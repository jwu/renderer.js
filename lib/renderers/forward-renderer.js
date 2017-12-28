import gfx from 'gfx.js';
import { vec3, mat4 } from 'vmath';
import { CircularPool } from 'memop';
import BufferPool from './buffer-pool';

import BaseRenderer from '../core/base-renderer';
import InputAssembler from '../core/input-assembler';
import enums from '../enums';

// import GaussianBlur from './gaussian-blur';

let _camPos = vec3.create();
let _camFwd = vec3.create();
let _v3_tmp1 = vec3.create();

let _a16_view = new Float32Array(16);
let _a16_proj = new Float32Array(16);
let _a16_viewProj = new Float32Array(16);
let _a16_lightViewProj = new Float32Array(16);
let _a3_camPos = new Float32Array(3);

let _bufferPool = new BufferPool();
const MAX_LINE_VERTS = Math.ceil(_bufferPool.maxBytes / 24); // pos: 3, color: 3

export default class ForwardRenderer extends BaseRenderer {
  constructor(device, builtin) {
    super(device, builtin);
    this._directionalLights = [];
    this._pointLights = [];
    this._spotLights = [];
    this._shadowLights = [];
    this._sceneAmbient = new Float32Array([0.5, 0.5, 0.5]);

    this._registerStage('shadowcast', this._shadowStage.bind(this));
    this._registerStage('opaque', this._opaqueStage.bind(this));
    this._registerStage('transparent', this._transparentStage.bind(this));
    this._registerStage('2d', this._2dStage.bind(this));

    this._registerModel('default', this._draw.bind(this));
    this._registerModel('line-batch', this._drawLineBatch.bind(this));
    this._registerModel('skinning', this._drawSkinning.bind(this));

    // this._blur = new GaussianBlur(device, this._programLib);

    this._lineIAs = new CircularPool(() => {
      return new InputAssembler(
        new gfx.VertexBuffer(
          device,
          new gfx.VertexFormat([
            { name: gfx.ATTR_POSITION, type: gfx.ATTR_TYPE_FLOAT32, num: 3 },
            { name: gfx.ATTR_COLOR, type: gfx.ATTR_TYPE_FLOAT32, num: 3 }
          ]),
          gfx.USAGE_DYNAMIC,
          null,
          MAX_LINE_VERTS
        ),
        null,
        gfx.PT_LINES
      );
    }, 2);
  }

  updateLights(scene) {
    this._directionalLights.length = 0;
    this._pointLights.length = 0;
    this._spotLights.length = 0;
    this._shadowLights.length = 0;
    let lights = scene._lights;
    for (let i = 0; i < lights.length; ++i) {
      let light = lights.data[i];
      light.update(this._device);
      if (light.shadowType !== enums.SHADOW_NONE) {
        this._shadowLights.push(light);
        let view = this._requestView();
        light.extractView(view, ['shadowcast']);
      }
      if (light._type === enums.LIGHT_DIRECTIONAL) {
        this._directionalLights.push(light);
      } else if (light._type === enums.LIGHT_POINT) {
        this._pointLights.push(light);
      } else {
        this._spotLights.push(light);
      }
    }
  }

  render(scene) {
    this._reset();

    // extract views from cameras, lights and so on
    const canvas = this._device._gl.canvas;

    // update lights, extract shadow view.
    this.updateLights(scene);

    if (scene._debugCamera) {
      let view = this._requestView();
      scene._debugCamera.extractView(view, canvas.width, canvas.height);
    } else {
      for (let i = 0; i < scene._cameras.length; ++i) {
        let view = this._requestView();
        scene._cameras.data[i].extractView(view, canvas.width, canvas.height);
      }
    }

    // render by cameras
    for (let i = 0; i < this._viewPools.length; ++i) {
      let view = this._viewPools.data[i];
      this._render(view, scene);
    }

    // render by views
    for (let i = 0; i < scene._views.length; ++i) {
      let view = scene._views[i];
      this._render(view, scene);
    }
  }

  _submitLightUniforms() {
    this._device.setUniform('sceneAmbient', this._sceneAmbient);

    if (this._directionalLights.length > 0) {
      for (let index = 0; index < this._directionalLights.length; ++index) {
        let light = this._directionalLights[index];
        this._device.setUniform(`dir_light${index}_direction`, light._directionUniform);
        this._device.setUniform(`dir_light${index}_color`, light._colorUniform);
      }
    }
    if (this._pointLights.length > 0) {
      for (let index = 0; index < this._pointLights.length; ++index) {
        let light = this._pointLights[index];
        this._device.setUniform(`point_light${index}_position`, light._positionUniform);
        this._device.setUniform(`point_light${index}_color`, light._colorUniform);
        this._device.setUniform(`point_light${index}_range`, light._range);
      }
    }

    if (this._spotLights.length > 0) {
      for (let index = 0; index < this._spotLights.length; ++index) {
        let light = this._spotLights[index];
        this._device.setUniform(`spot_light${index}_position`, light._positionUniform);
        this._device.setUniform(`spot_light${index}_direction`, light._directionUniform);
        this._device.setUniform(`spot_light${index}_color`, light._colorUniform);
        this._device.setUniform(`spot_light${index}_range`, light._range);
        this._device.setUniform(`spot_light${index}_spot`, light._spotUniform);
      }
    }
  }

  _submitShadowStageUniforms(view) {
    let light = view._shadowLight;
    this._device.setUniform('minDepth', light.shadowMinDepth);
    this._device.setUniform('maxDepth', light.shadowMaxDepth);
    this._device.setUniform('bias', light.shadowBias);
    this._device.setUniform('depthScale', light.shadowDepthScale);
  }

  _submitOtherStagesUniforms() {
    for (let index = 0; index < this._shadowLights.length; ++index) {
      let light = this._shadowLights[index];
      this._device.setUniform(`lightViewProjMatrix_${index}`, mat4.array(_a16_lightViewProj, light.viewProjMatrix));
      this._device.setUniform(`minDepth_${index}`, light.shadowMinDepth);
      this._device.setUniform(`maxDepth_${index}`, light.shadowMaxDepth);
      this._device.setUniform(`bias_${index}`, light.shadowBias);
      this._device.setUniform(`depthScale_${index}`, light.shadowDepthScale);
      this._device.setUniform(`darkness_${index}`, light.shadowDarkness);
      this._device.setUniform(`frustumEdgeFalloff_${index}`, light.frustumEdgeFalloff);
      this._device.setUniform(`texelSize_${index}`, new Float32Array([1.0 / light.shadowResolution, 1.0 / light.shadowResolution]));
    }
  }

  _updateShaderDefines(items) {
    for (let i = 0; i < items.length; ++i) {
      let item = items.data[i];
      let defines = item.defines;

      defines.NUM_DIR_LIGHTS = Math.min(4, this._directionalLights.length);
      defines.NUM_POINT_LIGHTS = Math.min(4, this._pointLights.length);
      defines.NUM_SPOT_LIGHTS = Math.min(4, this._spotLights.length);

      defines.NUM_SHADOW_LIGHTS = Math.min(4, this._shadowLights.length);
    }
  }

  _2dStage(view, items) {
    // update uniforms
    this._device.setUniform('view', mat4.array(_a16_view, view._matView));
    this._device.setUniform('proj', mat4.array(_a16_proj, view._matProj));
    this._device.setUniform('viewProj', mat4.array(_a16_viewProj, view._matViewProj));

    // sort items
    items.sort((a, b) => {
      return a.model.sortKey - b.model.sortKey;
    });

    // draw it
    for (let i = 0; i < items.length; ++i) {
      let item = items.data[i];
      this._drawModel(item);
    }
  }

  _shadowStage(view, items) {
    const programLib = this._programLib;
    this._device.setUniform('lightViewProjMatrix', mat4.array(_a16_viewProj, view._matViewProj));

    // update rendering
    this._submitLightUniforms();
    this._submitShadowStageUniforms(view);
    this._updateShaderDefines(items);

    // calculate sorting key
    for (let i = 0; i < items.length; ++i) {
      let item = items.data[i];
      item.sortKey = programLib.getKey(
        item.technique._passes[0]._programName,
        item.defines
      );
    }

    // sort items
    items.sort((a, b) => {
      let techA = a.technique;
      let techB = b.technique;

      if (techA._layer !== techB._layer) {
        return techA._layer - techB._layer;
      }

      if (techA._passes.length !== techB._passes.length) {
        return techA._passes.length - techB._passes.length;
      }

      return a.sortKey - b.sortKey;
    });

    // draw it
    for (let i = 0; i < items.length; ++i) {
      let item = items.data[i];
      this._drawModel(item);
    }

  }

  _opaqueStage(view, items) {
    const programLib = this._programLib;
    view.getPosition(_camPos);

    // update uniforms
    this._device.setUniform('view', mat4.array(_a16_view, view._matView));
    this._device.setUniform('proj', mat4.array(_a16_proj, view._matProj));
    this._device.setUniform('viewProj', mat4.array(_a16_viewProj, view._matViewProj));
    this._device.setUniform('eye', vec3.array(_a3_camPos, _camPos));

    // update rendering
    this._submitLightUniforms();
    this._submitOtherStagesUniforms();
    this._updateShaderDefines(items);

    // calculate sorting key
    for (let i = 0; i < items.length; ++i) {
      let item = items.data[i];
      item.sortKey = programLib.getKey(
        item.technique._passes[0]._programName,
        item.defines
      );
    }

    // sort items
    items.sort((a, b) => {
      let techA = a.technique;
      let techB = b.technique;

      if (techA._layer !== techB._layer) {
        return techA._layer - techB._layer;
      }

      if (techA._passes.length !== techB._passes.length) {
        return techA._passes.length - techB._passes.length;
      }

      return a.sortKey - b.sortKey;
    });

    // draw it
    for (let i = 0; i < items.length; ++i) {
      let item = items.data[i];

      for (let index = 0; index < this._shadowLights.length; ++index) {
        let light = this._shadowLights[index];
        this._device.setTexture(`shadowMap_${index}`, light.shadowMap, this._allocTextuerUnit());
      }

      this._drawModel(item);
    }
  }

  _transparentStage(view, items) {
    view.getPosition(_camPos);
    view.getForward(_camFwd);

    // update uniforms
    this._device.setUniform('view', mat4.array(_a16_view, view._matView));
    this._device.setUniform('proj', mat4.array(_a16_proj, view._matProj));
    this._device.setUniform('viewProj', mat4.array(_a16_viewProj, view._matViewProj));
    this._device.setUniform('eye', vec3.array(_a3_camPos, _camPos));

    // calculate zdist
    for (let i = 0; i < items.length; ++i) {
      let item = items.data[i];

      // TODO: we should use mesh center instead!
      item.node.getWorldPos(_v3_tmp1);

      vec3.sub(_v3_tmp1, _v3_tmp1, _camPos);
      item.sortKey = vec3.dot(_v3_tmp1, _camFwd);
    }

    // update rendering
    this._submitLightUniforms();
    this._submitOtherStagesUniforms();
    this._updateShaderDefines(items);

    // sort items
    items.sort((a, b) => {
      if (a.technique._layer !== b.technique._layer) {
        return a.technique._layer - b.technique._layer;
      }

      return b.sortKey - a.sortKey;
    });

    // draw it
    for (let i = 0; i < items.length; ++i) {
      let item = items.data[i];

      for (let index = 0; index < this._shadowLights.length; ++index) {
        let light = this._shadowLights[index];
        this._device.setTexture(`shadowMap_${index}`, light.shadowMap, this._allocTextuerUnit());
      }

      this._drawModel(item);
    }
  }

  _drawSkinning(item) {
    let { model, defines } = item;

    defines.USE_SKINNING = true;
    model.updateMatrices();
    this._device.setTexture('u_jointsTexture', model._jointsTexture, this._allocTextuerUnit());
    this._device.setUniform('u_jointsTextureSize', model._jointsTexture._width);

    this._draw(item);
  }

  _drawLineBatch(item) {
    let model = item.model;
    let v = 0;
    // model.line total: 48 bytes (start: vec3, end: vec3, color: vec3, normal: vec3)
    let lineData = _bufferPool.request(model.lines.length * 48);
    let float32LineData = lineData.float32View;

    for (let i = model.lines.length-1; i >= 0; --i) {
      // flush when verts exceeds
      if (v + 2 >= MAX_LINE_VERTS) {
        let lineIA = this._lineIAs.request();
        lineIA._vertexBuffer.update(0, float32LineData);
        lineIA._start = 0;
        lineIA._count = v;

        item.ia = lineIA;
        this._draw(item);
        v = 0;
      }

      let line = model.lines.data[i];

      //
      let idx = v * 6;
      float32LineData[idx] = line.start.x;
      float32LineData[idx + 1] = line.start.y;
      float32LineData[idx + 2] = line.start.z;
      float32LineData[idx + 3] = line.color.r;
      float32LineData[idx + 4] = line.color.g;
      float32LineData[idx + 5] = line.color.b;

      float32LineData[idx + 6] = line.end.x;
      float32LineData[idx + 7] = line.end.y;
      float32LineData[idx + 8] = line.end.z;
      float32LineData[idx + 9] = line.color.r;
      float32LineData[idx + 10] = line.color.g;
      float32LineData[idx + 11] = line.color.b;

      v += 2;
    }

    // flush rest verts
    if (v > 0) {
      let lineIA = this._lineIAs.request();
      lineIA._vertexBuffer.update(0, float32LineData);
      lineIA._start = 0;
      lineIA._count = v;

      item.ia = lineIA;
      this._draw(item);
    }
  }
}