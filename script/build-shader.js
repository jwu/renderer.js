'use strict';

const path_ = require('path');
const shdcLib = require('../bin/shdc-lib');

// ====================
// build
// ====================
let chunksCache = {};
let chunkPath = './lib/program-lib/chunks';
let chunksFile = path_.join(chunkPath, 'index.js');
console.log(`generate ${chunksFile}`);
shdcLib.buildChunks(chunksFile, chunkPath, chunksCache);

let tmplPath = './lib/program-lib/templates';
let tmplFile = path_.join(tmplPath, 'index.js');
console.log(`generate ${tmplFile}`);
shdcLib.buildTemplates(tmplFile, tmplPath, chunksCache);