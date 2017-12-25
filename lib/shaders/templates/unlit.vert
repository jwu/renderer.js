attribute vec3 a_position;

uniform mat4 model;
uniform mat4 viewProj;

#ifdef USE_TEXTURE
  attribute vec2 a_uv0;
  varying vec2 uv0;
#endif

#ifdef USE_SKINNING
  #include <skinning.vert>
#endif

void main () {
  vec4 pos = vec4(a_position, 1);

  #ifdef USE_SKINNING
    pos = skinMatrix() * pos;
  #endif

  pos = viewProj * model * pos;

  #ifdef USE_TEXTURE
    uv0 = a_uv0;
  #endif

  gl_Position = pos;
}