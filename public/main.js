function createShader(gl, type, source) {
  var shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  var success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (success) {
    return shader;
  }

  console.log(gl.getShaderInfoLog(shader));
  gl.deleteShader(shader);
}

function createProgram(gl, vertexShader, fragmentShader) {
  var program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  var success = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (success) {
    return program;
  }

  console.log(gl.getProgramInfoLog(program));
  gl.deleteProgram(program);
}

function randomInt(range) {
  return Math.floor(Math.random() * range);
}

function setRectangle(gl, x, y, width, height) {
  const x1 = x;
  const x2 = x + width;
  const y1 = y;
  const y2 = y + height;

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    x1, y1,
    x2, y1,
    x1, y2,
    x1, y2,
    x2, y1,
    x2, y2
  ]), gl.STATIC_DRAW);
}


function main () {
  const canvas = document.getElementById('canvas');
  const vertexShaderSource = document.querySelector('#vertex-shader-2d').textContent;
  const fragmentShaderSource = document.querySelector('#fragment-shader-2d').textContent;
  const rangeX = document.querySelector('#x');
  const rangeY = document.querySelector('#y');
  const gl = canvas.getContext('webgl');

  if (!gl) {
    throw new Error('No se pudo iniciar webgl');
  }

  const translation = [0, 0];
  const width = 100;
  const height = 30;
  const color = [Math.random(), Math.random(), Math.random(), 1];

  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource); // EL TEXTO SOURCE DE LOS SHADERS
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

  const program = createProgram(gl, vertexShader, fragmentShader);

  const positionAttributeLocation = gl.getAttribLocation(program, 'a_position');
  const resoluctionUniformLocation = gl.getUniformLocation(program, 'u_resolution');
  const colorUniformLocation = gl.getUniformLocation(program, 'u_color'); // HACER RELACION CON EL FRAGMENT SHADER

  drawScene();

  webglLessonsUI.setupSlider("#x", {slide: updatePosition(0), max: gl.canvas.width });
  webglLessonsUI.setupSlider("#y", {slide: updatePosition(1), max: gl.canvas.height});


  function updatePosition(index) {
    return function(event, ui) {
      translation[index] = ui.value;
      drawScene();
    };
  }

  // gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW); // PASANDO DATOS AL BUFFER

  function drawScene() {
    webglUtils.resizeCanvasToDisplaySize(gl.canvas); 

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    const positionBuffer = gl.createBuffer(); // UN ESPACIO EN MEMORIA
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer); // BINDING EL ESPACIO DE MEMORIA A UN BUFFER DE LA GPU

    gl.clearColor(5, 5, 5, 1); // COLOR DEL FONDO
    gl.clear(gl.COLOR_BUFFER_BIT); // LIMPIAR EL COLOR DEL FONDO

    gl.useProgram(program);
    setRectangle(gl, translation[0], translation[1], width, height);
    gl.enableVertexAttribArray(positionAttributeLocation);
    gl.uniform2f(resoluctionUniformLocation, gl.canvas.width, gl.canvas.height);
  
    gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

    gl.uniform2f(resoluctionUniformLocation, gl.canvas.width, gl.canvas.height);
    gl.uniform4fv(colorUniformLocation, color);
    gl.drawArrays(gl.TRIANGLES, 0, 6);  
  }
}

main();