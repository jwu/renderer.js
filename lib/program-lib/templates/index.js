export default [
  {
    name: 'simple',
    vert: '\nattribute vec3 a_position;\nuniform mat4 model;\nuniform mat4 viewProj;\n#ifdef useTexture\n  attribute vec2 a_uv0;\n  varying vec2 uv0;\n#endif\nvoid main () {\n  vec4 pos = viewProj * model * vec4(a_position, 1);\n  #ifdef useTexture\n    uv0 = a_uv0;\n  #endif\n  gl_Position = pos;\n}',
    frag: '\n#ifdef useTexture\n  uniform sampler2D texture;\n  varying vec2 uv0;\n#endif\n#ifdef useColor\n  uniform vec4 color;\n#endif\nvoid main () {\n  vec4 o = vec4(1, 1, 1, 1);\n  #ifdef useTexture\n    o *= texture2D(texture, uv0);\n  #endif\n  #ifdef useColor\n    o *= color;\n  #endif\n  if (!gl_FrontFacing) {\n    o.rgb *= 0.5;\n  }\n  gl_FragColor = o;\n}',
    options: [
      { name: 'useTexture', },
      { name: 'useColor', },
    ],
  },
];