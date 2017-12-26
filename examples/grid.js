'use strict';

window.createGrid = function (node, width, length, seg) {
  const {
    gfx, device, renderer
  } = window;

  const { color4 } = window.vmath;

  // create IA
  let vertices = [];
  let hw = width * 0.5;
  let hl = length * 0.5;
  let dw = width / seg;
  let dl = length / seg;

  for (let x = -hw; x <= hw; x += dw) {
    vertices.push(x, 0, -hl);
    vertices.push(x, 0, hl);
  }

  for (let z = -hl; z <= hl; z += dl) {
    vertices.push(-hw, 0, z);
    vertices.push(hw, 0, z);
  }

  let ia = renderer.createIA(device, {
    positions: vertices
  });
  ia._primitiveType = gfx.PT_LINES;

  // create effect
  // let program = new gfx.Program(device, {
  //   vert: `
  //     precision highp float;

  //     attribute vec3 a_position;
  //     uniform mat4 model, viewProj;

  //     void main() {
  //       vec4 pos = viewProj * model * vec4(a_position, 1);

  //       gl_Position = pos;
  //     }
  //   `,
  //   frag: `
  //     precision highp float;
  //     uniform vec4 color;

  //     void main () {
  //       gl_FragColor = color;
  //     }
  //   `,
  // });
  // program.link();

  let pass = new renderer.Pass('simple');
  pass.setDepth(true, true);
  let technique = new renderer.Technique(
    ['opaque'],
    [
      { name: 'color', type: renderer.PARAM_COLOR4, },
    ],
    [
      pass
    ]
  );
  let effect = new renderer.Effect(
    [
      technique
    ],
    {
      color: color4.new(0.4, 0.4, 0.4, 1.0),
    },
    [
      { name: 'USE_TEXTURE', value: false },
      { name: 'USE_COLOR', value: true },
    ]
  );

  let model = new renderer.Model();
  model.addInputAssembler(ia);
  model.addEffect(effect);
  model.setNode(node);

  return model;
};