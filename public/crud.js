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
            if (confirm('¿Seguro que quieres eliminar este producto?')) {
                fetch(`${API_URL}/${id}`, { method: 'DELETE', credentials: 'include' })
                    .then(res => {
                        if (!res.ok) {
                            if (res.status === 401) window.location.href = 'index.html';
                            throw new Error('Error al eliminar');
                        }
                        cargarProductos();
                    })
                    .catch(error => console.error(error));
            }
        }
    });

    formulario.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = pidInput.value;
        const esActualizacion = id !== '';
        const url = esActualizacion ? `${API_URL}/${id}` : API_URL;
        const metodo = esActualizacion ? 'PUT' : 'POST';

        const datos = {
            nombre: nombreInput.value,
            precio_venta: precioInput.value,
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
                } else { /* ... manejo de error logout ... */ }
            } catch (error) { /* ... manejo error red logout ... */ }
        });
    }

    const checkAuth = async () => {
        try {
            const response = await fetch('/api/check-auth', { credentials: 'include' });
            const data = await response.json();
            if (!data.loggedIn) {
                window.location.href = 'index.html'; 
            } else {
                cargarProductos(); 
            }
        } catch (error) {
            console.error('Error verificando autenticación:', error);
            window.location.href = 'index.html'; 
        }
    };

    checkAuth(); 
});