#version 300 es

in vec4 a_position;
in vec2 a_texcoord;
in vec3 a_normal;

uniform mat4 model;
uniform mat4 view;
uniform mat4 projection;

out vec2 v_texcoord;
out vec3 v_normal;
out vec3 v_worldPosition;

void main() {
  vec4 worldPosition = model * a_position;
  gl_Position = projection * view * worldPosition;
  v_worldPosition = worldPosition.xyz;
  v_normal = mat3(model) * a_normal;
  v_texcoord = a_texcoord;
}
