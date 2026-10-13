import { m4 } from "../Math.js";
import {
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

  constructor(gl, vertices, vertexCount, model, normals = null, texcoords = null) {
    this.gl = gl;
    this.vertexCount = vertexCount;
    this.vertices = vertices;
    this.normals = normals;
    this.texcoords = texcoords;
    this.model = model;
    this.mode = gl.TRIANGLES;
    this.materialColor = [1, 1, 1];

    this.texture = null;
    this.textures = new Map();
    this.lighting = null;
    this.program = null;
    this.uniformLocations = {};
    this._setupObj();
  }

  _setupObj() {
    const gl = this.gl;
    let vertices = new Float32Array(this.vertices);
    let normals = new Float32Array(this.normals);
    const coordenadasTextura = [];

    if (this.texcoords) {
      coordenadasTextura.push(...this.texcoords);
    } else {
      for (let i = 0; i < this.vertices.length; i += 3) {
        const x = this.vertices[i];
        const y = this.vertices[i + 1];

        const u = (x + 1) / 2;
        const v = (y + 1) / 2;

        coordenadasTextura.push(u, v);
      }
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

  }

  _createTexture(source, slot = "diffuse") {
    const gl = this.gl;
    const texture = gl.createTexture();
    this.textures.set(slot, texture);
    if (slot === "diffuse") this.texture = texture;

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

    const upload = (image) => {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        image
      );

      if (this._isPowerOf2(image.width) && this._isPowerOf2(image.height)) {
        gl.generateMipmap(gl.TEXTURE_2D);
      } else {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      }
    };

    if (typeof source === "string") {
      return new Promise((resolve, reject) => {
        const image = new Image();
        image.addEventListener("load", () => {
          upload(image);
          resolve();
        });
        image.addEventListener("error", () => {
          reject(new Error(`No se pudo cargar la textura: ${image.src}`));
        });
        image.src = source.startsWith("/") || source.startsWith("data:")
          ? source
          : `/res/${source}`;
      });
    } else if (source) {
      if (source.complete === false) {
        return new Promise((resolve, reject) => {
          source.addEventListener("load", () => {
            upload(source);
            resolve();
          }, { once: true });
          source.addEventListener("error", () => {
            reject(new Error("No se pudo cargar una textura de material"));
          }, { once: true });
        });
      }
      upload(source);
      return Promise.resolve();
    }
    return Promise.reject(new Error(`Textura inválida para "${slot}"`));
  }

  _createSolidTexture(color, slot = "diffuse") {
    const gl = this.gl;
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      1,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      new Uint8Array(color),
    );
    this.textures.set(slot, texture);
    if (slot === "diffuse") this.texture = texture;
    return Promise.resolve();
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
    this.attributeLocations = {
      position: posLoc,
      texcoord: gl.getAttribLocation(program, "a_texcoord"),
      normal: gl.getAttribLocation(program, "a_normal"),
    };
    if (posLoc >= 0) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.objectBuffer);
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);
    }

    const texLoc = this.attributeLocations.texcoord;
    if (texLoc >= 0) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.textureBuffer);
      gl.enableVertexAttribArray(texLoc);
      gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, 0, 0);
    }

    const normalLoc = this.attributeLocations.normal;
    if (normalLoc >= 0) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.objectNormalBuffer);
      gl.enableVertexAttribArray(normalLoc);
      gl.vertexAttribPointer(normalLoc, 3, gl.FLOAT, false, 0, 0);
    }

    this.uniformLocations = {
      model: gl.getUniformLocation(program, "model"),
      view: gl.getUniformLocation(program, "view"),
      projection: gl.getUniformLocation(program, "projection"),
      color: gl.getUniformLocation(program, "u_color"),
      texture: gl.getUniformLocation(program, "u_texture"),
      diffuseMap: gl.getUniformLocation(program, "u_diffuseMap"),
      specularMap: gl.getUniformLocation(program, "u_specularMap"),
      normalMap: gl.getUniformLocation(program, "u_normalMap"),
      emissiveMap: gl.getUniformLocation(program, "u_emissiveMap"),
      hasSpecularMap: gl.getUniformLocation(program, "u_hasSpecularMap"),
      hasNormalMap: gl.getUniformLocation(program, "u_hasNormalMap"),
      hasEmissiveMap: gl.getUniformLocation(program, "u_hasEmissiveMap"),
      materialColor: gl.getUniformLocation(program, "u_materialColor"),
    };

    console.log(gl.getProgramInfoLog(program));
  }

  _updateUniforms() {
    const gl = this.gl;
    let model = this.model;

    if (this.uniformLocations.color) {
      gl.uniform4fv(this.uniformLocations.color, [
        model.color.r,
        model.color.g,
        model.color.b,
        1,
      ]);
    }
    if (this.uniformLocations.materialColor) {
      gl.uniform3fv(this.uniformLocations.materialColor, this.materialColor);
    }

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
    if (this.lighting) {
      this.lighting.applyToProgram(gl, this.program);
    }
  }

  setLighting(lighting) {
    this.lighting = lighting;
  }

  setMaterialColor(color) {
    this.materialColor = color;
  }

  setMode(mode) {
    this.mode = mode;
  }

  draw(mode = this.mode) {
    const gl = this.gl;
    gl.useProgram(this.program);
    if (this.uniformLocations.texture !== null && this.texture !== null) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      gl.uniform1i(this.uniformLocations.texture, 0);
    }
    const diffuse = this.textures.get("diffuse");
    const specular = this.textures.get("specular");
    const normalMap = this.textures.get("normal");
    const emissive = this.textures.get("emissive");
    if (this.uniformLocations.diffuseMap !== null && diffuse) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, diffuse);
      gl.uniform1i(this.uniformLocations.diffuseMap, 0);
    }
    if (this.uniformLocations.specularMap !== null) {
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, specular || diffuse);
      gl.uniform1i(this.uniformLocations.specularMap, 1);
      gl.uniform1i(this.uniformLocations.hasSpecularMap, specular ? 1 : 0);
    }
    if (this.uniformLocations.normalMap !== null) {
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, normalMap || diffuse);
      gl.uniform1i(this.uniformLocations.normalMap, 2);
      gl.uniform1i(this.uniformLocations.hasNormalMap, normalMap ? 1 : 0);
    }
    if (this.uniformLocations.emissiveMap !== null) {
      gl.activeTexture(gl.TEXTURE3);
      gl.bindTexture(gl.TEXTURE_2D, emissive || diffuse);
      gl.uniform1i(this.uniformLocations.emissiveMap, 3);
      gl.uniform1i(this.uniformLocations.hasEmissiveMap, emissive ? 1 : 0);
    }

    const { position, texcoord, normal } = this.attributeLocations;
    if (position >= 0) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.objectBuffer);
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 3, gl.FLOAT, false, 0, 0);
    }
    if (texcoord >= 0) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.textureBuffer);
      gl.enableVertexAttribArray(texcoord);
      gl.vertexAttribPointer(texcoord, 2, gl.FLOAT, false, 0, 0);
    }
    if (normal >= 0) {
      gl.bindBuffer(gl.ARRAY_BUFFER, this.objectNormalBuffer);
      gl.enableVertexAttribArray(normal);
      gl.vertexAttribPointer(normal, 3, gl.FLOAT, false, 0, 0);
    }

    this._updateUniforms();
    gl.drawArrays(mode, 0, this.vertexCount);
  }

  // Limpieza de memoria en la GPU cuando el objeto ya no se use
  delete() {
    const gl = this.gl;
    if (this.objectBuffer) {
      gl.deleteBuffer(this.objectBuffer);
      this.objectBuffer = null;
    }
    if (this.textureBuffer) {
      gl.deleteBuffer(this.textureBuffer);
      this.textureBuffer = null;
    }
    if (this.objectNormalBuffer) {
      gl.deleteBuffer(this.objectNormalBuffer);
      this.objectNormalBuffer = null;
    }
    for (const texture of this.textures.values()) gl.deleteTexture(texture);
    this.textures.clear();
    this.texture = null;
    if (this.program) {
      gl.deleteProgram(this.program);
      this.program = null;
    }
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
