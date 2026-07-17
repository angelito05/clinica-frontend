document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const pacienteId = params.get('id');

    if (!pacienteId) {
        alert("No se especificó un paciente válido.");
        window.location.href = 'dashboard.html';
        return;
    }

    cargarDatosPaciente(pacienteId);
    cargarHistorialConsultas(pacienteId);
    cargarEstudiosPaciente(pacienteId);
    cargarResumenIA(pacienteId);

    const btnNuevaConsulta = document.getElementById('btn-nueva-consulta');
    if (btnNuevaConsulta) {
        btnNuevaConsulta.addEventListener('click', () => {
            window.location.href = `consulta.html?paciente_id=${pacienteId}`;
        });
    }
});

async function cargarEstudiosPaciente(pacienteId) {
    const tbody = document.getElementById('lista-estudios');
    try {
        const estudios = await fetchAPI(`/api/v1/estudios/paciente/${pacienteId}`);
        
        if (!estudios || estudios.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-3">No hay estudios registrados.</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        estudios.forEach(e => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${new Date(e.creado_en).toLocaleDateString()}</td>
                <td><span class="badge bg-secondary">${e.tipo_estudio}</span></td>
                <td class="text-muted text-truncate" style="max-width: 200px;">${e.notas_laboratorio || '-'}</td>
                <td class="text-end text-nowrap">
                    <button onclick="analizarEstudioIA('${e.id}')" class="btn btn-sm btn-outline-success rounded-3 me-1" title="Interpretar con IA">
                        <i data-lucide="sparkles" width="16"></i> Analizar
                    </button>
                    <a href="${e.url_archivo.startsWith('http') ? e.url_archivo : 'http://127.0.0.1:8000' + e.url_archivo}" target="_blank" class="btn btn-sm btn-outline-brand rounded-3">
                        <i data-lucide="file-text" width="16" class="me-1"></i> Ver
                    </a>
                </td>
            `;
            tbody.appendChild(tr);
        });

        lucide.createIcons();
    } catch (error) {
        tbody.innerHTML = `<tr><td colspan="4" class="text-danger py-3">Error al cargar estudios: ${error.message}</td></tr>`;
    }
}

async function analizarEstudioIA(estudioId) {
    const modalContent = document.getElementById('analisis-ia-body');
    modalContent.innerHTML = `
        <div class="text-center py-5">
            <div class="spinner-border text-success" role="status" style="width: 3rem; height: 3rem;"></div>
            <h6 class="mt-3 text-muted">La IA está leyendo y analizando el documento...</h6>
            <p class="small text-muted">Esto puede tomar unos segundos.</p>
        </div>
    `;
    
    const modal = new bootstrap.Modal(document.getElementById('modalAnalisisIA'));
    modal.show();

    try {
        const response = await fetchAPI(`/api/v1/estudios/${estudioId}/analizar`, 'POST');
        
        // Convertir Markdown a HTML y limpiar para evitar XSS
        const rawHtml = marked.parse(response.analisis);
        const cleanHtml = DOMPurify.sanitize(rawHtml);
        
        modalContent.innerHTML = `
            <div class="alert alert-warning small py-2 mb-3">
                <i data-lucide="alert-triangle" width="16" class="me-1"></i>
                <strong>Aviso Médico:</strong> Este resumen fue generado por inteligencia artificial. No sustituye el criterio ni diagnóstico del profesional de la salud.
            </div>
            <div class="markdown-body" style="font-size: 0.95rem; color: #333;">
                ${cleanHtml}
            </div>
        `;
        lucide.createIcons();
    } catch (error) {
        modalContent.innerHTML = `
            <div class="alert alert-danger">
                <i data-lucide="x-circle" class="me-2"></i> Error al analizar el documento con IA: ${error.message}
            </div>
        `;
        lucide.createIcons();
    }
}

async function cargarDatosPaciente(id) {
    try {
        const paciente = await fetchAPI(`/api/v1/pacientes/${id}`);
        
        document.getElementById('perfil-nombre').textContent = paciente.nombre_completo;
        document.getElementById('perfil-edad').textContent = `${calcularEdad(paciente.fecha_nacimiento)} años`;
        document.getElementById('perfil-telefono').textContent = paciente.telefono || 'No registrado';
        document.getElementById('perfil-email').textContent = paciente.email || 'No registrado';
        document.getElementById('perfil-sangre').textContent = paciente.tipo_sangre || 'N/A';
        
        const alergiasContainer = document.getElementById('perfil-alergias');
        alergiasContainer.innerHTML = '';
        if (paciente.alergias && paciente.alergias.length > 0) {
            paciente.alergias.forEach(a => {
                const badge = document.createElement('span');
                badge.className = 'badge bg-warning text-dark rounded-pill me-1 mb-1';
                badge.textContent = a;
                alergiasContainer.appendChild(badge);
            });
        } else {
            alergiasContainer.innerHTML = '<span class="text-muted">Ninguna conocida</span>';
        }

    } catch (error) {
        alert("Error al cargar los datos del paciente: " + error.message);
    }
}

async function cargarHistorialConsultas(pacienteId) {
    const timeline = document.getElementById('timeline-consultas');
    try {
        const consultas = await fetchAPI(`/api/v1/consultas/paciente/${pacienteId}`);
        
        if (!consultas || consultas.length === 0) {
            document.getElementById('mensaje-timeline').textContent = "No hay consultas previas para este paciente.";
            return;
        }

        timeline.innerHTML = ''; // Limpiar mensaje de carga

        consultas.forEach(c => {
            const fecha = new Date(c.creado_en).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
            
            const item = document.createElement('div');
            item.className = 'timeline-item';
            
            item.innerHTML = `
                <div class="card border-0 bg-light rounded-4 shadow-sm">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <span class="small fw-bold text-muted">${fecha}</span>
                        </div>
                        <h6 style="color: #002D4C;" class="mb-2 fw-bold">${c.motivo_consulta || 'Consulta de rutina'}</h6>
                        <p class="small text-muted mb-3"><strong>TA:</strong> ${c.signos_vitales?.presion_arterial || '-'} | <strong>Temp:</strong> ${c.signos_vitales?.temperatura || '-'}°C | <strong>Peso:</strong> ${c.signos_vitales?.peso || '-'}kg</p>
                        
                        <button class="btn btn-sm btn-outline-brand rounded-3 px-3 mt-1" onclick="verDetallesConsulta('${c.id}', '${c.receta_id || ''}')">
                            <i data-lucide="eye" width="16" class="me-1"></i> Ver Detalles
                        </button>
                    </div>
                </div>
            `;
            timeline.appendChild(item);
        });

        lucide.createIcons();
    } catch (error) {
        document.getElementById('mensaje-timeline').textContent = "Error al cargar el historial.";
        console.error(error);
    }
}

async function verDetallesConsulta(consultaId, recetaId) {
    const modalContent = document.getElementById('detalle-consulta-body');
    modalContent.innerHTML = '<div class="text-center py-4"><div class="spinner-border text-brand" role="status"></div><p class="mt-2 text-muted">Cargando detalles...</p></div>';
    
    // Abrir Modal
    const modal = new bootstrap.Modal(document.getElementById('modalVerConsulta'));
    modal.show();

    try {
        const consulta = await fetchAPI(`/api/v1/consultas/${consultaId}`);
        let html = `
            <h6 class="fw-bold" style="color: #002D4C;">Motivo de Consulta</h6>
            <p class="small bg-light p-2 rounded border">${consulta.motivo_consulta}</p>
            
            <h6 class="fw-bold mt-3" style="color: #002D4C;">Signos Vitales</h6>
            <div class="row g-2 mb-3">
                <div class="col-6 col-md-3"><div class="bg-light p-2 rounded border small text-center"><strong>Peso:</strong><br>${consulta.signos_vitales?.peso || '-'} kg</div></div>
                <div class="col-6 col-md-3"><div class="bg-light p-2 rounded border small text-center"><strong>Talla:</strong><br>${consulta.signos_vitales?.talla || '-'} cm</div></div>
                <div class="col-6 col-md-3"><div class="bg-light p-2 rounded border small text-center"><strong>Temp:</strong><br>${consulta.signos_vitales?.temperatura || '-'} °C</div></div>
                <div class="col-6 col-md-3"><div class="bg-light p-2 rounded border small text-center"><strong>TA:</strong><br>${consulta.signos_vitales?.presion_arterial || '-'}</div></div>
            </div>
        `;

        if (recetaId) {
            const receta = await fetchAPI(`/api/v1/recetas/${recetaId}`);
            html += `
                <h6 class="fw-bold mt-4" style="color: #00A693;"><i data-lucide="file-signature" width="18" class="me-1"></i> Diagnóstico y Tratamiento</h6>
                <p class="small bg-light p-2 rounded border border-success-subtle"><strong>Diagnóstico:</strong> ${receta.diagnostico || 'No especificado'}</p>
                
                <h7 class="fw-bold small text-muted">Medicamentos Recetados:</h7>
                <div class="table-responsive mt-2">
                    <table class="table table-sm table-bordered small">
                        <thead class="table-light">
                            <tr><th>Medicamento</th><th>Dosis</th><th>Frecuencia</th><th>Duración</th></tr>
                        </thead>
                        <tbody>
                            ${receta.medicamentos.map(m => `
                                <tr>
                                    <td>${m.nombre}</td>
                                    <td>${m.dosis}</td>
                                    <td>${m.frecuencia}</td>
                                    <td>${m.duracion}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
                
                <h7 class="fw-bold small text-muted">Indicaciones Adicionales:</h7>
                <p class="small bg-light p-2 rounded border" style="white-space: pre-wrap;">${receta.indicaciones_adicionales || 'Ninguna'}</p>
            `;
        } else {
            html += `
                <div class="alert alert-secondary mt-4 py-2 small">
                    <i data-lucide="info" width="16" class="me-1"></i> Esta consulta no tiene una receta vinculada.
                </div>
            `;
        }

        modalContent.innerHTML = html;
        lucide.createIcons();

    } catch (error) {
        console.error(error);
        modalContent.innerHTML = `<div class="alert alert-danger small">Error al cargar la información: ${error.message}</div>`;
    }
}

function calcularEdad(fechaNacimiento) {
    if (!fechaNacimiento) return '?';
    const hoy = new Date();
    const cumpleanos = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - cumpleanos.getFullYear();
    const m = hoy.getMonth() - cumpleanos.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < cumpleanos.getDate())) {
        edad--;
    }
    return edad;
}

async function cargarResumenIA(pacienteId) {
    const resumenElement = document.getElementById('resumen-ia-texto');
    try {
        const respuesta = await fetchAPI(`/api/v1/consultas/paciente/${pacienteId}/resumen`);
        if (respuesta && respuesta.resumen) {
            resumenElement.innerHTML = `<strong>Contexto Rápido:</strong> ${respuesta.resumen}`;
            resumenElement.classList.remove('text-muted');
            resumenElement.classList.add('text-dark');
        } else {
            resumenElement.innerHTML = 'No se pudo generar el resumen.';
        }
    } catch (error) {
        console.error("Error cargando resumen IA:", error);
        resumenElement.innerHTML = 'El resumen no está disponible temporalmente.';
    }
}

