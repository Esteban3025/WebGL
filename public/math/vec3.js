export class vec3 {
  constructor(x, y = x, z = x) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  sum(otherVector) {
    this.result = new vec3(this.x+otherVector.x, this.y+otherVector.y, this.z+otherVector.z);
    return this.result;
  }

  sub(otherVector) {
    this.result = new vec3(this.x-otherVector.x, this.y-otherVector.y, this.z-otherVector.z);
    return this.result;
  }

  scalar(k) {
    this.result = new vec3(this.x*k, this.y+otherVector*k, this.z*k);
    return this.result;
  }

  sumAll() {
    this.result = this.x + this.y + this.z;
    return this.result;
  }

  length() {
    this.sum = new vec3(this.x*this.x, this.y*this.y, this.z*this.z).sumAll();
    this.result = Math.sqrt(this.sum);
    return this.result;
  }
}