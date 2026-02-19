#version 300 es

#define PI 3.14159265359

precision highp float;

uniform vec3 u_color;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;

out vec4 FragColor;


void main() {
  vec3 color = u_color;

  FragColor = vec4(color, 1.0);
}