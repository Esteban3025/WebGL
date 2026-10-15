import { mat4 } from "../../dist/esm/index.js";
import { findChild, findChildren } from "./FBXParser.js";

const DEG_TO_RAD = Math.PI / 180;
// Orden de rotación FBX (enum eEulerOrder). La matriz resultante es Rc·Rb·Ra.
const ROTATION_ORDERS = [
  [0, 1, 2], [0, 2, 1], [1, 2, 0], [1, 0, 2], [2, 0, 1], [2, 1, 0], [0, 1, 2],
];
const ROTATE = [mat4.rotateX, mat4.rotateY, mat4.rotateZ];
const TEXTURE_SLOTS = {
  DiffuseColor: "diffuse",
  SpecularColor: "specular",
  NormalMap: "normal",
  EmissiveColor: "emissive",
};

const objectName = (node) => String(node.props[1] ?? "").split("\u0000")[0];

function readProperties(node) {
  const properties = new Map();
  const container = findChild(node, "Properties70");
  if (!container) return properties;
  for (const property of container.children) {
    properties.set(property.props[0], property.props.slice(4));
  }
  return properties;
}

function applyEuler(out, angles, order, sign = 1) {
  const [a, b, c] = ROTATION_ORDERS[order] || ROTATION_ORDERS[0];
  const axes = sign > 0 ? [c, b, a] : [a, b, c];
  for (const axis of axes) ROTATE[axis](out, out, sign * angles[axis] * DEG_TO_RAD);
  return out;
}

// Transformación local de un Model según la fórmula de FBX:
// T · Roff · Rp · Rpre · R · Rpost⁻¹ · Rp⁻¹ · Soff · Sp · S · Sp⁻¹
function localMatrix(properties) {
  const get = (name, fallback) => properties.get(name) || fallback;
  const T = get("Lcl Translation", [0, 0, 0]);
  const R = get("Lcl Rotation", [0, 0, 0]);
  const S = get("Lcl Scaling", [1, 1, 1]);
  const Roff = get("RotationOffset", [0, 0, 0]);
  const Rp = get("RotationPivot", [0, 0, 0]);
  const Rpre = get("PreRotation", [0, 0, 0]);
  const Rpost = get("PostRotation", [0, 0, 0]);
  const Soff = get("ScalingOffset", [0, 0, 0]);
  const Sp = get("ScalingPivot", [0, 0, 0]);
  const order = get("RotationOrder", [0])[0];
  const neg = (v) => [-v[0], -v[1], -v[2]];

  const m = mat4.create();
  mat4.translate(m, m, T);
  mat4.translate(m, m, Roff);
  mat4.translate(m, m, Rp);
  applyEuler(m, Rpre, 0);
  applyEuler(m, R, order);
  applyEuler(m, Rpost, 0, -1);
  mat4.translate(m, m, neg(Rp));
  mat4.translate(m, m, Soff);
  mat4.translate(m, m, Sp);
  mat4.scale(m, m, S);
  mat4.translate(m, m, neg(Sp));
  return m;
}

// Transformación "geométrica": afecta solo a la malla, no a los hijos.
function geometricMatrix(properties) {
  const m = mat4.create();
  const T = properties.get("GeometricTranslation");
  const R = properties.get("GeometricRotation");
  const S = properties.get("GeometricScaling");
  if (T) mat4.translate(m, m, T);
  if (R) applyEuler(m, R, 0);
  if (S) mat4.scale(m, m, S);
  return m;
}

// Lee una capa (normales, uv, materiales) y devuelve una función que da el
// índice de dato para una esquina / vértice / polígono.
function layerReader(layer, dataName, indexName) {
  if (!layer) return null;
  const data = findChild(layer, dataName)?.props[0];
  if (!data) return null;
  const mapping = findChild(layer, "MappingInformationType")?.props[0];
  const reference = findChild(layer, "ReferenceInformationType")?.props[0];
  const indices = findChild(layer, indexName)?.props[0];
  const indirect = reference === "IndexToDirect" || reference === "Index";

  let select;
  switch (mapping) {
    case "ByPolygonVertex": select = (corner) => corner; break;
    case "ByVertice": case "ByVertex": select = (corner, vertex) => vertex; break;
    case "ByPolygon": select = (corner, vertex, polygon) => polygon; break;
    case "AllSame": select = () => 0; break;
    default: return null;
  }
  return {
    data,
    index: indirect && indices
      ? (corner, vertex, polygon) => indices[select(corner, vertex, polygon)]
      : select,
  };
}

// Triangula la geometría (abanico por polígono) y expande los atributos por
// esquina: el resultado es una lista de triángulos sin índices.
function decodeGeometry(geometry) {
  const positions = findChild(geometry, "Vertices")?.props[0];
  const polygons = findChild(geometry, "PolygonVertexIndex")?.props[0];
  if (!positions || !polygons) return null;

  const normals = layerReader(findChild(geometry, "LayerElementNormal"), "Normals", "NormalsIndex");
  const uvs = layerReader(findChild(geometry, "LayerElementUV"), "UV", "UVIndex");
  const materials = layerReader(findChild(geometry, "LayerElementMaterial"), "Materials", "");

  let triangleCount = 0;
  for (let i = 0, size = 0; i < polygons.length; i++) {
    size++;
    if (polygons[i] < 0) {
      triangleCount += Math.max(size - 2, 0);
      size = 0;
    }
  }

  const cornerCount = triangleCount * 3;
  const outPositions = new Float32Array(cornerCount * 3);
  const outNormals = normals ? new Float32Array(cornerCount * 3) : null;
  const outUvs = uvs ? new Float32Array(cornerCount * 2) : null;
  const outMaterials = materials ? new Uint32Array(triangleCount) : null;

  let out = 0;
  let triangle = 0;
  const emit = (corner, polygon) => {
    const raw = polygons[corner];
    const vertex = raw < 0 ? ~raw : raw;
    outPositions[out * 3] = positions[vertex * 3];
    outPositions[out * 3 + 1] = positions[vertex * 3 + 1];
    outPositions[out * 3 + 2] = positions[vertex * 3 + 2];
    if (normals) {
      const i = normals.index(corner, vertex, polygon) * 3;
      outNormals[out * 3] = normals.data[i];
      outNormals[out * 3 + 1] = normals.data[i + 1];
      outNormals[out * 3 + 2] = normals.data[i + 2];
    }
    if (uvs) {
      const i = uvs.index(corner, vertex, polygon) * 2;
      outUvs[out * 2] = uvs.data[i];
      outUvs[out * 2 + 1] = uvs.data[i + 1];
    }
    out++;
  };

  let start = 0;
  let polygon = 0;
  for (let i = 0; i < polygons.length; i++) {
    if (polygons[i] >= 0) continue;
    for (let k = 1; k < i - start; k++) {
      if (outMaterials) outMaterials[triangle] = materials.data[materials.index(0, 0, polygon)] ?? 0;
      triangle++;
      emit(start, polygon);
      emit(start + k, polygon);
      emit(start + k + 1, polygon);
    }
    start = i + 1;
    polygon++;
  }

  return {
    positions: outPositions,
    normals: outNormals,
    uvs: outUvs,
    triangleMaterials: outMaterials,
  };
}

/**
 * Convierte el árbol FBX en una lista de mallas con matriz de mundo:
 * { positions, normals, uvs, triangleMaterials, matrix, materials }.
 * `materials[i].textures[slot]` = { key, data?: Uint8Array, urls?: string[] }
 */
export function extractFBXScene(root, { baseUrl = "" } = {}) {
  const objectsNode = findChild(root, "Objects");
  const connectionsNode = findChild(root, "Connections");
  if (!objectsNode) throw new Error("El FBX no contiene un nodo Objects");

  const objects = new Map();
  for (const node of objectsNode.children) {
    if (typeof node.props[0] === "number") objects.set(node.props[0], node);
  }

  const parentOf = new Map();
  const childrenOf = new Map();
  for (const connection of connectionsNode?.children || []) {
    const [type, child, parent, property] = connection.props;
    if (!childrenOf.has(parent)) childrenOf.set(parent, []);
    childrenOf.get(parent).push({ id: child, type, property });
    if (type === "OO" && !parentOf.has(child)) parentOf.set(child, parent);
  }
  const connected = (parent, kind) =>
    (childrenOf.get(parent) || []).filter(({ id }) => objects.get(id)?.name === kind);

  const worldMatrices = new Map();
  const worldMatrix = (id, depth = 0) => {
    if (worldMatrices.has(id)) return worldMatrices.get(id);
    const node = objects.get(id);
    const local = localMatrix(readProperties(node));
    const parent = parentOf.get(id);
    const parentNode = parent !== undefined && depth < 256 ? objects.get(parent) : null;
    const world = parentNode?.name === "Model"
      ? mat4.multiply(mat4.create(), worldMatrix(parent, depth + 1), local)
      : local;
    worldMatrices.set(id, world);
    return world;
  };

  const resolveTexture = (textureId) => {
    const texture = objects.get(textureId);
    const video = connected(textureId, "Video")[0];
    const videoNode = video && objects.get(video.id);
    const content = videoNode && findChild(videoNode, "Content")?.props[0];
    if (content?.length > 0) return { key: `embedded:${video.id}`, data: content };

    const names = [
      findChild(texture, "RelativeFilename")?.props[0],
      findChild(texture, "FileName")?.props[0],
      videoNode && findChild(videoNode, "RelativeFilename")?.props[0],
      videoNode && findChild(videoNode, "Filename")?.props[0],
    ].filter(Boolean);
    const urls = [...new Set(names.flatMap((name) => {
      const clean = name.replace(/\\/g, "/");
      const base = clean.split("/").pop();
      return [baseUrl + clean, baseUrl + base].map((url) =>
        url.split("/").map((part, i) => (i === 0 ? part : encodeURIComponent(part))).join("/"));
    }))];
    return urls.length ? { key: `file:${urls[0]}`, urls } : null;
  };

  const materialCache = new Map();
  const readMaterial = (materialId) => {
    if (materialCache.has(materialId)) return materialCache.get(materialId);
    const node = objects.get(materialId);
    const properties = readProperties(node);
    const color = properties.get("DiffuseColor") || properties.get("Diffuse") || [1, 1, 1];
    const material = { name: objectName(node), color: color.slice(0, 3), textures: {} };
    for (const { id, property } of connected(materialId, "Texture")) {
      const slot = TEXTURE_SLOTS[property];
      if (!slot || material.textures[slot]) continue;
      const texture = resolveTexture(id);
      if (texture) material.textures[slot] = texture;
    }
    materialCache.set(materialId, material);
    return material;
  };

  const geometryCache = new Map();
  const meshes = [];
  for (const [id, node] of objects) {
    if (node.name !== "Model") continue;
    for (const { id: geometryId } of connected(id, "Geometry")) {
      if (!geometryCache.has(geometryId)) {
        geometryCache.set(geometryId, decodeGeometry(objects.get(geometryId)));
      }
      const geometry = geometryCache.get(geometryId);
      if (!geometry) continue;

      const matrix = mat4.multiply(
        mat4.create(),
        worldMatrix(id),
        geometricMatrix(readProperties(node)),
      );
      meshes.push({
        name: objectName(node),
        ...geometry,
        matrix,
        materials: connected(id, "Material").map(({ id: materialId }) => readMaterial(materialId)),
      });
    }
  }
  return { meshes };
}
