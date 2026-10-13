import { BufferAttribute, BufferGeometry } from "three";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";

const MODEL_LOADERS = {
  fbx: FBXLoader,
  obj: OBJLoader,
  gltf: GLTFLoader,
  glb: GLTFLoader,
};

export class ModelManager {
  constructor(objectManager) {
    this.objectManager = objectManager;
    this.models = new Map();
    this.loaderCache = new Map();
  }

  async load(id, path, options = {}) {
    if (this.models.has(id)) {
      throw new Error(`Ya existe un modelo con el id "${id}"`);
    }

    const extension = path.split("?")[0].split(".").pop().toLowerCase();
    const LoaderClass = MODEL_LOADERS[extension];
    if (!LoaderClass) {
      throw new Error(`Formato de modelo no soportado: ".${extension}"`);
    }

    const scene = await this.loadScene(path, extension, LoaderClass);
    scene.updateMatrixWorld(true);
    const objectIds = [];
    const model = options.model || {
      translate: [0, 0, 0],
      scale: [1, 1, 1],
      deg: 0,
      degZ: 0,
      color: { r: 1, g: 1, b: 1 },
    };

    const meshPromises = [];
    let meshIndex = 0;
    scene.traverse((node) => {
      if (!node.isMesh || !node.geometry) return;
      const parts = this.prepareMeshParts(node);
      for (const part of parts) {
        const meshId = `${id}:${meshIndex++}`;
        objectIds.push(meshId);
        meshPromises.push(this.objectManager.create(meshId, {
          vertices: Array.from(part.geometry.getAttribute("position").array),
          normals: part.geometry.hasAttribute("normal")
            ? Array.from(part.geometry.getAttribute("normal").array)
            : null,
          texcoords: part.geometry.hasAttribute("uv")
            ? Array.from(part.geometry.getAttribute("uv").array)
            : null,
          model,
          textures: this.getMaterialTextures(part.material),
          materialColor: part.material?.color
            ? [part.material.color.r, part.material.color.g, part.material.color.b]
            : [1, 1, 1],
          vertexShader: options.vertexShader || "model.vs",
          fragmentShader: options.fragmentShader || "model.fs",
        }));
      }
    });

    if (objectIds.length === 0) {
      throw new Error(`El modelo "${path}" no contiene meshes renderizables`);
    }
    try {
      await Promise.all(meshPromises);
    } catch (error) {
      for (const meshId of objectIds) this.objectManager.remove(meshId);
      throw error;
    }
    this.models.set(id, objectIds);
    return objectIds;
  }

  async loadScene(path, extension, LoaderClass) {
    if (!this.loaderCache.has(extension)) {
      this.loaderCache.set(extension, new LoaderClass());
    }
    const loader = this.loaderCache.get(extension);
    return new Promise((resolve, reject) => {
      loader.load(path, (result) => {
        resolve(extension === "gltf" || extension === "glb" ? result.scene : result);
      }, undefined, reject);
    });
  }

  prepareMeshParts(mesh) {
    const geometry = mesh.geometry.index
      ? mesh.geometry.toNonIndexed()
      : mesh.geometry.clone();
    geometry.applyMatrix4(mesh.matrixWorld);
    if (!geometry.hasAttribute("normal")) geometry.computeVertexNormals();
    const groups = geometry.groups.length
      ? geometry.groups
      : [{ start: 0, count: geometry.getAttribute("position").count, materialIndex: 0 }];
    const materials = Array.isArray(mesh.material)
      ? mesh.material
      : [mesh.material];
    const parts = groups.map((group) => ({
      geometry: this.sliceGeometry(geometry, group),
      material: materials[group.materialIndex] || materials[0],
    }));
    geometry.dispose();
    return parts;
  }

  sliceGeometry(source, group) {
    const geometry = new BufferGeometry();
    for (const name of Object.keys(source.attributes)) {
      const attribute = source.getAttribute(name);
      const start = group.start * attribute.itemSize;
      const end = (group.start + group.count) * attribute.itemSize;
      geometry.setAttribute(
        name,
        new BufferAttribute(attribute.array.slice(start, end), attribute.itemSize),
      );
    }
    return geometry;
  }

  getMaterialTextures(material) {
    if (!material) return {};
    return {
      diffuse: this.getTextureSource(material.map),
      specular: this.getTextureSource(material.specularMap),
      normal: this.getTextureSource(material.normalMap),
      emissive: this.getTextureSource(material.emissiveMap),
    };
  }

  getTextureSource(texture) {
    if (!texture?.image) return null;
    return texture.image;
  }

  remove(id) {
    const objectIds = this.models.get(id);
    if (!objectIds) return false;
    for (const objectId of objectIds) this.objectManager.remove(objectId);
    this.models.delete(id);
    return true;
  }

  clear() {
    for (const id of this.models.keys()) this.remove(id);
  }
}
