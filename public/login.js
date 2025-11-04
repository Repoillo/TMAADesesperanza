document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const errorMessageDiv = document.getElementById('error-message');
    const registerForm = document.getElementById('register-form');
    const registerErrorDiv = document.getElementById('reg-error-message'); 

    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            errorMessageDiv.textContent = ''; 

            const correo = document.getElementById('correo').value;
            const contraseña = document.getElementById('contraseña').value;

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