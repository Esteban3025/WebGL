import { Shapes } from "./tools/Shapes.js";

function main () {
  const shape = new Shapes();
  shape.draw({
    positions: [
      // left column
            0,   0,  0,
           30,   0,  0,
            0, 150,  0,
            0, 150,  0,
           30,   0,  0,
           30, 150,  0,
 
          // top rung
           30,   0,  0,
          100,   0,  0,
           30,  30,  0,
           30,  30,  0,
          100,   0,  0,
          100,  30,  0,
 
          // middle rung
           30,  60,  0,
           67,  60,  0,
           30,  90,  0,
           30,  90,  0,
           67,  60,  0,
           67,  90,  0,
    ],
    color: [5, 0, 0, 1],
  });

  shape.drawScene();

  // function drawScene(now) {
  //   now *= 0.001;
  //   let deltaTime = now - then;

  //   webglUtils.resizeCanvasToDisplaySize(gl.canvas); 

  //   gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

  //   gl.clearColor(backgroundColor.r, backgroundColor.g, backgroundColor.b, backgroundColor.a); // COLOR DEL FONDO
  //   gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // LIMPIAR EL COLOR DEL FONDO

  //   modelYRotationRadians += -0.7 * deltaTime;
  //   modelXRotationRadians += -0.4 * deltaTime;
    
  //   gl.useProgram(program);
  //   gl.enableVertexAttribArray(positionAttributeLocation);
  //   gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  //   gl.vertexAttribPointer(positionAttributeLocation, 3, gl.FLOAT, false, 0, 0);

  //   gl.enableVertexAttribArray(texcoordLocation);
  //   gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
  //   gl.vertexAttribPointer(texcoordLocation, 2, gl.FLOAT, false, 0, 0);
    
  //   const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;

  //   const projectionMatrix =
  //       m4.perspective(fieldOfViewRadians, aspect, 1, 2000);

  //   const cameraPosition = [0, 0, 2];
  //   const up = [0, 1, 0];
  //   const target = [0, 0, 0];

  //   // Compute the camera's matrix using look at.
  //   const cameraMatrix = m4.lookAt(cameraPosition, target, up);

  //   // Make a view matrix from the camera matrix.
  //   const viewMatrix = m4.inverse(cameraMatrix);

  //   const viewProjectionMatrix = m4.multiply(projectionMatrix, viewMatrix);

  //   let matrix = m4.xRotate(viewProjectionMatrix, modelXRotationRadians);
  //   matrix = m4.yRotate(matrix, modelYRotationRadians);

    
  //   gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

  //   gl.uniform1i(textureLocation, 0);
  //   gl.uniformMatrix4fv(matrixLocation, false, matrix); // set the matrix
  //   gl.drawArrays(gl.TRIANGLES, 0, 16 * 6); 
  //   then = now;
  //   requestAnimationFrame(drawScene);  
  // }
};



function setTexcoords(gl) {
  gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([
        // select the top left image
    0   , 0  ,
    0   , 0.5,
    0.25, 0  ,
    0   , 0.5,
    0.25, 0.5,
    0.25, 0  ,
    // select the top middle image
    0.25, 0  ,
    0.5 , 0  ,
    0.25, 0.5,
    0.25, 0.5,
    0.5 , 0  ,
    0.5 , 0.5,
    // select to top right image
    0.5 , 0  ,
    0.5 , 0.5,
    0.75, 0  ,
    0.5 , 0.5,
    0.75, 0.5,
    0.75, 0  ,
    // select the bottom left image
    0   , 0.5,
    0.25, 0.5,
    0   , 1  ,
    0   , 1  ,
    0.25, 0.5,
    0.25, 1  ,
    // select the bottom middle image
    0.25, 0.5,
    0.25, 1  ,
    0.5 , 0.5,
    0.25, 1  ,
    0.5 , 1  ,
    0.5 , 0.5,
    // select the bottom right image
    0.5 , 0.5,
    0.75, 0.5,
    0.5 , 1  ,
    0.5 , 1  ,
    0.75, 0.5,
    0.75, 1,
      ]),
      gl.STATIC_DRAW);
}

main();