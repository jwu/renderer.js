varying vec3 viewDir;

uniform samplerCube cubeMap;

void main() {
    gl_FragColor = textureCube(cubeMap, viewDir);
}