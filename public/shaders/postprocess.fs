#version 300 es
precision highp float;

in vec2 v_uv;

uniform sampler2D u_scene;
uniform vec2 u_texelSize;
uniform float u_kernel[9];
uniform float u_kernelWeight;

out vec4 outColor;

// Convolución 3x3: cada píxel es la suma ponderada de sus 8 vecinos y él mismo.
void main() {
  vec3 sum = vec3(0.0);
  for (int y = 0; y < 3; y++) {
    for (int x = 0; x < 3; x++) {
      vec2 offset = vec2(float(x - 1), float(y - 1)) * u_texelSize;
      sum += texture(u_scene, v_uv + offset).rgb * u_kernel[y * 3 + x];
    }
  }
  outColor = vec4(sum / u_kernelWeight, 1.0);
}
