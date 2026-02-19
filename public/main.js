import { WebGL2Utils } from './utils/WebGLUtils.js';
import { Shapes } from './utils/Shapes.js';

const utils = new WebGL2Utils();
const shapes = new Shapes();

let u_mouse = { x: 0, y: 0};
let position = { x: 0, y: 0};


async function main() {
  // Get A WebGL context
  const canvas = document.querySelector("#c");
  const gl = canvas.getContext("webgl2");
  
  if (!gl) {
    return;
  }

  document.addEventListener("keydown", e => {
    let keys = e.key;
    utils.processInput(gl, keys, position); // Process all the keyboard input
    drawScene();
  })

  // create GLSL shaders, upload the GLSL source, compile the shaders
  const vertexShader = await utils.createShader(gl, gl.VERTEX_SHADER, "/shaders/main.vs");
  const fragmentShader = await utils.createShader(gl, gl.FRAGMENT_SHADER, "/shaders/main.fs");

  // Link the two shaders into a program
  const program = utils.createProgram(gl, vertexShader, fragmentShader);

  // look up where the vertex data needs to go.
  const positionAttributeLocation = gl.getAttribLocation(program, "a_position");

  const resolutionUniform = gl.getUniformLocation(program, "u_resolution");
  const timeUniform = gl.getUniformLocation(program, "u_time");
  const mouseUniform = gl.getUniformLocation(program, "u_mouse");
  const colorUniform = gl.getUniformLocation(program, "u_color");

  const translationUniform = gl.getUniformLocation(program, "u_translation");

  // Create a buffer and put three 2d clip space points in it
  const positionBuffer = gl.createBuffer();

  // Bind it to ARRAY_BUFFER (think of it as ARRAY_BUFFER = positionBuffer)
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

  // Create a vertex array object (attribute state)
  const vao = gl.createVertexArray();

  // and make it the one we're currently working with
  gl.bindVertexArray(vao);

  // Turn on the attribute
  gl.enableVertexAttribArray(positionAttributeLocation);

  // Tell the attribute how to get data out of positionBuffer (ARRAY_BUFFER)
  const size = 2;          // 2 components per iteration
  const type = gl.FLOAT;   // the data is 32bit floats
  const normalize = false; // don't normalize the data
  const stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
  const offset = 0;
  gl.vertexAttribPointer(
      positionAttributeLocation, size, type, normalize, stride, offset);

  requestAnimationFrame(drawScene);

  function drawScene(time) {
    utils.resizeCanvasToDisplaySize(gl.canvas);
    // Tell WebGL how to convert from clip space to pixels
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    const mousePOS = Object.values(u_mouse); // make an object a vector;
    let translation = [position.x, position.y];

    canvas.onmousemove = (e) => {
      u_mouse.x = e.pageX
      u_mouse.y = e.pageY
      // console.log(e.pageX, " ",  e.pageY);
    }
    
    // Clear the canvas
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Tell it to use our program (pair of shaders)
    gl.useProgram(program);
  
    // set uniforms
    gl.uniform2fv(mouseUniform, mousePOS);
    gl.uniform2fv(translationUniform, translation);

    gl.uniform2f(resolutionUniform, gl.canvas.width, gl.canvas.height);
    gl.uniform1f(timeUniform, time  * 0.001);

    gl.uniform3f(colorUniform, Math.random(), Math.random(), Math.random());

    // Bind the attribute/buffer set we want.
    gl.bindVertexArray(vao);

    // draw
    const primitiveType = gl.TRIANGLES;
    const offset = 0;
    const count = 18;
    shapes.setF(gl);
      gl.drawArrays(primitiveType, offset, count);
  }  
}

main();
