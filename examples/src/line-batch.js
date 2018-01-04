(() => {
  const {
    gfx,
    renderer,
    sgraph,
    orbit,
    forwardRenderer,
  } = window;

  const { vec3, color3, randomRange } = window.vmath;

  // scene
  let scene = new renderer.Scene();

  // create effect
  let pass = new renderer.Pass('line');
  pass.setCullMode(gfx.CULL_FRONT);
  pass.setDepth(true, true);

  let technique = new renderer.Technique(
    ['opaque'],
    [],
    [pass]
  );
  let effect = new renderer.Effect(
    [technique],
    {},
    []
  );

  let lineBatchModel = new renderer.LineBatchModel();
  lineBatchModel.setNode(new sgraph.Node('debug-lines'));
  lineBatchModel.setEffect(effect);
  scene.addModel(lineBatchModel);

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
  ]);

  scene.addCamera(camera);

  let time = 0;
  let count = 0;

  // tick
  return function tick(dt) {
    time += dt;
    if (time > 5 * dt) {
      time = 0;
      if (++count > 50) {
        lineBatchModel.clear();
        count = 0;
        return;
      }
      for (let i = 0; i < 100; ++i) {
        lineBatchModel.addLine(
          vec3.new(randomRange(-10, 10), randomRange(-10, 10), randomRange(-10, 10)),
          vec3.new(randomRange(-10, 10), randomRange(-10, 10), randomRange(-10, 10)),
          color3.new(randomRange(0, 1), randomRange(0, 1), randomRange(0, 1))
        );
      }
    }

    forwardRenderer.render(scene);
  };
})();