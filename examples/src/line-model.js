(() => {
  const {
    device,
    gfx,
    renderer,
    primitives,
    sgraph,
  } = window;
  const { vec3, color3, quat, randomRange } = window.vmath;

  const orbit = window.orbit;
  const forwardRenderer = window.forwardRenderer;

  renderer.addStage('opaque');

  // create effect
  let pass = new renderer.Pass('line');
  // pass.setDepth(true, true);
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

  // models
  for (let i = 0; i < 100; ++i) {
    linesModel.addLine(vec3.new(0, 10 * i, 0), vec3.new(100, 10 * i, 0), color3.new(1, 1, 1));
  }


  // camera
  let camera = new renderer.Camera();
  camera.setNode(orbit._node);
  camera.setStages([
    'opaque',
  ]);

  scene.addCamera(camera);

  let time = 0;

  // tick
  return function tick(dt) {
    time += dt;
    forwardRenderer.render(scene);
  };
})();