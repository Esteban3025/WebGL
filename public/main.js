/*

░██╗░░░░░░░██╗███████╗██████╗░░██████╗░██╗░░░░░
░██║░░██╗░░██║██╔════╝██╔══██╗██╔════╝░██║░░░░░
░╚██╗████╗██╔╝█████╗░░██████╦╝██║░░██╗░██║░░░░░
░░████╔═████║░██╔══╝░░██╔══██╗██║░░╚██╗██║░░░░░
░░╚██╔╝░╚██╔╝░███████╗██████╦╝╚██████╔╝███████╗
░░░╚═╝░░░╚═╝░░╚══════╝╚═════╝░░╚═════╝░╚══════╝

*/

import { WebGL2Utils } from "./utils/WebGLUtils.js";
import { m4 } from "./utils/Math.js";
import { mat4, vec3 } from "./dist/esm/index.js";
import { ProcessMovement } from "./movement.js";

const utils = new WebGL2Utils();

export let cameraPos = vec3.fromValues(0, 0, 313);
export let cameraFront = vec3.fromValues(0, 0, -1); // Esto es un vector de direccion de hacia donde mira la camara
export let cameraUp = vec3.fromValues(0, 1, 0);
export let cameraSpeed = 5.0;
export let keyPressed = new Set();
export let movement = false; // Evitar el movimiento antes de capturar el mouse

async function main() {
  // Get A WebGL context  let movement = false;
  /** @type {HTMLCanvasElement} */
  let canvas = document.querySelector("#c");
  let dx = document.getElementById("x");
  let dy = document.getElementById("y");
  let dz = document.getElementById("z");
  let delta = document.getElementById("deltatime");
  let gl = canvas.getContext("webgl2");
  if (!gl) {
    return;
  }

  let firstMouse = true;
  let yaw = -90; // yaw is initialized to -90.0 degrees since a yaw of 0.0 results in a direction vector pointing to the right so we initially rotate a bit to the left.
  let pitch = 0;
  let lastX = canvas.clientWidth / 2;
  let lastY = canvas.clientHeight / 2;
  let lastFrame = 0;

  document.addEventListener("keydown", e => {
    keyPressed.add(e.key.toLocaleLowerCase());
  });

  document.addEventListener("keyup", e => {
    keyPressed.delete(e.key.toLocaleLowerCase());
  });

  canvas.addEventListener("click", async () => {
    if (!document.pointerLockElement) {
      try {
        await canvas.requestPointerLock({
          unadjustedMovement: true,
        });
      } catch (error) {
        if (error.name === "NotSupportedError") {
          // Some platforms may not support unadjusted movement.
          await canvas.requestPointerLock();
        } else {
          throw error;
        }
      }
    }
  });

  document.addEventListener("pointerlockchange", lockChangeAlert, false);

  function lockChangeAlert() {
    if (document.pointerLockElement === canvas) {
      console.log("The pointer lock status is now locked");
      document.addEventListener("mousemove", mouseMovement, false);
      movement = true;
    } else {
      console.log("The pointer lock status is now unlocked");
      document.removeEventListener("mousemove", mouseMovement, false);
      movement = false;
    }
  }

  function mouseMovement(e) {
    const xpos = e.movementX;
    const ypos = e.movementY;
    // console.log(`Mouse en: X: ${xpos}, Y: ${ypos}`);

    if (firstMouse) {
      lastX = xpos;
      lastY = ypos;
      firstMouse = false;
    }

    let xoffset = e.movementX;
    let yoffset = -e.movementY;
    lastX = xpos;
    lastY = ypos;

    const sensitivity = 0.1;
    xoffset *= sensitivity;
    yoffset *= sensitivity;

    yaw += xoffset;
    pitch += yoffset;

    if (pitch > 89) pitch = 89;
    if (pitch < -89) pitch = -89;

    let direction = vec3.create();
    direction[0] = Math.cos(m4.degToRad(yaw)) * Math.cos(m4.degToRad(pitch));
    direction[1] = Math.sin(m4.degToRad(pitch));
    direction[2] = Math.sin(m4.degToRad(yaw)) * Math.cos(m4.degToRad(pitch));
    vec3.normalize(cameraFront, direction);

    // console.log("Camera Front: ", cameraFront[0], cameraFront[1], cameraFront[2]);
    // console.log("_Pitch:", pitch);
    // console.log("_Yaw:", yaw);
  
  };


  const vertexShader = await utils.createShader(
    gl,
    gl.VERTEX_SHADER,
    "shaders/main.vs",
  );
  const fragmentShader = await utils.createShader(
    gl,
    gl.FRAGMENT_SHADER,
    "shaders/main.fs",
  );

  const program = utils.createProgram(gl, vertexShader, fragmentShader);

  // look up where the vertex data needs to go.
  let positionAttributeLocation = gl.getAttribLocation(program, "a_position");
  // let colorAttributeLocation = gl.getAttribLocation(program, "a_color");
  let normalAttributeLocation = gl.getAttribLocation(program, "a_normal");

  // look up uniform locations
  let modelLocation = gl.getUniformLocation(program, "model");
  let viewLocation = gl.getUniformLocation(program, "view");
  let projectionLocation = gl.getUniformLocation(program, "projection");
  let colorLocation = gl.getUniformLocation(program, "u_color");
  let lightDirectionReversed = gl.getUniformLocation(program, "u_reverseLightDirection");

  // Create a buffer
  var positionBuffer = gl.createBuffer();

  // Create a vertex array object (attribute state)
  var vao = gl.createVertexArray();

  // and make it the one we're currently working with
  gl.bindVertexArray(vao);

  // Turn on the attribute
  gl.enableVertexAttribArray(positionAttributeLocation);

  // Bind it to ARRAY_BUFFER (think of it as ARRAY_BUFFER = positionBuffer)
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  // Set Geometry.
  setGeometry(gl);

  // Tell the attribute how to get data out of positionBuffer (ARRAY_BUFFER)
  gl.vertexAttribPointer(
    positionAttributeLocation,
    3,
    gl.FLOAT,
    false,
    0,
    0,
  );

  // create the color buffer, make it the current ARRAY_BUFFER
  // and copy in the color values
  let normalBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
  // Turn on the attribute
  gl.enableVertexAttribArray(normalAttributeLocation);
  setNormals(gl);
  gl.vertexAttribPointer(
    normalAttributeLocation, 3, gl.FLOAT, false, 0, 0,
  );
  

  requestAnimationFrame(drawScene);

  let currentDirection = vec3.create();

  // Draw the scene.
  function drawScene(now) {
    now *= 0.01;
    let deltaTime = now - lastFrame;
    lastFrame = now;

    // console.log("deltatime: ", deltaTime);
    ProcessMovement(deltaTime); // Esto es la funcion principal del movimiento
    utils.resizeCanvasToDisplaySize(gl.canvas);
    // utils.processInput(cameraPos, cameraFront, cameraUp, deltaTime);

    // Tell WebGL how to convert from clip space to pixels
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    // Clear the canvas
    gl.clearColor(1, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // turn on depth testing
    gl.enable(gl.DEPTH_TEST);

    // tell webgl to cull faces
    gl.enable(gl.CULL_FACE);

    // Tell it to use our program (pair of shaders)
    gl.useProgram(program);

    // Bind the attribute/buffer set we want.
    gl.bindVertexArray(vao);

    let aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;

    let view = mat4.create();
    
    vec3.add(currentDirection, cameraPos, cameraFront);
    view = mat4.lookAt(view, cameraPos, currentDirection, cameraUp);
    gl.uniformMatrix4fv(viewLocation, false, view);
    dx.textContent = cameraPos[0].toFixed(2);
    dy.textContent = cameraPos[1].toFixed(2);
    dz.textContent = cameraPos[2].toFixed(2);
    delta.textContent = deltaTime;

    let projection = mat4.create();
    projection = mat4.perspective(
      projection,
      m4.degToRad(45),
      aspect,
      1,
    10000
    );
    gl.uniformMatrix4fv(projectionLocation, false, projection);

    gl.uniform4fv(colorLocation, [0.2, 1, 0.2, 1]);
    gl.uniform3fv(lightDirectionReversed, m4.normalize([0.5, 0.7, 1]));
    //gl.uniformMatrix3fv(lightDirectionReversed, false, m4.normalize([0.5, 0.7, 1])); 

    let fModel = mat4.create();
    fModel = mat4.translate(fModel, fModel, [0, 0, 0]);
    fModel = mat4.scale(fModel, fModel, [1, 1, 1]);
    // fModel = mat4.rotateY(fModel, fModel, m4.degToRad(now * 10));

    gl.uniformMatrix4fv(modelLocation, false, fModel);

    // Draw the geometry.
    let primitiveType = gl.TRIANGLES;
    let offset = 0;
    let count = 16 * 6;
    gl.drawArrays(primitiveType, offset, count);

    requestAnimationFrame(drawScene);
  }
}

// Fill the current ARRAY_BUFFER buffer
// with the values that define a letter 'F'.
function setGeometry(gl) {
  let positions = new Float32Array([
    // left column front
    0, 0, 0, 0, 150, 0, 30, 0, 0, 0, 150, 0, 30, 150, 0, 30, 0, 0,

    // top rung front
    30, 0, 0, 30, 30, 0, 100, 0, 0, 30, 30, 0, 100, 30, 0, 100, 0, 0,

    // middle rung front
    30, 60, 0, 30, 90, 0, 67, 60, 0, 30, 90, 0, 67, 90, 0, 67, 60, 0,

    // left column back
    0, 0, 30, 30, 0, 30, 0, 150, 30, 0, 150, 30, 30, 0, 30, 30, 150, 30,

    // top rung back
    30, 0, 30, 100, 0, 30, 30, 30, 30, 30, 30, 30, 100, 0, 30, 100, 30, 30,

    // middle rung back
    30, 60, 30, 67, 60, 30, 30, 90, 30, 30, 90, 30, 67, 60, 30, 67, 90, 30,

    // top
    0, 0, 0, 100, 0, 0, 100, 0, 30, 0, 0, 0, 100, 0, 30, 0, 0, 30,

    // top rung right
    100, 0, 0, 100, 30, 0, 100, 30, 30, 100, 0, 0, 100, 30, 30, 100, 0, 30,

    // under top rung
    30, 30, 0, 30, 30, 30, 100, 30, 30, 30, 30, 0, 100, 30, 30, 100, 30, 0,

    // between top rung and middle
    30, 30, 0, 30, 60, 30, 30, 30, 30, 30, 30, 0, 30, 60, 0, 30, 60, 30,

    // top of middle rung
    30, 60, 0, 67, 60, 30, 30, 60, 30, 30, 60, 0, 67, 60, 0, 67, 60, 30,

    // right of middle rung
    67, 60, 0, 67, 90, 30, 67, 60, 30, 67, 60, 0, 67, 90, 0, 67, 90, 30,

    // bottom of middle rung.
    30, 90, 0, 30, 90, 30, 67, 90, 30, 30, 90, 0, 67, 90, 30, 67, 90, 0,

    // right of bottom
    30, 90, 0, 30, 150, 30, 30, 90, 30, 30, 90, 0, 30, 150, 0, 30, 150, 30,

    // bottom
    0, 150, 0, 0, 150, 30, 30, 150, 30, 0, 150, 0, 30, 150, 30, 30, 150, 0,

    // left side
    0, 0, 0, 0, 0, 30, 0, 150, 30, 0, 0, 0, 0, 150, 30, 0, 150, 0,
  ]);

  // Center the F around the origin and Flip it around. We do this because
  // we're in 3D now with and +Y is up where as before when we started with 2D
  // we had +Y as down.

  // We could do by changing all the values above but I'm lazy.
  // We could also do it with a matrix at draw time but you should
  // never do stuff at draw time if you can do it at init time.
  let matrix = m4.xRotation(Math.PI);
  matrix = m4.translate(matrix, -50, -100, -15);

  for (let ii = 0; ii < positions.length; ii += 3) {
    let vector = m4.transformVector(matrix, [
      positions[ii + 0],
      positions[ii + 1],
      positions[ii + 2],
      1,
    ]);
    positions[ii + 0] = vector[0];
    positions[ii + 1] = vector[1];
    positions[ii + 2] = vector[2];
  }

  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
}

// Fill the current ARRAY_BUFFER buffer with colors for the 'F'.
function setColors(gl) {
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Uint8Array([
      // left column front
      200, 70, 120, 200, 70, 120, 200, 70, 120, 200, 70, 120, 200, 70, 120, 200,
      70, 120,

      // top rung front
      200, 70, 120, 200, 70, 120, 200, 70, 120, 200, 70, 120, 200, 70, 120, 200,
      70, 120,

      // middle rung front
      200, 70, 120, 200, 70, 120, 200, 70, 120, 200, 70, 120, 200, 70, 120, 200,
      70, 120,

      // left column back
      80, 70, 200, 80, 70, 200, 80, 70, 200, 80, 70, 200, 80, 70, 200, 80, 70,
      200,

      // top rung back
      80, 70, 200, 80, 70, 200, 80, 70, 200, 80, 70, 200, 80, 70, 200, 80, 70,
      200,

      // middle rung back
      80, 70, 200, 80, 70, 200, 80, 70, 200, 80, 70, 200, 80, 70, 200, 80, 70,
      200,

      // top
      70, 200, 210, 70, 200, 210, 70, 200, 210, 70, 200, 210, 70, 200, 210, 70,
      200, 210,

      // top rung right
      200, 200, 70, 200, 200, 70, 200, 200, 70, 200, 200, 70, 200, 200, 70, 200,
      200, 70,

      // under top rung
      210, 100, 70, 210, 100, 70, 210, 100, 70, 210, 100, 70, 210, 100, 70, 210,
      100, 70,

      // between top rung and middle
      210, 160, 70, 210, 160, 70, 210, 160, 70, 210, 160, 70, 210, 160, 70, 210,
      160, 70,

      // top of middle rung
      70, 180, 210, 70, 180, 210, 70, 180, 210, 70, 180, 210, 70, 180, 210, 70,
      180, 210,

      // right of middle rung
      100, 70, 210, 100, 70, 210, 100, 70, 210, 100, 70, 210, 100, 70, 210, 100,
      70, 210,

      // bottom of middle rung.
      76, 210, 100, 76, 210, 100, 76, 210, 100, 76, 210, 100, 76, 210, 100, 76,
      210, 100,

      // right of bottom
      140, 210, 80, 140, 210, 80, 140, 210, 80, 140, 210, 80, 140, 210, 80, 140,
      210, 80,

      // bottom
      90, 130, 110, 90, 130, 110, 90, 130, 110, 90, 130, 110, 90, 130, 110, 90,
      130, 110,

      // left side
      160, 160, 220, 160, 160, 220, 160, 160, 220, 160, 160, 220, 160, 160, 220,
      160, 160, 220,
    ]),
    gl.STATIC_DRAW,
  );
}

function setNormals(gl) {
  let normals = new Float32Array([
          // left column front
          0, 0, 1,
          0, 0, 1,
          0, 0, 1,
          0, 0, 1,
          0, 0, 1,
          0, 0, 1,
 
          // top rung front
          0, 0, 1,
          0, 0, 1,
          0, 0, 1,
          0, 0, 1,
          0, 0, 1,
          0, 0, 1,
 
          // middle rung front
          0, 0, 1,
          0, 0, 1,
          0, 0, 1,
          0, 0, 1,
          0, 0, 1,
          0, 0, 1,
 
          // left column back
          0, 0, -1,
          0, 0, -1,
          0, 0, -1,
          0, 0, -1,
          0, 0, -1,
          0, 0, -1,
 
          // top rung back
          0, 0, -1,
          0, 0, -1,
          0, 0, -1,
          0, 0, -1,
          0, 0, -1,
          0, 0, -1,
 
          // middle rung back
          0, 0, -1,
          0, 0, -1,
          0, 0, -1,
          0, 0, -1,
          0, 0, -1,
          0, 0, -1,
 
          // top
          0, 1, 0,
          0, 1, 0,
          0, 1, 0,
          0, 1, 0,
          0, 1, 0,
          0, 1, 0,
 
          // top rung right
          1, 0, 0,
          1, 0, 0,
          1, 0, 0,
          1, 0, 0,
          1, 0, 0,
          1, 0, 0,
 
          // under top rung
          0, -1, 0,
          0, -1, 0,
          0, -1, 0,
          0, -1, 0,
          0, -1, 0,
          0, -1, 0,
 
          // between top rung and middle
          1, 0, 0,
          1, 0, 0,
          1, 0, 0,
          1, 0, 0,
          1, 0, 0,
          1, 0, 0,
 
          // top of middle rung
          0, 1, 0,
          0, 1, 0,
          0, 1, 0,
          0, 1, 0,
          0, 1, 0,
          0, 1, 0,
 
          // right of middle rung
          1, 0, 0,
          1, 0, 0,
          1, 0, 0,
          1, 0, 0,
          1, 0, 0,
          1, 0, 0,
 
          // bottom of middle rung.
          0, -1, 0,
          0, -1, 0,
          0, -1, 0,
          0, -1, 0,
          0, -1, 0,
          0, -1, 0,
 
          // right of bottom
          1, 0, 0,
          1, 0, 0,
          1, 0, 0,
          1, 0, 0,
          1, 0, 0,
          1, 0, 0,
 
          // bottom
          0, -1, 0,
          0, -1, 0,
          0, -1, 0,
          0, -1, 0,
          0, -1, 0,
          0, -1, 0,
 
          // left side
          -1, 0, 0,
          -1, 0, 0,
          -1, 0, 0,
          -1, 0, 0,
          -1, 0, 0,
          -1, 0, 0,
  ]);
  gl.bufferData(gl.ARRAY_BUFFER, normals, gl.STATIC_DRAW);
}

main();
