import { color4, vec3, mat4 } from 'vmath';
import enums from '../../enums';

let _matView = mat4.create();
let _matProj = mat4.create();
let _matViewProj = mat4.create();
let _matInvViewProj = mat4.create();
let _tmp_v3 = vec3.create();

export default class Camera {
  constructor() {
    this._poolID = -1;
    this._node = null;

    //
    this._projection = enums.PROJ_PERSPECTIVE;

    // clear options
    this._color = color4.new(0.2, 0.3, 0.47, 1);
    this._depth = 1;
    this._stencil = 1;
    this._clearFlags = enums.CLEAR_COLOR | enums.CLEAR_DEPTH;

    // stages & framebuffer
    this._stages = [];
    this._framebuffer = null;

    // projection properties
    this._near = 0.01;
    this._far = 1000.0;
    this._fov = Math.PI/4.0; // vertical fov
    // this._aspect = 16.0/9.0; // DISABLE: use _rect.w/_rect.h
    this._rect = {
      x: 0, y: 0, w: 1, h: 1
    };

    // ortho properties
    this._orthoHeight = 10;
  }

  // node
  getNode() {
    return this._node;
  }
  setNode(node) {
    this._node = node;
  }

  // type
  getType() {
    return this._projection;
  }
  setType(type) {
    this._projection = type;
  }

  // orthoHeight
  getOrthoHeight() {
    return this._orthoHeight;
  }
  setOrthoHeight(val) {
    this._orthoHeight = val;
  }

  // fov
  getFov() {
    return this._fov;
  }
  setFov(fov) {
    this._fov = fov;
  }

  // near
  getNear() {
    return this._near;
  }
  setNear(near) {
    this._near = near;
  }

  // far
  getFar() {
    return this._far;
  }
  setFar(far) {
    this._far = far;
  }

  // color
  getColor(out) {
    return color4.copy(out, this._color);
  }
  setColor(r, g, b, a) {
    color4.set(this._color, r, g, b, a);
  }

  // depth
  getDepth() {
    return this._depth;
  }
  setDepth(depth) {
    this._depth = depth;
  }

  // stencil
  getStencil() {
    return this._stencil;
  }
  setStencil(stencil) {
    this._stencil = stencil;
  }

  // clearFlags
  getClearFlags() {
    return this._clearFlags;
  }
  setClearFlags(flags) {
    this._clearFlags = flags;
  }

  // rect
  getRect(out) {
    out.x = this._rect.x;
    out.y = this._rect.y;
    out.w = this._rect.w;
    out.h = this._rect.h;

    return out;
  }
  /**
   * @param {Number} x - [0,1]
   * @param {Number} y - [0,1]
   * @param {Number} w - [0,1]
   * @param {Number} h - [0,1]
   */
  setRect(x, y, w, h) {
    this._rect.x = x;
    this._rect.y = y;
    this._rect.w = w;
    this._rect.h = h;
  }

  // stages
  getStages() {
    return this._stages;
  }
  setStages(stages) {
    this._stages = stages;
  }

  // framebuffer
  getFramebuffer() {
    return this._framebuffer;
  }
  setFramebuffer(framebuffer) {
    this._framebuffer = framebuffer;
  }

  extractView(out, width, height) {
    // rect
    out._rect.x = this._rect.x * width;
    out._rect.y = this._rect.y * height;
    out._rect.w = this._rect.w * width;
    out._rect.h = this._rect.h * height;

    // clear opts
    out._color = this._color;
    out._depth = this._depth;
    out._stencil = this._stencil;
    out._clearFlags = this._clearFlags;

    // stages & framebuffer
    out._stages = this._stages;
    out._framebuffer = this._framebuffer;

    // view matrix
    this._node.getWorldRT(out._matView);
    mat4.invert(out._matView, out._matView);

    // projection matrix
    // TODO: if this._projDirty
    let aspect = width / height;
    if (this._projection === enums.PROJ_PERSPECTIVE) {
      mat4.perspective(out._matProj,
        this._fov,
        aspect,
        this._near,
        this._far
      );
    } else {
      let x = this._orthoHeight * aspect;
      let y = this._orthoHeight;
      mat4.ortho(out._matProj,
        -x, x, -y, y, this._near, this._far
      );
    }

    // view-projection
    mat4.mul(out._matViewProj, out._matProj, out._matView);
    mat4.invert(out._matInvViewProj, out._matViewProj);
  }

  screenToWorld(out, screenPos, width, height) {
    let aspect = width / height;
    let cx = this._rect.x * width;
    let cy = this._rect.y * height;
    let cw = this._rect.w * width;
    let ch = this._rect.h * height;

    // view matrix
    this._node.getWorldRT(_matView);
    mat4.invert(_matView, _matView);

    // projection matrix
    if (this._projection === enums.PROJ_PERSPECTIVE) {
      mat4.perspective(_matProj,
        this._fov,
        aspect,
        this._near,
        this._far
      );
    } else {
      let x = this._orthoHeight * aspect;
      let y = this._orthoHeight;
      mat4.ortho(_matProj,
        -x, x, -y, y, this._near, this._far
      );
    }

    // view-projection
    mat4.mul(_matViewProj, _matProj, _matView);

    // inv view-projection
    mat4.invert(_matInvViewProj, _matViewProj);

    //
    if (this._projection === enums.PROJ_PERSPECTIVE) {
      // calculate screen pos in far clip plane
      vec3.set(out,
        (screenPos.x - cx) * 2.0 / cw - 1.0,
        (screenPos.y - cy) * 2.0 / ch - 1.0, // DISABLE: (ch - (screenPos.y - cy)) * 2.0 / ch - 1.0,
        1.0
      );

      // transform to world
      vec3.transformMat4(out, out, _matInvViewProj);

      //
      this._node.getWorldPos(_tmp_v3);
      vec3.lerp(out, _tmp_v3, out, screenPos.z / this._far);
    } else {
      let range = this._farClip - this._nearClip;
      vec3.set(out,
        (screenPos.x - cx) * 2.0 / cw - 1.0,
        (screenPos.y - cy) * 2.0 / ch - 1.0, // DISABLE: (ch - (screenPos.y - cy)) * 2.0 / ch - 1.0,
        (this._far - screenPos.z) / range * 2.0 - 1.0
      );

      // transform to world
      vec3.transformMat4(out, out, _matInvViewProj);
    }

    return out;
  }

  worldToScreen(out, worldPos, width, height) {
    let aspect = width / height;
    let cx = this._rect.x * width;
    let cy = this._rect.y * height;
    let cw = this._rect.w * width;
    let ch = this._rect.h * height;

    // view matrix
    this._node.getWorldRT(_matView);
    mat4.invert(_matView, _matView);

    // projection matrix
    if (this._projection === enums.PROJ_PERSPECTIVE) {
      mat4.perspective(_matProj,
        this._fov,
        aspect,
        this._near,
        this._far
      );
    } else {
      let x = this._orthoHeight * aspect;
      let y = this._orthoHeight;
      mat4.ortho(_matProj,
        -x, x, -y, y, this._near, this._far
      );
    }

    // view-projection
    mat4.mul(_matViewProj, _matProj, _matView);

    // calculate w
    let w =
      worldPos.x * _matViewProj.m03 +
      worldPos.y * _matViewProj.m07 +
      worldPos.z * _matViewProj.m11 +
      _matViewProj.m15
      ;

    vec3.transformMat4(out, worldPos, _matViewProj);
    out.x = cx + (out.x / w + 1) * 0.5 * cw;
    out.y = cy + (out.y / w + 1) * 0.5 * ch;

    return out;
  }
}