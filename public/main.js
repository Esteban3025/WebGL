import { Render } from "./utils/lib/Render.js";
import { World } from "./utils/lib/World.js";
import { checkInput } from "./utils/lib/checkInput.js";
import { MenuManager } from "./utils/ui/MenuManager.js";

async function main() {
  const canvas = document.querySelector("#c");
  const gl = canvas.getContext("webgl2");
  if (!gl) {
    throw new Error("WebGL2 no está disponible en este navegador");
  }

  const menu = new MenuManager(canvas);
  menu.showLoading("Inicializando WebGL...");
  const world = new World(gl);
  await world.initialize((message) => menu.updateLoading(message));

  const render = new Render(gl, world, {
    x: document.getElementById("x"),
    y: document.getElementById("y"),
    z: document.getElementById("z"),
    delta: document.getElementById("deltatime"),
    lightX: document.getElementById("lightx"),
    lightY: document.getElementById("lighty"),
    lightZ: document.getElementById("lightz"),
    fps: document.getElementById("fpscontainer"),
  });
  checkInput(canvas, {
    onPause: () => {
      menu.showPause(() => canvas.requestPointerLock());
    },
  });
  menu.hideLoading();
  menu.showMain(() => {
    render.start();
    canvas.requestPointerLock();
  });
}

main().catch((error) => {
  console.error("No se pudo iniciar el mundo WebGL", error);
});
