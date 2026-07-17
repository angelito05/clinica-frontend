document.addEventListener('DOMContentLoaded', () => {
    const btnBuscar = document.getElementById('btn-buscar-paciente');
    const inputBuscar = document.getElementById('search-paciente');
    const resultadosBox = document.getElementById('resultados-busqueda');
    
    // Búsqueda de pacientes
    btnBuscar.addEventListener('click', async () => {
        const query = inputBuscar.value.trim();
        if (query.length < 2) {
            alert("Escribe al menos 2 letras para buscar.");
            return;
        }

        try {
            const btnText = btnBuscar.innerHTML;
            btnBuscar.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
            btnBuscar.disabled = true;

            const pacientes = await fetchAPI(`/api/v1/pacientes/laboratorio/buscar?q=${encodeURIComponent(query)}`);
            
            resultadosBox.innerHTML = '';
            if (pacientes.length === 0) {
                resultadosBox.innerHTML = '<div class="list-group-item text-muted small">No se encontraron pacientes.</div>';
            } else {
                pacientes.forEach(p => {
                    const btn = document.createElement('button');
                    btn.type = 'button';
                    btn.className = 'list-group-item list-group-item-action small py-2';
                    btn.innerHTML = `<strong>${p.nombre_completo}</strong> <br><span class="text-muted" style="font-size: 0.75rem;">Nacimiento: ${new Date(p.fecha_nacimiento).toLocaleDateString()} | Tel: ${p.telefono || 'N/A'}</span>`;
                    
                    btn.addEventListener('click', () => {
                        document.getElementById('paciente-id-seleccionado').value = p.id;
                        document.getElementById('nombre-paciente-seleccionado').textContent = p.nombre_completo;
                        document.getElementById('paciente-seleccionado-info').classList.remove('d-none');
                        resultadosBox.classList.add('d-none');
                        inputBuscar.value = p.nombre_completo;
                    });
                    
                    resultadosBox.appendChild(btn);
                });
            }
            resultadosBox.classList.remove('d-none');
        } catch (error) {
            alert("Error buscando pacientes: " + error.message);
        } finally {
            btnBuscar.innerHTML = 'Buscar';
            btnBuscar.disabled = false;
        }
    });

    // Ocultar resultados si hace click fuera
    document.addEventListener('click', (e) => {
        if (!inputBuscar.contains(e.target) && !resultadosBox.contains(e.target) && e.target !== btnBuscar) {
            resultadosBox.classList.add('d-none');
        }
    });

    // Subida del formulario
    const form = document.getElementById('form-subir-estudio');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const pacienteId = document.getElementById('paciente-id-seleccionado').value;
        if (!pacienteId) {
            alert("Por favor, busca y selecciona un paciente primero.");
            return;
        }

        const btnSubmit = document.getElementById('btn-submit');
        const originalBtnHTML = btnSubmit.innerHTML;
        btnSubmit.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Subiendo...';
        btnSubmit.disabled = true;
        
        document.getElementById('mensaje-exito').classList.add('d-none');
        document.getElementById('mensaje-error').classList.add('d-none');

        const formData = new FormData();
        formData.append("paciente_id", pacienteId);
        formData.append("tipo_estudio", document.getElementById('tipo-estudio').value);
        formData.append("notas_laboratorio", document.getElementById('notas-laboratorio').value);
        formData.append("archivo", document.getElementById('archivo-estudio').files[0]);

        try {
            // fetchAPI maneja FormData automáticamente
            await fetchAPI('/api/v1/estudios/subir', 'POST', formData);
            
            document.getElementById('mensaje-exito').classList.remove('d-none');
            form.reset();
            document.getElementById('paciente-seleccionado-info').classList.add('d-none');
            document.getElementById('paciente-id-seleccionado').value = '';
            
        } catch (error) {
            console.error(error);
            const errorMsg = document.getElementById('mensaje-error');
            errorMsg.textContent = "Error al cargar: " + error.message;
            errorMsg.classList.remove('d-none');
        } finally {
            btnSubmit.innerHTML = originalBtnHTML;
            btnSubmit.disabled = false;
        }
    });
});
