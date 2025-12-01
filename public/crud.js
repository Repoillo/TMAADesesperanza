document.addEventListener('DOMContentLoaded', () => {
    const API_URL = '/api/productos';

    const tablabody = document.getElementById('tablabody');
    const formulario = document.getElementById('formulario');
    const pidInput = document.getElementById('pid');
    const nombreInput = document.getElementById('nombre');
    const precioInput = document.getElementById('precio');
    const imagenUrlInput = document.getElementById('imagenurl');
    const esTemporadaCheckbox = document.getElementById('estemporada');
    const formtitulo = document.getElementById('formtitulo');
    const btnLimpiar = document.querySelector('.blimpiar');
    const logoutButton = document.getElementById('logout-btn'); 

    let productos = [];
    const cargarGrafica = async () => {
        try {
            const res = await fetch('/api/admin/estadisticas', { credentials: 'include' });
            if (!res.ok) return;
            
            const datos = await res.json();
            
            if (datos.length === 0) return;

            const etiquetas = datos.map(d => d.nombre);
            const valores = datos.map(d => d.total_vendido);
            
            const coloresFondo = [
                '#4a2c2a', // Café oscuro
                '#a1662f', // Café medio
                '#ff6d00', // Naranja temporada
                '#e0dace', // Crema
                '#8d6e63'  // Café claro
            ];

            const ctx = document.getElementById('graficaVentas').getContext('2d');

            if (window.miGrafica) {
                window.miGrafica.destroy();
            }

            window.miGrafica = new Chart(ctx, {
                type: 'pie', 
                data: {
                    labels: etiquetas,
                    datasets: [{
                        label: 'Unidades Vendidas',
                        data: valores,
                        backgroundColor: coloresFondo,
                        borderColor: '#fff',
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                font: {
                                    family: "'Poppins', sans-serif"
                                }
                            }
                        }
                    }
                }
            });

        } catch (error) {
            console.error('Error cargando gráfica:', error);
        }
    };
    const cargarHistorialVentas = async () => {
            try {
                const res = await fetch('/api/admin/historial', { credentials: 'include' });
                if (res.ok) {
                    const ventas = await res.json();
                    const tbody = document.getElementById('tabla-ventas-body');
                    tbody.innerHTML = '';
                    
                    ventas.forEach(v => {
                        const tr = document.createElement('tr');
                        // Formato de fecha legible
                        const fecha = new Date(v.fecha_pedido).toLocaleDateString() + ' ' + new Date(v.fecha_pedido).toLocaleTimeString();
                        
                        tr.innerHTML = `
                            <td style="font-family: monospace; font-weight: bold;">${v.numero_venta}</td>
                            <td>${fecha}</td>
                            <td>${v.nombre_cliente} ${v.apellido_cliente}</td>
                            <td>$${parseFloat(v.total_pedido).toFixed(2)}</td>
                            <td><span style="padding: 4px 8px; border-radius: 4px; background: #d4edda; color: #155724;">${v.estado_pedido}</span></td>
                        `;
                        tbody.appendChild(tr);
                    });
                }
            } catch (error) {
                console.error('Error cargando ventas:', error);
            }
    };

    const cargarProductos = async () => {
        try {
            const res = await fetch(API_URL, { credentials: 'include' });
            if (!res.ok) {
                 if (res.status === 401) {
                     window.location.href = 'index.html';
                     return;
                 }
                 throw new Error(`Error ${res.status} al cargar productos`);
            }
            productos = await res.json();

            tablabody.innerHTML = '';
            productos.forEach(p => {
                if (p.esta_activo !== 0) { 
                    const fila = document.createElement('tr');
                    fila.innerHTML = `
                        <td>${p.nombre}</td>
                        <td>$${p.precio_venta}</td>
                        <td class="acciones">
                            <button class="beditar" data-id="${p.id_producto}">Editar</button>
                            <button class="beliminar" data-id="${p.id_producto}">Eliminar</button>
                        </td>
                    `;
                    tablabody.appendChild(fila);
                }
            });
        } catch (error) {
            console.error('Error al cargar:', error);
        }
    };

    const limpiarFormulario = () => {
        formulario.reset();
        pidInput.value = '';
        formtitulo.textContent = 'Agregar Producto';
    };

    tablabody.addEventListener('click', (e) => {
        if (e.target.classList.contains('beditar')) {
            const id = e.target.dataset.id;
            const producto = productos.find(p => p.id_producto == id);
            if (producto) {
                pidInput.value = producto.id_producto;
                nombreInput.value = producto.nombre;
                precioInput.value = producto.precio_venta;
                imagenUrlInput.value = producto.imagen_url || '';
                esTemporadaCheckbox.checked = producto.es_de_temporada == 1; 
                formtitulo.textContent = 'Editar Producto';
                window.scrollTo(0, 0);
            }
        }
        if (e.target.classList.contains('beliminar')) {
            const id = e.target.dataset.id;
            if (confirm('¿Seguro que quieres eliminar (desactivar) este producto?')) {
                fetch(`${API_URL}/${id}`, { method: 'DELETE', credentials: 'include' })
                    .then(res => {
                        if (!res.ok) {
                            if (res.status === 401) window.location.href = 'index.html';
                            throw new Error('Error al eliminar');
                        }
                        return res.json(); 
                    })
                    .then(data => {
                        console.log(data.message); 
                        cargarProductos(); 
                    })
                    .catch(error => console.error(error));
            }
        }
    });

    formulario.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const id = pidInput.value;
        const nombre = nombreInput.value;
        const precio = parseFloat(precioInput.value);

        if (!nombre.trim()) {
            alert('El nombre del producto no puede estar vacío.');
            return;
        }
        if (isNaN(precio) || precio <= 0) {
            alert('El precio debe ser un número positivo válido.');
            return;
        }

        const esActualizacion = id !== '';
        const url = esActualizacion ? `${API_URL}/${id}` : API_URL;
        const metodo = esActualizacion ? 'PUT' : 'POST';

        const datos = {
            nombre: nombre.trim(),
            precio_venta: precio, 
            imagen_url: imagenUrlInput.value,
            es_de_temporada: esTemporadaCheckbox.checked ? 1 : 0
        };

        try {
            const res = await fetch(url, {
                method: metodo,
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include', 
                body: JSON.stringify(datos)
            });
            if (!res.ok) {
                 if (res.status === 401) window.location.href = 'index.html';
                 throw new Error('Falló la operación de guardado');
            }
            limpiarFormulario();
            cargarProductos(); 
        } catch (error) {
            console.error('Error al guardar:', error);
            alert('Hubo un error al guardar el producto.'); 
        }
    });

    btnLimpiar.addEventListener('click', limpiarFormulario);

    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            try {
                const response = await fetch('/api/logout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include' 
                });
                if (response.ok) {
                    window.location.href = 'index.html'; 
                } else { 
                    alert('No se pudo cerrar sesión');
                }
            } catch (error) { 
                console.error('Error de red al cerrar sesión:', error);
            }
        });
    }

    const checkAuth = async () => {
        try {
            const response = await fetch('/api/check-auth', { credentials: 'include' });
            const data = await response.json();
            if (!data.loggedIn || data.rol !== 'admin') { 
                window.location.href = 'index.html'; 
            } else {
                cargarProductos();
                cargarGrafica(); 
                cargarHistorialVentas();
            }
        } catch (error) {
            console.error('Error verificando autenticación:', error);
            window.location.href = 'index.html'; 
        }
    };

    checkAuth(); 
});