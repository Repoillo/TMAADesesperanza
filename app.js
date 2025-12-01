const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcrypt');
const session = require('express-session');
require('dotenv').config();

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
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

  if (typeof nombre !== 'string' || !nombre.trim()) {
    return res.status(400).json({ error: 'Nombre inválido.' });
  }

  if (typeof apellido !== 'string' || !apellido.trim()) {
    return res.status(400).json({ error: 'Apellido inválido.' });
  }

  if (!emailRegex.test(correo)) {
    return res.status(400).json({ error: 'Formato de correo inválido.' });
  }

  if (typeof contraseña !== 'string' || contraseña.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
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
    await connection.query(sqlCliente, [nuevoUsuarioId, nombre.trim(), apellido.trim(), correo]);

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
  const query = 'SELECT id_producto, nombre, precio_venta, es_de_temporada, imagen_url, esta_activo FROM productos';
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
  const precioNum = parseFloat(precio_venta);

  if (!nombre || !nombre.trim() || precio_venta === undefined) {
    return res.status(400).json({ error: 'Nombre y precio son requeridos.' });
  }
  if (isNaN(precioNum) || precioNum <= 0) {
    return res.status(400).json({ error: 'El precio debe ser un número positivo válido.' });
  }

  const query = 'INSERT INTO productos (nombre, precio_venta, es_de_temporada, imagen_url) VALUES (?, ?, ?, ?)';
  try {
    const [result] = await db.query(query, [nombre.trim(), precioNum, es_de_temporada ? 1 : 0, imagen_url || null]);
    res.status(201).json({ id: result.insertId, message: 'Producto creado exitosamente' });
  } catch (err) {
    console.error('Error al crear producto:', err);
    res.status(500).json({ error: 'Error al crear el producto' });
  }
});

app.put('/api/productos/:id', esAdmin, async (req, res) => {
  const { id } = req.params;
  const { nombre, precio_venta, es_de_temporada, imagen_url } = req.body;

  const precioNum = parseFloat(precio_venta);
  if (!nombre || !nombre.trim() || precio_venta === undefined) {
    return res.status(400).json({ error: 'Nombre y precio son requeridos.' });
  }
  if (isNaN(precioNum) || precioNum <= 0) {
    return res.status(400).json({ error: 'El precio debe ser un número positivo válido.' });
  }

  const query = 'UPDATE productos SET nombre = ?, precio_venta = ?, es_de_temporada = ?, imagen_url = ? WHERE id_producto = ?';
  try {
    const [result] = await db.query(query, [nombre.trim(), precioNum, es_de_temporada ? 1 : 0, imagen_url || null, id]);
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
  const query = 'UPDATE productos SET esta_activo = 0 WHERE id_producto = ?';
  try {
    const [result] = await db.query(query, [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.json({ message: 'Producto desactivado exitosamente' });
  } catch (err) {
    console.error('Error al desactivar producto:', err);
    res.status(500).json({ error: 'Error al desactivar el producto' });
  }
});

app.get('/api/productos-tienda', esCliente, async (req, res) => {
  const query = 'SELECT id_producto, nombre, precio_venta, es_de_temporada, imagen_url FROM productos WHERE esta_activo = 1';
  try {
    const [results] = await db.query(query);
    res.json(results);
  } catch (err) {
    console.error('Error al obtener productos (cliente):', err);
    res.status(500).json({ error: 'Error al obtener productos' });
  }
});

// --- ACTUALIZACIÓN: CREAR PEDIDO CON VALIDACIONES Y DESCUENTO DE SALDO ---
app.post('/api/pedidos/crear', esCliente, async (req, res) => {
  const id_cliente_sesion = req.session.userId;
  // Recibimos latitud y longitud del frontend (Leaflet)
  const { total_pedido, detalle_items, latitud, longitud } = req.body;

  // Validación básica de datos
  if (!total_pedido || !detalle_items || !Array.isArray(detalle_items) || detalle_items.length === 0) {
    return res.status(400).json({ message: 'Datos del pedido incompletos.' });
  }

  // REGLA: No más de 100 productos en total
  const totalArticulos = detalle_items.reduce((acc, item) => acc + parseInt(item.cantidad), 0);
  if (totalArticulos > 100) {
    return res.status(400).json({ message: 'No puedes pedir más de 100 productos en una sola orden.' });
  }

  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    const [cliente] = await connection.query('SELECT saldo FROM clientes WHERE id_cliente = ? FOR UPDATE', [id_cliente_sesion]);
    const saldoActual = parseFloat(cliente[0].saldo);
    const totalA_Pagar = parseFloat(total_pedido);

    if (saldoActual < totalA_Pagar) {
      await connection.rollback();
      return res.status(402).json({ message: 'Fondos insuficientes. Por favor recarga tu cartera.' });
    }

    await connection.query('UPDATE clientes SET saldo = saldo - ? WHERE id_cliente = ?', [totalA_Pagar, id_cliente_sesion]);

    const sqlPedido = `
      INSERT INTO pedidos 
      (id_cliente, fecha_pedido, total_pedido, estado_pedido, latitud, longitud) 
      VALUES (?, NOW(), ?, 'pendiente', ?, ?)
    `;
    const lat = latitud || null;
    const lon = longitud || null;

    const [pedidoResult] = await connection.query(sqlPedido, [id_cliente_sesion, totalA_Pagar, lat, lon]);
    const idPedido = pedidoResult.insertId;

    const sqlDetalle = `INSERT INTO detalle_pedidos (id_pedido, id_producto, cantidad, precio_unitario) VALUES ?`;
    const detalleValues = detalle_items.map(item => [idPedido, item.id, item.cantidad, item.precio]);
    await connection.query(sqlDetalle, [detalleValues]);

    await connection.commit();

    const fecha = new Date();
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    const ticketID = `${anio}${mes}${dia}101#${idPedido}`;

    res.status(201).json({ 
      message: 'Pedido realizado exitosamente', 
      id_pedido: idPedido,
      ticket_id: ticketID,
      nuevo_saldo: saldoActual - totalA_Pagar
    });

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

// --- RUTAS DE CARTERA (CLIENTE) ---

// Obtener saldo actual
app.get('/api/cartera', esCliente, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT saldo FROM clientes WHERE id_cliente = ?', [req.session.userId]);
    if (rows.length > 0) {
      res.json({ saldo: rows[0].saldo });
    } else {
      res.status(404).json({ error: 'Cliente no encontrado' });
    }
  } catch (err) {
    console.error('Error al obtener saldo:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// Agregar fondos (Simulación)
app.post('/api/cartera/depositar', esCliente, async (req, res) => {
  const { cantidad } = req.body;
  const monto = parseFloat(cantidad);

  // 1. Validaciones de entrada (Anti-F12 básico)
  if (isNaN(monto) || monto <= 0) {
    return res.status(400).json({ error: 'La cantidad debe ser un número positivo.' });
  }

  // Tope máximo (aprox 1 billón - 1)
  const MAX_SALDO = 999999999999; 
  
  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    // Verificamos saldo actual para no pasar el límite
    const [rows] = await connection.query('SELECT saldo FROM clientes WHERE id_cliente = ? FOR UPDATE', [req.session.userId]);
    const saldoActual = parseFloat(rows[0].saldo);

    if ((saldoActual + monto) > MAX_SALDO) {
      await connection.rollback();
      return res.status(400).json({ error: 'La cantidad excede el límite permitido en la cartera.' });
    }

    // Actualizamos
    await connection.query('UPDATE clientes SET saldo = saldo + ? WHERE id_cliente = ?', [monto, req.session.userId]);
    
    await connection.commit();
    res.json({ message: 'Fondos agregados exitosamente', nuevoSaldo: saldoActual + monto });

  } catch (err) {
    if (connection) await connection.rollback();
    console.error('Error al depositar:', err);
    res.status(500).json({ error: 'Error al procesar el depósito.' });
  } finally {
    if (connection) connection.release();
  }
});

// --- RUTAS DE ADMINISTRADOR (HISTORIAL) ---

// 1. Obtener lista de todos los pedidos (Resumen)
// Ordenados del más reciente al más antiguo
app.get('/api/admin/historial', esAdmin, async (req, res) => {
  const query = `
    SELECT 
      p.id_pedido, 
      c.nombre AS nombre_cliente, 
      c.apellido AS apellido_cliente,
      p.fecha_pedido, 
      p.total_pedido,
      p.estado_pedido
    FROM pedidos p
    JOIN clientes c ON p.id_cliente = c.id_cliente
    ORDER BY p.fecha_pedido DESC
    LIMIT 10;
  `;
  try {
    const [results] = await db.query(query);
    const resultsConTicket = results.map(row => {
      const fecha = new Date(row.fecha_pedido);
      const anio = fecha.getFullYear();
      const mes = String(fecha.getMonth() + 1).padStart(2, '0');
      const dia = String(fecha.getDate()).padStart(2, '0');
      // Generamos el folio visual aquí también
      row.numero_venta = `${anio}${mes}${dia}101#${row.id_pedido}`;
      return row;
    });
    res.json(resultsConTicket);
  } catch (err) {
    console.error('Error al obtener historial:', err);
    res.status(500).json({ error: 'Error al obtener historial' });
  }
});

// 2. Obtener detalle completo de UN pedido (para el modal/vista detallada)
app.get('/api/admin/pedidos/:id', esAdmin, async (req, res) => {
  const { id } = req.params;
  
  try {
    // Info general + Ubicación
    const queryCabecera = `
      SELECT 
        p.id_pedido, p.fecha_pedido, p.total_pedido, p.estado_pedido,
        p.latitud, p.longitud,
        c.nombre, c.apellido, c.email
      FROM pedidos p
      JOIN clientes c ON p.id_cliente = c.id_cliente
      WHERE p.id_pedido = ?
    `;

    // Items comprados
    const queryDetalles = `
      SELECT 
        dp.cantidad, dp.precio_unitario, 
        prod.nombre AS nombre_producto, prod.imagen_url
      FROM detalle_pedidos dp
      JOIN productos prod ON dp.id_producto = prod.id_producto
      WHERE dp.id_pedido = ?
    `;

    const [cabecera] = await db.query(queryCabecera, [id]);
    const [detalles] = await db.query(queryDetalles, [id]);

    if (cabecera.length === 0) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    const pedido = cabecera[0];
    
    const fecha = new Date(pedido.fecha_pedido);
    const anio = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    pedido.numero_venta = `${anio}${mes}${dia}101#${pedido.id_pedido}`;

    res.json({
      info: pedido,
      items: detalles
    });

  } catch (err) {
    console.error('Error al obtener detalle de pedido:', err);
    res.status(500).json({ error: 'Error al obtener detalles' });
  }
});

// --- RUTA PARA ESTADÍSTICAS (ADMIN) ---
app.get('/api/admin/estadisticas', esAdmin, async (req, res) => {
  const query = `
    SELECT 
      p.nombre, 
      SUM(dp.cantidad) as total_vendido
    FROM detalle_pedidos dp
    JOIN productos p ON dp.id_producto = p.id_producto
    GROUP BY p.id_producto, p.nombre
    ORDER BY total_vendido DESC
    LIMIT 5; -- Solo los top 5 para que la gráfica no sea un caos
  `;

  try {
    const [results] = await db.query(query);
    res.json(results);
  } catch (err) {
    console.error('Error obteniendo estadísticas:', err);
    res.status(500).json({ error: 'Error al calcular estadísticas' });
  }
});

// --- RUTA HISTORIAL PROPIO (CLIENTE) ---
app.get('/api/mis-pedidos', esCliente, async (req, res) => {
  const idUsuario = req.session.userId;
  const query = `
    SELECT 
      id_pedido, fecha_pedido, total_pedido, estado_pedido
    FROM pedidos 
    WHERE id_cliente = ?
    ORDER BY fecha_pedido DESC
  `;

  try {
    const [results] = await db.query(query, [idUsuario]);
    
    // Formateamos para incluir el folio visual
    const pedidosConFolio = results.map(p => {
      const f = new Date(p.fecha_pedido);
      const anio = f.getFullYear();
      const mes = String(f.getMonth() + 1).padStart(2, '0');
      const dia = String(f.getDate()).padStart(2, '0');
      return {
        ...p,
        folio: `${anio}${mes}${dia}101#${p.id_pedido}`
      };
    });
    
    res.json(pedidosConFolio);
  } catch (err) {
    console.error('Error al obtener mis pedidos:', err);
    res.status(500).json({ error: 'Error al cargar historial' });
  }
});

app.get('/api/pedidos/:id', esCliente, async (req, res) => {
    const idPedido = req.params.id;
    const idCliente = req.session.userId;

    try {
        // Obtenemos cabecera SOLO si pertenece al cliente (Seguridad)
        const queryCabecera = `
            SELECT id_pedido, fecha_pedido, total_pedido, estado_pedido 
            FROM pedidos 
            WHERE id_pedido = ? AND id_cliente = ?
        `;
        const [cabecera] = await db.query(queryCabecera, [idPedido, idCliente]);

        if (cabecera.length === 0) {
            return res.status(404).json({ error: 'Pedido no encontrado o no autorizado' });
        }

        // Obtenemos los items
        const queryDetalles = `
            SELECT dp.cantidad, dp.precio_unitario, p.nombre
            FROM detalle_pedidos dp
            JOIN productos p ON dp.id_producto = p.id_producto
            WHERE dp.id_pedido = ?
        `;
        const [items] = await db.query(queryDetalles, [idPedido]);

        const pedido = cabecera[0];
        
        // Reconstruir Folio
        const f = new Date(pedido.fecha_pedido);
        const folio = `${f.getFullYear()}${String(f.getMonth()+1).padStart(2,'0')}${String(f.getDate()).padStart(2,'0')}101#${pedido.id_pedido}`;

        res.json({
            ticket_id: folio,
            fecha: pedido.fecha_pedido,
            total: pedido.total_pedido,
            items: items
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener detalles' });
    }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`));
