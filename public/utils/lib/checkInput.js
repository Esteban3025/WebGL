import { mainMenu } from "../ui/mainMenu.js";
import { pauseMenu } from "../ui/pauseMenu.js";
import { cameraFront } from "../lib/constants.js";
import { vec3 } from "../../dist/esm/index.js";
import { m4 } from "../Math.js";
export let keyPressed = new Set();
export let movement = false; // Evitar el movimiento antes de capturar el mouse

let firstMouse = true;
let yaw = -90; // yaw is initialized to -90.0 degrees since a yaw of 0.0 results in a direction vector pointing to the right so we initially rotate a bit to the left.
let pitch = 0;

export function checkInput(canvas) {
 //  mainMenu(); // Renderizar el menu es lo primero que hacemos
  document.addEventListener("keydown", (e) => {
    console.log("Esta tecla se esta tocando: ", e.key.toLocaleLowerCase());
    keyPressed.add(e.key.toLocaleLowerCase());
  });

  document.addEventListener("keyup", (e) => {
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
      // pauseMenu();
    }
  }

  function mouseMovement(e) {
    let lastX = canvas.clientWidth / 2;
    let lastY = canvas.clientHeight / 2;

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
  }
}
