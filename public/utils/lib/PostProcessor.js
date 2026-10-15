import { loadShader } from "./CreateObject.js";

// Kernels 3x3 (fila por fila). Para crear otro postprocesado basta agregar uno acá
// o llamar a setKernel() con 9 valores.
export const KERNELS = {
  sharpen: [
    0, -1, 0,
    -1, 5, -1,
    0, -1, 0,
  ],
  blur: [
    1, 2, 1,
    2, 4, 2,
    1, 2, 1,
  ],
  edge: [
    -1, -1, -1,
    -1, 8, -1,
    -1, -1, -1,
  ],
  emboss: [
    -2, -1, 0,
    -1, 1, 1,
    0, 1, 2,
  ],
};

const MAX_SAMPLES = 4;

/**
 * Renderiza la escena a un framebuffer multisample (MSAA) con depth+stencil,
 * lo resuelve a una textura y la dibuja en pantalla aplicando un kernel de
 * convolución. Sin efecto activo, el resultado se copia directo al canvas
 * con un blit (sin shader).
 */
export class PostProcessor {
  constructor(gl, programs) {
    this.gl = gl;
    this.programs = programs;
    this.samples = Math.min(MAX_SAMPLES, gl.getParameter(gl.MAX_SAMPLES));
    this.width = 0;
    this.height = 0;
    this.sceneFbo = null;
    this.colorBuffer = null;
    this.depthBuffer = null;
    this.resolveFbo = null;
    this.resolveTexture = null;
    this.vao = gl.createVertexArray();
    this.program = null;
    this.effect = "none";
    this.kernel = null;
    this.kernelWeight = 1;
  }

  async initialize() {
    const [vertexSource, fragmentSource] = await Promise.all([
      loadShader("postprocess.vs"),
      loadShader("postprocess.fs"),
    ]);
    const { gl } = this;
    const info = this.programs.get(vertexSource, fragmentSource);
    this.program = {
      program: info.program,
      scene: gl.getUniformLocation(info.program, "u_scene"),
      texelSize: gl.getUniformLocation(info.program, "u_texelSize"),
      kernel: gl.getUniformLocation(info.program, "u_kernel[0]"),
      kernelWeight: gl.getUniformLocation(info.program, "u_kernelWeight"),
    };
    gl.useProgram(info.program);
    gl.uniform1i(this.program.scene, 0);
  }

  // Elige un efecto de KERNELS ("none" lo desactiva).
  setEffect(name) {
    if (name === "none") {
      this.effect = "none";
      this.kernel = null;
      return;
    }
    if (!KERNELS[name]) throw new Error(`No existe el efecto "${name}"`);
    this.effect = name;
    this.setKernel(KERNELS[name]);
  }

  setKernel(values) {
    if (values.length !== 9) throw new Error("El kernel debe tener 9 valores (3x3)");
    const sum = values.reduce((total, value) => total + value, 0);
    this.kernel = new Float32Array(values);
    this.kernelWeight = sum <= 0 ? 1 : sum; // los kernels que suman 0 (bordes) no se normalizan
  }

  // Deja el framebuffer de la escena listo para dibujar (reasigna si cambió el tamaño).
  begin(width, height) {
    if (width !== this.width || height !== this.height) this.allocate(width, height);
    this.bind();
  }

  bind() {
    const { gl } = this;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.sceneFbo);
    gl.viewport(0, 0, this.width, this.height);
  }

  allocate(width, height) {
    const { gl } = this;
    this.release();
    this.width = width;
    this.height = height;

    this.colorBuffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, this.colorBuffer);
    gl.renderbufferStorageMultisample(gl.RENDERBUFFER, this.samples, gl.RGBA8, width, height);
    this.depthBuffer = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, this.depthBuffer);
    gl.renderbufferStorageMultisample(gl.RENDERBUFFER, this.samples, gl.DEPTH24_STENCIL8, width, height);

    this.sceneFbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.sceneFbo);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, this.colorBuffer);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_STENCIL_ATTACHMENT, gl.RENDERBUFFER, this.depthBuffer);

    this.resolveTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.resolveTexture);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, width, height);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    this.resolveFbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.resolveFbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.resolveTexture, 0);

    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
      throw new Error("No se pudo crear el framebuffer de postprocesado");
    }
  }

  // Resuelve el MSAA y dibuja el resultado en el canvas.
  present() {
    const { gl, width, height } = this;
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.sceneFbo);

    if (!this.kernel || !this.program) {
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
      gl.blitFramebuffer(0, 0, width, height, 0, 0, width, height, gl.COLOR_BUFFER_BIT, gl.NEAREST);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      return;
    }

    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this.resolveFbo);
    gl.blitFramebuffer(0, 0, width, height, 0, 0, width, height, gl.COLOR_BUFFER_BIT, gl.NEAREST);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    gl.disable(gl.DEPTH_TEST);
    gl.useProgram(this.program.program);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.resolveTexture);
    gl.uniform2f(this.program.texelSize, 1 / width, 1 / height);
    gl.uniform1fv(this.program.kernel, this.kernel);
    gl.uniform1f(this.program.kernelWeight, this.kernelWeight);
    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);
    gl.enable(gl.DEPTH_TEST);
  }

  release() {
    const { gl } = this;
    if (this.sceneFbo) gl.deleteFramebuffer(this.sceneFbo);
    if (this.resolveFbo) gl.deleteFramebuffer(this.resolveFbo);
    if (this.colorBuffer) gl.deleteRenderbuffer(this.colorBuffer);
    if (this.depthBuffer) gl.deleteRenderbuffer(this.depthBuffer);
    if (this.resolveTexture) gl.deleteTexture(this.resolveTexture);
    this.sceneFbo = this.resolveFbo = this.colorBuffer = this.depthBuffer = this.resolveTexture = null;
  }

  dispose() {
    this.release();
    this.gl.deleteVertexArray(this.vao);
  }
}
