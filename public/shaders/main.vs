#version 300 es

// an attribute is an input (in) to a vertex shader.
// It will receive data from a buffer
in vec4 a_position;
in vec3 a_normal;

// A matrix to transform the positions by
uniform mat4 model;
uniform mat4 view;
uniform mat4 projection;

// a varying the color to the fragment shader
out vec3 v_normal;

// all shaders have a main function
void main() {
  // Multiply the position by the matrix.
  gl_Position = projection * view * model * a_position;

  // Make the normal always 
  v_normal = mat3(model) * a_normal;
}