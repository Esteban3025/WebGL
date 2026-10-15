// Formato de vértice compartido por todos los objetos (24 bytes):
//   0  float32 x3     posición
//   12 int 2_10_10_10 normal (normalizada)
//   16 float32 x2     uv
export const VERTEX_WORDS = 6;
export const VERTEX_STRIDE = VERTEX_WORDS * 4;

// Ubicaciones fijas: los VAO no dependen del programa que los dibuje.
export const ATTRIBUTE_LOCATIONS = {
  a_position: 0,
  a_normal: 1,
  a_texcoord: 2,
};

export function packNormal(x, y, z) {
  const length = Math.hypot(x, y, z) || 1;
  const quantize = (value) =>
    Math.round(Math.max(-1, Math.min(1, value / length)) * 511) & 0x3ff;
  return (quantize(x) | (quantize(y) << 10) | (quantize(z) << 20)) >>> 0;
}

export function setupVertexArray(gl, vertexBuffer, indexBuffer) {
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.enableVertexAttribArray(ATTRIBUTE_LOCATIONS.a_position);
  gl.vertexAttribPointer(ATTRIBUTE_LOCATIONS.a_position, 3, gl.FLOAT, false, VERTEX_STRIDE, 0);
  gl.enableVertexAttribArray(ATTRIBUTE_LOCATIONS.a_normal);
  gl.vertexAttribPointer(ATTRIBUTE_LOCATIONS.a_normal, 4, gl.INT_2_10_10_10_REV, true, VERTEX_STRIDE, 12);
  gl.enableVertexAttribArray(ATTRIBUTE_LOCATIONS.a_texcoord);
  gl.vertexAttribPointer(ATTRIBUTE_LOCATIONS.a_texcoord, 2, gl.FLOAT, false, VERTEX_STRIDE, 16);
  if (indexBuffer) gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bindVertexArray(null);
  return vao;
}

// Esfera envolvente (centro + radio) de un rango de posiciones dentro de un
// buffer de vértices ya empaquetado.
export function computeBounds(words, firstVertex, vertexCount) {
  const floats = words instanceof Float32Array ? words : new Float32Array(words.buffer);
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let v = firstVertex; v < firstVertex + vertexCount; v++) {
    for (let axis = 0; axis < 3; axis++) {
      const value = floats[v * VERTEX_WORDS + axis];
      if (value < min[axis]) min[axis] = value;
      if (value > max[axis]) max[axis] = value;
    }
  }
  if (vertexCount === 0) return { center: [0, 0, 0], radius: 0 };
  const center = [
    (min[0] + max[0]) / 2,
    (min[1] + max[1]) / 2,
    (min[2] + max[2]) / 2,
  ];
  const radius = Math.hypot(max[0] - center[0], max[1] - center[1], max[2] - center[2]);
  return { center, radius };
}

// Convierte arrays planos (como los del suelo) al formato de vértice común.
export function packGeometry(vertices, normals = null, texcoords = null) {
  const count = vertices.length / 3;
  const data = new Float32Array(count * VERTEX_WORDS);
  const words = new Uint32Array(data.buffer);
  for (let i = 0; i < count; i++) {
    const base = i * VERTEX_WORDS;
    const x = vertices[i * 3];
    const y = vertices[i * 3 + 1];
    data[base] = x;
    data[base + 1] = y;
    data[base + 2] = vertices[i * 3 + 2];
    words[base + 3] = normals
      ? packNormal(normals[i * 3], normals[i * 3 + 1], normals[i * 3 + 2])
      : packNormal(0, 0, 1);
    data[base + 4] = texcoords ? texcoords[i * 2] : (x + 1) / 2;
    data[base + 5] = texcoords ? texcoords[i * 2 + 1] : (y + 1) / 2;
  }
  return { data, vertexCount: count };
}
