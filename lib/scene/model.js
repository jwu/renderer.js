export default class Model {
  constructor() {
    this._type = 'default';
    this._poolID = -1;
    this._node = null;
    this._inputAssembler = null;
    this._effect = null;
    this._defines = {};
    this._viewID = -1;
    this._userKey = -1;

    // TODO: we calculate aabb based on vertices
    // this._aabb
  }

  setNode(node) {
    this._node = node;
  }

  setInputAssembler(ia) {
    this._inputAssembler = ia;
  }

  setEffect(effect) {
    if (effect) {
      this._effect = effect;
      this._defines = effect.extractDefines(Object.create(null));
    } else {
      this._effect = null;
      this._defines = Object.create(null);
    }
  }

  setUserKey(key) {
    this._userKey = key;
  }

  extractDrawItem(out) {
    out.model = this;
    out.node = this._node;
    out.ia = this._inputAssembler;
    out.effect = this._effect;
    out.defines = this._effect.extractDefines(this._defines);
  }
}