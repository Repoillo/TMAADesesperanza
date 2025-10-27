document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const errorMessageDiv = document.getElementById('error-message');

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // Evita que el formulario se envíe de la forma tradicional

        errorMessageDiv.textContent = ''; // Limpia mensajes de error anteriores

        const correo = document.getElementById('correo').value;
        const contraseña = document.getElementById('contraseña').value;

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include', // Incluye cookies en la solicitud
                body: JSON.stringify({ correo, contraseña }), // Envía los datos como JSON
            });

            if (response.ok) {
                // Si la respuesta es exitosa (status 2xx)
                const data = await response.json();
                console.log(data.message); // Muestra "Login exitoso" en la consola
                // Redirige al usuario al panel de administración
                window.location.href = 'crud.html';
            } else {
                // Si la respuesta indica un error (status 4xx o 5xx)
                const errorData = await response.json();
                errorMessageDiv.textContent = errorData.error || 'Error al iniciar sesión';
            }
        } catch (error) {
            // Si hay un error de red (no se pudo conectar al servidor)
            console.error('Error de red:', error);
            errorMessageDiv.textContent = 'No se pudo conectar al servidor. Inténtalo más tarde.';
        }
    });
});