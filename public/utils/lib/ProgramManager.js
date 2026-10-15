import { ATTRIBUTE_LOCATIONS } from "./VertexFormat.js";

// Unidades de textura fijas por slot de material.
export const TEXTURE_UNITS = { diffuse: 0, specular: 1, normal: 2, emissive: 3 };

const SAMPLER_UNIFORMS = {
  u_texture: TEXTURE_UNITS.diffuse,
  u_diffuseMap: TEXTURE_UNITS.diffuse,
  u_specularMap: TEXTURE_UNITS.specular,
  u_normalMap: TEXTURE_UNITS.normal,
  u_emissiveMap: TEXTURE_UNITS.emissive,
};

// Un programa por par único de shaders, compartido entre todos los objetos.
export class ProgramManager {
  constructor(gl) {
    this.gl = gl;
    this.programs = new Map();
    this.nextId = 1;
  }

  get(vertexSource, fragmentSource) {
    const key = `${vertexSource}\u0000${fragmentSource}`;
    let info = this.programs.get(key);
    if (!info) {
      info = this.create(vertexSource, fragmentSource);
      this.programs.set(key, info);
    }
    return info;
  }

  create(vertexSource, fragmentSource) {
    const { gl } = this;
    const vertexShader = this.compile(gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = this.compile(gl.FRAGMENT_SHADER, fragmentSource);
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    for (const [name, location] of Object.entries(ATTRIBUTE_LOCATIONS)) {
      gl.bindAttribLocation(program, location, name);
    }
    gl.linkProgram(program);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const log = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      throw new Error(`Error al enlazar el programa: ${log}`);
    }

    const uniform = (name) => gl.getUniformLocation(program, name);
    const info = {
      id: this.nextId++,
      program,
      uniforms: {
        model: uniform("model"),
        view: uniform("view"),
        projection: uniform("projection"),
        color: uniform("u_color"),
        materialColor: uniform("u_materialColor"),
        hasSpecularMap: uniform("u_hasSpecularMap"),
        hasNormalMap: uniform("u_hasNormalMap"),
        hasEmissiveMap: uniform("u_hasEmissiveMap"),
        outlineColor: uniform("u_outlineColor"),
        outlineWidth: uniform("u_outlineWidth"),
      },
      samplers: { diffuse: false, specular: false, normal: false, emissive: false },
      // Estado de uniforms que persiste en el programa entre frames.
      owner: null,
      ownerVersion: -1,
      flags: -1,
      colorR: NaN,
      colorG: NaN,
      colorB: NaN,
      lightVersion: -1,
    };

    gl.useProgram(program);
    for (const [name, unit] of Object.entries(SAMPLER_UNIFORMS)) {
      const location = uniform(name);
      if (location === null) continue;
      gl.uniform1i(location, unit);
      const slot = Object.keys(TEXTURE_UNITS).find((key) => TEXTURE_UNITS[key] === unit);
      info.samplers[slot] = true;
    }
    return info;
  }

  compile(type, source) {
    const { gl } = this;
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`Error al compilar el shader: ${log}`);
    }
    return shader;
  }

  dispose() {
    for (const info of this.programs.values()) this.gl.deleteProgram(info.program);
    this.programs.clear();
  }
}
