import { ProcessMovement } from "../../movement.js";
import { cameraPos, light } from "./constants.js";
import { keyPressed } from "./checkInput.js";
import { LightManager } from "./LightManager.js";
import { ModelManager } from "./ModelManager.js";
import { ObjectManager } from "./ObjectManager.js";
import { Skybox } from "./Skybox.js";

const squareGeometry = [
  0.5, 0.5, 0,
  -0.5, 0.5, 0,
  0.5, -0.5, 0,
  -0.5, -0.5, 0,
];

const squareNormals = [
  0, 0, 1,
  0, 0, 1,
  0, 0, 1,
  0, 0, 1,
];

export class World {
  constructor(gl) {
    this.gl = gl;
    this.lightManager = new LightManager(gl, light);
    this.objectManager = new ObjectManager(gl, {
      lighting: this.lightManager,
    });
    this.modelManager = new ModelManager(this.objectManager);
    this.skybox = new Skybox(gl);
  }

  async initialize(onProgress = () => {}) {
    onProgress("Preparando iluminación y skybox...");
    await Promise.all([
      this.lightManager.initializeMarker(),
      this.skybox.initialize({
      right: "right.jpg",
      left: "left.jpg",
      top: "top.jpg",
      bottom: "bottom.jpg",
      front: "front.jpg",
      back: "back.jpg",
      }),
    ]);

    onProgress("Cargando geometría del mundo...");
    await this.objectManager.create("floor", {
      vertices: squareGeometry,
      normals: squareNormals,
      model: {
        translate: [0, -60, 0],
        scale: [500, 500, 500],
        deg: 90,
        degZ: 0,
        color: { r: 1, g: 1, b: 1 },
      },
      texture: "floor4.jpg",
      mode: this.gl.TRIANGLE_STRIP,
      vertexShader: "floor.vs",
      fragmentShader: "floor.fs",
    });

    await this.objectManager.create("triangulo", {
      vertices: squareGeometry,
      normals: squareNormals,
      model: {
        translate: [120, 0.7, 0],
        scale: [50, 50, 50],
        deg: 0,
        degZ: 180,
        color: { r: 1, g: 1, b: 1 },
      },
      texture: "montana.jpg",
      mode: this.gl.TRIANGLE_STRIP,
      vertexShader: "triangle.vs",
      fragmentShader: "triangle.fs",
    });

    onProgress("Cargando modelo y materiales...");
    await this.modelManager.load("astronaut", "/res/astronaut.fbx", {
      model: {
        translate: [0, -60, 0],
        scale: [0.5, 0.5, 0.5],
        deg: 0,
        degZ: 0,
        color: { r: 1, g: 1, b: 1 },
      },
    });
    onProgress("Mundo listo");
  }

  update(deltaTime) {
    ProcessMovement(deltaTime);
    this.lightManager.update(deltaTime, keyPressed);
  }

  draw() {
    this.objectManager.resize();
    this.skybox.draw();
    this.objectManager.drawAll();
    this.lightManager.drawMarker();
  }

  dispose() {
    this.skybox.dispose();
    this.modelManager.clear();
    this.objectManager.clear();
  }

  getCameraPosition() {
    return cameraPos;
  }

  getLightPosition() {
    return light;
  }
}
