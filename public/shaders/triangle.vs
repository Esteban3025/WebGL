#version 300 es

// an attribute is an input (in) to a vertex shader.
// It will receive data from a buffer
in vec4 a_position;

// A matrix to transform the positions by
uniform mat4 model;
uniform mat4 view;
uniform mat4 projection;

// all shaders have a main function
void main() {
  // Multiply the position by the matrix.
  gl_Position = projection * view * model * a_position;

}