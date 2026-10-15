import { mat3, mat4 } from "../../dist/esm/index.js";
import { VERTEX_WORDS, computeBounds, packNormal } from "../lib/VertexFormat.js";

const DEFAULT_MATERIAL = { color: [1, 1, 1], textures: {} };
const SLOTS = ["diffuse", "specular", "normal", "emissive"];

const scratchFloats = new Float32Array(VERTEX_WORDS);
const scratchWords = new Uint32Array(scratchFloats.buffer);

function hashWords(words, base) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < VERTEX_WORDS; i++) hash = Math.imul(hash ^ words[base + i], 0x01000193);
  hash ^= hash >>> 15;
  hash = Math.imul(hash, 0x2c1b3c6d);
  return hash ^ (hash >>> 12);
}

// Acumula los vértices e índices de un material y elimina vértices duplicados
// con una tabla hash de direccionamiento abierto.
class VertexCollector {
  constructor(material) {
    this.material = material;
    this.capacity = 1024;
    this.words = new Uint32Array(this.capacity * VERTEX_WORDS);
    this.count = 0;
    this.table = new Int32Array(2048).fill(-1);
    this.indices = new Uint32Array(3072);
    this.indexCount = 0;
  }

  // Inserta el vértice de `scratchWords` (o reutiliza uno idéntico) y devuelve su índice.
  addVertex() {
    const mask = this.table.length - 1;
    let slot = hashWords(scratchWords, 0) & mask;
    for (let found = this.table[slot]; found !== -1; found = this.table[slot]) {
      const base = found * VERTEX_WORDS;
      let same = true;
      for (let i = 0; i < VERTEX_WORDS; i++) {
        if (this.words[base + i] !== scratchWords[i]) { same = false; break; }
      }
      if (same) return this.pushIndex(found);
      slot = (slot + 1) & mask;
    }

    if (this.count === this.capacity) {
      this.capacity *= 2;
      const grown = new Uint32Array(this.capacity * VERTEX_WORDS);
      grown.set(this.words);
      this.words = grown;
    }
    this.words.set(scratchWords, this.count * VERTEX_WORDS);
    this.table[slot] = this.count++;
    if (this.count * 2 > this.table.length) this.rehash();
    return this.pushIndex(this.count - 1);
  }

  pushIndex(index) {
    if (this.indexCount === this.indices.length) {
      const grown = new Uint32Array(this.indices.length * 2);
      grown.set(this.indices);
      this.indices = grown;
    }
    this.indices[this.indexCount++] = index;
  }

  rehash() {
    this.table = new Int32Array(this.table.length * 2).fill(-1);
    const mask = this.table.length - 1;
    for (let v = 0; v < this.count; v++) {
      let slot = hashWords(this.words, v * VERTEX_WORDS) & mask;
      while (this.table[slot] !== -1) slot = (slot + 1) & mask;
      this.table[slot] = v;
    }
  }
}

const round = (value) => Math.round(value * 1e4) / 1e4;

function materialKey(material) {
  const textures = SLOTS.map((slot) => material.textures[slot] || "");
  return `${textures.join("|")}|${material.color.map(round).join(",")}`;
}

/**
 * Fusiona todas las mallas de un modelo en un único buffer de vértices e
 * índices indexados, agrupados por material. Cada material resultante es un
 * rango contiguo del índice: un draw call por material.
 *
 * meshes[i].materials[j] = { color: [r,g,b], textures: { slot: textureKey } }
 */
export function buildMesh(meshes) {
  const collectors = new Map();
  const collectorFor = (material) => {
    const key = materialKey(material);
    if (!collectors.has(key)) collectors.set(key, new VertexCollector(material));
    return collectors.get(key);
  };

  const world = [new Float32Array(3), new Float32Array(3), new Float32Array(3)];
  const normal = new Float32Array(3);
  const normalMatrix = mat3.create();

  for (const mesh of meshes) {
    const { matrix, positions, normals, uvs, triangleMaterials } = mesh;
    if (!mat3.normalFromMat4(normalMatrix, matrix)) mat3.fromMat4(normalMatrix, matrix);
    const mirrored = mat4.determinant(matrix) < 0;
    const order = mirrored ? [0, 2, 1] : [0, 1, 2];
    const slotCollectors = (mesh.materials.length ? mesh.materials : [DEFAULT_MATERIAL]).map(collectorFor);
    const triangles = positions.length / 9;

    for (let t = 0; t < triangles; t++) {
      const collector = slotCollectors[Math.min(triangleMaterials ? triangleMaterials[t] : 0, slotCollectors.length - 1)];

      for (let c = 0; c < 3; c++) {
        const i = (t * 3 + c) * 3;
        const x = positions[i];
        const y = positions[i + 1];
        const z = positions[i + 2];
        world[c][0] = matrix[0] * x + matrix[4] * y + matrix[8] * z + matrix[12];
        world[c][1] = matrix[1] * x + matrix[5] * y + matrix[9] * z + matrix[13];
        world[c][2] = matrix[2] * x + matrix[6] * y + matrix[10] * z + matrix[14];
      }

      if (!normals) {
        // Sin normales en el archivo: normal plana de la cara.
        const ax = world[1][0] - world[0][0], ay = world[1][1] - world[0][1], az = world[1][2] - world[0][2];
        const bx = world[2][0] - world[0][0], by = world[2][1] - world[0][1], bz = world[2][2] - world[0][2];
        normal[0] = ay * bz - az * by;
        normal[1] = az * bx - ax * bz;
        normal[2] = ax * by - ay * bx;
        if (normal[0] === 0 && normal[1] === 0 && normal[2] === 0) continue;
      }

      for (const c of order) {
        const i = (t * 3 + c) * 3;
        scratchFloats[0] = world[c][0];
        scratchFloats[1] = world[c][1];
        scratchFloats[2] = world[c][2];
        if (normals) {
          const nx = normals[i], ny = normals[i + 1], nz = normals[i + 2];
          scratchWords[3] = packNormal(
            normalMatrix[0] * nx + normalMatrix[3] * ny + normalMatrix[6] * nz,
            normalMatrix[1] * nx + normalMatrix[4] * ny + normalMatrix[7] * nz,
            normalMatrix[2] * nx + normalMatrix[5] * ny + normalMatrix[8] * nz,
          );
        } else {
          scratchWords[3] = packNormal(normal[0], normal[1], normal[2]);
        }
        scratchFloats[4] = uvs ? uvs[(t * 3 + c) * 2] : 0;
        scratchFloats[5] = uvs ? uvs[(t * 3 + c) * 2 + 1] : 0;
        collector.addVertex();
      }
    }
  }

  // Agrupa materiales con la misma textura difusa contiguos.
  const used = [...collectors.entries()]
    .filter(([, collector]) => collector.indexCount > 0)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([, collector]) => collector);

  const totalVertices = used.reduce((sum, collector) => sum + collector.count, 0);
  const totalIndices = used.reduce((sum, collector) => sum + collector.indexCount, 0);
  if (totalIndices === 0) throw new Error("El modelo no contiene triángulos renderizables");

  const vertexData = new Float32Array(totalVertices * VERTEX_WORDS);
  const vertexWords = new Uint32Array(vertexData.buffer);
  const indices = totalVertices <= 65536 ? new Uint16Array(totalIndices) : new Uint32Array(totalIndices);
  const ranges = [];
  let vertexOffset = 0;
  let indexOffset = 0;

  for (const collector of used) {
    vertexWords.set(collector.words.subarray(0, collector.count * VERTEX_WORDS), vertexOffset * VERTEX_WORDS);
    for (let i = 0; i < collector.indexCount; i++) {
      indices[indexOffset + i] = collector.indices[i] + vertexOffset;
    }
    ranges.push({
      start: indexOffset,
      count: collector.indexCount,
      ...computeBounds(vertexData, vertexOffset, collector.count),
      material: {
        color: collector.material.color,
        textures: { ...collector.material.textures },
      },
    });
    vertexOffset += collector.count;
    indexOffset += collector.indexCount;
  }

  return {
    vertexData,
    indices,
    ranges,
    stats: {
      triangles: totalIndices / 3,
      vertices: totalVertices,
      drawCalls: ranges.length,
    },
  };
}
