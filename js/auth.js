// js/auth.js

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const errorAlert = document.getElementById('errorAlert');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault(); // Evita que la página se recargue

            // Ocultar errores previos
            errorAlert.classList.add('d-none');

            const correo = document.getElementById('correo').value;
            const password = document.getElementById('password').value;
            const submitBtn = loginForm.querySelector('button[type="submit"]');

            // Cambiar estado del botón a "Cargando"
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Conectando...';
            submitBtn.disabled = true;

            try {
                // El backend actual espera un JSON con 'correo' y 'password'
                const payload = {
                    correo: correo,
                    password: password
                };

                // ¡Llamada real a la API!
                const response = await fetchAPI('/api/auth/login', 'POST', payload);

                // Guardar datos reales en el navegador
                localStorage.setItem('token', response.token);
                // El backend podría no devolver rol y nombre en el login, así que guardamos el correo temporalmente
                localStorage.setItem('nombre', response.nombre || correo);
                
                if(response.rol) localStorage.setItem('rol', response.rol);
                if(response.cedula) localStorage.setItem('cedula', response.cedula);

                // Redirigir al dashboard según el rol
                if (response.rol === 'laboratorio') {
                    window.location.href = 'dashboard-laboratorio.html';
                } else {
                    window.location.href = 'dashboard.html';
                }

            } catch (error) {
                // Mostrar el error visualmente respetando la paleta de colores
                errorAlert.textContent = error.message || 'Error al conectar con el servidor. Verifica tus credenciales.';
                errorAlert.classList.remove('d-none');
            } finally {
                // Restaurar el botón
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        });
    }
});