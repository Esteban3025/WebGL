import { mat4, vec3 } from "../../dist/esm/index.js";
import { cameraFront, cameraPos, cameraUp } from "./constants.js";
import { loadShader } from "./CreateObject.js";

const MAX_LIGHTS = 8;

export class LightManager {
  constructor(gl, position) {
    this.gl = gl;
    this.position = position;
    this.lights = new Map();
    this.enabled = true;
    this.markerVisible = true;
    this.previousKeys = new Set();
    this.markerProgram = null;
    this.markerBuffer = null;
    this.markerUniforms = null;
    this.programUniforms = new WeakMap();

    this.addLight("ambient", {
      type: "ambient",
      color: [1, 1, 1],
      intensity: 0.2,
    });
    this.addLight("main", {
      type: "point",
      position: [position.x, position.y, position.z],
      color: [1, 0.85, 0.65],
      intensity: 1.5,
      enabled: true,
    });
    this.addLight("sun", {
      type: "directional",
      direction: [-0.4, -1, -0.3],
      color: [0.65, 0.75, 1],
      intensity: 0.6,
    });
  }

  addLight(id, light) {
    if (this.lights.size >= MAX_LIGHTS) {
      throw new Error(`No se pueden registrar más de ${MAX_LIGHTS} luces`);
    }
    this.lights.set(id, {
      type: light.type,
      position: light.position || [0, 0, 0],
      direction: light.direction || [0, -1, 0],
      color: light.color || [1, 1, 1],
      intensity: light.intensity ?? 1,
      enabled: light.enabled ?? true,
    });
  }

  removeLight(id) {
    if (id === "ambient" || id === "main") {
      throw new Error(`La luz "${id}" es requerida por la escena`);
    }
    this.lights.delete(id);
  }

  setLightEnabled(id, enabled) {
    const light = this.lights.get(id);
    if (!light) {
      throw new Error(`No existe la luz "${id}"`);
    }
    light.enabled = enabled;
  }

  update(deltaTime, keys) {
    const ligthMovementSpeed = deltaTime * 20;
    const justPressed = (key) => keys.has(key) && !this.previousKeys.has(key);
    if (justPressed("l")) this.enabled = !this.enabled;
    if (justPressed("h")) this.markerVisible = !this.markerVisible;

    const mainLight = this.lights.get("main");
    if (mainLight) {
      if (keys.has("arrowright")) this.position.x += ligthMovementSpeed;
      if (keys.has("arrowleft")) this.position.x -= ligthMovementSpeed;
      if (keys.has("arrowup") && !keys.has("control")) this.position.z -= ligthMovementSpeed;
      if (keys.has("arrowdown") && !keys.has("control")) this.position.z += ligthMovementSpeed;
      if (keys.has("arrowup") && keys.has("control")) this.position.y += ligthMovementSpeed;
      if (keys.has("arrowdown") && keys.has("control")) this.position.y -= ligthMovementSpeed;
      mainLight.position[0] = this.position.x;
      mainLight.position[1] = this.position.y;
      mainLight.position[2] = this.position.z;
    }

    this.previousKeys = new Set(keys);
  }

  applyToProgram(gl, program) {
    const lights = this.enabled
      ? [...this.lights.values()].filter((light) => light.enabled).slice(0, MAX_LIGHTS)
      : [];
    const positions = [];
    const directions = [];
    const colors = [];
    const types = [];
    const intensities = [];

    for (const light of lights) {
      types.push(light.type === "ambient" ? 0 : light.type === "directional" ? 1 : 2);
      positions.push(...light.position);
      directions.push(...light.direction);
      colors.push(...light.color);
      intensities.push(light.intensity);
    }

    let uniforms = this.programUniforms.get(program);
    if (!uniforms) {
      uniforms = {
        count: gl.getUniformLocation(program, "u_lightCount"),
        types: gl.getUniformLocation(program, "u_lightTypes[0]"),
        positions: gl.getUniformLocation(program, "u_lightPositions[0]"),
        directions: gl.getUniformLocation(program, "u_lightDirections[0]"),
        colors: gl.getUniformLocation(program, "u_lightColors[0]"),
        intensities: gl.getUniformLocation(program, "u_lightIntensities[0]"),
      };
      this.programUniforms.set(program, uniforms);
    }

    gl.uniform1i(uniforms.count, lights.length);
    gl.uniform1iv(uniforms.types, types);
    gl.uniform3fv(uniforms.positions, positions);
    gl.uniform3fv(uniforms.directions, directions);
    gl.uniform3fv(uniforms.colors, colors);
    gl.uniform1fv(uniforms.intensities, intensities);
  }

  async initializeMarker() {
    const gl = this.gl;
    const vertexSource = await loadShader("light.vs");
    const fragmentSource = await loadShader("light.fs");
    const vertexShader = this.compileShader(gl.VERTEX_SHADER, vertexSource);
    const fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, fragmentSource);
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program));
    }

    this.markerProgram = program;
    this.markerBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.markerBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 0, 1, -1, 0, -1, 1, 0, 1, 1, 0]),
      gl.STATIC_DRAW,
    );
    this.markerUniforms = {
      position: gl.getAttribLocation(program, "a_position"),
      model: gl.getUniformLocation(program, "model"),
      view: gl.getUniformLocation(program, "view"),
      projection: gl.getUniformLocation(program, "projection"),
    };
  }

  drawMarker() {
    if (!this.markerVisible || !this.enabled || !this.markerProgram) return;

    const gl = this.gl;
    const mainLight = this.lights.get("main");
    if (!mainLight || !mainLight.enabled) return;

    const view = mat4.lookAt(mat4.create(), cameraPos, vec3.add(vec3.create(), cameraPos, cameraFront), cameraUp);
    const projection = mat4.perspective(
      mat4.create(),
      Math.PI / 4,
      gl.canvas.width / gl.canvas.height,
      1,
      10000,
    );
    const model = mat4.translate(mat4.create(), mat4.create(), mainLight.position);
    mat4.scale(model, model, [5, 5, 5]);

    gl.useProgram(this.markerProgram);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.markerBuffer);
    gl.enableVertexAttribArray(this.markerUniforms.position);
    gl.vertexAttribPointer(this.markerUniforms.position, 3, gl.FLOAT, false, 0, 0);
    gl.uniformMatrix4fv(this.markerUniforms.model, false, model);
    gl.uniformMatrix4fv(this.markerUniforms.view, false, view);
    gl.uniformMatrix4fv(this.markerUniforms.projection, false, projection);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  compileShader(type, source) {
    const shader = this.gl.createShader(type);
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);
    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      throw new Error(this.gl.getShaderInfoLog(shader));
    }
    return shader;
  }
}
