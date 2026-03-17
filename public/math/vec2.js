export class vec2 {
  constructor(x, y = x) {
    this.x = x;
    this.y = y;
  }

  vector(x, y) {
    return new vec2(x, y);
  }

  sum(otherVector) {
    this.result = new vec2(this.x+otherVector.x, this.y+otherVector.y);
    return this.result;
  }

  sub(otherVector){
    this.result = new vec2(this.x-otherVector.x, this.y-otherVector.y);
    return this.result;
  }

  scalar(k) {
    this.result = new vec2(this.x*k, this.y*k);
    return this.result;
  }

  sumAll() {
    this.result = this.x + this.y;
    return this.result;
  }

  length() {
    this.sum = new vec2(this.x*this.x, this.y*this.y).sumAll();
    this.result = Math.sqrt(this.sum);
    return this.result;
  }

  normalize() {
    this.vectorLength = this.vector(this.x, this.y).length();
    this.result = new vec2(this.x / this.vectorLength, this.y / this.vectorLength);
    return this.result;
  }
  
}