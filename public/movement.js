import { cameraSpeed, cameraFront, cameraPos, cameraUp, keyPressed, movement } from "./main.js";
import { mat4, vec3 } from "./dist/esm/index.js";

export function ProcessMovement(deltaTime) {
  let speed = cameraSpeed * deltaTime;

  if (!movement) return;

  console.log("keyPressed", keyPressed);

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

  cameraPos[1] = 0.0;
}
