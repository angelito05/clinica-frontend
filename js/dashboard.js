document.addEventListener('DOMContentLoaded', () => {
    cargarPacientes();

    const formNuevoPaciente = document.getElementById('form-nuevo-paciente');
    if (formNuevoPaciente) {
        formNuevoPaciente.addEventListener('submit', async (e) => {
            e.preventDefault();

            const botonSubmit = formNuevoPaciente.querySelector('button[type="submit"]');
            const originalText = botonSubmit.innerHTML;
            botonSubmit.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Guardando...';
            botonSubmit.disabled = true;

            const alergiasText = document.getElementById('paciente-alergias').value;
            const alergiasArray = alergiasText ? alergiasText.split(',').map(a => a.trim()).filter(a => a) : [];

            const payload = {
                nombre_completo: document.getElementById('paciente-nombre').value,
                fecha_nacimiento: document.getElementById('paciente-fecha').value,
                sexo: document.getElementById('paciente-sexo').value,
                telefono: document.getElementById('paciente-telefono').value,
                email: document.getElementById('paciente-email').value,
                tipo_sangre: document.getElementById('paciente-sangre').value,
                alergias: alergiasArray
            };

            try {
                await fetchAPI('/api/v1/pacientes/', 'POST', payload);
                
                // Ocultar modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('modalNuevoPaciente'));
                modal.hide();
                formNuevoPaciente.reset();

                // Recargar lista
                cargarPacientes();
                
                alert("Paciente registrado exitosamente");

            } catch (error) {
                alert(`Error al registrar paciente: ${error.message}`);
            } finally {
                botonSubmit.innerHTML = originalText;
                botonSubmit.disabled = false;
            }
        });
    }
});

async function cargarPacientes() {
    const lista = document.getElementById('lista-pacientes');
    try {
        const pacientes = await fetchAPI('/api/v1/pacientes/');
        
        lista.innerHTML = '';

        if (pacientes.length === 0) {
            lista.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-4">No hay pacientes registrados.</td></tr>`;
            return;
        }

        pacientes.forEach(p => {
            const tr = document.createElement('tr');
            tr.style.cursor = 'pointer';
            tr.onclick = () => {
                // p.id de pydantic BaseModel usualmente es p.id
                window.location.href = `paciente.html?id=${p.id || p._id}`;
            };

            tr.innerHTML = `
                <td class="fw-bold" style="color: #002D4C;">${p.nombre_completo}</td>
                <td>${p.fecha_nacimiento}</td>
                <td>${p.sexo}</td>
                <td>${p.telefono || '-'}</td>
                <td><span class="badge bg-danger rounded-pill">${p.tipo_sangre || 'N/A'}</span></td>
                <td class="text-end">
                    <button class="btn btn-sm btn-light rounded-circle" title="Ver Expediente">
                        <i data-lucide="chevron-right" width="16"></i>
                    </button>
                </td>
            `;
            lista.appendChild(tr);
        });

        // Re-inicializar iconos de lucide para los nuevos elementos
        lucide.createIcons();
    } catch (error) {
        lista.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-4">Error al cargar pacientes: ${error.message}</td></tr>`;
    }
}
