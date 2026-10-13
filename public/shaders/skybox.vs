#version 300 es
in vec3 a_position;

uniform mat4 view;
uniform mat4 projection;

out vec3 v_direction;

void main() {
  v_direction = a_position;
  vec4 position = projection * mat4(mat3(view)) * vec4(a_position, 1.0);
  gl_Position = position.xyww;
}
