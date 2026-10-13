#version 300 es

// an attribute is an input (in) to a vertex shader.
// It will receive data from a buffer
in vec4 a_position;
in vec2 a_texcoord;
in vec3 a_normal;

out vec2 v_texcoord;
out vec3 v_normal;
out vec3 v_worldPosition;

// A matrix to transform the positions by
uniform mat4 model;
uniform mat4 view;
uniform mat4 projection;

// all shaders have a main function
void main() {
  // Multiply the position by the matrix.
  gl_Position = projection * view * model * a_position;
  v_texcoord = a_texcoord;
  v_normal = mat3(model) * a_normal;
  v_worldPosition = (model * a_position).xyz;
}
