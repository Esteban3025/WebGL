import { mat4, vec3 } from "../../dist/esm/index.js";
import { cameraFront, cameraPos, cameraUp, currentDirection } from "./constants.js";
import { CreateObject, loadShader } from "./CreateObject.js";
import { ProgramManager } from "./ProgramManager.js";
import {
  DEPTH_LEQUAL,
  RenderState,
  STENCIL_OFF,
  STENCIL_OUTSIDE,
  STENCIL_WRITE,
} from "./RenderState.js";
import { TextureManager, loadImage } from "./TextureManager.js";
import { computeBounds, packGeometry } from "./VertexFormat.js";

const shaderSourceCache = new Map();
const WHITE_KEY = "solid:ffffffff";
const FOV = Math.PI / 4;

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
    this.programs = new ProgramManager(gl);
    this.textures = new TextureManager(gl);
    this.state = new RenderState(gl);
    this.drawList = [];
    this.opaque = [];
    this.outlined = [];
    this.blended = [];
    this.outlineInfo = null;
    this.outlineLoading = null;
    this.drawListDirty = false;
    this.view = mat4.create();
    this.projection = mat4.create();
    this.viewProjection = mat4.create();
    this.frameId = 0;
    this.programFrame = new WeakMap();
  }

  resolveId(id) {
    return this.aliases.get(id) || id;
  }

  /**
   * Crea un objeto. `definition` puede traer geometría plana
   * (vertices/normals/texcoords + texture) o una malla ya construida
   * (`mesh`, ver MeshBuilder) con sus texturas en `mesh.sources`.
   */
  async create(id, definition) {
    const objectId = this.resolveId(id);
    if (this.objects.has(objectId)) {
      throw new Error(`Ya existe un objeto con el id "${objectId}"`);
    }

    const geometry = definition.mesh || this.buildStaticGeometry(definition);
    if (definition.outline?.enabled) await this.ensureOutlineProgram();
    const acquired = [];
    try {
      const acquire = (key, source) => {
        acquired.push(key);
        return this.textures.acquire(key, source);
      };
      const loaded = new Map();
      const pending = [];
      const request = (key) => {
        if (loaded.has(key)) return;
        loaded.set(key, null);
        const source = geometry.sources.get(key);
        let promise;
        if (key === WHITE_KEY) {
          acquired.push(key);
          promise = this.textures.acquireSolid(key, [255, 255, 255, 255]);
        } else {
          promise = acquire(key, () => (typeof source === "string" ? loadImage(source) : source));
        }
        pending.push(promise.then((texture) => loaded.set(key, texture)));
      };

      for (const range of geometry.ranges) {
        if (!range.material.textures.diffuse) range.material.textures.diffuse = WHITE_KEY;
        for (const key of Object.values(range.material.textures)) request(key);
      }

      const [vertexSource, fragmentSource] = await Promise.all([
        this.loadShaderCached(definition.vertexShader),
        this.loadShaderCached(definition.fragmentShader),
        ...pending,
      ]);
      if (this.objects.has(objectId)) {
        throw new Error(`Ya existe un objeto con el id "${objectId}"`);
      }

      const ranges = geometry.ranges.map((range) => ({
        start: range.start,
        count: range.count,
        center: range.center,
        radius: range.radius,
        material: {
          color: range.material.color,
          textures: Object.fromEntries(
            Object.entries(range.material.textures).map(([slot, key]) => [slot, loaded.get(key)]),
          ),
        },
      }));

      const object = new CreateObject(this.gl, {
        programInfo: this.programs.get(vertexSource, fragmentSource),
        vertexData: geometry.vertexData,
        indices: geometry.indices,
        ranges,
        model: definition.model,
        mode: definition.mode ?? this.gl.TRIANGLES,
        cullFace: definition.cullFace ?? false,
        textureKeys: acquired,
        blend: definition.blend ?? false,
        outline: definition.outline,
      });
      this.objects.set(objectId, object);
      this.drawListDirty = true;
      return object;
    } catch (error) {
      for (const key of acquired) this.textures.release(key);
      throw error;
    }
  }

  buildStaticGeometry(definition) {
    const { data, vertexCount } = packGeometry(
      definition.vertices,
      definition.normals,
      definition.texcoords,
    );
    const sources = new Map();
    const textures = {};
    const addTexture = (slot, path) => {
      const url = path.startsWith("/") || path.startsWith("data:") ? path : `/res/${path}`;
      const key = `url:${url}`;
      sources.set(key, url);
      textures[slot] = key;
    };
    if (definition.texture) addTexture("diffuse", definition.texture);
    for (const [slot, path] of Object.entries(definition.textures || {})) {
      if (path) addTexture(slot, path);
    }

    return {
      vertexData: data,
      indices: null,
      sources,
      ranges: [{
        start: 0,
        count: definition.vertexCount ?? vertexCount,
        ...computeBounds(data, 0, vertexCount),
        material: { color: definition.materialColor || [1, 1, 1], textures },
      }],
    };
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

    this.disposeObject(object);
    this.objects.delete(objectId);
    this.drawListDirty = true;
    return true;
  }

  disposeObject(object) {
    object.delete();
    for (const key of object.textureKeys) this.textures.release(key);
  }

  // Ordena por programa y luego por textura difusa para minimizar cambios de estado.
  rebuildDrawList() {
    const textureIds = new Map();
    const diffuseId = (object) => {
      const texture = object.ranges[0]?.material.textures.diffuse;
      if (!texture) return 0;
      if (!textureIds.has(texture)) textureIds.set(texture, textureIds.size + 1);
      return textureIds.get(texture);
    };
    this.drawList = [...this.objects.values()].sort(
      (a, b) =>
        a.programInfo.id - b.programInfo.id ||
        Number(a.cullFace) - Number(b.cullFace) ||
        diffuseId(a) - diffuseId(b),
    );
    const groups = this.partition(this.drawList);
    this.opaque = groups.opaque;
    this.outlined = groups.outlined;
    this.blended = groups.blended;
    this.drawListDirty = false;
  }

  partition(objects) {
    const groups = { opaque: [], outlined: [], blended: [] };
    for (const object of objects) {
      if (object.blend) groups.blended.push(object);
      else if (object.outline.enabled && this.outlineInfo) groups.outlined.push(object);
      else groups.opaque.push(object);
    }
    return groups;
  }

  async ensureOutlineProgram() {
    if (this.outlineInfo) return this.outlineInfo;
    if (!this.outlineLoading) {
      this.outlineLoading = Promise.all([
        this.loadShaderCached("outline.vs"),
        this.loadShaderCached("outline.fs"),
      ]).then(([vertexSource, fragmentSource]) => {
        this.outlineInfo = this.programs.get(vertexSource, fragmentSource);
        return this.outlineInfo;
      }).catch((error) => {
        this.outlineLoading = null;
        throw error;
      });
    }
    return this.outlineLoading;
  }

  /**
   * Activa/configura el contorno de un objeto: { enabled, color: [r,g,b], width }.
   * Los objetos con `blend` no se contornean.
   */
  async setOutline(id, outline) {
    const object = this.get(id);
    if (!object) return false;
    if (outline.enabled) await this.ensureOutlineProgram();
    object.setOutline(outline);
    this.drawListDirty = true;
    return true;
  }

  updateCamera() {
    const { gl } = this;
    vec3.add(currentDirection, cameraPos, cameraFront);
    mat4.lookAt(this.view, cameraPos, currentDirection, cameraUp);
    mat4.perspective(
      this.projection,
      FOV,
      gl.canvas.clientWidth / gl.canvas.clientHeight,
      1,
      10000,
    );
    mat4.multiply(this.viewProjection, this.projection, this.view);
    this.state.frustum.update(this.viewProjection);
  }

  drawAll() {
    if (this.drawListDirty) this.rebuildDrawList();
    const frameId = this.beginFrame();
    this.renderGroups(this, frameId);
    this.state.finish();
  }

  /**
   * Redibuja solo los objetos indicados sobre el framebuffer actual, sin
   * limpiar ni tocar el resto. Usa el mismo pipeline que drawAll (programas,
   * luces, stencil y blending) y depth LEQUAL para poder redibujar encima.
   * Un contorno ya pintado no se borra: eso lo hace el próximo drawAll.
   */
  drawObjects(ids) {
    const objects = ids.map((id) => this.get(id)).filter(Boolean);
    if (!objects.length) return;
    const frameId = this.beginFrame();
    this.state.setDepthFunc(DEPTH_LEQUAL);
    this.renderGroups(this.partition(objects), frameId);
    this.state.finish();
  }

  drawObject(id) {
    this.drawObjects([id]);
  }

  beginFrame() {
    this.state.reset();
    this.updateCamera();
    return ++this.frameId;
  }

  renderGroups({ opaque, outlined, blended }, frameId) {
    this.drawGroup(opaque, frameId);
    if (outlined.length) this.drawOutlined(outlined, frameId);
    if (blended.length) this.drawBlended(blended, frameId);
  }

  // view/projection/luces se suben una sola vez por programa y frame.
  useProgram(info, frameId, lit = true) {
    const { gl, state, lighting } = this;
    state.useProgram(info);
    if (this.programFrame.get(info) === frameId) return;
    this.programFrame.set(info, frameId);
    gl.uniformMatrix4fv(info.uniforms.view, false, this.view);
    gl.uniformMatrix4fv(info.uniforms.projection, false, this.projection);
    if (lit && lighting && info.lightVersion !== lighting.version) {
      lighting.applyToProgram(gl, info.program);
      info.lightVersion = lighting.version;
    }
  }

  drawGroup(list, frameId) {
    for (const object of list) {
      this.useProgram(object.programInfo, frameId);
      object.draw(this.state);
    }
  }

  // Stencil: los objetos con contorno marcan sus píxeles con 1 y luego se
  // redibujan extruidos solo donde el stencil no es 1. El test de stencil
  // solo está activo durante estos dos pases.
  drawOutlined(outlined, frameId) {
    const { state, outlineInfo } = this;
    state.setStencil(STENCIL_WRITE);
    this.drawGroup(outlined, frameId);

    state.setStencil(STENCIL_OUTSIDE);
    this.useProgram(outlineInfo, frameId, false);
    for (const object of outlined) object.drawOutline(state, outlineInfo);
    state.setStencil(STENCIL_OFF);
  }

  // Los objetos con blending van al final, de atrás hacia adelante y sin
  // escribir profundidad, para que se mezclen bien con lo que tienen detrás.
  drawBlended(blended, frameId) {
    const { state } = this;
    if (blended.length > 1) {
      for (const object of blended) {
        const [x, y, z] = object.worldCenter;
        object.sortDistance =
          (x - cameraPos[0]) ** 2 + (y - cameraPos[1]) ** 2 + (z - cameraPos[2]) ** 2;
      }
      blended.sort((a, b) => b.sortDistance - a.sortDistance);
    }
    state.setBlend(true);
    state.setDepthWrite(false);
    this.drawGroup(blended, frameId);
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
    for (const object of this.objects.values()) this.disposeObject(object);
    this.objects.clear();
    this.drawList = [];
    this.opaque = [];
    this.outlined = [];
    this.blended = [];
    this.drawListDirty = false;
  }

  dispose() {
    this.clear();
    this.programs.dispose();
    this.textures.dispose();
  }
}
