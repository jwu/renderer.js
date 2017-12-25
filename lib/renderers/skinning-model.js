import Model from '../core/scene/model';
import { mat4 } from 'vmath';

let _m4_tmp = mat4.create();

export default class SkinningModel extends Model {
  constructor() {
    super();

    // set from skinning
    this._jointIndices = null;
    this._bindposes = null;

    // cloned from skinning
    this._skeleton = null;

    // caches
    this._jointsTexture = null;
    this._data = null;
    this._updateOpts = null;
  }

  setSkinning(skinning) {
    this._jointIndices = skinning.jointIndices;
    this._bindposes = skinning.bindposes;
  }

  setSkeleton(skeleton) {
    this._skeleton = skeleton;
  }

  setJointsTexture(texture) {
    if ( this._jointsTexture ) {
      this._jointsTexture.destroy();
    }

    this._jointsTexture = texture;

    if (this._jointsTexture) {
      this._updateCaches();
    }
  }

  destroy() {
    if (this._jointsTexture) {
      this._jointsTexture.destroy();
    }
  }

  _updateCaches() {
    const texture = this._jointsTexture;

    // resize data
    this._data = new Float32Array(texture._width * texture._height * 4);

    // update texture opts
    this._updateOpts = {
      x: 0,
      y: 0,
      width: texture._width,
      height: texture._height,
      level: 0,
      image: this._data,
    };
  }

  updateMatrices() {
    const texture = this._jointsTexture;

    for (let i = 0; i < this._jointIndices.length; ++i) {
      let bindpose = this._bindposes[i];
      let idx = this._jointIndices[i];

      let worldMatrix = this._skeleton.getWorldMatrix(idx);
      mat4.multiply(_m4_tmp, worldMatrix, bindpose);

      this._data[16 * i + 0]  = _m4_tmp.m00;
      this._data[16 * i + 1]  = _m4_tmp.m01;
      this._data[16 * i + 2]  = _m4_tmp.m02;
      this._data[16 * i + 3]  = _m4_tmp.m03;
      this._data[16 * i + 4]  = _m4_tmp.m04;
      this._data[16 * i + 5]  = _m4_tmp.m05;
      this._data[16 * i + 6]  = _m4_tmp.m06;
      this._data[16 * i + 7]  = _m4_tmp.m07;
      this._data[16 * i + 8]  = _m4_tmp.m08;
      this._data[16 * i + 9]  = _m4_tmp.m09;
      this._data[16 * i + 10] = _m4_tmp.m10;
      this._data[16 * i + 11] = _m4_tmp.m11;
      this._data[16 * i + 12] = _m4_tmp.m12;
      this._data[16 * i + 13] = _m4_tmp.m13;
      this._data[16 * i + 14] = _m4_tmp.m14;
      this._data[16 * i + 15] = _m4_tmp.m15;
    }

    texture.updateSubImage(this._updateOpts);
  }
}