export class WebGL2Utils {
    
  async createShader(gl, type, path) {
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

  randomInt(range) {
    return Math.floor(Math.random() * range);
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

  getRandomNumber(min, max) {
    return Math.random() * (max - min) + min;
  }

  processInput(gl, position) {
    window.addEventListener('keydown', e => {
      let keys = e.key.toLocaleLowerCase();
      console.log("Key Pressed: ", keys);
      inputsCases(keys, position);
    })
  }

}

function inputsCases(keys, position) {
  let speed = -Math.sin(100) * 8.0;
  switch (keys) {
      case "w":
        position[1] -= speed;
        break
      case "s":
        position[1] += speed;
        break
      case "d":
        position[0] += speed;
        break
      case "a":
        position[0] -= speed;
        break
      case "t":
        position[0] = 0;
        position[1] = 0;
        break
  }
}