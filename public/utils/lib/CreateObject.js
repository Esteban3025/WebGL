import { m4 } from "../Math.js";

export class CreateObject {
  /**
   * @param {WebGLRenderingContext} gl - El contexto de WebGL.
   * @param {Array|Float32Array} vertices - Coordenadas de los vértices (ej: [x,y, z...]).
   * @param {Number} vertexCount - Número total de vértices a renderizar.
   */

  constructor(gl, positionAttributeLocation, vertices, vertexCount) {
    this.gl = gl;
    this.vertexCount = vertexCount;
    this.positionAttributeLocation = positionAttributeLocation;
    this.vertices = vertices

    // 1. Crear y cargar el buffer de la geometría
    const positionBuffer = gl.createBuffer();
    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);
    gl.enableVertexAttribArray(positionAttributeLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    let positions = new Float32Array(this.vertices);

    // let matrix = m4.xRotation(Math.PI);
    //   matrix = m4.translate(matrix, -50, -100, -15);
    
    //   for (let ii = 0; ii < positions.length; ii += 3) {
    //     let vector = m4.transformVector(matrix, [
    //       positions[ii + 0],
    //       positions[ii + 1],
    //       positions[ii + 2],
    //       1,
    //     ]);
    //     positions[ii + 0] = vector[0];
    //     positions[ii + 1] = vector[1];
    //     positions[ii + 2] = vector[2];
    //   }
    
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    // Tell the attribute how to get data out of positionBuffer (ARRAY_BUFFER)
    gl.vertexAttribPointer(positionAttributeLocation, 3, gl.FLOAT, false, 0, 0);
  }

  /**
   * Dibuja el objeto en la pantalla.
   * @param {Number} positionAttributeLocation - La localidad del atributo 'a_position' en el Shader.
   * @param {Number} mode - Primitiva de WebGL (ej: gl.TRIANGLES, gl.LINES).
   */
  draw(mode = this.gl.TRIANGLES) {
    const gl = this.gl;

    gl.bindVertexArray(this.vao);

    // Activar el buffer del objeto
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);

    // Renderizar
    gl.drawArrays(mode, 0, this.vertexCount);
  }

  // Limpieza de memoria en la GPU cuando el objeto ya no se use
  delete() {
    if (this.buffer) {
      this.gl.deleteBuffer(this.buffer);
      this.buffer = null;
    }
  }
}
