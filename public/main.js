import { WebGL2Utils } from './utils/WebGLUtils.js';
import { Shapes } from './utils/Shapes.js';
import { m4 } from './utils/Math.js';

const utils = new WebGL2Utils();
const shapes = new Shapes();

async function main() {
  const canvas = document.querySelector("#c");
  let gl = canvas.getContext("webgl2");
  if (!gl) {
    return;
  }

  const vertexShader = await utils.createShader(gl, gl.VERTEX_SHADER, '/shaders/main.vs');
  const fragmentShader = await utils.createShader(gl, gl.FRAGMENT_SHADER, '/shaders/main.fs');

  const program = utils.createProgram(gl, vertexShader, fragmentShader);

  const positionAttributeLocation = gl.getAttribLocation(program, "a_position");
  const colorAttributeLocation = gl.getAttribLocation(program, "a_color");

  // look up uniform locations
  const matrixLocation = gl.getUniformLocation(program, "u_matrix");

  // Create a buffer
  const positionBuffer = gl.createBuffer();

  // Create a vertex array object (attribute state)
  const vao = gl.createVertexArray();

  // and make it the one we're currently working with
  gl.bindVertexArray(vao);

  // Turn on the attribute
  gl.enableVertexAttribArray(positionAttributeLocation);

  // Bind it to ARRAY_BUFFER (think of it as ARRAY_BUFFER = positionBuffer)
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  // Set Geometry.
  shapes.addF3d(gl);

  // Tell the attribute how to get data out of positionBuffer (ARRAY_BUFFER)
  let size = 3;          // 3 components per iteration
  let type = gl.FLOAT;   // the data is 32bit floats
  let normalize = false; // don't normalize the data
  let stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
  let offset = 0;        // start at the beginning of the buffer
  gl.vertexAttribPointer(
      positionAttributeLocation, size, type, normalize, stride, offset);

  // create the color buffer, make it the current ARRAY_BUFFER
  // and copy in the color values
  const colorBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  shapes.setColors(gl);

  // Turn on the attribute
  gl.enableVertexAttribArray(colorAttributeLocation);

  // Tell the attribute how to get data out of colorBuffer (ARRAY_BUFFER)
  size = 3;          // 3 components per iteration
  type = gl.UNSIGNED_BYTE;   // the data is 8bit unsigned bytes
  normalize = true;  // convert from 0-255 to 0.0-1.0
  stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next color
  offset = 0;        // start at the beginning of the buffer
  gl.vertexAttribPointer(
      colorAttributeLocation, size, type, normalize, stride, offset);


  function radToDeg(r) {
    return r * 180 / Math.PI;
  }

  function degToRad(d) {
    return d * Math.PI / 180;
  }

  // First let's make some variables
  // to hold the translation,
  let translation = [50, 150, 0];
  let rotation = [degToRad(40), degToRad(25), degToRad(325)];
  let scale = [1, 1, 1];

  utils.processInput(gl, translation);

  console.log('Position: ', translation);
  
  requestAnimationFrame(drawScene);

  // Draw the scene.
  function drawScene() {
    utils.resizeCanvasToDisplaySize(gl.canvas);

    // Tell WebGL how to convert from clip space to pixels
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    // Clear the canvas
    gl.clearColor(0.5, 0.2, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // turn on depth testing
    gl.enable(gl.DEPTH_TEST);

    // tell webgl to cull faces
    gl.enable(gl.CULL_FACE);

    // Tell it to use our program (pair of shaders)
    gl.useProgram(program);

    // Bind the attribute/buffer set we want.
    gl.bindVertexArray(vao);

    // Compute the matrix
    let matrix = m4.projection(gl.canvas.clientWidth, gl.canvas.clientHeight, 400);
    matrix = m4.translate(matrix, translation[0], translation[1], translation[2]);
    matrix = m4.xRotate(matrix, rotation[0]);
    matrix = m4.yRotate(matrix, rotation[1]);
    matrix = m4.zRotate(matrix, rotation[2]);
    matrix = m4.scale(matrix, scale[0], scale[1], scale[2]);

    // Set the matrix.
    gl.uniformMatrix4fv(matrixLocation, false, matrix);

    // Draw the geometry.
    let primitiveType = gl.TRIANGLES;
    let offset = 0;
    let count = 16 * 6;
    gl.drawArrays(primitiveType, offset, count);

    requestAnimationFrame(drawScene);
  }
}

main();