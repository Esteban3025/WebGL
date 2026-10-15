import { parseFBX } from "../loaders/FBXParser.js";
import { extractFBXScene } from "../loaders/FBXScene.js";
import { buildMesh } from "../loaders/MeshBuilder.js";
import { parseOBJ } from "../loaders/OBJLoader.js";
import { decodeImage, loadImage } from "./TextureManager.js";

const SUPPORTED_FORMATS = ["fbx", "obj"];

export class ModelManager {
  constructor(objectManager) {
    this.objectManager = objectManager;
    this.models = new Set();
  }

  /**
   * Carga un modelo FBX (binario) u OBJ. Todas las mallas se fusionan en un
   * solo objeto con un draw call por material distinto.
   */
  async load(id, path, options = {}) {
    if (this.models.has(id)) {
      throw new Error(`Ya existe un modelo con el id "${id}"`);
    }
    const extension = path.split("?")[0].split(".").pop().toLowerCase();
    if (!SUPPORTED_FORMATS.includes(extension)) {
      throw new Error(`Formato de modelo no soportado: ".${extension}" (usá ${SUPPORTED_FORMATS.join(" o ")})`);
    }

    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`No se pudo cargar el modelo "${path}": ${response.status}`);
    }
    const scene = extension === "fbx"
      ? extractFBXScene(await parseFBX(await response.arrayBuffer()), {
        baseUrl: path.slice(0, path.lastIndexOf("/") + 1),
      })
      : parseOBJ(await response.text());

    const sources = await this.loadTextures(id, scene);
    const mesh = buildMesh(scene.meshes);
    mesh.sources = sources;

    const model = options.model || {
      translate: [0, 0, 0],
      scale: [1, 1, 1],
      deg: 0,
      degZ: 0,
      color: { r: 1, g: 1, b: 1 },
    };
    this.models.add(id);
    try {
      await this.objectManager.create(id, {
        mesh,
        model,
        cullFace: options.cullFace ?? false,
        blend: options.blend ?? false,
        outline: options.outline,
        vertexShader: options.vertexShader || "model.vs",
        fragmentShader: options.fragmentShader || "model.fs",
      });
    } catch (error) {
      this.models.delete(id);
      for (const image of sources.values()) image.close?.();
      throw error;
    }

    const { triangles, vertices, drawCalls } = mesh.stats;
    console.info(`[Modelo "${id}"] ${triangles} triángulos, ${vertices} vértices, ${drawCalls} draw calls`);
    return [id];
  }

  // Decodifica en paralelo las texturas de los materiales y reemplaza cada
  // referencia por la clave final de textura. Las que fallan se omiten.
  async loadTextures(id, scene) {
    const references = new Map();
    for (const mesh of scene.meshes) {
      for (const material of mesh.materials) {
        for (const reference of Object.values(material.textures)) {
          if (!references.has(reference.key)) references.set(reference.key, this.decode(id, reference));
        }
      }
    }
    const decoded = new Map();
    await Promise.all([...references].map(async ([key, promise]) => decoded.set(key, await promise)));

    const sources = new Map();
    const normalized = new Map();
    for (const mesh of scene.meshes) {
      mesh.materials = mesh.materials.map((material) => {
        if (!normalized.has(material)) {
          const textures = {};
          for (const [slot, reference] of Object.entries(material.textures)) {
            const result = decoded.get(reference.key);
            if (!result) continue;
            textures[slot] = result.key;
            sources.set(result.key, result.image);
          }
          normalized.set(material, { color: material.color, textures });
        }
        return normalized.get(material);
      });
    }
    return sources;
  }

  async decode(id, reference) {
    try {
      if (reference.data) {
        return {
          key: `${id}:${reference.key}`,
          image: await decodeImage(new Blob([reference.data])),
        };
      }
      for (const url of reference.urls) {
        try {
          return { key: `url:${url}`, image: await loadImage(url) };
        } catch {
          // se prueba con la siguiente ruta candidata
        }
      }
      throw new Error(`no se encontró ${reference.urls[0]}`);
    } catch (error) {
      console.warn(`[Modelo "${id}"] textura omitida: ${error.message}`);
      return null;
    }
  }

  remove(id) {
    if (!this.models.delete(id)) return false;
    this.objectManager.remove(id);
    return true;
  }

  clear() {
    for (const id of [...this.models]) this.remove(id);
  }
}
