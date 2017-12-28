import { bits } from 'vmath';
import DataBuffer from './data-buffer';

// max batch sprites num: 2000
// uv, position, color, indices, 2000 * 4 * (2 + 3 + 4 + 6/4) * 4 = 336000
// 2^19 = 524288
const _MAX_BATCH_BYTES = 524288;
const _MIN_BATCH_BYTES = 64;
let _maxLog = bits.log2(_MAX_BATCH_BYTES);
let _minLog = bits.log2(_MIN_BATCH_BYTES)

export default class BufferPool {
  constructor() {
    this._buffers = [];
    this._maxBytes = _MAX_BATCH_BYTES;
    for(let i = _minLog; i <= _maxLog; ++i) {
      this._buffers.push(new DataBuffer(1 << i));
    }
  }

  get maxBytes() {
    return this._maxBytes;
  }

  request(size) {
    let np2 = bits.nextPow2(size);
    let curLog = bits.log2(np2);
    if (curLog > _maxLog) {
      return this._buffers[_maxLog - _minLog];
    } else if (curLog < _minLog){
      return this._buffers[0];
    } else {
      return this._buffers[curLog - _minLog];
    }
  }
}