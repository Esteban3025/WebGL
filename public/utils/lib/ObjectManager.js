import { CreateObject, loadShader } from "./CreateObject.js";

const shaderSourceCache = new Map();

export class ObjectManager {
  constructor(gl, { lighting = null, maxPixelRatio = 1.25 } = {}) {
    this.gl = gl;
    this.lighting = lighting;
    this.maxPixelRatio = maxPixelRatio;
    this.objects = new Map();
    this.aliases = new Map([
      ["triangulo", "cuadrado"],
      ["triangle", "cuadrado"],
    ]);
  }

  resolveId(id) {
    return this.aliases.get(id) || id;
  }

  async create(id, definition) {
    const objectId = this.resolveId(id);
    if (this.objects.has(objectId)) {
      throw new Error(`Ya existe un objeto con el id "${objectId}"`);
    }

    const object = new CreateObject(
      this.gl,
      definition.vertices,
      definition.vertexCount ?? definition.vertices.length / 3,
      definition.model,
      definition.normals,
      definition.texcoords,
    );
    try {
      object.setLighting(this.lighting);
      object.setMode(definition.mode ?? this.gl.TRIANGLES);
      const resources = [];
      if (definition.texture) resources.push(object._createTexture(definition.texture));
      for (const [slot, path] of Object.entries(definition.textures || {})) {
        if (path) resources.push(object._createTexture(path, slot));
      }
      if (!definition.texture && !definition.textures?.diffuse) {
        resources.push(object._createSolidTexture([255, 255, 255, 255], "diffuse"));
      }
      object.setMaterialColor(definition.materialColor || [1, 1, 1]);

      const [vertexShader, fragmentShader] = await Promise.all([
        this.loadShaderCached(definition.vertexShader),
        this.loadShaderCached(definition.fragmentShader),
        ...resources,
      ]);
      object._setProgram(vertexShader, fragmentShader);
      this.objects.set(objectId, object);
      return object;
    } catch (error) {
      object.delete();
      throw error;
    }
  }

  async loadShaderCached(path) {
    if (!shaderSourceCache.has(path)) {
      shaderSourceCache.set(path, loadShader(path));
    }
    return shaderSourceCache.get(path);
  }

  get(id) {
    return this.objects.get(this.resolveId(id)) || null;
  }

  has(id) {
    return this.objects.has(this.resolveId(id));
  }

  remove(id) {
    const objectId = this.resolveId(id);
    const object = this.objects.get(objectId);
    if (!object) return false;

    object.delete();
    this.objects.delete(objectId);
    return true;
  }

  drawAll(mode = null) {
    for (const object of this.objects.values()) {
      object.draw(
        typeof mode === "function"
          ? mode(object)
          : mode ?? object.mode,
      );
    }
  }

  resize() {
    const { gl } = this;
    const dpr = Math.min(window.devicePixelRatio || 1, this.maxPixelRatio);
    const width = Math.floor(gl.canvas.clientWidth * dpr);
    const height = Math.floor(gl.canvas.clientHeight * dpr);
    if (gl.canvas.width !== width || gl.canvas.height !== height) {
      gl.canvas.width = width;
      gl.canvas.height = height;
    }
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  }

  clear() {
    for (const object of this.objects.values()) object.delete();
    this.objects.clear();
  }
}
