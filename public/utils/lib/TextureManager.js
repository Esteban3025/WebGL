const MAX_ANISOTROPY = 4;

export async function decodeImage(blob) {
  return createImageBitmap(blob, {
    imageOrientation: "flipY",
    premultiplyAlpha: "none",
  });
}

export async function loadImage(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`No se pudo cargar la textura "${url}": ${response.status}`);
  }
  return decodeImage(await response.blob());
}

// Texturas compartidas por clave con conteo de referencias.
export class TextureManager {
  constructor(gl) {
    this.gl = gl;
    this.entries = new Map();
    const extension = gl.getExtension("EXT_texture_filter_anisotropic");
    this.anisotropyExtension = extension;
    this.anisotropy = extension
      ? Math.min(MAX_ANISOTROPY, gl.getParameter(extension.MAX_TEXTURE_MAX_ANISOTROPY_EXT))
      : 0;
  }

  // `source` es una función async que devuelve un ImageBitmap/imagen ya orientada.
  acquire(key, source) {
    let entry = this.entries.get(key);
    if (!entry) {
      entry = { texture: null, refs: 0, promise: null };
      entry.promise = Promise.resolve()
        .then(source)
        .then((image) => {
          entry.texture = this.upload(image);
          image.close?.();
          return entry.texture;
        })
        .catch((error) => {
          this.entries.delete(key);
          throw error;
        });
      this.entries.set(key, entry);
    }
    entry.refs++;
    return entry.promise;
  }

  acquireSolid(key, rgba) {
    return this.acquire(key, () => ({
      width: 1,
      height: 1,
      data: new Uint8Array(rgba),
      solid: true,
    }));
  }

  upload(image) {
    const { gl } = this;
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    if (image.solid) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, image.data);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      return texture;
    }
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    if (this.anisotropy > 1) {
      gl.texParameterf(
        gl.TEXTURE_2D,
        this.anisotropyExtension.TEXTURE_MAX_ANISOTROPY_EXT,
        this.anisotropy,
      );
    }
    return texture;
  }

  release(key) {
    const entry = this.entries.get(key);
    if (!entry || --entry.refs > 0) return;
    this.entries.delete(key);
    if (entry.texture) this.gl.deleteTexture(entry.texture);
    else entry.promise.then((texture) => this.gl.deleteTexture(texture), () => {});
  }

  dispose() {
    for (const entry of this.entries.values()) {
      if (entry.texture) this.gl.deleteTexture(entry.texture);
    }
    this.entries.clear();
  }
}
