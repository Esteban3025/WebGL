import { vec3 } from "../dist/esm/index.js";
import { m4 } from "./Math.js";

export class WebGL2Utils {
  async createShader(gl, type, path) {
    // ESTO ES UNA FUNCION ASINCRONA, LLAMA A LA FUNCION SIEMPRE CON UN WAIT.
    const res = await fetch(path);
    const source = await res.text();
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (success) {
      return shader;
    }

    console.log(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
  }

  createProgram(gl, vertexShader, fragmentShader) {
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    const success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (success) {
      return program;
    }

    console.log(gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
  }

  async loadShader(url) {
    const res = await fetch(url);
    return await res.text();
  }

  resizeCanvasToDisplaySize(canvas) {
    // Lookup the size the browser is displaying the canvas in CSS pixels.
    const displayWidth = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;

    // Check if the canvas is not the same size.
    const needResize =
      canvas.width !== displayWidth || canvas.height !== displayHeight;

    if (needResize) {
      // Make the canvas the same size
      canvas.width = displayWidth;
      canvas.height = displayHeight;
    }
    return needResize;
  }

  processInput(cameraPos, cameraFront, cameraUp) {
    window.addEventListener("keydown", (e) => {
      let keys = e.key.toLocaleLowerCase();
      // console.log("Key Pressed: ", keys);

      this.inputsCases(keys, cameraPos, cameraFront, cameraUp);
    });
  }

  inputsCases(keys, cameraPos, cameraFront, cameraUp) {
    let cameraSpeed = 3.5;
    // console.log("Camera Speed: ", cameraSpeed);
    // console.log("cameraPos", cameraPos);
    // console.log("cameraFront", cameraFront);
    // console.log("cameraUp", cameraUp);
    switch (keys) {
      case "w":
        let a = vec3.create();
        vec3.scale(a, cameraFront, cameraSpeed);
        cameraPos = vec3.add(cameraPos, cameraPos, a);
        break;
      case "s":
        let b = vec3.create();
        vec3.scale(b, cameraFront, cameraSpeed);
        cameraPos = vec3.subtract(cameraPos, cameraPos, b);
        break;
      case "a":
        let rightVector = vec3.create();
        vec3.cross(rightVector, cameraFront, cameraUp);
        vec3.normalize(rightVector, rightVector);
        vec3.scale(rightVector, rightVector, cameraSpeed);
        cameraPos = vec3.subtract(cameraPos, cameraPos, rightVector);
        break;
      case "d":
        let subVec = vec3.create();
        vec3.cross(subVec, cameraFront, cameraUp);
        vec3.normalize(subVec, subVec);
        vec3.scale(subVec, subVec, cameraSpeed);
        cameraPos = vec3.add(cameraPos, cameraPos, subVec);
        break;
    }
  }

  async loadImage(path) {
    const img = new Image();
    img.src = `${path}`;
    console.log(img);
    return img;
  }

  createTexture(gl, image) {
    // Create a texture.
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // Set the parameters so we don't need mips and so we're not filtering
    // and we don't repeat at the edges
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    // Upload the image into the texture.
    const mipLevel = 0; // the largest mip
    const internalFormat = gl.RGBA; // format we want in the texture
    const srcFormat = gl.RGBA; // format of data we are supplying
    const srcType = gl.UNSIGNED_BYTE; // type of data we are supplying
    gl.texImage2D(
      gl.TEXTURE_2D,
      mipLevel,
      internalFormat,
      srcFormat,
      srcType,
      image,
    );
  }
}
