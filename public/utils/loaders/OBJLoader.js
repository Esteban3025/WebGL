import { mat4 } from "../../dist/esm/index.js";

// Lector OBJ mínimo (v/vt/vn/f con índices negativos y polígonos arbitrarios).
// Devuelve el mismo formato de escena que FBXScene; los materiales .mtl se ignoran.
export function parseOBJ(text) {
  const positions = [];
  const texcoords = [];
  const normalsList = [];
  const outPositions = [];
  const outNormals = [];
  const outUvs = [];
  let missingNormals = false;

  const resolve = (token, length) => {
    if (!token) return -1;
    const index = parseInt(token, 10);
    return index < 0 ? length + index : index - 1;
  };

  const corner = (token) => {
    const [v, t, n] = token.split("/");
    const vi = resolve(v, positions.length / 3);
    const ti = resolve(t, texcoords.length / 2);
    const ni = resolve(n, normalsList.length / 3);
    outPositions.push(positions[vi * 3], positions[vi * 3 + 1], positions[vi * 3 + 2]);
    if (ni >= 0) outNormals.push(normalsList[ni * 3], normalsList[ni * 3 + 1], normalsList[ni * 3 + 2]);
    else missingNormals = true;
    if (ti >= 0) outUvs.push(texcoords[ti * 2], texcoords[ti * 2 + 1]);
    else outUvs.push(0, 0);
  };

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line || line[0] === "#") continue;
    const parts = line.split(/\s+/);
    switch (parts[0]) {
      case "v": positions.push(+parts[1], +parts[2], +parts[3]); break;
      case "vt": texcoords.push(+parts[1], +parts[2]); break;
      case "vn": normalsList.push(+parts[1], +parts[2], +parts[3]); break;
      case "f":
        for (let k = 2; k < parts.length - 1; k++) {
          corner(parts[1]);
          corner(parts[k]);
          corner(parts[k + 1]);
        }
        break;
    }
  }

  if (outPositions.length === 0) throw new Error("El OBJ no contiene caras");
  return {
    meshes: [{
      name: "obj",
      positions: Float32Array.from(outPositions),
      normals: missingNormals ? null : Float32Array.from(outNormals),
      uvs: Float32Array.from(outUvs),
      triangleMaterials: null,
      matrix: mat4.create(),
      materials: [],
    }],
  };
}
