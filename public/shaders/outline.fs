#version 300 es
precision mediump float;

uniform vec3 u_outlineColor;

out vec4 outColor;

void main() {
  outColor = vec4(u_outlineColor, 1.0);
}
