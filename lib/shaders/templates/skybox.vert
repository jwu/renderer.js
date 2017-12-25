attribute vec3 a_position;

uniform mat4 view;
uniform mat4 proj;

varying vec3 viewDir;

void main() {
  mat4 viewNoTrans = view;
  viewNoTrans[3][0] = viewNoTrans[3][1] = viewNoTrans[3][2] = 0.0;
  gl_Position = proj * viewNoTrans * vec4(a_position, 1.0);

  // Force skybox to far Z, regardless of the clip planes on the camera
  // Subtract a tiny fudge factor to ensure floating point errors don't
  // still push pixels beyond far Z. See:
  // http://www.opengl.org/discussion_boards/showthread.php/171867-skybox-problem

  gl_Position.z = gl_Position.w - 0.00001;
  viewDir = a_position;
}
