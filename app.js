const express = require('express');
const mysql = require('mysql2'); 
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// usamos .env para no subir datos sensibles como contraseñas a GitHub
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

// Este bloque prueba la conexión al iniciar el servidor
db.connect(err => {
  if (err) {
    // si el parametro 'err' llega con algo, es que hubo un error
    console.error('Error al conectar a la base de datos:', err);
    return;
  }
  // si 'err' llega vacio, todo salio bien
  console.log('Conexión exitosa a la base de datos');
});

// === Rutas ===


const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`));