import config from '../config';

export default class Effect {
  /**
   * @param {Array} techniques
   */
  constructor(techniques, properties = {}, defines = []) {
    this._techniques = techniques;
    this._properties = properties;
    this._defines = defines;

    // TODO: check if params is valid for current technique???
  }

  clear() {
    this._techniques.length = 0;
    this._properties = null;
    this._defines.length = 0;
  }

  getTechnique(stage) {
    let stageID = config.stageID(stage);
    for (let i = 0; i < this._techniques.length; ++i) {
      let tech = this._techniques[i];
      if (tech.stageIDs & stageID) {
        return tech;
      }
    }

    return null;
  }

  getProperty(name) {
    return this._properties[name];
  }

  setProperty(name, value) {
    // TODO: check if params is valid for current technique???
    this._properties[name] = value;
  }

  getDefine(name) {
    for (let i = 0; i < this._defines.length; ++i) {
      let def = this._defines[i];
      if ( def.name === name ) {
        return def.value;
      }
    }

    console.warn(`Failed to get define ${name}, define not found.`);
    return null;
  }

  define(name, value) {
    for (let i = 0; i < this._defines.length; ++i) {
      let def = this._defines[i];
      if ( def.name === name ) {
        def.value = value;
        return;
      }
    }

    console.warn(`Failed to set define ${name}, define not found.`);
  }

  extractDefines(out = {}) {
    for (let i = 0; i < this._defines.length; ++i) {
      let def = this._defines[i];
      out[def.name] = def.value;
    }

    return out;
  }
}