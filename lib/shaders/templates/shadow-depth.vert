attribute vec3 a_position;

uniform mat4 model;
uniform mat4 lightViewProjMatrix;
uniform float minDepth;
uniform float maxDepth;
uniform float bias;
varying float vDepth;

void main() {
  gl_Position = lightViewProjMatrix * model * vec4(a_position, 1.0);
  // compute vDepth according to active camera's minDepth and maxDepth.
  vDepth = ((gl_Position.z + minDepth) / (minDepth + maxDepth)) + bias;
}