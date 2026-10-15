export class Render {
  constructor(gl, world, ui = {}) {
    this.gl = gl;
    this.world = world;
    this.ui = ui;
    this.lastFrame = 0;
    this.fpsFrames = 0;
    this.fpsTime = 0;
    this.running = false;
  }

  start() {
    if (this.running) return;
    this.running = true;
    requestAnimationFrame((now) => this.frame(now));
  }

  stop() {
    this.running = false;
  }

  frame(now) {
    if (!this.running) return;

    const deltaTime = this.lastFrame === 0
      ? 0
      : Math.min((now - this.lastFrame) / 1000, 0.1);
    this.lastFrame = now;

    this.world.update(deltaTime);
    this.world.draw();
    this.updateUi(deltaTime);
    this.fpsFrames++;
    this.fpsTime += deltaTime;

    if (this.fpsTime >= 1) {
      if (this.ui.fps) {
        this.ui.fps.textContent = `FPS: ${Math.round(this.fpsFrames / this.fpsTime)}`;
      }
      this.fpsFrames = 0;
      this.fpsTime = 0;
    }

    requestAnimationFrame((nextFrame) => this.frame(nextFrame));
  }

  updateUi(deltaTime) {
    const camera = this.world.getCameraPosition();
    const light = this.world.getLightPosition();
    if (this.ui.x) this.ui.x.textContent = camera[0].toFixed(2);
    if (this.ui.y) this.ui.y.textContent = camera[1].toFixed(2);
    if (this.ui.z) this.ui.z.textContent = camera[2].toFixed(2);
    if (this.ui.delta) this.ui.delta.textContent = deltaTime.toFixed(4);
    if (this.ui.lightX) this.ui.lightX.textContent = light.x.toFixed(2);
    if (this.ui.lightY) this.ui.lightY.textContent = light.y.toFixed(2);
    if (this.ui.lightZ) this.ui.lightZ.textContent = light.z.toFixed(2);
  }
}
