import { vec1 } from "./vec1.js";

export class vec2 {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  sum(otherVector) {
    this.result = new vec2(this.x+otherVector.x, this.y+otherVector.y);
    return this.result;
  }

  sub(otherVector){
    this.result = new vec2(this.x-otherVector.x, this.y-otherVector.y);
    return this.result;
  }

  multiply(otherVector) {
    return new vec2(this.x*otherVector.x, this.y*otherVector.y);
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
    return Math.sqrt(this.sum);
  }

  normalize() {
    this.vectorLength = new vec2(this.x, this.y).length();
    this.result = new vec2(this.x / this.vectorLength, this.y / this.vectorLength);
    return this.result;
  }

  distance(otherVector) {
    // La distancia de dos vectores se halla restando ambos vectores, y hallar la magnitud del vector resultante.
    this.d = new vec2(otherVector.x, otherVector.y).sub(new vec2(this.x, this.y));
    return new vec1(this.d.length());
  }
  
  dot(otherVector) {
    this.d = new vec2(this.x, this.y).multiply(otherVector);
    return new vec1(this.d.x + this.d.y);
  }

}