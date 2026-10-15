#version 300 es

in vec3 a_position;
in vec3 a_normal;

uniform mat4 model;
uniform mat4 view;
uniform mat4 projection;
uniform float u_outlineWidth;

void main() {
  // Se extruye en espacio de mundo para que el grosor sea independiente de la escala del objeto.
  vec3 worldNormal = normalize(mat3(model) * a_normal);
  vec3 worldPosition = (model * vec4(a_position, 1.0)).xyz + worldNormal * u_outlineWidth;
  gl_Position = projection * view * vec4(worldPosition, 1.0);
}
