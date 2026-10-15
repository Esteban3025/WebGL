// Tengo que hacer el server para poder leer los shaders desde un txt con nodejs
import express from 'express';

const app = express();
const PORT = 3000;

 app.use(express.static('public'))

 app.use("/shaders", express.static('shaders'));

app.listen(PORT, () => {
  console.log(`Servidor eschando en http://localhost:${PORT}`);
})