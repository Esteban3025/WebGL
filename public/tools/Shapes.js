import  { m4 }  from "./maths.js";

class Shapes {
  canvas = document.getElementById('canvas');
  gl = canvas.getContext('webgl');
  webglProgram = createWebGLProgramFromIds(this.gl, "vertex-shader-3d", "fragment-shader-3d");
  positionLocation;
  colorLocation;
  matrixLocation;
  constructor() {
    const gl = this.gl;
    gl.useProgram(this.webglProgram);
    this.positionLocation = gl.getAttribLocation(this.webglProgram, 'a_position');
    this.matrixLocation = gl.getUniformLocation(this.webglProgram, "u_matrix");
    this.colorLocation = gl.getUniformLocation(this.webglProgram, "u_color");

    gl.enable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);
  }

  draw(setting) {
    const data = new Float32Array(setting.positions);

    const gl = this.gl;

    if (!gl) {
      throw new Error('No se pudo iniciar webgl');
    }

    const translation = [0, 0, 0];
    const rotation = [degToRad(40), degToRad(25), degToRad(325)];
    const scale = [1, 1, 1];

    webglUtils.resizeCanvasToDisplaySize(gl.canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const zNear = 1;
    const zFar = 2000;
    const cameraAngleRadians = degToRad(0);
    const fieldOfViewRadians = degToRad(60);
    const projectionMatrix = m4.perspective(fieldOfViewRadians, aspect, zNear, zFar);

    const numFs = 5;
    const radius = 200;
 
    // Compute a matrix for the camera
    let cameraMatrix = m4.yRotation(cameraAngleRadians);
    cameraMatrix = m4.translate(cameraMatrix, 0, 0, radius * 1.5);

    const viewMatrix = m4.inverse(cameraMatrix)

    const viewProjectionMatrix = m4.multiply(projectionMatrix, viewMatrix);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);

    gl.enableVertexAttribArray(this.positionLocation);
    gl.vertexAttribPointer(this.positionLocation, 3, gl.FLOAT, false, 0, 0);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.clearColor(0, 0, 0.5, 1);

    gl.uniform4fv(this.colorLocation, setting.color);

    for (let ii = 0; ii < numFs; ++ii) {
      const angle = ii * Math.PI * 2 / numFs;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius
 
      const matrix = m4.translate(viewProjectionMatrix, x, 0, y);
 
      gl.uniformMatrix4fv(this.matrixLocation, false, matrix);
 
      gl.drawArrays(gl.TRIANGLES, 0, 16 * 6);
    }   
  }

  drawScene(){

  }

  updateCameraAngle(event, ui) {
    cameraAngleRadians = degToRad(ui.value);
    this.draw();
  }
}

function createShader(gl, source, type) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (success) {
    return shader;
  }

  console.log(gl.getShaderInfoLog(shader));
  gl.deleteShader(shader);
}

function linkProgram(gl, vertexShader, fragmentShader) {
  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  const success = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (success) {
    return program;
  }

  console.log(gl.getProgramInfoLog(program));
  gl.deleteProgram(program);
}

function createWebGLProgram(gl, vertexSourceId, fragmentSourceId) {

  const vertexShader = createShader(gl, vertexSourceId, gl.VERTEX_SHADER);
  const fragmentShader = createShader(gl, fragmentSourceId, gl.FRAGMENT_SHADER);
  return linkProgram(
    gl,
    vertexShader,
    fragmentShader
  );
}

function createWebGLProgramFromIds(gl, vertexSourceId, fragmentSourceId) {
  const vertexSourceEl = document.getElementById(vertexSourceId).textContent;
  const fragmentSourceEl = document.getElementById(fragmentSourceId).textContent;
  
  return createWebGLProgram(
    gl,
    vertexSourceEl,
    fragmentSourceEl,
  );
}

function radToDeg(r) {
  return r * 180 / Math.PI;
}

function degToRad(d) {
  return d * Math.PI / 180;
}

export {Shapes};