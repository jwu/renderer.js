import { color3, color4, mat4, mat3, vec3, toRadian } from 'vmath';
import enums from '../../enums';
import gfx from 'gfx.js';

const _forward = vec3.new(0, 0, -1);

let _m4_tmp = mat4.create();
let _m3_tmp = mat3.create();
let _transformedLightDirection = vec3.create();

// compute light viewProjMat for shadow.
function _computeSpotLightViewProjMatrix(light, outView, outProj) {
  // view matrix
  light._node.getWorldRT(outView);
  mat4.invert(outView, outView);

  // proj matrix
  mat4.perspective(outProj, light._spotAngle * light._spotAngleScale, 1, light._shadowMinDepth, light._shadowMaxDepth);
}

function _computeDirectionalLightViewProjMatrix(light, outView, outProj) {
  // view matrix
  light._node.getWorldRT(outView);
  mat4.invert(outView, outView);

  // TODO: should compute directional light frustum based on rendered meshes in scene.
  // proj matrix
  let halfSize = light._shadowFustumSize / 2;
  mat4.ortho(outProj, -halfSize, halfSize, -halfSize, halfSize, light._shadowMinDepth, light._shadowMaxDepth);
}

function _computePointLightViewProjMatrix(light, outView, outProj) {
  // TODO:
}

export default class Light {
  constructor() {
    this._poolID = -1;
    this._node = null;

    this._type = enums.LIGHT_DIRECTIONAL;

    this._color = color3.new(1, 1, 1);
    this._intensity = 1;

    // used for spot and point light
    this._range = 1;
    // used for spot light, default to 60 degrees
    this._spotAngle = toRadian(60);
    this._spotExp = 1;
    // cached for uniform
    this._directionUniform = new Float32Array(3);
    this._positionUniform = new Float32Array(3);
    this._colorUniform = new Float32Array([this._color.r * this._intensity, this._color.g * this._intensity, this._color.b * this._intensity]);
    this._spotUniform = new Float32Array([Math.cos(this._spotAngle * 0.5), this._spotExp]);

    // shadow params
    this._shadowType = enums.SHADOW_NONE;
    this._shadowFrameBuffer = null;
    this._shadowMap = null;
    this._shadowMapDirty = false;
    this._shadowDepthBuffer = null;
    this._shadowResolution = 1024;
    this._shadowBias = 0.0005;
    this._shadowDarkness = 1;
    this._shadowMinDepth = 1;
    this._shadowMaxDepth = 1000;
    this._shadowDepthScale = 50; // maybe need to change it if the distance between shadowMaxDepth and shadowMinDepth is small.
    this._frustumEdgeFalloff = 0; // used by directional and spot light.
    this._viewProjMatrix = mat4.create();
    this._spotAngleScale = 1; // used for spot light.
    this._shadowFustumSize = 80; // used for directional light.
  }

  setNode(node) {
    this._node = node;
  }

  setColor(r, g, b) {
    color3.set(this._color, r, g, b);
    this._colorUniform[0] = r * this._intensity;
    this._colorUniform[1] = g * this._intensity;
    this._colorUniform[2] = b * this._intensity;
  }
  get color() {
    return this._color;
  }

  setIntensity(val) {
    this._intensity = val;
    this._colorUniform[0] = val * this._color.r;
    this._colorUniform[1] = val * this._color.g;
    this._colorUniform[2] = val * this._color.b;
  }
  get intensity() {
    return this._intensity;
  }

  setType(tpe) {
    this._type = tpe;
  }
  get type() {
    return this._type;
  }

  setSpotAngle(val) {
    this._spotAngle = val;
    this._spotUniform[0] = Math.cos(this._spotAngle * 0.5);
  }
  get spotAngle() {
    return this._spotAngle;
  }

  setSpotExp(val) {
    this._spotExp = val;
    this._spotUniform[1] = val;
  }
  get spotExp() {
    return this._spotExp;
  }

  setRange(tpe) {
    this._range = tpe;
  }
  get range() {
    return this._range;
  }

  setShadowType(type) {
    if (this._shadowType === enums.SHADOW_NONE && type !== enums.SHADOW_NONE) {
      this._shadowMapDirty = true;
    }
    this._shadowType = type;
  }
  get shadowType() {
    return this._shadowType;
  }

  get shadowMap() {
    return this._shadowMap;
  }

  get viewProjMatrix() {
    return this._viewProjMatrix;
  }

  setShadowResolution(val) {
    if (this._shadowResolution !== val) {
      this._shadowMapDirty = true;
    }
    this._shadowResolution = val;
  }
  get shadowResolution() {
    return this._shadowResolution;
  }

  setShadowBias(val) {
    this._shadowBias = val;
  }
  get shadowBias() {
    return this._shadowBias;
  }

  setShadowDarkness(val) {
    this._shadowDarkness = val;
  }
  get shadowDarkness() {
    return this._shadowDarkness;
  }

  setShadowMinDepth(val) {
    this._shadowMinDepth = val;
  }
  get shadowMinDepth() {
    if (this._type === enums.LIGHT_DIRECTIONAL) {
      return 1.0;
    }
    return this._shadowMinDepth;
  }

  setShadowMaxDepth(val) {
    this._shadowMaxDepth = val;
  }
  get shadowMaxDepth() {
    if (this._type === enums.LIGHT_DIRECTIONAL) {
      return 1.0;
    }
    return this._shadowMaxDepth;
  }

  setShadowDepthScale(val) {
    this._shadowDepthScale = val;
  }
  get shadowDepthScale() {
    return this._shadowDepthScale;
  }

  setFrustumEdgeFalloff(val) {
    this._frustumEdgeFalloff = val;
  }
  get frustumEdgeFalloff() {
    return this._frustumEdgeFalloff;
  }

  extractView(out, stages) {
    // TODO: view should not handle light.
    out._shadowLight = this;

    // rect
    out._rect.x = 0;
    out._rect.y = 0;
    out._rect.w = this._shadowResolution;
    out._rect.h = this._shadowResolution;

    // clear opts
    color4.set(out._color, 1, 1, 1, 1);
    out._depth = 1;
    out._stencil = 1;
    out._clearFlags = enums.CLEAR_COLOR | enums.CLEAR_DEPTH;

    // stages & framebuffer
    out._stages = stages;
    out._framebuffer = this._shadowFrameBuffer;

    // view projection matrix
    switch(this._type) {
      case enums.LIGHT_SPOT:
        _computeSpotLightViewProjMatrix(this, out._matView, out._matProj);
        break;

      case enums.LIGHT_DIRECTIONAL:
        _computeDirectionalLightViewProjMatrix(this, out._matView, out._matProj);
        break;

      case enums.LIGHT_POINT:
        _computePointLightViewProjMatrix(this, out._matView, out._matProj);
        break;

      default:
        console.warn('shadow of this light type is not supported');
    }

    // view-projection
    mat4.mul(out._matViewProj, out._matProj, out._matView);
    this._viewProjMatrix = out._matViewProj;
    mat4.invert(out._matInvViewProj, out._matViewProj);
  }

  _updateLightPositionAndDirection() {
    this._node.getWorldMatrix(_m4_tmp);
    mat3.fromMat4(_m3_tmp, _m4_tmp);
    vec3.transformMat3(_transformedLightDirection, _forward, _m3_tmp);
    vec3.array(this._directionUniform, _transformedLightDirection);
    let pos = this._positionUniform;
    pos[0] = _m4_tmp.m12;
    pos[1] = _m4_tmp.m13;
    pos[2] = _m4_tmp.m14;
  }

  _generateShadowMap(device) {
    this._shadowMap = new gfx.Texture2D(device, {
      width: this._shadowResolution,
      height: this._shadowResolution,
      format: gfx.TEXTURE_FMT_RGBA8,
      wrapS: gfx.WRAP_CLAMP,
      wrapT: gfx.WRAP_CLAMP,
    });
    this._shadowDepthBuffer = new gfx.RenderBuffer(device,
      gfx.RB_FMT_D16,
      this._shadowResolution,
      this._shadowResolution
    );
    this._shadowFrameBuffer = new gfx.FrameBuffer(device, this._shadowResolution, this._shadowResolution, {
      colors: [this._shadowMap],
      depth: this._shadowDepthBuffer,
    });
  }

  _destroyShadowMap() {
    if (this._shadowMap) {
      this._shadowMap.destroy();
      this._shadowDepthBuffer.destroy();
      this._shadowFrameBuffer.destroy();
      this._shadowMap = null;
      this._shadowDepthBuffer = null;
      this._shadowFrameBuffer = null;
    }
  }

  update(device) {
    this._updateLightPositionAndDirection();

    if (this._shadowType === enums.SHADOW_NONE) {
      this._destroyShadowMap();
    } else if (this._shadowMapDirty) {
      this._destroyShadowMap();
      this._generateShadowMap(device);
      this._shadowMapDirty = false;
    }

  }
}