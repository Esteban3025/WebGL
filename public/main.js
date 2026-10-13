/*

░██╗░░░░░░░██╗███████╗██████╗░░██████╗░██╗░░░░░
░██║░░██╗░░██║██╔════╝██╔══██╗██╔════╝░██║░░░░░
░╚██╗████╗██╔╝█████╗░░██████╦╝██║░░██╗░██║░░░░░
░░████╔═████║░██╔══╝░░██╔══██╗██║░░╚██╗██║░░░░░
░░╚██╔╝░╚██╔╝░███████╗██████╦╝╚██████╔╝███████╗
░░░╚═╝░░░╚═╝░░╚══════╝╚═════╝░░╚═════╝░╚══════╝

*/
import { m4 } from "./utils/Math.js";
import { ProcessMovement } from "./movement.js";
import { CreateObject, loadShader } from "./utils/lib/CreateObject.js";
import { light,cameraPos} from "./utils/lib/constants.js"; 
import { checkInput } from "./utils/lib/checkInput.js";

export let models = {
  floor: {
    translate: [0, -60.0, 0],
    scale: [500, 500, 500],
    deg: 90,
    degZ:0,
    color: {r: 1, g:0, b:0}
  },
  triangle: {
    translate: [light.x, light.y, light.z],
    scale: [50, 50, 50],
    deg: 0,
    degZ:180,
    color: {r: 1, g:0, b:1}
  },
  f: {
    translate: [-30, 0, 0],
    scale: [1, 1, 1],
    deg: 0,
    degZ:0,
    color: {r: 1, g:0, b:0}
  }
};

async function main() {
  let canvas = document.querySelector("#c");
  let dx = document.getElementById("x");
  let dy = document.getElementById("y");
  let dz = document.getElementById("z");
  let delta = document.getElementById("deltatime");
  let lightx = document.getElementById("lightx");
  let lighty = document.getElementById("lighty");
  let lightz = document.getElementById("lightz");
  let fpscontainer = document.getElementById("fpscontainer");
  let lastFrame = 0;

  let gl = canvas.getContext("webgl2");
  if (!gl) {
    return;
  }

  checkInput(canvas);

  const geometriaTriangulo = [
     0.5,  0.5,  0.0,
    -0.5,  0.5,  0.0,
     0.5, -0.5,  0.0,
    -0.5, -0.5,  0.0
  ]

  const geometriaFloor = [
     0.5,  0.5,  0.0,
    -0.5,  0.5,  0.0,
     0.5, -0.5,  0.0,
    -0.5, -0.5,  0.0
  ]

  const numVertexTriangle=4;
  const numVertexFloor=4;

  const triangulo = new CreateObject(gl, geometriaTriangulo, numVertexTriangle, models.triangle);
  triangulo._createTexture("descarga.jpg");
  const triangleVertexShader = await loadShader("triangle.vs");
  const triangleFragmentShader = await loadShader("triangle.fs");
  triangulo._setProgram(triangleVertexShader, triangleFragmentShader);

  const floor     = new CreateObject(gl, geometriaFloor,     numVertexFloor,    models.floor);
  floor._createTexture("descarga.jpg");
  const floorVertexShader = await loadShader("floor.vs");
  const floorFragmentShader = await loadShader("floor.fs");
  floor._setProgram(floorVertexShader, floorFragmentShader);

  requestAnimationFrame(drawScene);

  // ---- FPS ----
  let fpsFrames = 0;
  let fpsTime = 0;

  // Draw the scene.
  function drawScene(now) {
    // now *= 0.01;
    let deltaTime = (now - lastFrame) / 1000;
    lastFrame = now;

    ProcessMovement(deltaTime); // Esto es la funcion principal del movimiento
    // utils.resizeCanvasToDisplaySize(gl.canvas);

    // Tell WebGL how to convert from clip space to pixels
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    // Clear the canvas
    gl.clearColor(1, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // turn on depth testing
    gl.enable(gl.DEPTH_TEST);

    // tell webgl to cull faces
    //gl.enable(gl.CULL_FACE);

    dx.textContent = cameraPos[0].toFixed(2);
    dy.textContent = cameraPos[1].toFixed(2);
    dz.textContent = cameraPos[2].toFixed(2);
    delta.textContent = deltaTime;
    lightx.textContent = light.x;
    lighty.textContent = light.y;
    lightz.textContent = light.z;

    floor.draw(gl.TRIANGLE_STRIP);
    triangulo.draw(gl.TRIANGLE_STRIP);

    fpsFrames++;
    fpsTime += deltaTime;
    if (fpsTime >= 1) {
      fpscontainer.textContent = "FPS: " + Math.round(fpsFrames / fpsTime);
      fpsFrames = 0;
      fpsTime = 0;
    }

    requestAnimationFrame(drawScene);
  }
}

main();
