attribute vec3 a_position;
uniform mat4 model;
uniform mat4 viewProj;

attribute vec2 a_uv0;
attribute vec4 a_color;
varying vec2 uv0;
varying vec4 color;

void main () {
  vec4 pos = vec4(a_position, 1);

  pos = model * viewProj * pos;

  vec4 uv = vec4(a_uv0, 0, 1);
  uv0 = uv.xy;

  color = a_color;

  gl_Position = pos;
}