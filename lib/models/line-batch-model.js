import { vec3, color3 } from 'vmath';
import { RecyclePool } from 'memop';

import Model from '../scene/model';

export default class LineBatchModel extends Model {
  constructor() {
    super();

    this._type = 'line-batch';
    this._lines = new RecyclePool(() => {
      return {
        start: vec3.create(),
        end: vec3.create(),
        color: color3.create(),
        normal: vec3.create(),
      };
    }, 2000);
  }

  get vertCount() {
    return this._lines.length * 2;
  }

  get lineCount() {
    return this._lines.length;
  }

  getLine(idx) {
    return this._lines.data[idx];
  }

  addLine(start, end, color, normal) {
    let line = this._lines.add();

    vec3.copy(line.start, start);
    vec3.copy(line.end, end);

    if (color) {
      color3.copy(line.color, color);
    }

    if (normal) {
      vec3.copy(line.normal, normal);
    }

    return line;
  }

  clear() {
    this._lines.reset();
  }
}
