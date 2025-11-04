const express = require('express');
const mysql = require('mysql2/promise'); 
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


const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,         
  connectTimeout: 30000,
  waitForConnections: true,
  connectionLimit: 30,
  queueLimit: 0
});


app.get('/', (req, res) => {
    if (req.session.userId) {
        if (req.session.rol === 'admin') {
            res.redirect('/crud.html');
        } else {
            res.redirect('/principal.html');
        }
    } else {
        res.sendFile(__dirname + '/public/index.html');
    }
});

app.post('/api/register', async (req, res) => {
    const { nombre, apellido, correo, contraseña } = req.body;
    
    if (!nombre || !apellido || !correo || !contraseña) {
        return res.status(400).json({ error: 'Todos los campos son requeridos.' });
    }

    let connection;
    try {
        const contraseñaHash = await bcrypt.hash(contraseña, saltRounds);
        
        connection = await db.getConnection();
        await connection.beginTransaction(); 

        const sqlUsuario = 'INSERT INTO usuario (correo, contraseña_hash, rol) VALUES (?, ?, ?)';
        const [resultUsuario] = await connection.query(sqlUsuario, [correo, contraseñaHash, 'cliente']);
        const nuevoUsuarioId = resultUsuario.insertId;

        const sqlCliente = 'INSERT INTO clientes (id_cliente, nombre, apellido, email) VALUES (?, ?, ?, ?)';
        await connection.query(sqlCliente, [nuevoUsuarioId, nombre, apellido, correo]);

        await connection.commit();
        
        res.status(201).json({ id: nuevoUsuarioId, message: 'Usuario y cliente registrados exitosamente' });

    } catch (dbErr) {
        if (connection) await connection.rollback(); 
        console.error("Error en registro:", dbErr);
        if (dbErr.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'El correo ya está registrado.' });
        }
        res.status(500).json({ error: 'Error al registrar el usuario.' });
    } finally {
        if (connection) connection.release();
    }
});


app.post('/api/login', async (req, res) => {
    const { correo, contraseña } = req.body;
    if (!correo || !contraseña) { 
        return res.status(400).json({ error: 'Correo y contraseña son requeridos.' });
    }
    
    const query = 'SELECT id_usuario, correo, contraseña_hash, rol FROM usuario WHERE correo = ?';
    
    try {
        const [results] = await db.query(query, [correo]);
        if (results.length === 0) { 
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }
        
        const usuario = results[0];
        const match = await bcrypt.compare(contraseña, usuario.contraseña_hash);
        
        if (match) {
            req.session.userId = usuario.id_usuario;
            req.session.correo = usuario.correo;
            req.session.rol = usuario.rol;
            
            res.json({ message: 'Login exitoso', rol: usuario.rol });
        } else {
            res.status(401).json({ error: 'Credenciales inválidas' });
        }
    } catch (dbErr) {
        console.error("Error en login:", dbErr);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
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
        res.json({ 
            loggedIn: true, 
            correo: req.session.correo, 
            rol: req.session.rol 
        });
    } else {
        res.json({ loggedIn: false });
    }
});

const esAdmin = (req, res, next) => {
    if (req.session.userId && req.session.rol === 'admin') {
        next(); 
    } else {
        res.status(401).json({ error: 'No autorizado. Se requiere rol de Administrador.' });
    }
};

const esCliente = (req, res, next) => {
    if (req.session.userId && req.session.rol === 'cliente') {
        next(); 
    } else {
        res.status(401).json({ error: 'No autorizado. Se requiere rol de Cliente.' });
    }
};

app.get('/api/productos', esAdmin, async (req, res) => {
    const query = 'SELECT id_producto, nombre, precio_venta, es_de_temporada, imagen_url FROM productos';
    try {
        const [results] = await db.query(query);
        res.json(results);
    } catch (err) {
        console.error('Error al obtener productos (admin):', err);
        res.status(500).json({ error: 'Error al obtener productos' });
    }
});

app.post('/api/productos', esAdmin, async (req, res) => { 
    const { nombre, precio_venta, es_de_temporada, imagen_url } = req.body;
    if (!nombre || precio_venta === undefined) {
        return res.status(400).json({ error: 'Nombre y precio son requeridos' });
    }
    
    const query = 'INSERT INTO productos (nombre, precio_venta, es_de_temporada, imagen_url) VALUES (?, ?, ?, ?)';
    
    try {
        const [result] = await db.query(query, [nombre, precio_venta, es_de_temporada ? 1 : 0, imagen_url || null]);
        res.status(201).json({ id: result.insertId, message: 'Producto creado exitosamente' });
    } catch (err) {
        console.error('Error al crear producto:', err);
        res.status(500).json({ error: 'Error al crear el producto' });
    }
 });

app.put('/api/productos/:id', esAdmin, async (req, res) => { 
    const { id } = req.params;
    const { nombre, precio_venta, es_de_temporada, imagen_url } = req.body;
    if (!nombre || precio_venta === undefined) {
        return res.status(400).json({ error: 'Nombre y precio son requeridos' });
    }

    const query = 'UPDATE productos SET nombre = ?, precio_venta = ?, es_de_temporada = ?, imagen_url = ? WHERE id_producto = ?';
    
    try {
        const [result] = await db.query(query, [nombre, precio_venta, es_de_temporada ? 1 : 0, imagen_url || null, id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        res.json({ message: 'Producto actualizado exitosamente' });
    } catch (err) {
         console.error('Error al actualizar producto:', err);
         res.status(500).json({ error: 'Error al actualizar el producto' });
    }
 });

app.delete('/api/productos/:id', esAdmin, async (req, res) => { 
    const { id } = req.params;
    const query = 'DELETE FROM productos WHERE id_producto = ?';
    
    try {
        const [result] = await db.query(query, [id]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        res.json({ message: 'Producto eliminado exitosamente' });
    } catch (err) {
         console.error('Error al eliminar producto:', err);
         res.status(500).json({ error: 'Error al eliminar el producto' });
    }
 });

app.get('/api/productos-tienda', esCliente, async (req, res) => {
    const query = 'SELECT id_producto, nombre, precio_venta, es_de_temporada, imagen_url FROM productos';
    try {
        const [results] = await db.query(query);
        res.json(results);
    } catch (err) {
        console.error('Error al obtener productos (cliente):', err);
        res.status(500).json({ error: 'Error al obtener productos' });
    }
});



app.get('/api/productos-tienda', esCliente, async (req, res) => {
    const query = 'SELECT id_producto, nombre, precio_venta, es_de_temporada, imagen_url FROM productos';
    try {
        const [results] = await db.query(query);
        res.json(results);
    } catch (err) {
        console.error('Error al obtener productos (cliente):', err);
        res.status(500).json({ error: 'Error al obtener productos' });
    }
});

app.post('/api/pedidos/crear', esCliente, async (req, res) => {
    
    const id_cliente_sesion = req.session.userId; 
    const { total_pedido, estado_pedido, detalle_items } = req.body;

    if (!total_pedido || !detalle_items || !Array.isArray(detalle_items) || detalle_items.length === 0) {
        return res.status(400).json({ message: 'Datos del pedido incompletos.' });
    }

    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        const sqlPedido = `
            INSERT INTO pedidos 
            (id_cliente, fecha_pedido, total_pedido, estado_pedido) 
            VALUES (?, NOW(), ?, ?)
        `;
        const paramsPedido = [id_cliente_sesion, total_pedido, estado_pedido || 'pendiente'];
        
        const [pedidoResult] = await connection.query(sqlPedido, paramsPedido);
        const idPedido = pedidoResult.insertId;

        const sqlDetalle = `
            INSERT INTO detalle_pedidos
            (id_pedido, id_producto, cantidad, precio_unitario) 
            VALUES ?
        `; 
        const detalleValues = detalle_items.map(item => [
            idPedido, item.id, item.cantidad, item.precio
        ]);
        await connection.query(sqlDetalle, [detalleValues]);

        await connection.commit();
        res.status(201).json({ message: 'Pedido creado exitosamente', id_pedido: idPedido });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Error en la transacción del pedido:', error);
        res.status(500).json({ message: 'Error interno al procesar el pedido.' });
    } finally {
        if (connection) connection.release();
    }
});

app.use(express.static('public'));

app.get('/crud.html', esAdmin, (req, res) => {
    res.sendFile(__dirname + '/public/crud.html');
});
app.get('/principal.html', esCliente, (req, res) => {
    res.sendFile(__dirname + '/public/principal.html');
});
app.get('/carrito.html', esCliente, (req, res) => {
    res.sendFile(__dirname + '/public/carrito.html');
});


const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`));