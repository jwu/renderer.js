import Model from '../scene/model';

export default class SkinningModel extends Model {
  constructor() {
    super();

    this._type = 'skinning';
    this._jointsTexture = null;
  }

  setJointsTexture(texture) {
    this._jointsTexture = texture;
  }
}