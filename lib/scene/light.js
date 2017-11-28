import { color3, mat4, mat3, vec3, toRadian } from 'vmath';
import enums from '../enums';

let _m4_tmp = mat4.create();
let _m3_tmp = mat3.create();
const _forward = vec3.new(0, 0, -1);
let _transformedLightDirection = vec3.create();
// matrixs for shadow.
let _m4_tmp1 = mat4.create();
let _m4_tmp2 = mat4.create();

// compute light viewProjMat for shadow.
function _computeSpotLightViewProjMatrix(light) {
  // view matrix
  light._node.getWorldRT(_m4_tmp1);
  mat4.invert(_m4_tmp1, _m4_tmp1);
  // proj matrix
  //mat4.perspective(_m4_tmp2, this._spotAngle * this._spotAngleScale, 1, camera.getNear(), camera.getFar());
  mat4.perspective(_m4_tmp2, light._spotAngle * light._spotAngleScale, 1, light._shadowMinDepth, light._shadowMaxDepth);
  // view-proj matrix
  mat4.mul(light._lightViewProj, _m4_tmp2, _m4_tmp1);
}

function _computeDirectionalLightViewProjMatrix(light) {
  // view matrix
  light._node.getWorldRT(_m4_tmp1);
  mat4.invert(_m4_tmp1, _m4_tmp1);
  // TODO: should compute directional light frustum based on rendered meshes in scene.
  // proj matrix
  let halfSize = light._shadowFustumSize / 2;
  mat4.ortho(_m4_tmp2, -halfSize, halfSize, -halfSize, halfSize, light._shadowMinDepth, light._shadowMaxDepth);
  // view-proj matrix
  mat4.mul(light._lightViewProj, _m4_tmp2, _m4_tmp1);
}

function _computePointLightViewProjMatrix(light) {
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
    this._shadowResolution = 1024;
    this._shadowBias = 0.00005;
    this._shadowDarkness = 1;
    this._shadowMinDepth = 1;
    this._shadowMaxDepth = 1000;
    this._shadowDepthScale = 50; // maybe need to change it if the distance between shadowMaxDepth and shadowMinDepth is small.
    this._frustumEdgeFalloff = 0; // used by directional and spot light.
    this._lightViewProj = mat4.create();
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
    this._shadowType = type;
  }
  get shadowType() {
    return this._shadowType;
  }

  setShadowResolution(val) {
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

  computeLightViewProjMatrix() {
    switch(this._type) {
      case enums.LIGHT_SPOT:
        _computeSpotLightViewProjMatrix(this);
        break;
      case enums.LIGHT_DIRECTIONAL:
        _computeDirectionalLightViewProjMatrix(this);
        break;
      case enums.LIGHT_POINT:
        _computePointLightViewProjMatrix(this);
        break;
      default:
        console.warn('shadow of this light type is not supported');
    }
    return this._lightViewProj;
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

  update() {
    this._updateLightPositionAndDirection();
  }
}