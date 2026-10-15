import { mat4 } from "../../dist/esm/index.js";
import { setupVertexArray } from "./VertexFormat.js";
import { TEXTURE_UNITS } from "./ProgramManager.js";

const SLOTS = Object.keys(TEXTURE_UNITS);
const DEG_TO_RAD = Math.PI / 180;
const scratchPoint = new Float32Array(3);
// Object outlining: desactivado por defecto. `width` está en unidades de mundo.
export function normalizeOutline(outline = {}) {
  return {
    enabled: false,
    width: 1.5,
    ...outline,
    color: [...(outline.color || [1, 0.6, 0.1])],
  };
}

export function buildModelMatrix(out, model) {
  mat4.identity(out);
  mat4.translate(out, out, model.translate);
  mat4.scale(out, out, model.scale);
  mat4.rotateX(out, out, model.deg * DEG_TO_RAD);
  mat4.rotateZ(out, out, model.degZ * DEG_TO_RAD);
  return out;
}

/**
 * Objeto dibujable: un VBO/IBO y un VAO propios, con uno o más rangos
 * (uno por material). Cada rango equivale a un único draw call.
 *
 * ranges[i] = { start, count, center, radius, material }
 * material = { color: [r,g,b], textures: { diffuse, specular, normal, emissive } }
 */
export class CreateObject {
  constructor(gl, { programInfo, vertexData, indices, ranges, model, mode, cullFace, textureKeys, blend, outline }) {
    this.gl = gl;
    this.programInfo = programInfo;
    this.model = model;
    this.mode = mode;
    this.cullFace = cullFace;
    this.textureKeys = textureKeys;
    this.blend = blend ?? false;
    this.outline = normalizeOutline(outline);
    this.ranges = ranges.map((range) => ({
      ...range,
      material: this._prepareMaterial(range.material),
    }));
    this._computeBounds();

    this.vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);

    this.indexBuffer = null;
    this.indexType = 0;
    this.indexBytes = 0;
    if (indices) {
      this.indexType = indices instanceof Uint16Array ? gl.UNSIGNED_SHORT : gl.UNSIGNED_INT;
      this.indexBytes = indices.BYTES_PER_ELEMENT;
      this.indexBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    }
    this.vao = setupVertexArray(gl, this.vertexBuffer, this.indexBuffer);

    this.modelMatrix = mat4.create();
    this.version = 0;
    this.updateModel();
  }

  _prepareMaterial(material) {
    // Máscara con los mapas opcionales presentes para actualizar los flags
    // del shader solo cuando cambian.
    const { textures } = material;
    const flags =
      (textures.specular ? 1 : 0) |
      (textures.normal ? 2 : 0) |
      (textures.emissive ? 4 : 0);
    return { ...material, flags };
  }

  // Esfera que envuelve todos los rangos y el tramo contiguo que cubren.
  _computeBounds() {
    const min = [Infinity, Infinity, Infinity];
    const max = [-Infinity, -Infinity, -Infinity];
    let start = Infinity;
    let end = 0;
    for (const range of this.ranges) {
      for (let axis = 0; axis < 3; axis++) {
        min[axis] = Math.min(min[axis], range.center[axis] - range.radius);
        max[axis] = Math.max(max[axis], range.center[axis] + range.radius);
      }
      start = Math.min(start, range.start);
      end = Math.max(end, range.start + range.count);
    }
    this.center = min.map((value, axis) => (value + max[axis]) / 2);
    this.radius = Math.max(
      ...this.ranges.map((range) => Math.hypot(
        range.center[0] - this.center[0],
        range.center[1] - this.center[1],
        range.center[2] - this.center[2],
      ) + range.radius),
    );
    this.drawStart = start;
    this.drawCount = end - start;
    this.worldCenter = new Float32Array(3);
  }

  // Recalcula la matriz del modelo; llamar si `model` cambia.
  updateModel() {
    buildModelMatrix(this.modelMatrix, this.model);
    const [sx, sy, sz] = this.model.scale;
    this.maxScale = Math.max(Math.abs(sx), Math.abs(sy), Math.abs(sz));
    this._transformPoint(this.center, this.worldCenter);
    this.version++;
  }

  setOutline(outline) {
    this.outline = normalizeOutline({ ...this.outline, ...outline });
  }

  _transformPoint([x, y, z], out) {
    const m = this.modelMatrix;
    out[0] = m[0] * x + m[4] * y + m[8] * z + m[12];
    out[1] = m[1] * x + m[5] * y + m[9] * z + m[13];
    out[2] = m[2] * x + m[6] * y + m[10] * z + m[14];
    return out;
  }

  isVisible(frustum) {
    const [x, y, z] = this.worldCenter;
    return frustum.intersectsSphere(x, y, z, this.radius * this.maxScale);
  }

  _uploadModel(info) {
    if (info.owner === this && info.ownerVersion === this.version) return;
    const { gl } = this;
    const { uniforms } = info;
    gl.uniformMatrix4fv(uniforms.model, false, this.modelMatrix);
    if (uniforms.color) {
      const { color } = this.model;
      gl.uniform4f(uniforms.color, color.r, color.g, color.b, 1);
    }
    info.owner = this;
    info.ownerVersion = this.version;
  }

  _drawIndices(start, count) {
    const { gl } = this;
    if (this.indexBuffer) {
      gl.drawElements(this.mode, count, this.indexType, start * this.indexBytes);
    } else {
      gl.drawArrays(this.mode, start, count);
    }
  }

  draw(state) {
    const info = this.programInfo;
    const { frustum } = state;
    if (this.ranges.length > 1 && !this.isVisible(frustum)) return;

    state.bindVertexArray(this.vao);
    state.setCull(this.cullFace);
    this._uploadModel(info);

    for (const range of this.ranges) {
      this._transformPoint(range.center, scratchPoint);
      if (!frustum.intersectsSphere(scratchPoint[0], scratchPoint[1], scratchPoint[2], range.radius * this.maxScale)) continue;

      this._applyMaterial(state, range.material);
      this._drawIndices(range.start, range.count);
    }
  }

  // Segunda pasada del contorno: la malla extruida a lo largo de sus normales,
  // en un único draw call (el índice de todos los materiales es contiguo).
  // Solo tiene efecto con el stencil en modo STENCIL_OUTSIDE.
  drawOutline(state, info) {
    if (!this.isVisible(state.frustum)) return;
    const { gl } = this;
    state.bindVertexArray(this.vao);
    state.setCull(this.cullFace);
    this._uploadModel(info);
    gl.uniform3fv(info.uniforms.outlineColor, this.outline.color);
    gl.uniform1f(info.uniforms.outlineWidth, this.outline.width);
    this._drawIndices(this.drawStart, this.drawCount);
  }

  _applyMaterial(state, material) {
    const { gl, programInfo: info } = this;
    const { uniforms } = info;
    for (const slot of SLOTS) {
      const texture = material.textures[slot];
      if (texture && info.samplers[slot]) state.bindTexture(TEXTURE_UNITS[slot], texture);
    }

    if (info.flags !== material.flags) {
      if (uniforms.hasSpecularMap) gl.uniform1i(uniforms.hasSpecularMap, material.flags & 1);
      if (uniforms.hasNormalMap) gl.uniform1i(uniforms.hasNormalMap, (material.flags >> 1) & 1);
      if (uniforms.hasEmissiveMap) gl.uniform1i(uniforms.hasEmissiveMap, (material.flags >> 2) & 1);
      info.flags = material.flags;
    }

    if (uniforms.materialColor) {
      const [r, g, b] = material.color;
      if (info.colorR !== r || info.colorG !== g || info.colorB !== b) {
        gl.uniform3f(uniforms.materialColor, r, g, b);
        info.colorR = r;
        info.colorG = g;
        info.colorB = b;
      }
    }
  }

  // Limpieza de memoria en la GPU cuando el objeto ya no se use.
  delete() {
    const { gl } = this;
    if (this.vao) gl.deleteVertexArray(this.vao);
    if (this.vertexBuffer) gl.deleteBuffer(this.vertexBuffer);
    if (this.indexBuffer) gl.deleteBuffer(this.indexBuffer);
    this.vao = this.vertexBuffer = this.indexBuffer = null;
    if (this.programInfo.owner === this) this.programInfo.owner = null;
  }
}

export async function loadShader(path) {
  const res = await fetch("shaders/" + path);
  if (!res.ok) {
    throw new Error(`No se pudo cargar el shader "${path}": ${res.status}`);
  }
  const source = await res.text();
  return source;
}
