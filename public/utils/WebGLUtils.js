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
    const displayWidth  = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;
 
    // Check if the canvas is not the same size.
    const needResize = canvas.width  !== displayWidth ||
                      canvas.height !== displayHeight;
 
      if (needResize) {
        // Make the canvas the same size
        canvas.width  = displayWidth;
        canvas.height = displayHeight;
      }
    return needResize;
  }

  processInput(position, modelRotationX, modelRotationY) {
    window.addEventListener('keydown', e => {
      let keys = e.key.toLocaleLowerCase();
      console.log("Key Pressed: ", keys);
      this.inputsCases(keys, position, modelRotationX, modelRotationY);
    })
  }

  inputsCases(keys, position, modelRotationX, modelRotationY) {
    let speed = 5;
    let rotationSpeed = 1.5;
    switch (keys) {
        case "+":
          position[1] += speed;
        break;
        case "-":
          position[1] -= speed;
        break;
        case "d":
          position[0] -= speed;
        break;
        case "a":
          position[0] += speed;
        break;
        case "w":
          position[2] += speed;
        break;
        case "s":
          position[2] -= speed;
        break;
        case "arrowup":
          modelRotationX[0] += Math.sin(m4.degToRad(rotationSpeed));
        break;
        case "arrowdown":
          modelRotationX[0] -= Math.sin(m4.degToRad(rotationSpeed));
        break;
        case "arrowright":
          modelRotationY[0] += Math.sin(m4.degToRad(rotationSpeed));
        break;
        case "arrowleft":
          modelRotationY[0] -= Math.sin(m4.degToRad(rotationSpeed));
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
    const mipLevel = 0;               // the largest mip
    const internalFormat = gl.RGBA;   // format we want in the texture
    const srcFormat = gl.RGBA;        // format of data we are supplying
    const srcType = gl.UNSIGNED_BYTE; // type of data we are supplying
    gl.texImage2D(gl.TEXTURE_2D,
                mipLevel,
                internalFormat,
                srcFormat,
                srcType,
                image);
    };
}
 