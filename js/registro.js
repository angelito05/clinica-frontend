document.addEventListener('DOMContentLoaded', () => {
    const registroForm = document.getElementById('registroForm');
    const registroAlert = document.getElementById('registroAlert');

    if (registroForm) {
        registroForm.addEventListener('submit', async (e) => {
            e.preventDefault(); // Evita que la página recargue

            // 1. Limpiar alertas previas
            registroAlert.className = 'alert mt-3 text-center rounded-3 small d-none';

            // 2. Capturar los valores base
            const rol = document.getElementById('rolInput').value;
            const nombre = document.getElementById('nombre').value;
            const correo = document.getElementById('correo').value;
            const password = document.getElementById('password').value;
            const btnSubmit = registroForm.querySelector('button[type="submit"]');

            // 3. Cambiar el botón a estado de carga
            const originalText = btnSubmit.innerHTML;
            btnSubmit.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Procesando...';
            btnSubmit.disabled = true;

            // 4. Construir el JSON dinámico
            const payload = {
                nombre: nombre,
                correo: correo,
                password: password,
                rol: rol
            };

            // Inyectar el campo condicional según la pestaña activa
            if (rol === 'doctor') {
                payload.cedula_profesional = document.getElementById('cedula').value;
            } else if (rol === 'laboratorio') {
                payload.nombre_laboratorio = document.getElementById('nombreLab').value;
            }

            try {
                // 5. Enviar al backend usando tu función puente
                const response = await fetchAPI('/api/auth/registro', 'POST', payload);

                // 6. UI de Éxito (Verde semántico)
                registroAlert.textContent = response.mensaje + ' Redirigiendo al acceso...';
                registroAlert.classList.remove('d-none');
                registroAlert.style.backgroundColor = '#E8F6F3';
                registroAlert.style.color = '#00A693';
                registroAlert.style.border = '1px solid #A2D9CE';

                // Redirigir automáticamente al login tras 2 segundos
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 2000);

            } catch (error) {
                // 7. UI de Error (Rojo semántico)
                registroAlert.textContent = error.message || 'Ocurrió un error al intentar crear la cuenta.';
                registroAlert.classList.remove('d-none');
                registroAlert.style.backgroundColor = '#FDEDEC';
                registroAlert.style.color = '#E74C3C';
                registroAlert.style.border = '1px solid #F5B7B1';
            } finally {
                // 8. Restaurar el botón siempre
                btnSubmit.innerHTML = originalText;
                btnSubmit.disabled = false;
            }
        });
    }
});