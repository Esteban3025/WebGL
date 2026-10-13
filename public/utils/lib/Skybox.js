import { mat4, vec3 } from "../../dist/esm/index.js";
import { cameraFront, cameraPos, cameraUp } from "./constants.js";
import { loadShader } from "./CreateObject.js";

const CUBE_FACES = [
  ["right", "TEXTURE_CUBE_MAP_POSITIVE_X"],
  ["left", "TEXTURE_CUBE_MAP_NEGATIVE_X"],
  ["top", "TEXTURE_CUBE_MAP_POSITIVE_Y"],
  ["bottom", "TEXTURE_CUBE_MAP_NEGATIVE_Y"],
  ["front", "TEXTURE_CUBE_MAP_POSITIVE_Z"],
  ["back", "TEXTURE_CUBE_MAP_NEGATIVE_Z"],
];

export class Skybox {
  constructor(gl) {
    this.gl = gl;
    this.program = null;
    this.texture = null;
    this.buffer = null;
    this.locations = null;
  }

  async initialize(textures) {
    const [vertexSource, fragmentSource] = await Promise.all([
      loadShader("skybox.vs"),
      loadShader("skybox.fs"),
    ]);
    this.program = this.createProgram(vertexSource, fragmentSource);
    this.createGeometry();
    await this.setTextures(textures);
  }

  async setTextures(textures) {
    for (const [name] of CUBE_FACES) {
      if (!textures[name]) {
        throw new Error(`Falta la textura "${name}" del skybox`);
      }
    }

    const gl = this.gl;
    if (this.texture) gl.deleteTexture(this.texture);
    this.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.texture);

    for (const [, targetName] of CUBE_FACES) {
      gl.texImage2D(
        gl[targetName],
        0,
        gl.RGBA,
        1,
        1,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        new Uint8Array([0, 0, 0, 255]),
      );
    }

    const images = await Promise.all(
      CUBE_FACES.map(([name]) => this.loadImage(textures[name])),
    );
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    CUBE_FACES.forEach(([, targetName], index) => {
      gl.texImage2D(
        gl[targetName],
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        images[index],
      );
    });
    gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
    gl.texParameteri(
      gl.TEXTURE_CUBE_MAP,
      gl.TEXTURE_MIN_FILTER,
      gl.LINEAR_MIPMAP_LINEAR,
    );
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  }

  draw() {
    if (!this.program || !this.texture) return;

    const gl = this.gl;
    const view = mat4.lookAt(
      mat4.create(),
      cameraPos,
      vec3.add(vec3.create(), cameraPos, cameraFront),
      cameraUp,
    );
    const projection = mat4.perspective(
      mat4.create(),
      Math.PI / 4,
      gl.canvas.width / gl.canvas.height,
      1,
      10000,
    );

    gl.depthFunc(gl.LEQUAL);
    gl.depthMask(false);
    gl.useProgram(this.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.enableVertexAttribArray(this.locations.position);
    gl.vertexAttribPointer(this.locations.position, 3, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.texture);
    gl.uniform1i(this.locations.texture, 0);
    gl.uniformMatrix4fv(this.locations.view, false, view);
    gl.uniformMatrix4fv(this.locations.projection, false, projection);
    gl.drawArrays(gl.TRIANGLES, 0, 36);
    gl.depthMask(true);
    gl.depthFunc(gl.LESS);
  }

  dispose() {
    const gl = this.gl;
    if (this.buffer) gl.deleteBuffer(this.buffer);
    if (this.texture) gl.deleteTexture(this.texture);
    if (this.program) gl.deleteProgram(this.program);
    this.buffer = null;
    this.texture = null;
    this.program = null;
  }

  createGeometry() {
    const gl = this.gl;
    const vertices = new Float32Array([
      -1, 1, -1, -1, -1, -1, 1, -1, -1, 1, -1, -1, 1, 1, -1, -1, 1, -1,
      -1, -1, 1, -1, -1, -1, -1, 1, -1, -1, 1, -1, -1, 1, 1, -1, -1, 1,
      1, -1, -1, 1, -1, 1, 1, 1, 1, 1, 1, 1, 1, 1, -1, 1, -1, -1,
      -1, -1, 1, -1, 1, 1, -1, 1, 1, -1, 1, -1, -1, -1, -1, 1, -1, -1,
      -1, 1, -1, 1, 1, -1, 1, 1, 1, 1, 1, 1, 1, -1, 1, 1, -1, -1,
      -1, -1, -1, -1, -1, 1, 1, -1, 1, 1, -1, 1, 1, -1, -1, -1, -1, -1,
    ]);
    this.buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
  }

  createProgram(vertexSource, fragmentSource) {
    const gl = this.gl;
    const program = gl.createProgram();
    for (const [type, source] of [
      [gl.VERTEX_SHADER, vertexSource],
      [gl.FRAGMENT_SHADER, fragmentSource],
    ]) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const error = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw new Error(`Error compilando shader del skybox: ${error}`);
      }
      gl.attachShader(program, shader);
      gl.deleteShader(shader);
    }
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(`Error enlazando skybox: ${gl.getProgramInfoLog(program)}`);
    }
    this.locations = {
      position: gl.getAttribLocation(program, "a_position"),
      view: gl.getUniformLocation(program, "view"),
      projection: gl.getUniformLocation(program, "projection"),
      texture: gl.getUniformLocation(program, "u_skybox"),
    };
    return program;
  }

  loadImage(path) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener("load", () => resolve(image));
      image.addEventListener("error", () => {
        reject(new Error(`No se pudo cargar la textura del skybox: ${path}`));
      });
      image.src = path.startsWith("/") ? path : `/res/${path}`;
    });
  }
}
