const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcrypt');
const session = require('express-session');
require('dotenv').config();

const app = express();
const saltRounds = 10;

app.use(cors({
    origin: true,
    credentials: true
}));

app.use(express.json());

if (!process.env.SESSION_SECRET) {
    console.error("¡ERROR GRAVE! La variable SESSION_SECRET no está definida en el archivo .env.");
    process.exit(1);
}

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 1000 * 60 * 60 
    }
}));

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

// --- Ruta Raíz ---
app.get('/', (req, res) => {
    if (req.session.userId) {
        res.redirect('/principal.html');
    } else {
        res.sendFile(__dirname + '/public/index.html');
    }
});

// --- RUTAS PÚBLICAS  ---
app.post('/api/register', (req, res) => {
    const { correo, contraseña } = req.body;
    if (!correo || !contraseña) { /* ... validación ... */ }
    bcrypt.hash(contraseña, saltRounds, (err, contraseñaHash) => {
        if (err) { /* ... manejo error hash ... */ }
        const query = 'INSERT INTO usuario (correo, contraseña_hash) VALUES (?, ?)';
        db.query(query, [correo, contraseñaHash], (dbErr, result) => {
            if (dbErr) { /* ... manejo error db (duplicado, etc) ... */ }
            res.status(201).json({ id: result.insertId, message: 'Usuario registrado exitosamente' });
        });
    });
});

app.post('/api/login', (req, res) => {
    const { correo, contraseña } = req.body;
    if (!correo || !contraseña) { /* ... validación ... */ }
    const query = 'SELECT * FROM usuario WHERE correo = ?';
    db.query(query, [correo], (dbErr, results) => {
        if (dbErr) { /* ... manejo error db ... */ }
        if (results.length === 0) { /* ... usuario no encontrado ... */ }
        const usuario = results[0];
        bcrypt.compare(contraseña, usuario.contraseña_hash, (compareErr, match) => {
            if (compareErr) { /* ... manejo error compare ... */ }
            if (match) {
                req.session.userId = usuario.id_usuario;
                req.session.correo = usuario.correo;
                res.json({ message: 'Login exitoso' });
            } else {
                res.status(401).json({ error: 'Credenciales inválidas' });
            }
        });
    });
});

app.post('/api/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Error al cerrar sesión:', err); 
            return res.status(500).json({ error: 'No se pudo cerrar sesión' });
        }
        res.clearCookie('connect.sid');
        res.json({ message: 'Sesión cerrada exitosamente' });
    });
});

app.get('/api/check-auth', (req, res) => {
    if (req.session.userId) {
        res.json({ loggedIn: true, correo: req.session.correo });
    } else {
        res.json({ loggedIn: false });
    }
});

// --- MIDDLEWARE DE AUTENTICACIÓN ---
const isAuthenticated = (req, res, next) => {
    if (req.session.userId) {
        next(); 
    } else {
        res.status(401).json({ error: 'No autorizado. Por favor, inicia sesión.' });
    }
};

// === RUTAS PROTEGIDAS (CRUD de Productos) ===
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
app.post('/api/productos', isAuthenticated, (req, res) => {
    const { nombre, precio_venta, es_de_temporada, imagen_url } = req.body;
    if (!nombre || precio_venta === undefined) { /* ... validación ... */ }
    const query = 'INSERT INTO Productos (nombre, precio_venta, es_de_temporada, imagen_url) VALUES (?, ?, ?, ?)';
    db.query(query, [nombre, precio_venta, es_de_temporada ? 1 : 0, imagen_url || null], (err, result) => {
        if (err) { /* ... manejo error db ... */ }
        res.status(201).json({ id: result.insertId, message: 'Producto creado exitosamente' });
    });
});
app.put('/api/productos/:id', isAuthenticated, (req, res) => {
    const { id } = req.params;
    const { nombre, precio_venta, es_de_temporada, imagen_url } = req.body;
    if (!nombre || precio_venta === undefined) { /* ... validación ... */ }
    const query = 'UPDATE Productos SET nombre = ?, precio_venta = ?, es_de_temporada = ?, imagen_url = ? WHERE id_producto = ?';
    db.query(query, [nombre, precio_venta, es_de_temporada ? 1 : 0, imagen_url || null, id], (err, result) => {
        if (err) { /* ... manejo error db ... */ }
        if (result.affectedRows === 0) { /* ... no encontrado ... */ }
        res.json({ message: 'Producto actualizado exitosamente' });
    });
});
app.delete('/api/productos/:id', isAuthenticated, (req, res) => {
    const { id } = req.params;
    const query = 'DELETE FROM Productos WHERE id_producto = ?';
    db.query(query, [id], (err, result) => {
        if (err) { /* ... manejo error db ... */ }
        if (result.affectedRows === 0) { /* ... no encontrado ... */ }
        res.json({ message: 'Producto eliminado exitosamente' });
    });
});
app.use(express.static('public'));

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`));