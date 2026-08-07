import { cameraSpeed, cameraFront, cameraPos, cameraUp, keyPressed, movement, light } from "./main.js";
import { mat4, vec3 } from "./dist/esm/index.js";

export function ProcessMovement(deltaTime) {
  let speed = cameraSpeed * deltaTime;

  if (!movement) return;

  console.log("keyPressed", keyPressed);
  if (keyPressed.has("shift"))
    speed *= 3; 

  if (keyPressed.has("w"))
    vec3.scaleAndAdd(cameraPos, cameraPos, cameraFront, +speed);

  if (keyPressed.has("s"))
    vec3.scaleAndAdd(cameraPos, cameraPos, cameraFront, -speed);

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

  if (keyPressed.has("space")) {
    cameraPos[1] += 1.0;;
  }

  //cameraPos[1] = 0.0;
}
