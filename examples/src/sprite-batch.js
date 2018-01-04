(() => {
  const {
    device,
    resl,
    gfx,
    renderer,
    sgraph,
    orbit,
    forwardRenderer
  } = window;

  const { vec2, vec3, quat, color4, randomRange } = window.vmath;
  const indcies = [0, 1, 2, 3, 2, 1];

  // scene
  let scene = new renderer.Scene();

  // create effect
  let pass = new renderer.Pass('sprite');
  pass.setCullMode(gfx.CULL_NONE);
  pass.setDepth(true, false);
  pass.setBlend(
    gfx.BLEND_FUNC_ADD,
    gfx.BLEND_SRC_ALPHA, gfx.BLEND_ONE_MINUS_SRC_ALPHA,
    gfx.BLEND_FUNC_ADD,
    gfx.BLEND_ONE, gfx.BLEND_ONE
  );

  let technique = new renderer.Technique(
    ['transparent'],
    [
      { name: 'texture', type: renderer.PARAM_TEXTURE_2D },
    ],
    [pass]
  );
  let effect = new renderer.Effect(
    [technique],
    {
    },
    []
  );

  resl({
    manifest: {
      image: {
        type: 'image',
        src: './assets/sprite0.png'
      },
    },
    onDone (assets) {
      let image = assets.image;
      let texture = new gfx.Texture2D(device, {
        width : image.width,
        height: image.height,
        wrapS: gfx.WRAP_CLAMP,
        wrapT: gfx.WRAP_CLAMP,
        mipmap: true,
        images : [image]
      });
      effect.setProperty('texture', texture);
    }
  });

  let spriteBatchModel = new renderer.SpriteBatchModel();
  spriteBatchModel.setNode(new sgraph.Node('batched-sprites'));
  spriteBatchModel.setEffect(effect);
  scene.addModel(spriteBatchModel);

  // create grid
  let gridNode = new sgraph.Node('grid');
  let grid = window.createGrid(gridNode, 100, 100, 100 );
  scene.addModel(grid);

  // camera
  let camera = new renderer.Camera();
  camera.setColor(0.3, 0.3, 0.3, 1.0);
  camera.setNode(orbit._node);
  camera.setStages([
    'opaque',
    'transparent'
  ]);

  scene.addCamera(camera);

  let sprites = [];
  let w = 0.5;
  let h = 0.5;

  //
  for (let x = 0; x < 100; ++x) {
    for (let y = 0; y < 100; ++y) {
      let center = vec3.new(
        x - 50,
        10 * Math.sin((x + 50)/100 * Math.PI * 2.0),
        y - 50
      );
      let positions = [
        vec3.new(center.x - w, center.y - h, center.z),
        vec3.new(center.x + w, center.y - h, center.z),
        vec3.new(center.x - w, center.y + h, center.z),
        vec3.new(center.x + w, center.y + h, center.z),
      ];
      let uvs = [
        vec2.new(0.0, 0.0),
        vec2.new(1.0, 0.0),
        vec2.new(0.0, 1.0),
        vec2.new(1.0, 1.0),
      ];
      let color = color4.new(
        x / 100, y / 100, 1.0, 0.8
      );
      sprites.push({
        center,
        positions,
        uvs,
        color,
        indcies,
        sortKey: -1
      });
    }
  }

  // tick
  return function tick(dt) {
    let camRot = camera._node.getWorldRot(quat.create());
    let camPos = camera._node.getWorldPos(vec3.create());
    let camFwd = vec3.transformQuat(vec3.create(), vec3.new(0, 0, -1), camRot);
    vec3.normalize(camFwd, camFwd);
    let v3_tmp = vec3.create();

    // calculate zdist
    for (let i = 0; i < sprites.length; ++i) {
      let sprite = sprites[i];

      vec3.sub(v3_tmp, sprite.center, camPos);
      sprite.sortKey = vec3.dot(v3_tmp, camFwd);
    }

    let sortedSprites = sprites.sort((a, b) => {
      return b.sortKey - a.sortKey;
    });

    spriteBatchModel.clear();
    for (let i = 0; i < sortedSprites.length; ++i) {
      let sprite = sortedSprites[i];
      spriteBatchModel.addSprite(
        sprite.positions, sprite.uvs, sprite.color, sprite.indcies
      );
    }

    forwardRenderer.render(scene);
  };
})();