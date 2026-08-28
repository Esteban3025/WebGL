import { vec3 } from "../../dist/esm/index.js";

export let cameraPos = vec3.fromValues(0, 0, 313);
export let cameraFront = vec3.fromValues(0, 0, -1); // Esto es un vector de direccion de hacia donde mira la camara
export let cameraUp = vec3.fromValues(0, 1, 0);
export let currentDirection = vec3.create();
export let light = {
  x: 0.5,
  y: 0.7,
  z: 1
};


