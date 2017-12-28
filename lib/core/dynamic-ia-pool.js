import gfx from 'gfx.js';
import { CircularPool } from 'memop';
import InputAssembler from './input-assembler';
import BufferPool from './buffer-pool';

export default class DynamicIAPool {
  constructor(device, maxBuffers, pt, vfmt, maxVerts, ifmt = gfx.INDEX_FMT_UINT16, maxIndices = -1) {
    this._bytesPerVeretx = vfmt._bytes;

    if (ifmt === gfx.INDEX_FMT_UINT8) {
      this._bytesPerIndex = 1;
    } else if (ifmt === gfx.INDEX_FMT_UINT16) {
      this._bytesPerIndex = 2;
    } else if (ifmt === gfx.INDEX_FMT_UINT32) {
      this._bytesPerIndex = 4;
    }

    this._vdataPool = new BufferPool(this._bytesPerVeretx * maxVerts);
    if (maxIndices !== -1) {
      this._idataPool = new BufferPool(this._bytesPerIndex * maxIndices);
    }

    this._maxVerts = maxVerts;
    this._maxIndices = maxIndices;

    this._IAs = new CircularPool(() => {
      return new InputAssembler(
        new gfx.VertexBuffer(
          device,
          vfmt,
          gfx.USAGE_DYNAMIC,
          null,
          Math.ceil(this._vdataPool.maxBytes / this._bytesPerVeretx)
        ),
        maxIndices === -1 ? null : new gfx.IndexBuffer(
          device,
          ifmt,
          gfx.USAGE_DYNAMIC,
          null,
          Math.ceil(this._idataPool.maxBytes / this._bytesPerIndex)
        ),
        pt
      );
    }, maxBuffers);
  }

  get maxVerts() {
    return this._maxVerts;
  }

  get maxIndices() {
    return this._maxIndices;
  }

  requestIA() {
    return this._IAs.request();
  }

  requestVData(count) {
    return this._vdataPool.request(count * this._bytesPerVeretx);
  }

  requestIData(count) {
    return this._idataPool.request(count * this._bytesPerIndex);
  }
}