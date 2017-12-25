import { FixedArray } from 'memop';

export default class Scene {
  constructor() {
    this._lights = new FixedArray(16);
    this._models = new FixedArray(16);
    this._cameras = new FixedArray(16);
    this._debugCamera = null;

    // NOTE: we don't use pool for views (because it's less changed and it doesn't have poolID)
    this._views = [];
  }

  _add(pool, item) {
    if (item._poolID !== -1) {
      return;
    }

    pool.push(item);
    item._poolID = pool.length - 1;
  }

  _remove(pool, item) {
    if (item._poolID === -1) {
      return;
    }

    pool.data[pool.length-1]._poolID = item._poolID;
    pool.fastRemove(item._poolID);
    item._poolID = -1;
  }

  reset() {
    for (let i = 0; i < this._models.length; ++i) {
      let model = this._models.data[i];
      model._viewID = -1;
    }
  }

  setDebugCamera(cam) {
    this._debugCamera = cam;
  }

  // camera

  getCameraCount() {
    return this._cameras.length;
  }

  getCamera(idx) {
    return this._cameras.data[idx];
  }

  addCamera(camera) {
    this._add(this._cameras, camera);
  }

  removeCamera(camera) {
    this._remove(this._cameras, camera);
  }

  // model

  getModelCount() {
    return this._models.length;
  }

  getModel(idx) {
    return this._models.data[idx];
  }

  addModel(model) {
    this._add(this._models, model);
  }

  removeModel(model) {
    this._remove(this._models, model);
  }

  // light

  getLightCount() {
    return this._lights.length;
  }

  getLight(idx) {
    return this._lights.data[idx];
  }

  addLight(light) {
    this._add(this._lights, light);
  }

  removeLight(light) {
    this._remove(this._lights, light);
  }

  // view

  addView(view) {
    if (this._views.indexOf(view) === -1) {
      this._views.push(view);
    }
  }

  removeView(view) {
    let idx = this._views.indexOf(view);
    if (idx !== -1) {
      this._views.splice(idx, 1);
    }
  }
}