const express = require('express');
const mysql = require('mysql2'); 
const cors = require('cors');
require('dotenv').config();
const bcrypt = require('bcrypt');
const saltRounds = 10;
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
// --- RUTA PARA REGISTRAR UN NUEVO USUARIO ---
app.post('/api/register', (req, res) => {
    const { correo, contraseña } = req.body;

    // Validación básica
    if (!correo || !contraseña) {
        return res.status(400).json({ error: 'Correo y contraseña son requeridos' });
    }

    // Hashea la contraseña ANTES de la consulta
    bcrypt.hash(contraseña, saltRounds, (err, contraseñaHash) => {
        if (err) {
            console.error('Error al hashear la contraseña:', err);
            return res.status(500).json({ error: 'Error interno del servidor' });
        }

        // Guarda el usuario en la base de datos (MySQL)
        const query = 'INSERT INTO Usuarios (correo, contraseña_hash) VALUES (?, ?)';
        // MySQL usa ? como placeholders

        db.query(query, [correo, contraseñaHash], (dbErr, result) => {
            if (dbErr) {
                // Manejo de errores (ej. correo duplicado)
                if (dbErr.code === 'ER_DUP_ENTRY') { // Código de error de MySQL para duplicados
                    return res.status(400).json({ error: 'El correo ya está registrado' });
                }
                console.error('Error al registrar usuario:', dbErr);
                return res.status(500).json({ error: 'Error interno del servidor' });
            }

            // Éxito al insertar
            res.status(201).json({ id: result.insertId, message: 'Usuario registrado exitosamente' });
        });
    });
});

// --- RUTA PARA INICIAR SESIÓN ---
app.post('/api/login', (req, res) => {
    const { correo, contraseña } = req.body;

    if (!correo || !contraseña) {
        return res.status(400).json({ error: 'Correo y contraseña son requeridos' });
    }

    // Busca al usuario por correo
    const query = 'SELECT * FROM Usuarios WHERE correo = ?';
    db.query(query, [correo], (dbErr, results) => {
        if (dbErr) {
            console.error('Error al buscar usuario:', dbErr);
            return res.status(500).json({ error: 'Error interno del servidor' });
        }

        // Si no se encuentra el usuario (results es un array vacío)
        if (results.length === 0) {
            return res.status(401).json({ error: 'Credenciales inválidas' }); // 401 Unauthorized
        }

        const usuario = results[0]; // El usuario encontrado

        // Compara la contraseña enviada con el hash guardado
        bcrypt.compare(contraseña, usuario.contraseña_hash, (compareErr, match) => {
            if (compareErr) {
                console.error('Error al comparar contraseñas:', compareErr);
                return res.status(500).json({ error: 'Error interno del servidor' });
            }

            if (match) {
                // Contraseña correcta - ¡Login exitoso!
                res.json({ message: 'Login exitoso' });
            } else {
                // Contraseña incorrecta
                res.status(401).json({ error: 'Credenciales inválidas' });
            }
        });
    });
});
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