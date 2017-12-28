(() => {
  const {
    gfx,
    renderer,
    sgraph,
  } = window;
  const { vec3, color3, randomRange } = window.vmath;

  const orbit = window.orbit;
  const forwardRenderer = window.forwardRenderer;

  renderer.addStage('opaque');

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

  let linesModel = new renderer.LineBatchModel();
  linesModel.setNode(new sgraph.Node('debug-lines'));
  linesModel.addEffect(effect);

  // scene
  let scene = new renderer.Scene();
  scene.addModel(linesModel);

  // camera
  let camera = new renderer.Camera();
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
        linesModel.clear();
        count = 0;
        return;
      }
      for (let i = 0; i < 100; ++i) {
        linesModel.addLine(vec3.new(randomRange(-100, 0), randomRange(-100, 100), randomRange(-100, 100)), vec3.new(randomRange(0, 100), randomRange(-100, 100), randomRange(-100, 100)), color3.new(randomRange(0, 1), randomRange(0, 1), randomRange(0, 1)));
      }
    }

    forwardRenderer.render(scene);
  };
})();