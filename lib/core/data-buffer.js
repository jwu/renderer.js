export default class DataBuffer {
  constructor(size) {
    this._data = new ArrayBuffer(size);
    this._float32View = new Float32Array(this._data);
    this._uint32View = new Uint32Array(this._data);
  }

  get float32View() {
    return this._float32View;
  }

  get uint32View() {
    return this._uint32View;
  }

  destroy() {
    this._float32View = null;
    this._uint32View = null;
    this._data = null;
  }
}