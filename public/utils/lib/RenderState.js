import { Frustum } from "./Frustum.js";

export const STENCIL_OFF = 0;
// Marca con 1 los píxeles que dibujan los objetos con contorno.
export const STENCIL_WRITE = 1;
// Solo deja pasar los píxeles que no fueron marcados (el borde extruido).
export const STENCIL_OUTSIDE = 2;

export const DEPTH_LESS = 0;
// Permite volver a dibujar un objeto encima de sí mismo (misma profundidad).
export const DEPTH_LEQUAL = 1;

// Caché del estado de WebGL durante un frame para evitar llamadas redundantes.
export class RenderState {
  constructor(gl) {
    this.gl = gl;
    this.frustum = new Frustum();
    // Alpha separado: el canvas debe conservar alpha 1 al mezclar.
    gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    this.reset();
  }

  reset() {
    this.program = null;
    this.vao = null;
    this.cull = false;
    this.blend = false;
    this.depthWrite = true;
    this.depthFunc = DEPTH_LESS;
    this.stencil = STENCIL_OFF;
    this.textures = [null, null, null, null];
    this.activeUnit = -1;
  }

  useProgram(info) {
    if (this.program === info) return;
    this.gl.useProgram(info.program);
    this.program = info;
  }

  bindVertexArray(vao) {
    if (this.vao === vao) return;
    this.gl.bindVertexArray(vao);
    this.vao = vao;
  }

  bindTexture(unit, texture) {
    if (this.textures[unit] === texture) return;
    const { gl } = this;
    if (this.activeUnit !== unit) {
      gl.activeTexture(gl.TEXTURE0 + unit);
      this.activeUnit = unit;
    }
    gl.bindTexture(gl.TEXTURE_2D, texture);
    this.textures[unit] = texture;
  }

  setCull(enabled) {
    if (this.cull === enabled) return;
    if (enabled) this.gl.enable(this.gl.CULL_FACE);
    else this.gl.disable(this.gl.CULL_FACE);
    this.cull = enabled;
  }

  setBlend(enabled) {
    if (this.blend === enabled) return;
    if (enabled) this.gl.enable(this.gl.BLEND);
    else this.gl.disable(this.gl.BLEND);
    this.blend = enabled;
  }

  setDepthWrite(enabled) {
    if (this.depthWrite === enabled) return;
    this.gl.depthMask(enabled);
    this.depthWrite = enabled;
  }

  setDepthFunc(func) {
    if (this.depthFunc === func) return;
    this.gl.depthFunc(func === DEPTH_LEQUAL ? this.gl.LEQUAL : this.gl.LESS);
    this.depthFunc = func;
  }

  setStencil(mode) {
    if (this.stencil === mode) return;
    const { gl } = this;
    if (mode === STENCIL_OFF) {
      gl.disable(gl.STENCIL_TEST);
      gl.stencilMask(0xff); // el clear del próximo frame necesita la máscara completa
    } else {
      if (this.stencil === STENCIL_OFF) gl.enable(gl.STENCIL_TEST);
      if (mode === STENCIL_WRITE) {
        gl.stencilFunc(gl.ALWAYS, 1, 0xff);
        gl.stencilOp(gl.KEEP, gl.KEEP, gl.REPLACE);
        gl.stencilMask(0xff);
      } else {
        gl.stencilFunc(gl.NOTEQUAL, 1, 0xff);
        gl.stencilMask(0x00);
      }
    }
    this.stencil = mode;
  }

  // Deja WebGL en el estado por defecto para lo que se dibuje después.
  finish() {
    this.bindVertexArray(null);
    this.setCull(false);
    this.setBlend(false);
    this.setDepthWrite(true);
    this.setDepthFunc(DEPTH_LESS);
    this.setStencil(STENCIL_OFF);
  }
}
