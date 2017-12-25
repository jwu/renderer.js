import enums from '../enums';
import { color4, vec2, vec3, mat4 } from 'vmath';
import { Pool } from 'memop';
import RenderDataInterface from './render-data-interface';

const _defaultWidth = 64;
const _defaultHeight = 64;

let _defaultSpriteUV = vec3.new(0, 0, 0);
function _generateSimpleSpriteVerts(out, sprite, width, height, pivotX, pivotY) {
  let uvs = sprite ? sprite.getUVs() : null;
  let xOffset = -pivotX * width;
  let yOffset = -pivotY * height;
  vec3.set(out._positions[0], 0 + xOffset, 0 + yOffset, 0);
  vec3.set(out._positions[1], width + xOffset, 0 + yOffset, 0);
  vec3.set(out._positions[2], 0 + xOffset, height + yOffset, 0);
  vec3.set(out._positions[3], width + xOffset, height + yOffset, 0);

  vec3.copy(out._uvs[0], uvs ? uvs[0] : _defaultSpriteUV);
  vec3.copy(out._uvs[1], uvs ? uvs[3] : _defaultSpriteUV);
  vec3.copy(out._uvs[2], uvs ? uvs[12] : _defaultSpriteUV);
  vec3.copy(out._uvs[3], uvs ? uvs[15] : _defaultSpriteUV);
}

let _xs_tmp = [0.0, 0.0, 0.0, 0.0];
let _ys_tmp = [0.0, 0.0, 0.0, 0.0];
function _generateSlicedSpriteVerts(out, sprite, width, height, pivotX, pivotY) {
  let uvs = sprite ? sprite.getUVs() : null;
  let xOffset = -pivotX * width;
  let yOffset = -pivotY * height;

  // x0, x1, x2, x3
  let xScale = 1.0;
  let yScale = 1.0;
  if (sprite && (sprite._left + sprite._right > width)) {
    xScale = width / (sprite._left + sprite._right);
  }
  if (sprite && (sprite._bottom + sprite._top > height)) {
    yScale = height / (sprite._bottom + sprite._top);
  }
  _xs_tmp[0] = 0.0 + xOffset;
  _xs_tmp[1] = (sprite ? sprite._left : 0.0) * xScale + xOffset;
  _xs_tmp[2] = width - (sprite ? sprite._right : 0.0) * xScale + xOffset;
  _xs_tmp[3] = width + xOffset;
  _ys_tmp[0] = 0.0 + yOffset;
  _ys_tmp[1] = (sprite ? sprite._bottom : 0.0) * yScale + yOffset;
  _ys_tmp[2] = height - (sprite ? sprite._top : 0.0) * yScale + yOffset;
  _ys_tmp[3] = height + yOffset;
  for (let row = 0; row < 4; ++row) {
    for (let column = 0; column < 4; ++column) {
      vec3.set(out._positions[row * 4 + column], _xs_tmp[column], _ys_tmp[row], 0.0);
    }
  }

  for (let i = 0; i < 16; ++i) {
    vec3.copy(out._uvs[i], uvs ? uvs[i] : _defaultSpriteUV);
  }
}

/**
 * simple sprite
 * v2------v3
 * |       |
 * |       |
 * |       |
 * v0      v1
 * sliced sprite
 * v12---v13---v14---v15
 * |      |     |     |
 * v08---v09---v10---v11
 * |      |     |     |
 * v04---v05---v06---v07
 * |      |     |     |
 * v00---v01---v02---v03
 */
let _simpleSpriteIndices = new Uint16Array([0, 1, 2, 3, 2, 1]);
let _slicedSpriteIndices = new Uint16Array([
  0, 1, 4, 5, 4, 1,
  1, 2, 5, 6, 5, 2,
  2, 3, 6, 7, 6, 3,
  4, 5, 8, 9, 8, 5,
  5, 6, 9, 10, 9, 6,
  6, 7, 10, 11, 10, 7,
  8, 9, 12, 13, 12, 9,
  9, 10, 13, 14, 13, 10,
  10, 11, 14, 15, 14, 11
]);

let _vertexCountTable = {
  [enums.SPRITE_SIMPLE]: 4,
  [enums.SPRITE_SLICED]: 16
};

let _indexCountTable = {
  [enums.SPRITE_SIMPLE]: 6,
  [enums.SPRITE_SLICED]: 54
};

class _RenderData extends RenderDataInterface {
  constructor(owner) {
    super();
    this._owner = owner;
  }

  getNode() {
    return this._owner._node;
  }

  getEffect() {
    return this._owner._effect;
  }

  getPositions() {
    return this._owner._positions;
  }

  getUVs() {
    return this._owner._uvs;
  }

  getIndices() {
    return this._owner._indices;
  }

  getColor() {
    return this._owner._color;
  }

  getVertexCount() {
    return this._owner.vertexCount;
  }

  getIndexCount() {
    return this._owner.indexCount;
  }

}

export default class SpriteRenderHelper {
  constructor() {
    this._width = _defaultWidth;
    this._height = _defaultHeight;
    this._pivotX = 0.0;
    this._pivotY = 0.0;
    this._sprite = null;
    this._node = null;
    this._effect = null;
    this._type = enums.SPRITE_SIMPLE;
    this._positions = null;
    this._uvs = null;
    this._color = color4.create();
    this._reallocVertexData();
    this._vertexDataDirty = true;
    this._texture = null;
    this._indices = _simpleSpriteIndices;

    this._renderData = new _RenderData(this);
  }

  setNode(node) {
    this._node = node;
  }

  setEffect(effect) {
    this._effect = effect;
  }

  _reallocVertexData() {
    let positions = this._positions = new Array(this.vertexCount);
    let uvs = this._uvs = new Array(this.vertexCount);
    for (let i = 0; i < this.vertexCount; ++i) {
      positions[i] = vec3.create();
      uvs[i] = vec3.create();
    }
  }

  set type(val) {
    if (this._type !== val) {
      this._type = val;
      this._indices = this._type === enums.SPRITE_SIMPLE ? _simpleSpriteIndices : _slicedSpriteIndices;
      this._reallocVertexData();
      this._vertexDataDirty = true;
    }
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

  set sprite(val) {
    this._sprite = val;
    this._texture = val._texture;
    // sprite is batched based on texture
    this._renderData.setBatchKey(this._texture._uuid);
    this._vertexDataDirty = true;
  }

  set color(val) {
    color4.copy(this._color, val);
  }

  get color() {
    return this._color;
  }

  get vertexCount() {
    return _vertexCountTable[this._type];
  }

  get indexCount() {
    return _indexCountTable[this._type];
  }

  get positions() {
    return this._positions;
  }

  get uvs() {
    return this._uvs;
  }

  getRenderDataCount() {
    return 1;
  }

  getRenderData(index) {
    if (index > 1) {
      return null;
    }
    return this._renderData;
  }

  updateModelData() {
    if (this._vertexDataDirty) {
      this._vertexDataDirty = false;
      if (this._type === enums.SPRITE_SIMPLE) {
        _generateSimpleSpriteVerts(this, this._sprite, this._width, this._height, this._pivotX, this._pivotY);
      } else if (this._type == enums.SPRITE_SLICED) {
        _generateSlicedSpriteVerts(this, this._sprite, this._width, this._height, this._pivotX, this._pivotY);
      } else {
      }
    }
  }

  destroy() {
    // reserved for tiled sprite which may use pools
  }

}