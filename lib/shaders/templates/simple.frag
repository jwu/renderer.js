// precision highp float;

#ifdef USE_TEXTURE
  uniform sampler2D texture;
  varying vec2 uv0;
#endif

#ifdef USE_COLOR
  uniform vec4 color;
#endif

void main () {
  vec4 o = vec4(1, 1, 1, 1);

  #ifdef USE_TEXTURE
    o *= texture2D(texture, uv0);
  #endif

  #ifdef USE_COLOR
    o *= color;
  #endif

  if (!gl_FrontFacing) {
    o.rgb *= 0.5;
  }

  gl_FragColor = o;
}