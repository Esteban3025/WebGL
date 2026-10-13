#version 300 es

precision highp float;

uniform vec4 u_color;
in vec2 v_texcoord;
in vec3 v_normal;
in vec3 v_worldPosition;

// we need to declare an output for the fragment shader
out vec4 outColor;
uniform sampler2D u_texture;
uniform int u_lightCount;
uniform int u_lightTypes[8];
uniform vec3 u_lightPositions[8];
uniform vec3 u_lightDirections[8];
uniform vec3 u_lightColors[8];
uniform float u_lightIntensities[8];

void main() {

  vec3 normal = normalize(v_normal);
  vec3 lighting = vec3(0.0);
  for (int i = 0; i < 8; i++) {
    if (i >= u_lightCount) break;
    if (u_lightTypes[i] == 0) {
      lighting += u_lightColors[i] * u_lightIntensities[i];
    } else {
      vec3 lightDirection = u_lightTypes[i] == 1
        ? normalize(-u_lightDirections[i])
        : normalize(u_lightPositions[i] - v_worldPosition);
      float diffuse = max(dot(normal, lightDirection), 0.0);
      float attenuation = u_lightTypes[i] == 2
        ? 1.0 / (1.0 + 0.02 * distance(v_worldPosition, u_lightPositions[i]))
        : 1.0;
      lighting += u_lightColors[i] * diffuse * attenuation * u_lightIntensities[i];
    }
  }
  outColor = texture(u_texture, v_texcoord) * vec4(lighting, 1.0);
}
