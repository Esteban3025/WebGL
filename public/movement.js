import {cameraFront, cameraPos, cameraUp, light } from "./utils/lib/constants.js";
import { vec3 } from "./dist/esm/index.js";
import { movement, keyPressed } from "./utils/lib/checkInput.js";

/**
 * @param {cameraPos[1] = 0.0}; esto mantiene la propiedad Y de la camara a cero
 */

export function ProcessMovement(deltaTime) {
  let cameraSpeed = 10.0 * 5.0;
  let speed = cameraSpeed * deltaTime;

  if (!movement) return;

  // console.log("keyPressed", keyPressed);
  if (keyPressed.has("shift"))
    speed *= 2; 

  if (keyPressed.has("w")){
    vec3.scaleAndAdd(cameraPos, cameraPos, cameraFront, +speed);
  }

  if (keyPressed.has("s")) {
    vec3.scaleAndAdd(cameraPos, cameraPos, cameraFront, -speed);
  }

  if (keyPressed.has(' ')) {
    cameraPos[1] += speed;
  }

  if (keyPressed.has('c')) {
    cameraPos[1] -= speed;
  }

  if (keyPressed.has("d")) {
    let fd = vec3.create();
    vec3.cross(fd, cameraFront, cameraUp);
    vec3.normalize(fd, fd);
    vec3.scaleAndAdd(cameraPos, cameraPos, fd, +speed);
  }

  if (keyPressed.has("a")) {
    let rightVector = vec3.create();
    vec3.cross(rightVector, cameraFront, cameraUp);
    vec3.normalize(rightVector, rightVector);
    vec3.scaleAndAdd(cameraPos, cameraPos, rightVector, -speed);
  }

  if (keyPressed.has("arrowup")) {
    light.z -= 1 * deltaTime;
  }

  if (keyPressed.has("arrowdown")) {
    light.z += 1 * deltaTime;
  }

  if (keyPressed.has("arrowright")) {
    light.x+= 1 * deltaTime;
  }

  if (keyPressed.has("arrowleft")) {
    light.x-= 1 *deltaTime;
  }

  if (keyPressed.has("arrowup") && keyPressed.has("control")) {
    light.y+= 1 * deltaTime;
  }

  if (keyPressed.has("arrowdown") && keyPressed.has("control")) {
    light.y -= 1 *deltaTime;
  }

  cameraPos[1] = 0.0
}
