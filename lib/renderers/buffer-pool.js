import { bits } from 'vmath';

class DataBuffer {
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

// max batch sprites num: 2000
// uv, position, color, indices, 2000 * 4 * (2 + 3 + 4 + 6/4) * 4 = 336000
// 2^19 = 524288
let _MAX_BATCH_BYTES = 336000;

export default class BufferPool {
  constructor() {
    this.buffers = [];
    // at least 4 bytes ?
    let np2 = bits.nextPow2(_MAX_BATCH_BYTES);
    let bufferNum = bits.log2(np2);
    for(let i = 2; i <= bufferNum; ++i) {
      this.buffers.push(new DataBuffer(1 << i));
    }
  }

  request(size) {
    if (size > bits.nextPow2(_MAX_BATCH_BYTES)) {
      console.warn(`can not get batch size bigger than ${bits.nextPow2(_MAX_BATCH_BYTES)} bytes.`);
      return null;
    }
    let np2 = bits.nextPow2(size);
    let index = bits.log2(np2);
    return this.buffers[index];
  }
}