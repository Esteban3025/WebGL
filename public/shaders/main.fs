#version 300 es

precision highp float;

// the varied color passed from the vertex shader
in vec3 v_normal;

uniform vec3 u_reverseLightDirection;
uniform vec4 u_color;

// we need to declare an output for the fragment shader
out vec4 outColor;

void main() {
  vec3 normal = normalize(v_normal);

  float light = dot(normal, u_reverseLightDirection);

  outColor = u_color;

  outColor.rgb *= light;
}