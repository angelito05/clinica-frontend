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
                // Aquí llamaremos al endpoint de FastAPI (lo construiremos en el backend pronto)
                // Por ahora, simulamos la estructura de datos que enviaremos
                const payload = {
                    correo: correo,
                    password: password
                };

                // NOTA: Cuando el backend esté listo, descomenta la siguiente línea:
                // const response = await fetchAPI('/api/auth/login', 'POST', payload);

                // SIMULACIÓN TEMPORAL para poder avanzar al dashboard visualmente:
                const response = { token: "fake_jwt_token", rol: "doctor", nombre: "Dr. Prueba" };

                // Guardar datos en el navegador
                localStorage.setItem('token', response.token);
                localStorage.setItem('rol', response.rol);
                localStorage.setItem('nombre', response.nombre);

                // Redirigir al dashboard
                window.location.href = 'dashboard.html';

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