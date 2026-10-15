import { ProcessMovement } from "../../movement.js";
import { cameraPos, light, objectOutline } from "./constants.js";
import { keyPressed } from "./checkInput.js";
import { LightManager } from "./LightManager.js";
import { ModelManager } from "./ModelManager.js";
import { ObjectManager } from "./ObjectManager.js";
import { PostProcessor } from "./PostProcessor.js";
import { Skybox } from "./Skybox.js";

const squareGeometry = [
  0.5, 0.5, 0,
  -0.5, 0.5, 0,
  0.5, -0.5, 0,
  -0.5, -0.5, 0,
];

const cubeVertices = [
        -0.5, -0.5, -0.5, 
         0.5,  0.5, -0.5,  
         0.5, -0.5, -0.5, 
         0.5,  0.5, -0.5, 
        -0.5, -0.5, -0.5,
        -0.5,  0.5, -0.5, 

        -0.5, -0.5,  0.5, 
         0.5, -0.5,  0.5,  
         0.5,  0.5,  0.5, 
         0.5,  0.5,  0.5, 
        -0.5,  0.5,  0.5,
        -0.5, -0.5,  0.5, 

        -0.5,  0.5,  0.5,  
        -0.5,  0.5, -0.5, 
        -0.5, -0.5, -0.5,
        -0.5, -0.5, -0.5,
        -0.5, -0.5,  0.5, 
        -0.5,  0.5,  0.5,  

         0.5,  0.5,  0.5,  
         0.5, -0.5, -0.5, 
         0.5,  0.5, -0.5,
         0.5, -0.5, -0.5,
         0.5,  0.5,  0.5, 
         0.5, -0.5,  0.5,  

        -0.5, -0.5, -0.5,
         0.5, -0.5, -0.5, 
         0.5, -0.5,  0.5,  
         0.5, -0.5,  0.5,  
        -0.5, -0.5,  0.5, 
        -0.5, -0.5, -0.5,

        -0.5,  0.5, -0.5,
         0.5,  0.5,  0.5, 
         0.5,  0.5, -0.5,  
         0.5,  0.5,  0.5,  
        -0.5,  0.5, -0.5, 
        -0.5,  0.5,  0.5,
];

const cubeFaceNormals = [
  [0, 0, -1], [0, 0, 1], [-1, 0, 0], [1, 0, 0], [0, -1, 0], [0, 1, 0],
];

// Cada cara (6 vértices, mismo orden que cubeVertices) ocupa la textura completa,
// orientada para verse derecha desde afuera.
const cubeFaceUV = [
  (x, y) => [0.5 - x, y + 0.5],
  (x, y) => [x + 0.5, y + 0.5],
  (x, y, z) => [z + 0.5, y + 0.5],
  (x, y, z) => [0.5 - z, y + 0.5],
  (x, y, z) => [x + 0.5, z + 0.5],
  (x, y, z) => [x + 0.5, 0.5 - z],
];

const cubeNormals = cubeFaceNormals.flatMap((normal) => Array(6).fill(normal).flat());

const cubeTexcoords = Array.from({ length: cubeVertices.length / 3 }, (_, i) => {
  const [x, y, z] = cubeVertices.slice(i * 3, i * 3 + 3);
  return cubeFaceUV[Math.floor(i / 6)](x, y, z);
}).flat();

// Índice de cada cara en cubeVertices (6 vértices por cara).
const CUBE_FACE = { back: 0, front: 1, left: 2, right: 3, bottom: 4, top: 5 };

// Geometría del cubo con solo las caras indicadas (por defecto, las 6).
function cubeFaces(faces = Object.values(CUBE_FACE)) {
  const pick = (data, size) => faces.flatMap((face) => data.slice(face * 6 * size, (face + 1) * 6 * size));
  return {
    vertices: pick(cubeVertices, 3),
    normals: pick(cubeNormals, 3),
    texcoords: pick(cubeTexcoords, 2),
  };
}

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
    this.postProcessor = new PostProcessor(gl, this.objectManager.programs);
    this.sharpenEnabled = true;
  }

  async initialize(onProgress = () => {}) {
    onProgress("Preparando iluminación y skybox...");
    await Promise.all([
      this.postProcessor.initialize(),
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
    this.postProcessor.setEffect("emboss");

    const floorSize = 500*2;

    onProgress("Cargando geometría del mundo...");
    // El plano del suelo y el sprite de pasto se ven de ambos lados: sin culling.
    await this.objectManager.create("floor", {
      vertices: squareGeometry,
      normals: squareNormals,
      model: {
        translate: [0, -60, 0],
        scale: [floorSize, floorSize, floorSize],
        deg: 90,
        degZ: 0,
        color: { r: 1, g: 1, b: 1 },
      },
      texture: "floorGreen.jpg",
      mode: this.gl.TRIANGLE_STRIP,
      outline: { enabled: false },
      vertexShader: "floor.vs",
      fragmentShader: "floor.fs",
    });

    // El pasto es un sprite con alpha: se muestra una sola vez (cara frontal)
    // para que el blending no mezcle las otras caras.
    await this.objectManager.create("triangulo", {
      ...cubeFaces([CUBE_FACE.front]),
      model: {
        translate: [120, -30, 0],
        scale: [50, 50, 50],
        deg: 0,
        degZ: 0,
        color: { r: 1, g: 1, b: 1 },
      },
      texture: "grass.png",
      mode: this.gl.TRIANGLES,
      blend: true,
      outline: { enabled: false },
      vertexShader: "triangle.vs",
      fragmentShader: "triangle.fs",
    });

     await this.objectManager.create("asd", {
      ...cubeFaces(),
      model: {
        translate: [-120, 0.7, 0],
        scale: [50, 50, 50],
        deg: 0,
        degZ: 0,
        color: { r: 1, g: 1, b: 1 },
      },
      texture: "montana.jpg",
      mode: this.gl.TRIANGLES,
      blend: false,
      cullFace: true,
      outline: { enabled: objectOutline.enabled },
      vertexShader: "triangle.vs",
      fragmentShader: "triangle.fs",
    });

    onProgress("Cargando modelo y materiales...");
    await this.modelManager.load("astronaut", "/res/astronaut.fbx", {
      cullFace: true,
      outline: { enabled: objectOutline.enabled },
      model: {
        translate: [0, -60, 0],
        scale: [0.5, 0.5, 0.5],
        deg: 0,
        degZ: 0,
        color: { r: 1, g: 1, b: 1 },
      },
    });

    await this.modelManager.load("Flashlight", "/res/Flashlight/SM_Flashlight.fbx", {
      cullFace: false,
      outline: { enabled: objectOutline.enabled },
      model: {
        translate: [-120, 0, 120],
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
    this.updateOutlineToggle();
    this.updateSharpenToggle();
  }

  // K activa / desactiva el efecto sharpen (una vez por pulsación).
  updateSharpenToggle() {
    const pressed = keyPressed.has("k");
    if (pressed && !this.sharpenKeyDown) {
      this.sharpenEnabled = !this.sharpenEnabled;
      this.postProcessor.setEffect(this.sharpenEnabled ? "emboss" : "none");
    }
    this.sharpenKeyDown = pressed;
  }

  // P alterna el contorno (una vez por pulsación).
  updateOutlineToggle() {
    const pressed = keyPressed.has("p");
    if (pressed && !this.outlineKeyDown) {
      objectOutline.enabled = !objectOutline.enabled;
      this.objectManager
        .setOutline("astronaut", { enabled: objectOutline.enabled })
        .catch((error) => console.error("No se pudo cambiar el contorno", error));
      this.objectManager
        .setOutline("asd", { enabled: objectOutline.enabled })
        .catch((error) => console.error("No se pudo cambiar el contorno", error));
    }
    this.outlineKeyDown = pressed;
  }

  // La escena se dibuja en el framebuffer del postprocesador y luego se
  // presenta en el canvas aplicando el kernel.
  draw() {
    const { gl } = this;
    this.objectManager.resize();
    if (!gl.canvas.width || !gl.canvas.height) return;
    this.postProcessor.begin(gl.canvas.width, gl.canvas.height);
    this.clear();
    this.skybox.draw();
    this.objectManager.drawAll();
    this.lightManager.drawMarker();
    this.postProcessor.present();
  }

  clear() {
    const { gl } = this;
    gl.clearColor(0.02, 0.02, 0.025, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
  }

  // Vuelve a dibujar solo estos objetos sobre el frame actual (ids o lista de ids).
  drawObjects(ids) {
    this.postProcessor.bind();
    this.objectManager.drawObjects([].concat(ids));
    this.postProcessor.present();
  }

  dispose() {
    this.postProcessor.dispose();
    this.skybox.dispose();
    this.modelManager.clear();
    this.objectManager.dispose();
  }

  getCameraPosition() {
    return cameraPos;
  }

  getLightPosition() {
    return light;
  }
}
