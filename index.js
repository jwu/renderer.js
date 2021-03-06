import enums from './lib/enums';
import { createIA } from './lib/utils';
import config from './lib/config';

import Pass from './lib/core/pass';
import Technique from './lib/core/technique';
import Effect from './lib/core/effect';
import InputAssembler from './lib/core/input-assembler';
import View from './lib/core/view';

import Light from './lib/scene/light';
import Camera from './lib/scene/camera';
import Model from './lib/scene/model';
import Scene from './lib/scene/scene';

import LineBatchModel from './lib/models/line-batch-model';
import SpriteBatchModel from './lib/models/sprite-batch-model';
import SkinningModel from './lib/models/skinning-model';

import ForwardRenderer from './lib/renderers/forward-renderer';
import MaskRenderHelper from './lib/renderers/mask-render-data';

let renderer = {
  // config
  addStage: config.addStage,

  // utils
  createIA,

  // core
  Pass,
  Technique,
  Effect,
  InputAssembler,
  View,

  // scene
  Light,
  Camera,
  Model,
  Scene,

  // models
  LineBatchModel,
  SpriteBatchModel,
  SkinningModel,

  // renderers
  ForwardRenderer,
  LabelRenderHelper,
  MaskRenderHelper,
};
Object.assign(renderer, enums);

export default renderer;