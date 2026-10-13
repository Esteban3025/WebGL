#version 300 es
precision highp float;

in vec2 v_texcoord;
in vec3 v_normal;
in vec3 v_worldPosition;

uniform sampler2D u_diffuseMap;
uniform sampler2D u_specularMap;
uniform sampler2D u_normalMap;
uniform sampler2D u_emissiveMap;
uniform bool u_hasSpecularMap;
uniform bool u_hasNormalMap;
uniform bool u_hasEmissiveMap;
uniform vec3 u_materialColor;

uniform int u_lightCount;
uniform int u_lightTypes[8];
uniform vec3 u_lightPositions[8];
uniform vec3 u_lightDirections[8];
uniform vec3 u_lightColors[8];
uniform float u_lightIntensities[8];

out vec4 outColor;

void main() {
  vec3 normal = normalize(v_normal);
  if (u_hasNormalMap) {
    vec3 mappedNormal = texture(u_normalMap, v_texcoord).xyz * 2.0 - 1.0;
    normal = normalize(mix(normal, mappedNormal, 0.5));
  }
  vec3 baseColor = texture(u_diffuseMap, v_texcoord).rgb * u_materialColor;
  vec3 specularColor = u_hasSpecularMap
    ? texture(u_specularMap, v_texcoord).rgb
    : vec3(0.35);
  vec3 viewDirection = normalize(-v_worldPosition);
  vec3 result = vec3(0.0);

  for (int i = 0; i < 8; i++) {
    if (i >= u_lightCount) break;
    if (u_lightTypes[i] == 0) {
      result += baseColor * u_lightColors[i] * u_lightIntensities[i];
      continue;
    }

    vec3 lightDirection = u_lightTypes[i] == 1
      ? normalize(-u_lightDirections[i])
      : normalize(u_lightPositions[i] - v_worldPosition);
    float diffuse = max(dot(normal, lightDirection), 0.0);
    vec3 halfway = normalize(lightDirection + viewDirection);
    float specular = pow(max(dot(normal, halfway), 0.0), 32.0);
    float attenuation = u_lightTypes[i] == 2
      ? 1.0 / (1.0 + 0.02 * distance(v_worldPosition, u_lightPositions[i]))
      : 1.0;
    result += (baseColor * diffuse + specularColor * specular)
      * u_lightColors[i] * u_lightIntensities[i] * attenuation;
  }

  if (u_hasEmissiveMap) {
    result += texture(u_emissiveMap, v_texcoord).rgb;
  }
  outColor = vec4(result, 1.0);
}
