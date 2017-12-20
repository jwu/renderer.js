import gfx from 'gfx.js';

let _shdID = 0;

function _generateDefines(defs) {
  let defines = [];
  for (let def in defs) {
    if (defs[def] === true) {
      defines.push(`#define ${def}`);
    }
  }
  return defines.join('\n');
}

function _replaceMacroNums(string, defs) {
  let cache = {};
  let tmp = string;
  for (let def in defs) {
    if (Number.isInteger(defs[def])) {
      cache[def] = defs[def];
    }
  }
  for (let def in cache) {
    let reg = new RegExp(def, 'g');
    tmp = tmp.replace(reg, cache[def]);
  }
  return tmp;
}

function _unrollLoops(string) {
  let pattern = /#pragma for (\w+) in range\(\s*(\d+)\s*,\s*(\d+)\s*\)([\s\S]+?)#pragma endFor/g;
  function replace(match, index, begin, end, snippet) {
    let unroll = '';
    let parsedBegin = parseInt(begin);
    let parsedEnd = parseInt(end);
    if (parsedBegin.isNaN || parsedEnd.isNaN) {
      console.error('Unroll For Loops Error: begin and end of range must be an int num.');
    }
    for (let i = parsedBegin; i < parsedEnd; ++i) {
      unroll += snippet.replace(new RegExp(`{${index}}`, 'g'), i);
    }
    return unroll;
  }
  return string.replace(pattern, replace);
}

export default class ProgramLib {
  /**
   * @param {gfx.Device} device
   * @param {Array} templates
   * @param {Object} chunks
   */
  constructor(device, templates = [], chunks = {}) {
    this._device = device;
    this._precision = `precision highp float;\n`;

    // register templates
    this._templates = {};
    for (let i = 0; i < templates.length; ++i) {
      let tmpl = templates[i];
      this.define(tmpl.name, tmpl.vert, tmpl.frag, tmpl.defines);
    }

    // register chunks
    this._chunks = {};
    Object.assign(this._chunks, chunks);

    this._cache = {};
  }

  /**
   * @param {string} name
   * @param {string} template
   * @param {Array} options
   *
   * @example:
   *   programLib.define('foobar', vertTmpl, fragTmpl, [
   *     { name: 'shadow' },
   *     { name: 'lightCount', min: 1, max: 4 }
   *   ]);
   */
  define(name, vert, frag, defines) {
    if (this._templates[name]) {
      console.warn(`Failed to define shader ${name}: already exists.`);
      return;
    }

    let id = ++_shdID;

    // calculate option mask offset
    let offset = 0;
    for (let i = 0; i < defines.length; ++i) {
      let def = defines[i];
      def._offset = offset;

      let cnt = 1;

      if (def.min !== undefined && def.max !== undefined) {
        cnt = Math.ceil((def.max - def.min) * 0.5);

        def._map = function (value) {
          return (value - this._min) << def._offset;
        }.bind(def);
      } else {
        def._map = function (value) {
          if (value) {
            return 1 << def._offset;
          }
          return 0;
        }.bind(def);
      }

      offset += cnt;

      def._offset = offset;
    }

    vert = this._precision + vert;
    frag = this._precision + frag;

    // store it
    this._templates[name] = {
      id,
      name,
      vert,
      frag,
      defines
    };
  }

  /**
   * @param {string} name
   * @param {Object} options
   */
  getKey(name, defines) {
    let tmpl = this._templates[name];
    let key = 0;
    for (let i = 0; i < tmpl.defines.length; ++i) {
      let tmplDefs = tmpl.defines[i];
      let value = defines[tmplDefs.name];
      if (value === undefined) {
        continue;
      }

      key |= tmplDefs._map(value);
    }

    return key << 8 | tmpl.id;
  }

  /**
   * @param {string} name
   * @param {Object} options
   */
  getProgram(name, defines) {
    let key = this.getKey(name, defines);
    let program = this._cache[key];
    if (program) {
      return program;
    }

    // get template
    let tmpl = this._templates[name];
    let customDef = _generateDefines(defines) + '\n';
    let vert = _replaceMacroNums(tmpl.vert, defines);
    vert = customDef + _unrollLoops(vert);
    let frag = _replaceMacroNums(tmpl.frag, defines);
    frag = customDef + _unrollLoops(frag);

    program = new gfx.Program(this._device, {
      vert,
      frag
    });
    program.link();
    this._cache[key] = program;

    return program;
  }
}