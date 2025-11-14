function main () {
  const canvas = document.getElementById('canvas');
  const vertexShaderSource = document.querySelector('#vertex-shader-2d').textContent;
  const fragmentShaderSource = document.querySelector('#fragment-shader-2d').textContent;
  const gl = canvas.getContext('webgl');

  if (!gl) {
    throw new Error('No se pudo iniciar webgl');
  }

  const translation = [0, 0];
  const rotation = [0, 1];
  const scale = [1, 1];
  const width = 100;
  const height = 30;
  const backgroundColor = {r: 5, g: 5, b: 5, a: 1};
  const color = [Math.random(), Math.random(), Math.random(), 1];

  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource); // EL TEXTO SOURCE DE LOS SHADERS
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

  const program = createProgram(gl, vertexShader, fragmentShader);

  const positionAttributeLocation = gl.getAttribLocation(program, 'a_position');
  const resoluctionUniformLocation = gl.getUniformLocation(program, 'u_resolution');
  const colorUniformLocation = gl.getUniformLocation(program, 'u_color'); // HACER RELACION CON EL FRAGMENT SHADER
  const translationLocation = gl.getUniformLocation(program, 'u_translation');
  const rotationLocation = gl.getUniformLocation(program, 'u_rotation');
  const scaleLocation = gl.getUniformLocation(program, 'u_scale');
  
  const positionBuffer = gl.createBuffer(); // UN ESPACIO EN MEMORIA
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer); // BINDING EL ESPACIO DE MEMORIA A UN BUFFER DE LA GPU
  setGeometry(gl);

  drawScene();

  webglLessonsUI.setupSlider("#x", {slide: updatePosition(0), max: gl.canvas.width });
  webglLessonsUI.setupSlider("#y", {slide: updatePosition(1), max: gl.canvas.height});
  webglLessonsUI.setupSlider("#angle", {slide: updateAngle, max: 360});
   webglLessonsUI.setupSlider("#scaleX", {value: scale[0], slide: updateScale(0), min: -5, max: 5, step: 0.01, precision: 2});
  webglLessonsUI.setupSlider("#scaleY", {value: scale[1], slide: updateScale(1), min: -5, max: 5, step: 0.01, precision: 2});

  function updatePosition(index) {
    return function(event, ui) {
      translation[index] = ui.value;
      drawScene();
    };
  }

  function updateScale(index) {
    return function(event, ui) {
      scale[index] = ui.value;
      drawScene();
    };
  }

  function updateAngle(event, ui) {
    const angleInDegrees = 360 - ui.value;
    const angleInRadians = angleInDegrees * Math.PI / 180;
    rotation[0] = Math.sin(angleInRadians);
    rotation[1] = Math.cos(angleInRadians);
    drawScene();
  }

  // gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW); // PASANDO DATOS AL BUFFER

  function drawScene() {
    webglUtils.resizeCanvasToDisplaySize(gl.canvas); 

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    gl.clearColor(backgroundColor.r, backgroundColor.g, backgroundColor.b, backgroundColor.a); // COLOR DEL FONDO
    gl.clear(gl.COLOR_BUFFER_BIT); // LIMPIAR EL COLOR DEL FONDO

    gl.useProgram(program);
    gl.enableVertexAttribArray(positionAttributeLocation);
    gl.uniform2f(resoluctionUniformLocation, gl.canvas.width, gl.canvas.height);
  
    gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

    gl.uniform2f(resoluctionUniformLocation, gl.canvas.width, gl.canvas.height);
    gl.uniform4fv(colorUniformLocation, color);
    gl.uniform2fv(translationLocation, translation);
    gl.uniform2fv(rotationLocation, rotation);
    gl.uniform2fv(scaleLocation, scale);
    gl.drawArrays(gl.TRIANGLES, 0, 18);  
  }
}

main();

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

function setGeometry(gl) {
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([
      // left column
          0, 0,
          30, 0,
          0, 150,
          0, 150,
          30, 0,
          30, 150,
          // top rung
          30, 0,
          100, 0,
          30, 30,
          30, 30,
          100, 0,
          100, 30,
          // middle rung
          30, 60,
          67, 60,
          30, 90,
          30, 90,
          67, 60,
          67, 90,
  ]), gl.STATIC_DRAW);
}