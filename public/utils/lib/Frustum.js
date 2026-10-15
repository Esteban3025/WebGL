// Planos del frustum extraídos de la matriz view-projection (Gribb-Hartmann).
export class Frustum {
  constructor() {
    this.planes = new Float32Array(24);
  }

  update(m) {
    const p = this.planes;
    const rows = [
      [m[3] + m[0], m[7] + m[4], m[11] + m[8], m[15] + m[12]],
      [m[3] - m[0], m[7] - m[4], m[11] - m[8], m[15] - m[12]],
      [m[3] + m[1], m[7] + m[5], m[11] + m[9], m[15] + m[13]],
      [m[3] - m[1], m[7] - m[5], m[11] - m[9], m[15] - m[13]],
      [m[3] + m[2], m[7] + m[6], m[11] + m[10], m[15] + m[14]],
      [m[3] - m[2], m[7] - m[6], m[11] - m[10], m[15] - m[14]],
    ];
    rows.forEach(([a, b, c, d], i) => {
      const inverseLength = 1 / (Math.hypot(a, b, c) || 1);
      p[i * 4] = a * inverseLength;
      p[i * 4 + 1] = b * inverseLength;
      p[i * 4 + 2] = c * inverseLength;
      p[i * 4 + 3] = d * inverseLength;
    });
  }

  intersectsSphere(x, y, z, radius) {
    const p = this.planes;
    for (let i = 0; i < 24; i += 4) {
      if (p[i] * x + p[i + 1] * y + p[i + 2] * z + p[i + 3] < -radius) return false;
    }
    return true;
  }
}
