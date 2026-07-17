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

    // Manejo Paso 1
    document.getElementById('form-consulta-paso1').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button');
        btn.disabled = true;

        const payload = {
            paciente_id: pacienteId,
            motivo_consulta: document.getElementById('form-motivo').value,
            signos_vitales: {
                peso: document.getElementById('form-peso').value,
                talla: document.getElementById('form-talla').value,
                temperatura: document.getElementById('form-temperatura').value,
                presion_arterial: document.getElementById('form-presion').value,
            }
        };

        // Rellenar datos de impresión
        document.getElementById('print-peso').textContent = payload.signos_vitales.peso + ' kg';
        document.getElementById('print-talla').textContent = payload.signos_vitales.talla + ' cm';
        document.getElementById('print-temperatura').textContent = payload.signos_vitales.temperatura + ' °C';
        document.getElementById('print-presion').textContent = payload.signos_vitales.presion_arterial;

        try {
            const resp = await fetchAPI('/api/v1/consultas/', 'POST', payload);
            consultaId = resp.id || resp._id; // Ajustar según respuesta real
            
            // Avanzar al Paso 2
            document.getElementById('paso-1').classList.remove('active');
            document.getElementById('paso-2').classList.add('active');
        } catch (error) {
            alert("Error al crear consulta: " + error.message);
        } finally {
            btn.disabled = false;
        }
    });

    // Manejo Paso 2 (Audio)
    const btnGrabar = document.getElementById('btn-grabar');
    btnGrabar.addEventListener('click', toggleGrabacion);

    // Manejo Paso 3 (Receta)
    document.getElementById('btn-add-medicamento').addEventListener('click', () => {
        agregarCampoMedicamento();
    });

    document.getElementById('form-guardar-receta').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button');
        btn.disabled = true;

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

        const payload = {
            diagnostico: document.getElementById('receta-diagnostico').value,
            medicamentos: medicamentos,
            indicaciones_adicionales: document.getElementById('receta-indicaciones').value,
            paciente_id: pacienteId,
            consulta_id: consultaId
        };

        try {
            await fetchAPI('/api/v1/recetas/guardar', 'POST', payload);
            
            // Preparar e imprimir
            prepararImpresion(payload);
            
            // Al terminar la impresión, redirigir
            setTimeout(() => {
                window.location.href = `paciente.html?id=${pacienteId}`;
            }, 1000);
            
        } catch (error) {
            alert("Error al guardar receta: " + error.message);
            btn.disabled = false;
        }
    });
});

async function toggleGrabacion() {
    const btnGrabar = document.getElementById('btn-grabar');
    const estadoText = document.getElementById('estado-grabacion');
    const indicacionText = document.getElementById('indicacion-detener');
    
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
                // Detener todas las pistas del stream para apagar la luz del mic
                if (streamGlobal) {
                    streamGlobal.getTracks().forEach(track => track.stop());
                }

                estadoText.textContent = "Procesando...";
                indicacionText.classList.add('d-none');
                btnGrabar.classList.add('d-none');
                document.getElementById('loader-ia').classList.remove('d-none');

                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                const formData = new FormData();
                // El campo esperado en el backend es 'audio' (revisar FastAPI, si espera archivo será type File)
                formData.append('audio', audioBlob, 'receta.webm');

                try {
                    // Espera multipart formData. fetchAPI ya maneja esto si no stringifica
                    const resp = await fetchAPI('/api/v1/recetas/procesar_audio', 'POST', formData);
                    mostrarPaso3(resp);
                } catch (error) {
                    alert("Error procesando audio: " + error.message);
                    // Reiniciar vista
                    btnGrabar.classList.remove('d-none');
                    document.getElementById('loader-ia').classList.add('d-none');
                    estadoText.textContent = "Listo para grabar";
                }
            };

            mediaRecorder.start();
            isRecording = true;
            btnGrabar.classList.add('recording');
            estadoText.textContent = "Grabando receta...";
            estadoText.style.color = "#E74C3C";
            indicacionText.classList.remove('d-none');

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

function mostrarPaso3(datosReceta) {
    document.getElementById('paso-2').classList.remove('active');
    document.getElementById('paso-3').classList.add('active');

    document.getElementById('receta-diagnostico').value = datosReceta.diagnostico || '';
    document.getElementById('receta-indicaciones').value = datosReceta.indicaciones_adicionales || '';

    const contenedorMeds = document.getElementById('contenedor-medicamentos');
    contenedorMeds.innerHTML = '';

    if (datosReceta.medicamentos && datosReceta.medicamentos.length > 0) {
        datosReceta.medicamentos.forEach(med => agregarCampoMedicamento(med));
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

function prepararImpresion(payload) {
    document.getElementById('print-diagnostico').textContent = payload.diagnostico;
    document.getElementById('print-indicaciones').textContent = payload.indicaciones_adicionales || '-';
    
    const printMeds = document.getElementById('print-medicamentos');
    printMeds.innerHTML = '';
    payload.medicamentos.forEach(m => {
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
