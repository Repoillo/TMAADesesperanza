const express = require('express');
const mysql = require('mysql2'); 
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

db.connect(err => {
  if (err) {
    console.error('Error al conectar a la base de datos:', err);
    return;
  }
  console.log('Conexión exitosa a la base de datos');
});

// === Rutas ===
app.get('/api/productos', (req, res) => {
  const query = 'SELECT id_producto, nombre, precio_venta, es_de_temporada, imagen_url FROM Productos';
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error al obtener productos:', err);
      return res.status(500).json({ error: 'Error al conectar a la base de datos' });
    }
    res.json(results);
  });
});

// CREAR un producto
app.post('/api/productos', (req, res) => {
  const { nombre, precio_venta, es_de_temporada, imagen_url } = req.body;
  const query = 'INSERT INTO Productos (nombre, precio_venta, es_de_temporada, imagen_url) VALUES (?, ?, ?, ?)';
  
  db.query(query, [nombre, precio_venta, es_de_temporada, imagen_url], (err, result) => {
    if (err) {
      console.error('Error al crear el producto:', err);
      return res.status(500).json({ error: 'Error al crear el producto' });
    }
    res.status(201).json({ id: result.insertId, message: 'Producto creado exitosamente' });
  });
});

// ACTUALIZAR un producto
app.put('/api/productos/:id', (req, res) => {
  const { id } = req.params;
  const { nombre, precio_venta, es_de_temporada, imagen_url } = req.body;
  const query = 'UPDATE Productos SET nombre = ?, precio_venta = ?, es_de_temporada = ?, imagen_url = ? WHERE id_producto = ?';

  db.query(query, [nombre, precio_venta, es_de_temporada, imagen_url, id], (err, result) => {
    if (err) {
      console.error('Error al actualizar el producto:', err);
      return res.status(500).json({ error: 'Error al actualizar el producto' });
    }
    res.json({ message: 'Producto actualizado exitosamente' });
  });
});

// ELIMINAR un producto
app.delete('/api/productos/:id', (req, res) => {
  const { id } = req.params;
  const query = 'DELETE FROM Productos WHERE id_producto = ?';

  db.query(query, [id], (err, result) => {
    if (err) {
      console.error('Error al eliminar el producto:', err);
      return res.status(500).json({ error: 'Error al eliminar el producto' });
    }
    res.json({ message: 'Producto eliminado exitosamente' });
  });
});


const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`));