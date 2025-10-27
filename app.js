const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcrypt');
const session = require('express-session'); // <-- Importa express-session
require('dotenv').config();

const app = express();
const saltRounds = 10;

// --- Configuración de CORS ---
// Permite que el frontend envíe credenciales (como cookies de sesión)
// Asegúrate de que la URL coincida con dónde corre tu frontend,
// si es diferente a http://localhost:10000 o tu IP local con el puerto.
// Para Render, puede ser necesario ajustar esto o usar una configuración más permisiva.
app.use(cors({
    origin: true, // Permite cualquier origen (ajusta para producción si es necesario)
    credentials: true
}));

app.use(express.json());
app.use(express.static('public'));

// --- Configuración de express-session ---
// Verifica que SESSION_SECRET esté definida en tu .env
if (!process.env.SESSION_SECRET) {
    console.error("¡ERROR GRAVE! La variable SESSION_SECRET no está definida en el archivo .env.");
    process.exit(1); // Detiene la aplicación si falta la clave secreta
}

app.use(session({
    secret: process.env.SESSION_SECRET, // Clave secreta para firmar la cookie de sesión
    resave: false,                      // No volver a guardar si no hay cambios
    saveUninitialized: false,             // No guardar sesiones vacías
    cookie: {
        secure: process.env.NODE_ENV === 'production', // true si usas HTTPS (importante en Render)
        httpOnly: true, // La cookie no es accesible por JavaScript en el navegador (más seguro)
        maxAge: 1000 * 60 * 60 // Cookie válida por 1 hora
    }
    // Podrías añadir un 'store' aquí para guardar sesiones en DB en producción
}));

// --- Conexión a Base de Datos ---
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

db.connect(err => {
  if (err) {
    console.error('Error al conectar a la base de datos:', err);
    // En un caso real, podrías intentar reconectar o detener la app
    return;
  }
  console.log('Conexión exitosa a la base de datos');
});

// === RUTAS PÚBLICAS (Login y Registro) ===

// --- RUTA PARA REGISTRAR UN NUEVO USUARIO ---
app.post('/api/register', (req, res) => {
    const { correo, contraseña } = req.body;
    if (!correo || !contraseña) {
        return res.status(400).json({ error: 'Correo y contraseña son requeridos' });
    }
    bcrypt.hash(contraseña, saltRounds, (err, contraseñaHash) => {
        if (err) {
             console.error('Error al hashear la contraseña:', err);
             return res.status(500).json({ error: 'Error interno del servidor al hashear' });
        }
        const query = 'INSERT INTO usuario (correo, contraseña_hash) VALUES (?, ?)';
        db.query(query, [correo, contraseñaHash], (dbErr, result) => {
            if (dbErr) {
                if (dbErr.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ error: 'El correo ya está registrado' });
                }
                console.error('Error al registrar usuario en DB:', dbErr);
                return res.status(500).json({ error: 'Error interno del servidor al registrar' });
            }
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
    const query = 'SELECT * FROM usuario WHERE correo = ?';
    db.query(query, [correo], (dbErr, results) => {
        if (dbErr) {
             console.error('Error al buscar usuario en DB:', dbErr);
             return res.status(500).json({ error: 'Error interno del servidor al buscar usuario' });
        }
        if (results.length === 0) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }
        const usuario = results[0];
        bcrypt.compare(contraseña, usuario.contraseña_hash, (compareErr, match) => {
            if (compareErr) {
                 console.error('Error al comparar contraseñas:', compareErr);
                 return res.status(500).json({ error: 'Error interno del servidor al comparar' });
            }
            if (match) {
                // Guarda info en la sesión
                req.session.userId = usuario.id_usuario;
                req.session.correo = usuario.correo;
                console.log('Sesión iniciada para:', usuario.correo); // Log para depuración
                res.json({ message: 'Login exitoso' });
            } else {
                res.status(401).json({ error: 'Credenciales inválidas' });
            }
        });
    });
});

// --- RUTA PARA CERRAR SESIÓN ---
app.post('/api/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Error al cerrar sesión:', err);
            return res.status(500).json({ error: 'No se pudo cerrar sesión' });
        }
        res.clearCookie('connect.sid'); // Nombre estándar de la cookie de sesión
        console.log('Sesión cerrada'); // Log para depuración
        res.json({ message: 'Sesión cerrada exitosamente' });
    });
});

// --- RUTA PARA VERIFICAR SI HAY SESIÓN ACTIVA ---
app.get('/api/check-auth', (req, res) => {
    if (req.session.userId) {
        res.json({ loggedIn: true, correo: req.session.correo });
    } else {
        res.json({ loggedIn: false });
    }
});

// === MIDDLEWARE DE AUTENTICACIÓN (Usando Sesiones) ===
const isAuthenticated = (req, res, next) => {
    if (req.session.userId) {
        console.log('Acceso permitido para usuario:', req.session.correo); // Log para depuración
        next();
    } else {
        console.log('Acceso denegado: No hay sesión activa'); // Log para depuración
        res.status(401).json({ error: 'No autorizado. Por favor, inicia sesión.' });
    }
};

// === RUTAS PROTEGIDAS (CRUD de Productos) ===

// LEER todos los productos (Protegida)
app.get('/api/productos', isAuthenticated, (req, res) => {
    const query = 'SELECT id_producto, nombre, precio_venta, es_de_temporada, imagen_url FROM Productos';
    db.query(query, (err, results) => {
        if (err) {
             console.error('Error al obtener productos:', err);
             return res.status(500).json({ error: 'Error al obtener productos' });
        }
        res.json(results);
    });
});

// CREAR un producto nuevo (Protegida)
app.post('/api/productos', isAuthenticated, (req, res) => {
    const { nombre, precio_venta, es_de_temporada, imagen_url } = req.body;
    // Validación básica en el backend también
    if (!nombre || precio_venta === undefined) {
        return res.status(400).json({ error: 'Nombre y precio son requeridos.' });
    }
    const query = 'INSERT INTO Productos (nombre, precio_venta, es_de_temporada, imagen_url) VALUES (?, ?, ?, ?)';
    db.query(query, [nombre, precio_venta, es_de_temporada ? 1 : 0, imagen_url || null], (err, result) => {
        if (err) {
             console.error('Error al crear producto:', err);
             return res.status(500).json({ error: 'Error al crear producto' });
        }
        res.status(201).json({ id: result.insertId, message: 'Producto creado exitosamente' });
    });
});

// ACTUALIZAR (Editar) un producto existente (Protegida)
app.put('/api/productos/:id', isAuthenticated, (req, res) => {
    const { id } = req.params;
    const { nombre, precio_venta, es_de_temporada, imagen_url } = req.body;
    if (!nombre || precio_venta === undefined) {
        return res.status(400).json({ error: 'Nombre y precio son requeridos.' });
    }
    const query = 'UPDATE Productos SET nombre = ?, precio_venta = ?, es_de_temporada = ?, imagen_url = ? WHERE id_producto = ?';
    db.query(query, [nombre, precio_venta, es_de_temporada ? 1 : 0, imagen_url || null, id], (err, result) => {
        if (err) {
            console.error('Error al actualizar producto:', err);
            return res.status(500).json({ error: 'Error al actualizar producto' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        res.json({ message: 'Producto actualizado exitosamente' });
    });
});

// ELIMINAR un producto (Protegida)
app.delete('/api/productos/:id', isAuthenticated, (req, res) => {
    const { id } = req.params;
    const query = 'DELETE FROM Productos WHERE id_producto = ?';
    db.query(query, [id], (err, result) => {
        if (err) {
            console.error('Error al eliminar producto:', err);
            return res.status(500).json({ error: 'Error al eliminar producto' });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        res.json({ message: 'Producto eliminado exitosamente' });
    });
});

// --- Iniciar Servidor ---
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`));