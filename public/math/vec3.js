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

  multiply(otherVector) {
    return new vec3(this.x*otherVector.x, this.y*otherVector.y, this.z*otherVector.z);
  } 

  scalar(k) {
    this.result = new vec3(this.x*k, this.y*k, this.z*k);
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

  normalize() {
    this.vectLenght = new vec3(this.x, this.y, this.z).length();
    this.result = new vec3(this.x / this.vectLenght, this.y / this.vectLenght);
    return this.result;
  }

  distance(otherVector) {
    // La distancia de dos vectores se halla restando ambos vectores, y hallar la magnitud del vector resultante.
    this.d = new vec3(otherVector.x, otherVector.y, otherVector.z).sub(new vec3(this.x, this.y, this.z));
    this.result = this.d.length();
    return this.result;
  }

  dot(otherVector) {
    this.d = new vec3(this.x, this.y, this.z).multiply(otherVector);
    this.result = this.d.x + this.d.y + this.d.y;
    return this.result; 
  }
}