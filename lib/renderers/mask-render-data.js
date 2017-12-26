import { color4, vec3 } from 'vmath';
import RenderDataInterface from './render-data-interface';

const _defaultWidth = 64;
const _defaultHeight = 64;
const _maskIndices = new Uint16Array([0, 1, 2, 3, 2, 1]);
const _dummyColor = color4.create();
let _dummyUVs = new Array(4);
_dummyUVs[0] = vec3.new(0, 0, 1);
_dummyUVs[1] = vec3.new(1, 0, 1);
_dummyUVs[2] = vec3.new(0, 1, 1);
_dummyUVs[3] = vec3.new(1, 1, 1);

class _RenderData extends RenderDataInterface {
  constructor(owner, index) {
    super();
    this._owner = owner;
    this._index = index;
  }

  getNode() {
    return this._owner._node;
  }

  getEffect() {
    return this._owner._effects[this._index];
  }

  getPositions() {
    return this._owner._positions;
  }

  getUVs() {
    return _dummyUVs;
  }

  getIndices() {
    return _maskIndices;
  }

  getColor() {
    return _dummyColor;
  }

  getVertexCount() {
    return 4;
  }

  getIndexCount() {
    return 6;
  }

}

export default class MaskRenderHelper {
  constructor() {
    this._width = _defaultWidth;
    this._height = _defaultHeight;
    this._pivotX = 0.0;
    this._pivotY = 0.0;
    this._node = null;
    this._effects = [null, null];
    let positions = this._positions = new Array(4);
    for (let i = 0; i < 4; ++i) {
      positions[i] = vec3.create();
    }

    positions[0].x = positions[2].x = 0;
    positions[1].x = positions[3].x = _defaultWidth;
    positions[0].y = positions[1].y = 0;
    positions[2].y = positions[3].y = _defaultHeight;

    this._uvs = _dummyUVs;
    this._color = _dummyColor;
    this._vertexDataDirty = true;
    this._indices = _maskIndices;

    this._renderDatas = [new _RenderData(this, 0), new _RenderData(this, 1)];
  }

  setNode(node) {
    this._node = node;
  }

  setEffect(effect, index) {
    this._effects[index] = effect;
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

  get color() {
    return this._color;
  }

  getRenderDataCount() {
    return 2;
  }

  getRenderData(index) {
    if (index > 2) {
      return null;
    }
    return this._renderDatas[index];
  }

  updateModelData() {
    if (this._vertexDataDirty) {
      this._vertexDataDirty = false;

      let xOffset = -this._pivotX * this._width;
      let yOffset = -this._pivotY * this._height;
      vec3.set(this._positions[0], 0 + xOffset, 0 + yOffset, 0);
      vec3.set(this._positions[1], this._width + xOffset, 0 + yOffset, 0);
      vec3.set(this._positions[2], 0 + xOffset, this._height + yOffset, 0);
      vec3.set(this._positions[3], this._width + xOffset, this._height + yOffset, 0);
    }
  }

}