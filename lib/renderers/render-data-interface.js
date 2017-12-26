const _doNotBatchKey = -1;

export default class RenderDataInterface {
  constructor() {
    // mutable value for rendering
    this._multiplyTransform = false;
    this._ia = null;
    // default do not support batch at all, it could be a value or a string(uuid)
    this._batchKey = _doNotBatchKey;
  }

  // test batch with another renderdata
  batchTest(another) {
    return another && this._multiplyTransform && another._multiplyTransform && (this._batchKey !== _doNotBatchKey) && (this._batchKey === another._batchKey);
  }

  // reset batch key to _doNotBatchKey
  resetBatchKey() {
    this._batchKey = _doNotBatchKey;
  }

  setBatchKey(key) {
    this._batchKey = key;
  }
  // should return a graph node
  getNode() {
    return null;
  }

  // should return an effect, generally only a pass is needed here
  getEffect() {
    return null;
  }

  // should return an array
  getPositions() {
    return null;
  }

  // should return an array
  getUVs() {
    return null;
  }

  // should return an array
  getIndices() {
    return null;
  }

  // should return a color4
  getColor() {
    return null;
  }

  // return vertex count here
  getVertexCount() {
    return 0;
  }

  // return index count here
  getIndexCount() {
    return 0;
  }

  // apply stencil state
  setStencil(func, ref, mask, failOp, zFailOp, zPassOp, writeMask) {
    let effect = this.getEffect();
    let technique = effect && effect.getTechnique('2d');
    let pass = technique && technique.passes && technique.passes[0];
    if (pass) {
      pass.setStencilFront(func, ref, mask, failOp, zFailOp, zPassOp, writeMask);
      pass.setStencilBack(func, ref, mask, failOp, zFailOp, zPassOp, writeMask);
    }
  }

  disableStencil() {
    let effect = this.getEffect();
    let technique = effect && effect.getTechnique('2d');
    let pass = technique && technique.passes && technique.passes[0];
    if (pass) {
      pass._stencilTest = false;
    }
  }

}
