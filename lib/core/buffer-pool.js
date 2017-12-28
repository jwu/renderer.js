import { bits } from 'vmath';
import DataBuffer from './data-buffer';

const _DEFAULT_MAX_BATCH_BYTES = 512000; // 500 kb
const _MIN_BATCH_BYTES = 64;

let _minLog = bits.log2(_MIN_BATCH_BYTES);

export default class BufferPool {
  constructor(maxBytes = _DEFAULT_MAX_BATCH_BYTES) {
    this._buffers = [];
    this._maxBytes = bits.nextPow2(maxBytes);
    this._maxLog = bits.log2(this._maxBytes);

    for (let i = _minLog; i <= this._maxLog; ++i) {
      this._buffers.push(new DataBuffer(1 << i));
    }
  }

  get maxBytes() {
    return this._maxBytes;
  }

  request(size) {
    let np2 = bits.nextPow2(size);
    let curLog = bits.log2(np2);
    if (curLog > this._maxLog) {
      return this._buffers[this._maxLog - _minLog];
    } else if (curLog < _minLog) {
      return this._buffers[0];
    } else {
      return this._buffers[curLog - _minLog];
    }
  }
}