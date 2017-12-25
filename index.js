import enums from './lib/enums';
import { createIA } from './lib/utils';
import config from './lib/config';

import Pass from './lib/core/renderer/pass';
import Technique from './lib/core/renderer/technique';
import Effect from './lib/core/renderer/effect';
import InputAssembler from './lib/core/renderer/input-assembler';
import View from './lib/core/renderer/view';

import Light from './lib/core/scene/light';
import Camera from './lib/core/scene/camera';
import Model from './lib/core/scene/model';
import Scene from './lib/core/scene/scene';

import Base from './lib/core/renderer/base';
import ProgramLib from './lib/core/program-lib/program-lib';

import ForwardRenderer from './lib/renderers/forward-renderer';
import shaderChunks from './lib/shaders/chunks/index';
import shaderTemplates from './lib/shaders/templates/index';

let renderer = {
  // config
  addStage: config.addStage,

  // utils
  createIA,

  // classes
  Pass,
  Technique,
  Effect,
  InputAssembler,
  View,

  Light,
  Camera,
  Model,
  Scene,

  Base,
  ProgramLib,

  ForwardRenderer,
  shaderChunks,
  shaderTemplates,
};
Object.assign(renderer, enums);

export default renderer;