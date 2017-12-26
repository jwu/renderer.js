import { nextPow2, color4, vec3 } from 'vmath';
import { Pool } from 'memop';
import enums from '../enums';
import RenderDataInterface from './render-data-interface';

const _defaultWidth = 64;
const _defaultHeight = 64;
// it should be power of two and _maxCharsOneBatch*4 should be not bigger than _vertsInIAPool(screen system batch) to make sure it could be filled in IA
const _maxCharsOneBatch = 256;

let _labelIndices = new Uint16Array(_maxCharsOneBatch * 6);
for (let i = 0; i < _maxCharsOneBatch; ++i) {
  _labelIndices[6 * i + 0] = 4 * i + 0;
  _labelIndices[6 * i + 1] = 4 * i + 1;
  _labelIndices[6 * i + 2] = 4 * i + 2;
  _labelIndices[6 * i + 3] = 4 * i + 3;
  _labelIndices[6 * i + 4] = 4 * i + 2;
  _labelIndices[6 * i + 5] = 4 * i + 1;
}
class _LabelVertsPool {
  constructor() {
    let dataPool = this._dataPool = {};
    // init 8, 16, 32, 64, 128, 256 pool
    for (let poolSize = _maxCharsOneBatch; poolSize >= 8; poolSize = poolSize / 2) {
      dataPool[poolSize] = new Pool(() => {
        let data = [];
        for (let i = 0; i < 4 * poolSize; ++i) {
          data.push(vec3.create());
        }
        return data;
      }, 2);
    }

  }

  alloc(charCount) {
    let poolSize = 8;
    if (charCount > 8) {
      poolSize = nextPow2(charCount);
    }
    if (charCount > _maxCharsOneBatch) {
      console.error('can not alloc size bigger than 256 chars');
    }
    return this._dataPool[poolSize].alloc();
  }

  free(data) {
    this._dataPool[data.length / 4].free(data);
  }
}

const _positionsPool = new _LabelVertsPool();
const _uvsPool = new _LabelVertsPool();

class _RenderData extends RenderDataInterface {
  constructor() {
    super();
  }

  init(owner, index) {
    this._owner = owner;
    this._index = index;
  }

  getNode() {
    return this._owner._node;
  }

  getEffect() {
    return this._owner._effect;
  }

  getPositions() {
    return this._owner.getPositions(this._index);
  }

  getUVs() {
    return this._owner.getUVs(this._index);
  }

  getIndices() {
    return _labelIndices;
  }

  getColor() {
    return this._owner._color;
  }

  getVertexCount() {
    return this._owner.getVertexCount(this._index);
  }

  getIndexCount() {
    return this._owner.getIndexCount(this._index);
  }
}

let _renderDataPool = new Pool(() => {
  return new _RenderData();
}, 2);

export default class LabelRenderHelper {
  constructor() {
    this._width = _defaultWidth;
    this._height = _defaultHeight;
    this._pivotX = 0.0;
    this._pivotY = 0.0;
    this._node = null;
    this._effect = null;
    this._font = null;
    this._label = '';
    this._texture = null;

    this._positions = [_positionsPool.alloc(1)];
    this._uvs = [_uvsPool.alloc(1)];
    this._vertexDataDirty = true;

    this._horizontalAlignPercentage = 0.0;
    this._verticalAlignPercentage = 0.0;
    this._horizontalAlign = enums.TEXT_ALIGN_LEFT;
    this._verticalAlign = enums.TEXT_ALIGN_TOP;
    this._wrap = true;
    this._fontSize = 32;
    this._lineHeight = 1.0;
    // this._indices = _labelIndices;
    this._vertexCount = 0;
    this._indexCount = 0;
    this._color = color4.create();
    let renderData = _renderDataPool.alloc();
    renderData.init(this, 0);
    this._renderData = [renderData];
    this._renderDataCount = 1;

    this._vertexValueAccessor = (valueName, index, callback) => {
      let accessValue = this[valueName];
      if (!accessValue || !accessValue[0] || !accessValue[0][0]) {
        callback && callback("Invalid value accessor", null, null, null, null);
      }
      let segmentIndex = Math.floor(index / _maxCharsOneBatch);
      if (segmentIndex < this._renderDataCount) {
        let segmentOffset = index - segmentIndex * _maxCharsOneBatch;
        if (segmentOffset * 4 < accessValue[segmentIndex].length) {
          callback && callback(null, accessValue[segmentIndex][4 * segmentOffset], accessValue[segmentIndex][4 * segmentOffset + 1],
            accessValue[segmentIndex][4 * segmentOffset + 2], accessValue[segmentIndex][4 * segmentOffset + 3]);
        } else {
          callback && callback("Out of Range", null, null, null, null);
        }
      } else {
        callback && callback("Out of Range", null, null, null, null);
      }
    }
  }

  destroy() {
    this._freeVerticesData();
  }

  positionAccess(index, callback) {
    return this._vertexValueAccessor('_positions', index, callback);
  }

  uvAccess(index, callback) {
    return this._vertexValueAccessor('_uvs', index, callback);
  }

  _freeVerticesData() {
    for (let i = 0; i < this._renderDataCount; ++i) {
      _positionsPool.free(this._positions[i]);
      _uvsPool.free(this._uvs[i]);
      this._renderData[i].resetBatchKey();
      _renderDataPool.free(this._renderData[i]);
    }
    this._positions.length = 0;
    this._uvs.length = 0;
    this._renderData.length = 0;
  }

  setNode(node) {
    this._node = node;
  }

  setEffect(effect) {
    this._effect = effect;
  }

  set label(val) {
    this._label = val;
    let renderDataCount = Math.ceil(val.length / _maxCharsOneBatch);
    if (renderDataCount !== this._renderDataCount) {
      this._freeVerticesData();
      this._renderDataCount = renderDataCount;
      // realloc
      this._positions.length = renderDataCount;
      this._uvs.length = renderDataCount;
      this._renderData.length = renderDataCount;
      for (let i = 0; i < renderDataCount; ++i) {
        this._positions[i] = _positionsPool.alloc(_maxCharsOneBatch);
        this._uvs[i] = _uvsPool.alloc(_maxCharsOneBatch);
        let renderData = this._renderData[i] = _renderDataPool.alloc();
        renderData.init(this, i);
        if (this._font) {
          renderData.setBatchKey(this._font._uuid);
        }
      }
    } else {
      // only deal with label with little chars
      if (renderDataCount === 1) {
        let allocCharSize = nextPow2(val.length);
        if (allocCharSize * 4 !== this._positions[0].length) {
          _positionsPool.free(this._positions[0]);
          _uvsPool.free(this._uvs[0]);
          this._uvs[0] = _uvsPool.alloc(allocCharSize);
          this._positions[0] = _positionsPool.alloc(allocCharSize);
        }
      }
    }
    this._vertexDataDirty = true;
  }

  set width(val) {
    if (this._width !== val) {
      this._width = val;
      this._vertexDataDirty = true;
    }
  }

  set height(val) {
    if (this._height !== val) {
      this._height = val;
      this._vertexDataDirty = true;
    }
  }

  set pivotX(val) {
    if (this._pivotX !== val) {
      this._pivotX = val;
      this._vertexDataDirty = true;
    }
  }

  set pivotY(val) {
    if (this._pivotY !== val) {
      this._pivotY = val;
      this._vertexDataDirty = true;
    }
  }
  set font(val) {
    this._font = val;
    this._texture = val._texture;
    this._renderData.forEach(data => {
      data.setBatchKey(val._uuid);
    })
    this._vertexDataDirty = true;
  }

  set wrap(val) {
    if (this._wrap !== val) {
      this._wrap = val;
      this._vertexDataDirty = true;
    }
  }

  set fontSize(val) {
    if (this._fontSize !== val) {
      this._fontSize = val;
      this._vertexDataDirty = true;
    }
  }

  set lineHeight(val) {
    if (this._lineHeight !== val) {
      this._lineHeight = val;
      this._vertexDataDirty = true;
    }
  }

  set horizontalAlign(val) {
    let percentage = 0.0;
    if (val === enums.TEXT_ALIGN_CENTER) {
      percentage = 0.5;
    } else if (val === enums.TEXT_ALIGN_RIGHT) {
      percentage = 1.0;
    } else {
      // do nothing 0.0 is default value
    }
    if (percentage !== this._horizontalAlignPercentage) {
      this._horizontalAlignPercentage = percentage;
      this._vertexDataDirty = true;
    }
  }

  set verticalAlign(val) {
    let percentage = 0.0;
    if (val === enums.TEXT_ALIGN_CENTER) {
      percentage = 0.5;
    } else if (val === enums.TEXT_ALIGN_BOTTOM) {
      percentage = 1.0;
    } else {
      // do nothing 0.0 is default value
    }
    if (percentage !== this._verticalAlignPercentage) {
      this._verticalAlignPercentage = percentage;
      this._vertexDataDirty = true;
    }
  }

  set color(val) {
    color4.copy(this._color, val);
  }

  get color() {
    return this._color;
  }

  getVertexCount(index) {
    let maxVertsOneBatch = _maxCharsOneBatch * 4;
    return (index * maxVertsOneBatch < this._vertexCount) ? (Math.min(maxVertsOneBatch, this._vertexCount - index * maxVertsOneBatch)) : 0;
  }

  getIndexCount(index) {
    let maxIndicesOneBatch = _maxCharsOneBatch * 6;
    return (index * maxIndicesOneBatch < this._indexCount) ? (Math.min(maxIndicesOneBatch, this._indexCount - index * maxIndicesOneBatch)) : 0;
  }

  getPositions(index) {
    return (index > this._renderDataCount) ? null : this._positions[index];
  }

  getUVs(index) {
    return (index > this._renderDataCount) ? null : this._uvs[index];
  }

  getRenderDataCount() {
    return this._renderDataCount;
  }

  getRenderData(index) {
    if (index > this._renderDataCount) {
      return null;
    } else {
      return this._renderData[index];
    }
  }

  updateModelData() {
    if (this._vertexDataDirty && this._font) {
      this._vertexDataDirty = false;
      let filledChars = this._font.genTextVertices(this, this._label, this._horizontalAlignPercentage, this._verticalAlignPercentage,
        this._wrap, this._width, this._height, this._fontSize, this._lineHeight, this._pivotX, this._pivotY);
      this._vertexCount = filledChars * 4;
      this._indexCount = filledChars * 6;
    }
  }

}