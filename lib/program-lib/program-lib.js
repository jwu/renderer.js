import gfx from 'gfx.js';
import builtinChunks from './chunks/index.js';
import builtinTemplates from './templates/index.js';

let _shdID = 0;

function _generateDefines(options) {
  let defines = [];
  for (let opt in options) {
    if (options[opt] === true) {
      defines.push(`#define ${opt}`);
    }
  }
  return defines.join('\n');
}

function _replaceMacroNums(string, options) {
  return string
    .replace(/NUM_DIR_LIGHTS/g, options['directionalLightNum'])
    .replace(/NUM_SPOT_LIGHTS/g, options['spotLightNum'])
    .replace(/NUM_POINT_LIGHTS/g, options['pointLightNum'])
    .replace(/NUM_SHADOW_LIGHTS/g, options['shadowLightNum'])
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
      unroll += snippet.replace(new RegExp(`{{${index}}}`, 'g'), i);
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
    for (let i = 0; i < builtinTemplates.length; ++i) {
      let tmpl = builtinTemplates[i];
      this.define(tmpl.name, tmpl.vert, tmpl.frag, tmpl.options);
    }
    for (let i = 0; i < templates.length; ++i) {
      let tmpl = templates[i];
      this.define(tmpl.name, tmpl.vert, tmpl.frag, tmpl.options);
    }

    // register chunks
    this._chunks = {};
    Object.assign(this._chunks, builtinChunks);
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
  define(name, vert, frag, options) {
    if (this._templates[name]) {
      console.warn(`Failed to define shader ${name}: already exists.`);
      return;
    }

    let id = ++_shdID;

    // calculate option mask offset
    let offset = 0;
    for (let i = 0; i < options.length; ++i) {
      let op = options[i];
      op._offset = offset;

      let cnt = 1;

      if (op.min !== undefined && op.max !== undefined) {
        cnt = Math.ceil((op.max - op.min) * 0.5);

        op._map = function (value) {
          return (value - this._min) << op._offset;
        }.bind(op);
      } else {
        op._map = function (value) {
          if (value) {
            return 1 << op._offset;
          }
          return 0;
        }.bind(op);
      }

      offset += cnt;

      op._offset = offset;
    }

    vert = this._precision + vert;
    frag = this._precision + frag;

    // store it
    this._templates[name] = {
      id,
      name,
      vert,
      frag,
      options
    };
  }

  /**
   * @param {string} name
   * @param {Object} options
   */
  getKey(name, options) {
    let tmpl = this._templates[name];
    let key = 0;
    for (let i = 0; i < tmpl.options.length; ++i) {
      let tmplOpts = tmpl.options[i];
      let value = options[tmplOpts.name];
      if (value === undefined) {
        continue;
      }

      key |= tmplOpts._map(value);
    }

    return key << 8 | tmpl.id;
  }

  /**
   * @param {string} name
   * @param {Object} options
   */
  getProgram(name, options) {
    let key = this.getKey(name, options);
    let program = this._cache[key];
    if (program) {
      return program;
    }

    // get template
    let tmpl = this._templates[name];
    let customDef = _generateDefines(options) + '\n';
    let vert = _replaceMacroNums(tmpl.vert, options);
    vert = customDef + _unrollLoops(vert);
    let frag = _replaceMacroNums(tmpl.frag, options);
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