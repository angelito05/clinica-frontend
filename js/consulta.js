let pacienteId = null;
let consultaId = null;
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;
let streamGlobal = null;

document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    pacienteId = params.get('paciente_id');

    if (!pacienteId) {
        alert("Paciente no válido.");
        window.location.href = 'dashboard.html';
        return;
    }

    document.getElementById('btn-volver').addEventListener('click', () => {
        window.location.href = `paciente.html?id=${pacienteId}`;
    });

    // Cargar nombre del paciente
    try {
        const p = await fetchAPI(`/api/v1/pacientes/${pacienteId}`);
        document.getElementById('nombre-paciente-display').textContent = p.nombre_completo;
        document.getElementById('print-paciente').textContent = p.nombre_completo;
    } catch (e) {
        console.error(e);
    }

    // Nombre del doctor y Cédula para impresión
    document.getElementById('print-doctor-nombre').textContent = localStorage.getItem('nombre') || 'Dr. Usuario';
    document.getElementById('print-doctor-cedula').textContent = localStorage.getItem('cedula') || 'No registrada';
    document.getElementById('print-fecha').textContent = new Date().toLocaleDateString('es-ES');

    // Manejo de la grabación
    const btnGrabar = document.getElementById('btn-grabar');
    btnGrabar.addEventListener('click', toggleGrabacion);

    // Saltar audio
    document.getElementById('btn-skip-audio').addEventListener('click', () => {
        mostrarPaso2({});
    });

    // Añadir medicamento manual
    document.getElementById('btn-add-medicamento').addEventListener('click', () => {
        agregarCampoMedicamento();
    });

    // Guardar Consulta y Receta
    document.getElementById('form-guardar-consulta').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button');
        btn.disabled = true;

        // 1. Preparar datos de la Consulta
        const payloadConsulta = {
            paciente_id: pacienteId,
            motivo_consulta: document.getElementById('form-motivo').value || "No especificado",
            sintomas: document.getElementById('form-sintomas').value,
            diagnostico: document.getElementById('receta-diagnostico').value,
            signos_vitales: {
                peso: document.getElementById('form-peso').value,
                talla: document.getElementById('form-talla').value,
                temperatura: document.getElementById('form-temperatura').value,
                presion_arterial: document.getElementById('form-presion').value,
            }
        };

        // 2. Preparar datos de la Receta
        const medsInputs = document.querySelectorAll('.med-item');
        const medicamentos = [];
        medsInputs.forEach(item => {
            medicamentos.push({
                nombre: item.querySelector('.med-nombre').value,
                dosis: item.querySelector('.med-dosis').value,
                frecuencia: item.querySelector('.med-frecuencia').value,
                duracion: item.querySelector('.med-duracion').value
            });
        });

        const payloadReceta = {
            diagnostico: payloadConsulta.diagnostico,
            medicamentos: medicamentos,
            indicaciones_adicionales: document.getElementById('receta-indicaciones').value,
            paciente_id: pacienteId
        };

        try {
            // A. Guardar Consulta
            const respConsulta = await fetchAPI('/api/v1/consultas/', 'POST', payloadConsulta);
            consultaId = respConsulta.id || respConsulta._id;

            // B. Guardar Receta vinculada
            payloadReceta.consulta_id = consultaId;
            await fetchAPI('/api/v1/recetas/guardar', 'POST', payloadReceta);
            
            // C. Preparar e imprimir
            prepararImpresion(payloadConsulta, payloadReceta);
            
            // Redirigir al expediente
            setTimeout(() => {
                window.location.href = `paciente.html?id=${pacienteId}`;
            }, 1000);
            
        } catch (error) {
            alert("Error al guardar: " + error.message);
            btn.disabled = false;
        }
    });
});

async function toggleGrabacion() {
    const btnGrabar = document.getElementById('btn-grabar');
    const estadoText = document.getElementById('estado-grabacion');
    const indicacionText = document.getElementById('indicacion-detener');
    const btnSkip = document.getElementById('btn-skip-audio');
    
    if (!isRecording) {
        // Iniciar grabación
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamGlobal = stream;
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];

            mediaRecorder.ondataavailable = e => {
                if (e.data.size > 0) audioChunks.push(e.data);
            };

            mediaRecorder.onstop = async () => {
                if (streamGlobal) {
                    streamGlobal.getTracks().forEach(track => track.stop());
                }

                estadoText.textContent = "Procesando...";
                indicacionText.classList.add('d-none');
                btnGrabar.classList.add('d-none');
                btnSkip.classList.add('d-none');
                document.getElementById('loader-ia').classList.remove('d-none');

                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                const formData = new FormData();
                formData.append('audio', audioBlob, 'consulta.webm');

                try {
                    // LLamada al nuevo endpoint completo
                    const resp = await fetchAPI('/api/v1/consultas/procesar_audio', 'POST', formData);
                    mostrarPaso2(resp);
                } catch (error) {
                    alert("Error procesando audio: " + error.message);
                    btnGrabar.classList.remove('d-none');
                    btnSkip.classList.remove('d-none');
                    document.getElementById('loader-ia').classList.add('d-none');
                    estadoText.textContent = "Listo para grabar la consulta";
                }
            };

            mediaRecorder.start();
            isRecording = true;
            btnGrabar.classList.add('recording');
            estadoText.textContent = "Escuchando consulta...";
            estadoText.style.color = "#E74C3C";
            indicacionText.classList.remove('d-none');
            btnSkip.classList.add('d-none');

        } catch (error) {
            alert("No se pudo acceder al micrófono: " + error.message);
        }
    } else {
        // Detener grabación
        mediaRecorder.stop();
        isRecording = false;
        btnGrabar.classList.remove('recording');
        estadoText.style.color = "#002D4C";
    }
}

function mostrarPaso2(datosIA) {
    document.getElementById('paso-1').classList.remove('active');
    document.getElementById('paso-2').classList.add('active');

    // Rellenar campos de la UI si la IA los detectó
    document.getElementById('form-motivo').value = (datosIA.motivo_consulta !== "No especificado") ? (datosIA.motivo_consulta || '') : '';
    document.getElementById('form-sintomas').value = (datosIA.sintomas !== "No especificado") ? (datosIA.sintomas || '') : '';
    document.getElementById('form-peso').value = datosIA.peso || '';
    document.getElementById('form-talla').value = datosIA.talla || '';
    document.getElementById('form-temperatura').value = datosIA.temperatura || '';
    document.getElementById('form-presion').value = datosIA.presion_arterial || '';
    document.getElementById('receta-diagnostico').value = (datosIA.diagnostico !== "No especificado") ? (datosIA.diagnostico || '') : '';
    document.getElementById('receta-indicaciones').value = (datosIA.indicaciones_adicionales !== "Ninguna") ? (datosIA.indicaciones_adicionales || '') : '';

    const contenedorMeds = document.getElementById('contenedor-medicamentos');
    contenedorMeds.innerHTML = '';

    if (datosIA.medicamentos && datosIA.medicamentos.length > 0) {
        datosIA.medicamentos.forEach(med => agregarCampoMedicamento(med));
    } else {
        agregarCampoMedicamento();
    }
}

function agregarCampoMedicamento(med = { nombre: '', dosis: '', frecuencia: '', duracion: '' }) {
    const contenedor = document.getElementById('contenedor-medicamentos');
    const div = document.createElement('div');
    div.className = 'card bg-light border-0 rounded-3 mb-2 med-item p-3 position-relative';
    div.innerHTML = `
        <button type="button" class="btn-close position-absolute top-0 end-0 m-2" onclick="this.parentElement.remove()" style="font-size: 0.8rem;"></button>
        <div class="row g-2">
            <div class="col-md-4">
                <label class="form-label small text-muted mb-1">Medicamento</label>
                <input type="text" class="form-control form-control-sm med-nombre" value="${med.nombre}" required>
            </div>
            <div class="col-md-3">
                <label class="form-label small text-muted mb-1">Dosis</label>
                <input type="text" class="form-control form-control-sm med-dosis" value="${med.dosis}" required>
            </div>
            <div class="col-md-3">
                <label class="form-label small text-muted mb-1">Frecuencia</label>
                <input type="text" class="form-control form-control-sm med-frecuencia" value="${med.frecuencia}" required>
            </div>
            <div class="col-md-2">
                <label class="form-label small text-muted mb-1">Duración</label>
                <input type="text" class="form-control form-control-sm med-duracion" value="${med.duracion}" required>
            </div>
        </div>
    `;
    contenedor.appendChild(div);
}

function prepararImpresion(payloadConsulta, payloadReceta) {
    // Signos Vitales
    document.getElementById('print-peso').textContent = payloadConsulta.signos_vitales.peso ? payloadConsulta.signos_vitales.peso + ' kg' : '-';
    document.getElementById('print-talla').textContent = payloadConsulta.signos_vitales.talla ? payloadConsulta.signos_vitales.talla + ' cm' : '-';
    document.getElementById('print-temperatura').textContent = payloadConsulta.signos_vitales.temperatura ? payloadConsulta.signos_vitales.temperatura + ' °C' : '-';
    document.getElementById('print-presion').textContent = payloadConsulta.signos_vitales.presion_arterial || '-';

    // Diagnóstico
    document.getElementById('print-diagnostico').textContent = payloadReceta.diagnostico;
    document.getElementById('print-indicaciones').textContent = payloadReceta.indicaciones_adicionales || '-';
    
    // Medicamentos
    const printMeds = document.getElementById('print-medicamentos');
    printMeds.innerHTML = '';
    payloadReceta.medicamentos.forEach(m => {
        const p = document.createElement('p');
        p.className = 'mb-1';
        p.innerHTML = `<strong>${m.nombre}</strong> - ${m.dosis} <br> <small class="text-muted">Tomar ${m.frecuencia} durante ${m.duracion}</small>`;
        printMeds.appendChild(p);
    });

    // Ocultar la UI y mostrar la receta para imprimir
    document.getElementById('contenedor-principal').classList.add('d-none');
    document.querySelector('nav').classList.add('d-none');
    document.getElementById('receta-impresion').classList.remove('d-none');

    window.print();

    // Restaurar vistas por si el usuario cancela la impresión y se queda
    document.getElementById('contenedor-principal').classList.remove('d-none');
    document.querySelector('nav').classList.remove('d-none');
    document.getElementById('receta-impresion').classList.add('d-none');
}
