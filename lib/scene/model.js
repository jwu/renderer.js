export default class Model {
  constructor() {
    this._type = 'default';
    this._poolID = -1;
    this._node = null;
    this._inputAssemblers = [];
    this._effects = [];
    this._defines = [];
    this._viewID = -1;

    // TODO: we calculate aabb based on vertices
    // this._aabb
  }

  get inputAssemblerCount() {
    return this._inputAssemblers.length;
  }

  get drawItemCount() {
    return this._inputAssemblers.length;
  }

  setNode(node) {
    this._node = node;
  }

  addInputAssembler(ia) {
    if (this._inputAssemblers.indexOf(ia) !== -1) {
      return;
    }
    this._inputAssemblers.push(ia);
  }

  clearInputAssemblers() {
    this._inputAssemblers.length = 0;
  }

  addEffect(effect) {
    if (this._effects.indexOf(effect) !== -1) {
      return;
    }
    this._effects.push(effect);

    //
    let defs = Object.create(null);
    effect.extractDefines(defs);
    this._defines.push(defs);
  }

  clearEffects() {
    this._effects.length = 0;
    this._defines.length = 0;
  }

  extractDrawItem(out, index) {
    out.model = this;
    out.node = this._node;

    if (index < this._inputAssemblers.length) {
      out.ia = this._inputAssemblers[index];
    } else {
      out.ia = null;
    }

    let effect, defines;
    if (index < this._effects.length) {
      effect = this._effects[index];
      defines = this._defines[index];
    } else {
      effect = this._effects[this._effects.length-1];
      defines = this._defines[this._effects.length-1];
    }
    out.effect = effect;
    out.defines = effect.extractDefines(defines);
  }
}