document.addEventListener('DOMContentLoaded', () => {
    actualizarSaldoUI();
});

// Referencias globales
const modalCartera = document.getElementById('modal-cartera');
const spanSaldoHeader = document.getElementById('saldo-header');
const spanSaldoModal = document.getElementById('saldo-modal');
const inputDeposito = document.getElementById('monto-deposito');

// --- FUNCIONES DE INTERFAZ ---

function abrirModalCartera() {
    if (modalCartera) {
        modalCartera.style.display = 'flex';
        actualizarSaldoUI(); // Refrescar dato al abrir
        inputDeposito.value = ''; // Limpiar input
        inputDeposito.focus();
    }
}

function cerrarModalCartera() {
    if (modalCartera) {
        modalCartera.style.display = 'none';
    }
}

// Cerrar si hacen clic fuera del modal
window.onclick = function(event) {
    if (event.target == modalCartera) {
        cerrarModalCartera();
    }
}

// --- LÓGICA DE NEGOCIO (Conexión con Backend) ---

async function actualizarSaldoUI() {
    try {
        const res = await fetch('/api/cartera', { credentials: 'include' });
        if (res.ok) {
            const data = await res.json();
            const saldoFormateado = parseFloat(data.saldo).toFixed(2);
            
            // Actualizamos todos los lugares donde se muestra el saldo
            if (spanSaldoHeader) spanSaldoHeader.textContent = saldoFormateado;
            if (spanSaldoModal) spanSaldoModal.textContent = saldoFormateado;
        }
    } catch (error) {
        console.error("Error al obtener saldo:", error);
    }
}

async function depositarDinero() {
    const monto = parseFloat(inputDeposito.value);

    // --- VALIDACIONES FRONTEND ---
    if (isNaN(monto) || monto <= 0) {
        alert("Por favor, ingresa una cantidad válida mayor a 0.");
        return;
    }
    
    // Límite visual de seguridad (coincide con backend)
    const MAX_LIMITE = 999999999999;
    
    // Validamos si el depósito actual es gigante
    if (monto > MAX_LIMITE) {
        alert("¡Esa cantidad excede el límite permitido por transacción!");
        return;
    }

    try {
        const res = await fetch('/api/cartera/depositar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ cantidad: monto })
        });

        const data = await res.json();

        if (res.ok) {
            alert(`¡Depósito exitoso!\nNuevo saldo: $${data.nuevoSaldo.toFixed(2)}`);
            actualizarSaldoUI();
            cerrarModalCartera();
            
            // Si estamos en el carrito, quizás queramos recargar la página o habilitar el botón de compra
            // pero con actualizarSaldoUI suele bastar.
        } else {
            alert(data.error || "Error al depositar");
        }
    } catch (error) {
        console.error("Error de red:", error);
        alert("No se pudo conectar con el banco (servidor).");
    }
}

window.mostrarModalCartera = abrirModalCartera;