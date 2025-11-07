document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const errorMessageDiv = document.getElementById('error-message');
    const registerForm = document.getElementById('register-form');
    const registerErrorDiv = document.getElementById('reg-error-message'); 
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            errorMessageDiv.textContent = ''; 

            const correo = document.getElementById('correo').value;
            const contraseña = document.getElementById('contraseña').value;

            if (!emailRegex.test(correo)) {
                errorMessageDiv.textContent = 'Por favor, introduce un correo válido.';
                return;
            }
            if (!contraseña) {
                 errorMessageDiv.textContent = 'Por favor, introduce una contraseña.';
                return;
            }

            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include', 
                    body: JSON.stringify({ correo, contraseña }),
                });

                const data = await response.json();

                if (response.ok) {
                    if (data.rol === 'admin') {
                        window.location.href = 'crud.html';
                    } else {
                        window.location.href = 'principal.html';
                    }
                } else {
                    errorMessageDiv.textContent = data.error || 'Error al iniciar sesión';
                }
            } catch (error) {
                console.error('Error de red en login:', error);
                errorMessageDiv.textContent = 'No se pudo conectar al servidor.';
            }
        });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            if(registerErrorDiv) registerErrorDiv.textContent = '';

            const nombre = document.getElementById('reg-nombre').value;
            const apellido = document.getElementById('reg-apellido').value;
            const correo = document.getElementById('reg-correo').value;
            const contraseña = document.getElementById('reg-contraseña').value;

            if (!nombre.trim() || !apellido.trim()) {
                if(registerErrorDiv) registerErrorDiv.textContent = 'Nombre y apellido son requeridos.';
                return;
            }
            if (!emailRegex.test(correo)) {
                if(registerErrorDiv) registerErrorDiv.textContent = 'Por favor, introduce un correo válido.';
                return;
            }
            if (contraseña.length < 6) { 
                if(registerErrorDiv) registerErrorDiv.textContent = 'La contraseña debe tener al menos 6 caracteres.';
                return;
            }

            try {
                const response = await fetch('/api/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ nombre, apellido, correo, contraseña }),
                });

                if (response.ok) {
                    registerForm.reset();
                    alert('¡Registro de cliente exitoso! Ahora puedes iniciar sesión.');
                    window.location.href = 'index.html'; 
                } else {
                    const errorData = await response.json();
                    if(registerErrorDiv) registerErrorDiv.textContent = errorData.error || 'Error al registrarse';
                }
            } catch (error) {
                console.error('Error de red en registro:', error);
                if(registerErrorDiv) registerErrorDiv.textContent = 'No se pudo conectar al servidor.';
            }
        });
    }
});