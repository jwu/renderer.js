import { utils } from 'scene-graph';
import { vec3, quat, mat4 } from 'vmath';

export default class Skeleton {
  constructor() {
    this._root = null;
    this._joints = null;
    this._matrices = null;
  }

  setRoot(root) {
    this._root = root;
    this._joints = utils.flat(this._root);
    this._matrices = new Array(this._joints.length);

    for (let i = 0; i < this._joints.length; ++i) {
      this._matrices[i] = mat4.create();
    }
    this.updateMatrices();
  }

  blend(fromSkel, toSkel, alpha) {
    for (let i = 0; i < this._joints.length; ++i) {
      let joint = this._joints[i];
      let jointFrom = fromSkel._joints[i];
      let jointTo = toSkel._joints[i];

      vec3.lerp(joint.lpos, jointFrom.lpos, jointTo.lpos, alpha);
      vec3.lerp(joint.lscale, jointFrom.lscale, jointTo.lscale, alpha);
      quat.slerp(joint.lrot, jointFrom.lrot, jointTo.lrot, alpha);
    }
  }

  updateMatrices() {
    for (let i = 0; i < this._joints.length; ++i) {
      this._joints[i].getWorldMatrix(this._matrices[i]);
    }
  }

  getWorldMatrix(i) {
    return this._matrices[i];
  }

  clone() {
    let newSkeleton = new Skeleton();
    newSkeleton.setRoot(utils.deepClone(this._root));

    return newSkeleton;
  }
}