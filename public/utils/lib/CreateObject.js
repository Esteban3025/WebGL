import { m4 } from "../Math.js";
import {
  light,
  cameraPos,
  cameraFront,
  currentDirection,
  cameraUp,
} from "./constants.js";
import { mat4, vec3 } from "../../dist/esm/index.js";

export class CreateObject {
  /**
   * @param {WebGLRenderingContext} gl - El contexto de WebGL.
   * @param {Array|Float32Array} vertices - Coordenadas de los vértices (ej: [x,y, z...]).
   * @param {Number} vertexCount - Número total de vértices a renderizar.
   */

  constructor(gl, vertices, vertexCount, model, normals = null) {
    this.gl = gl;
    this.vertexCount = vertexCount;
    this.vertices = vertices;
    this.normals = normals;
    this.model = model;

    this.textures = new Map();
    this.texture = null;
    this.program = null;
    this.uniformLocations = {};
    this._setupObj();
  }

  _setupObj() {
    const gl = this.gl;
    let vertices = new Float32Array(this.vertices);
    let normals = new Float32Array(this.normals);
    const coordenadasTextura = [];

    for (let i = 0; i < this.vertices.length; i += 3) {
      const x = this.vertices[i];
      const y = this.vertices[i + 1]; // El índice i+2 (Z) no lo usamos para la textura

      const u = (x + 1) / 2;
      const v = (y + 1) / 2;

      coordenadasTextura.push(u, v);
    }

    const v = new Float32Array(coordenadasTextura);

    this.objectBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.objectBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    this.textureBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.textureBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, v, gl.STATIC_DRAW);

    this.objectNormalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.objectNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, normals, gl.STATIC_DRAW);

    this._resize();
  }

  _createTexture(path) {
    const gl = this.gl;
    const texture = gl.createTexture();
    this.texture = texture;

    // gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);

    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      1,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      new Uint8Array([0, 0, 255, 255]),
    );

    const image = new Image();
    image.src = `/res/${path}`;
    image.addEventListener("load", () => {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        image,
      );

      if (this._isPowerOf2(image.width) && this._isPowerOf2(image.height)) {
        gl.generateMipmap(gl.TEXTURE_2D);
      } else {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      }
      // gl.generateMipmap(gl.TEXTURE_2D);
      // gl.texParameteri(
      //   gl.TEXTURE_2D,
      //   gl.TEXTURE_MIN_FILTER,
      //   gl.LINEAR_MIPMAP_LINEAR,
      // );
      // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    });
    image.addEventListener("error", () => {
      console.error(`No se pudo cargar la textura: ${image.src}`);
    });
  }

  _isPowerOf2(value) {
    return value > 0 && (value & (value - 1)) === 0;
  }

  _compileShader(type, source) {
    const gl = this.gl;
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    const compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (!compiled) {
      // Something went wrong during compilation; get the error
      const lastError = gl.getShaderInfoLog(shader);
      console.error(`${type} : Error compiling shader: ${lastError}`);
      gl.deleteShader(shader);
      return null;
    }
    // console.log(gl.getShaderInfoLog(shader));
    return shader;
  }

  _setProgram(vs_source, fs_source) {
    const gl = this.gl;

    const vertexShader = this._compileShader(gl.VERTEX_SHADER, vs_source);
    const fragmentShader = this._compileShader(gl.FRAGMENT_SHADER, fs_source);

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    const success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (!success) {
      console.error(success);
    }

    this.program = program;
    gl.useProgram(program);
    // console.log(vs_source);
    // console.log(fs_source);

    const posLoc = gl.getAttribLocation(program, "a_position");
    if (posLoc >= 0) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.objectBuffer);
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);
    }

    const texLoc = gl.getAttribLocation(program, "a_texcoord");
    if (texLoc >= 0) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.textureBuffer);
      gl.enableVertexAttribArray(texLoc);
      gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, 0, 0);
    }

    const normalLoc = gl.getAttribLocation(program, "a_normal");
    if (normalLoc >= 0) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.objectNormalBuffer);
      gl.enableVertexAttribArray(normalLoc);
      gl.vertexAttribPointer(normalLoc, 3, gl.FLOAT, false, 0, 0);
    }

    this.uniformLocations = {
      model: gl.getUniformLocation(program, "model"),
      view: gl.getUniformLocation(program, "view"),
      projection: gl.getUniformLocation(program, "projection"),
      reverseLightDirection: gl.getUniformLocation(
        program,
        "u_reverseLightDirection",
      ),
      color: gl.getUniformLocation(program, "u_color"),
      texture: gl.getUniformLocation(program, "u_texture"),
    };

    console.log(gl.getProgramInfoLog(program));
  }

  _updateUniforms() {
    const gl = this.gl;
    let model = this.model;

    gl.uniform4fv(
      this.uniformLocations.reverseLightDirection,
      m4.normalize([light.x, light.y, light.z]),
    );
    gl.uniform4fv(this.uniformLocations.color, [
      model.color.r,
      model.color.g,
      model.color.b,
      1,
    ]);

    let view = mat4.create();

    vec3.add(currentDirection, cameraPos, cameraFront);
    view = mat4.lookAt(view, cameraPos, currentDirection, cameraUp);
    gl.uniformMatrix4fv(this.uniformLocations.view, false, view);

    let aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;

    let projection = mat4.create();
    projection = mat4.perspective(
      projection,
      m4.degToRad(45),
      aspect,
      1,
      10000,
    );
    gl.uniformMatrix4fv(this.uniformLocations.projection, false, projection);

    let objectModel = mat4.create();
    objectModel = mat4.translate(objectModel, objectModel, model.translate);
    objectModel = mat4.scale(objectModel, objectModel, model.scale);
    objectModel = mat4.rotateX(
      objectModel,
      objectModel,
      m4.degToRad(model.deg),
    );
    objectModel = mat4.rotateZ(
      objectModel,
      objectModel,
      m4.degToRad(model.degZ),
    );

    gl.uniformMatrix4fv(this.uniformLocations.model, false, objectModel);
  }

  _resize() {
    const gl = this.gl;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.floor(gl.canvas.clientWidth * dpr);
    const h = Math.floor(gl.canvas.clientHeight * dpr);
    if (gl.canvas.clientWidth !== w || gl.canvas.clientHeight !== h) {
      gl.canvas.width = w;
      gl.canvas.height = h;
    }
    // gl.viewport le dice a WebGL en que area del canvas dibujar.
    gl.viewport(0, 0, gl.canvas.clientWidth, gl.canvas.clientHeight);
  }

  draw(mode = this.gl.TRIANGLES) {
    const gl = this.gl;
    gl.useProgram(this.program);
    if (this.uniformLocations.texture !== null && this.texture !== null) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      gl.uniform1i(this.uniformLocations.texture, 0);
    }

    this._resize();
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    // gl.bindBuffer(gl.ARRAY_BUFFER, this.objectBuffer);
    this._updateUniforms();
    gl.drawArrays(mode, 0, this.vertexCount);
  }

  // Limpieza de memoria en la GPU cuando el objeto ya no se use
  delete() {
    if (this.objectBuffer) {
      this.gl.deleteBuffer(this.objectBuffer);
      this.objectBuffer = null;
    }
    if (this.objectNormalBuffer) {
      this.gl.deleteBuffer(this.objectNormalBuffer);
      this.objectNormalBuffer = null;
    }
  }
}

export async function loadShader(path) {
  const res = await fetch("shaders/" + path);
  const source = await res.text();
  console.log(source);
  return source;
}
