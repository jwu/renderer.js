import enums from '../../enums';
import { vec3, color4, mat4 } from 'vmath';

let _m4_tmp = mat4.create();
let _genID = 0;

export default class View {
  constructor() {
    this._id = _genID++;

    // viewport
    this._rect = {
      x: 0, y: 0, w: 1, h: 1
    };

    // TODO:
    // this._scissor = {
    //   x: 0, y: 0, w: 1, h: 1
    // };

    // clear options
    this._color = color4.new(0.3, 0.3, 0.3, 1);
    this._depth = 1;
    this._stencil = 1;
    this._clearFlags = enums.CLEAR_COLOR | enums.CLEAR_DEPTH;

    // matrix
    this._matView = mat4.create();
    this._matProj = mat4.create();
    this._matViewProj = mat4.create();
    this._matInvViewProj = mat4.create();

    // stages & framebuffer
    this._stages = [];
    this._cullingByID = false;
    this._framebuffer = null;

    this._shadowLight = null; // TODO: should not refer light in view.
  }

  getForward(out) {
    return vec3.set(
      out,
      -this._matView.m02,
      -this._matView.m06,
      -this._matView.m10
    );
  }

  getPosition(out) {
    mat4.invert(_m4_tmp, this._matView);
    return mat4.getTranslation(out, _m4_tmp);
  }
}