import { vec3, color3 } from 'vmath';
import { RecyclePool } from 'memop';
import Model from '../core/scene/model';

export default class LinesModel extends Model {
  constructor() {
    super();

    this._dynamicIA = true;
    this.lines = new RecyclePool(() => {
      return {
        start: vec3.create(),
        end: vec3.create(),
        color: color3.create(),
        normal: vec3.create(),
      };
    }, 2000);
  }

  addLine(start, end, color, normal) {
    let line = this.lines.add();

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
    this.lines.reset();
  }
}
