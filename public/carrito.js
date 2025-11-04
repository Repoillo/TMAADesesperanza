function obtenerCarrito() {
    return JSON.parse(localStorage.getItem('carritoPanaderia')) || [];
}

function guardarCarrito(carrito) {
    localStorage.setItem('carritoPanaderia', JSON.stringify(carrito));
}

function agregarAlCarrito(id, nombre, precio) {
    const carrito = obtenerCarrito();
    
    const precioNum = parseFloat(precio);

    const itemExistente = carrito.find(item => item.id === id);

    if (itemExistente) {
        itemExistente.cantidad++;
    } else {
        carrito.push({
            id: id,
            nombre: nombre,
            precio: precioNum,
            cantidad: 1
        });
    }

    guardarCarrito(carrito);

    alert(`"${nombre}" se ha añadido al carrito.`);
}

function eliminarItemDelCarrito(index) {
    const carrito = obtenerCarrito();
    carrito.splice(index, 1); 
    guardarCarrito(carrito);
}


function actualizarCantidadItem(index, nuevaCantidad) {
    const carrito = obtenerCarrito();
    const cantNum = parseInt(nuevaCantidad, 10);
    
    if (cantNum >= 1) {
        carrito[index].cantidad = cantNum;
    } else {
        carrito.splice(index, 1);
    }
    
    guardarCarrito(carrito);
}