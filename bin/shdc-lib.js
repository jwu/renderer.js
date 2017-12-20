'use strict';

const path_ = require('path');
const fs = require('fs');
const fsJetpack = require('fs-jetpack');
const tokenizer = require("glsl-tokenizer/string");

function unwindIncludes(str, chunks) {
  let pattern = /#include +<([\w\d\-_.]+)>/gm;
  function replace(match, include) {
    let replace = chunks[include];
    if (replace === undefined) {
      console.error(`can not resolve #include <${include}>`);
    }
    return unwindIncludes(replace);
  }
  return str.replace(pattern, replace);
}

function glslStripComment(code) {
  let tokens = tokenizer(code);

  let result = '';
  for (let i = 0; i < tokens.length; ++i) {
    let t = tokens[i];
    if (t.type != 'block-comment' && t.type != 'line-comment' && t.type != 'eof') {
      result += t.data;
    }
  }

  return result;
}

function filterEmptyLine(str) {
  return str !== '';
}

function buildChunks(dest, path, cache) {
  let files = fsJetpack.find(path, { matching: ['**/*.vert', '**/*.frag'] });
  let code = '';

  for (let i = 0; i < files.length; ++i) {
    let file = files[i];
    let content = fs.readFileSync(file, { encoding: 'utf8' });
    content = glslStripComment(content);
    content = content.replace(new RegExp('[\\r\\n]+', 'g'), '\\n');
    code += `  '${path_.basename(file)}': '${content}',\n`;
    cache[path_.basename(file)] = content;
  }
  code = `export default {\n${code}};`;

  fs.writeFileSync(dest, code, { encoding: 'utf8' });
}

function buildTemplates(dest, path, cache) {
  let files = fsJetpack.find(path, { matching: ['**/*.vert'] });
  let code = '';

  for (let i = 0; i < files.length; ++i) {
    let file = files[i];
    let dir = path_.dirname(file);
    let name = path_.basename(file, '.vert');

    let vert = fs.readFileSync(path_.join(dir, name + '.vert'), { encoding: 'utf8' });
    vert = glslStripComment(vert);
    vert = unwindIncludes(vert, cache);
    vert = vert.replace(new RegExp('[\\r\\n]+', 'g'), '\\n');
    vert = [vert].filter(filterEmptyLine);

    let frag = fs.readFileSync(path_.join(dir, name + '.frag'), { encoding: 'utf8' });
    frag = glslStripComment(frag);
    frag = unwindIncludes(frag, cache);
    frag = frag.replace(new RegExp('[\\r\\n]+', 'g'), '\\n');
    frag = [frag].filter(filterEmptyLine);

    let json = fs.readFileSync(path_.join(dir, name + '.json'), { encoding: 'utf8' });
    json = JSON.parse(json);
    let jsonDefs = json.defines;
    let defines = '';

    if (jsonDefs) {
      for (let i = 0; i < jsonDefs.length; ++i) {
        let def = jsonDefs[i].name;
        let defCode = '';
        defCode += `name: '${def}', `;
        defCode = `      { ${defCode}},\n`;
        defines += defCode;
      }
    }
    defines = `[\n${defines}    ],`;

    code += '  {\n';
    code += `    name: '${name}',\n`;
    code += `    vert: '${vert}',\n`;
    code += `    frag: '${frag}',\n`;
    code += `    defines: ${defines}\n`;
    code += '  },\n';
  }
  code = `export default [\n${code}];`;

  fs.writeFileSync(dest, code, { encoding: 'utf8' });
}

// ==================
// exports
// ==================

module.exports = {
  glslStripComment,
  buildChunks,
  buildTemplates,
};