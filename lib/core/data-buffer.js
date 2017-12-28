export default class DataBuffer {
  constructor(size) {
    this._data = new ArrayBuffer(size);
    this._float32View = new Float32Array(this._data);
    this._int32View = new Int32Array(this._data);
  }

  get float32View() {
    return this._float32View;
  }

  get int32View() {
    return this._int32View;
  }

  destroy() {
    this._float32View = null;
    this._int32View = null;
    this._data = null;
  }
}