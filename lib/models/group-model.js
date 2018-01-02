import { FixedArray } from 'memop';
import Model from '../scene/model';

export default class GroupModel extends Model {
  constructor() {
    super();

    this._type = 'group';
    this._models = new FixedArray(16);
  }

  get drawItemCount() {
    return 1;
  }
}