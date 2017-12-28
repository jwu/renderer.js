import { RecyclePool } from 'memop';

import Model from '../scene/model';

export default class SpriteBatchModel extends Model {
  constructor() {
    super();

    this._type = 'sprite-batch';
    this.sprites = new RecyclePool(() => {
      return {
        refPositions: null,
        refUVs: null,
        refColor: null,
        refIndices: null,
      };
    }, 2000);

    this._vertCount = 0;
    this._indexCount = 0;
  }

  get drawItemCount() {
    return 1;
  }

  get vertCount() {
    return this._vertCount;
  }

  get indexCount() {
    return this._indexCount;
  }

  addSprite(positions, uvs, color, indices) {
    let sprite = this.sprites.add();

    sprite.refPositions = positions;
    sprite.refUVs = uvs;
    sprite.refColor = color;
    sprite.refIndices = indices;

    this._vertCount += positions.length;
    this._indexCount += indices.length;

    return sprite;
  }

  clear() {
    this.sprites.reset();

    this._vertCount = 0;
    this._indexCount = 0;
  }
}
