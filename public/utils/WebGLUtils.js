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

  processInput(gl, position, rotation, scale) {
    window.addEventListener('keydown', e => {
      let keys = e.key.toLocaleLowerCase();
      // console.log("Key Pressed: ", keys);
      this.inputsCases(keys, position, rotation, scale);
    })
  }

  inputsCases(keys, position, rotation, scale) {
    let speed = -Math.sin(100) * scale.x * 2.0;
    let rotationSpeed = 5;
    let scaleAmount = 2;
    // console.log("this is scale", scale)
    switch (keys) {
      case "w":
        // mover en y negativo
        position.y -= speed;
        break
      case "s":
        // mover en y positivo
        position.y += speed;
        break
      case "d":
        // mover en x positivo
        position.x += speed;
        break
      case "a":
        // mover en x negativo
        position.x -= speed;
        break
      case "c":
        // mover en y positivo
        position.y += speed;
        break
      case "v":
        // mover en y negativo
        position.y -= speed;
        break
      case "l":
        // mover en y negativo
        position.z += speed;
        break
      case "k":
        // mover en y negativo
        position.z -= speed;
        break
      case "+":
        // escalar hacia arriba
        scale = scale.scalar(2);
        break
      case "-":
        // escalar hacia abajo
        scale.x -= scaleAmount;
        scale.y -= scaleAmount;
        scale.z  = scale.z - scaleAmount;
        break
      case "1":
        // Esto resetea toda las posiciones
        position.x = 0;
        position.y = 0;
        position.z = 0;
        rotation.x = 0.261;
        rotation.y = 0.174;
        rotation.z = 6.283;
        break
      case "f":
      case "arrowright":
        // rotar en x positivo
        rotation.x += m4.degToRad(rotationSpeed);
        console.log("ROTATION X: ", rotation.x);
        break
      case "g":
      case "arrowleft":
        // rotar en x negativo
        rotation.x -= m4.degToRad(rotationSpeed);
        console.log("ROTATION X: ", rotation.x);
        break
      case "e":
      case "arrowup":
        // rotar en y positivo
        rotation.y += m4.degToRad(rotationSpeed);
        console.log("ROTATION Y: ", rotation.y);
        break
      case "r":
      case "arrowdown":
        // rotar en y negativo
        rotation.y -= m4.degToRad(rotationSpeed);
        console.log("ROTATION Y: ", rotation.y);
        break
      case "t":
        // rotar en z positivo
        rotation.z += m4.degToRad(rotationSpeed);
        console.log("ROTATION Z: ", rotation.z);
        break
      case "y":
        // rotar en z negativo
        rotation.z -= m4.degToRad(rotationSpeed);
        console.log("ROTATION Z: ", rotation.z);
        break
      case "2":
        // MOSTRAR INFO DE POSICIONES
        console.log("ROTATION: ");
        rotation.forEach(e => {
          console.log(e);
        });
        
        break
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
 