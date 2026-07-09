// js/dictado.js

document.addEventListener('DOMContentLoaded', () => {
    const btnGrabar = document.getElementById('btn-grabar');
    const estadoGrabacion = document.getElementById('estado-grabacion');
    const resultadoContenedor = document.getElementById('resultado-receta');
    const resultadoPre = resultadoContenedor.querySelector('pre');

    let mediaRecorder;
    let audioChunks = [];
    let isRecording = false;

    btnGrabar.addEventListener('click', async () => {
        if (!isRecording) {
            // --- INICIAR GRABACIÓN ---
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorder = new MediaRecorder(stream);

                mediaRecorder.ondataavailable = event => {
                    audioChunks.push(event.data);
                };

                mediaRecorder.onstop = async () => {
                    // Convertir los fragmentos de audio a un archivo WebM
                    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                    audioChunks = []; // Limpiar memoria
                    await enviarAudioBackend(audioBlob);
                };

                mediaRecorder.start();
                isRecording = true;

                // Cambios visuales: Botón Rojo
                btnGrabar.classList.remove('btn-brand');
                btnGrabar.style.backgroundColor = '#E74C3C'; // Rojo semántico
                btnGrabar.style.borderColor = '#E74C3C';
                btnGrabar.innerHTML = '<i data-lucide="square" width="18"></i> Detener y Procesar';
                estadoGrabacion.textContent = "Grabando... Habla ahora.";
                estadoGrabacion.style.color = "#E74C3C";
                lucide.createIcons();

            } catch (err) {
                console.error("Error al acceder al micrófono:", err);
                alert("Por favor, permite el acceso al micrófono en tu navegador.");
            }
        } else {
            // --- DETENER GRABACIÓN ---
            mediaRecorder.stop();
            mediaRecorder.stream.getTracks().forEach(track => track.stop()); // Apagar el micrófono
            isRecording = false;

            // Cambios visuales: Botón Cargando
            btnGrabar.style.backgroundColor = '';
            btnGrabar.style.borderColor = '';
            btnGrabar.classList.add('btn-brand');
            btnGrabar.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> IA Analizando...';
            btnGrabar.disabled = true;
            estadoGrabacion.textContent = "Enviando audio a Gemini...";
            estadoGrabacion.style.color = "#004D7F";
        }
    });

    async function enviarAudioBackend(blob) {
        // Formatear el archivo para que FastAPI lo reciba como UploadFile
        const formData = new FormData();
        formData.append("audio", blob, "dictado.webm");

        try {
            // Obtenemos el token del login anterior para mayor seguridad
            const token = localStorage.getItem('token');
            const headers = {};
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            // Llamada directa usando la IP de tu Uvicorn
            const response = await fetch("http://127.0.0.1:8000/api/v1/recetas/procesar_audio", {
                method: "POST",
                headers: headers,
                body: formData
            });

            if (!response.ok) {
                throw new Error("Error en el servidor al procesar el dictado.");
            }

            // Obtener la estructura validada por Pydantic
            const recetaEstructurada = await response.json();

            // Mostrar éxito en la UI
            estadoGrabacion.textContent = "¡Receta extraída con éxito!";
            estadoGrabacion.style.color = "#00A693";

            // --- NUEVA LÓGICA: INYECCIÓN AL FORMULARIO ---

            // Función auxiliar para dejar en blanco los campos vacíos
            const limpiar = (texto) => {
                if (!texto || texto.toLowerCase().includes("no especificado") || texto.toLowerCase().includes("ninguna")) {
                    return "";
                }
                return texto;
            };

            // 1. Llenar los datos básicos
            document.getElementById('form-nombre').value = limpiar(recetaEstructurada.paciente_nombre);
            document.getElementById('form-edad').value = limpiar(recetaEstructurada.edad);
            document.getElementById('form-peso').value = limpiar(recetaEstructurada.peso);
            document.getElementById('form-talla').value = limpiar(recetaEstructurada.talla);
            document.getElementById('form-temperatura').value = limpiar(recetaEstructurada.temperatura);
            document.getElementById('form-presion').value = limpiar(recetaEstructurada.presion_arterial);
            document.getElementById('form-diagnostico').value = limpiar(recetaEstructurada.diagnostico);
            document.getElementById('form-indicaciones').value = limpiar(recetaEstructurada.indicaciones_adicionales);

            // 2. Generar las tarjetas de medicamentos dinámicamente
            const contenedorMeds = document.getElementById('contenedor-medicamentos');
            contenedorMeds.innerHTML = ""; // Limpiamos por si había una grabación anterior

            recetaEstructurada.medicamentos.forEach((med, index) => {
                const medHTML = `
                    <div class="card border-1 shadow-sm mb-2 bg-light">
                        <div class="card-body p-3 row g-2">
                            <div class="col-md-4">
                                <label class="form-label small text-muted mb-1">Medicamento</label>
                                <input type="text" class="form-control form-control-sm med-nombre" value="${limpiar(med.nombre)}">
                            </div>
                            <div class="col-md-2">
                                <label class="form-label small text-muted mb-1">Dosis</label>
                                <input type="text" class="form-control form-control-sm med-dosis" value="${limpiar(med.dosis)}">
                            </div>
                            <div class="col-md-3">
                                <label class="form-label small text-muted mb-1">Frecuencia</label>
                                <input type="text" class="form-control form-control-sm med-frecuencia" value="${limpiar(med.frecuencia)}">
                            </div>
                            <div class="col-md-3">
                                <label class="form-label small text-muted mb-1">Duración</label>
                                <input type="text" class="form-control form-control-sm med-duracion" value="${limpiar(med.duracion)}">
                            </div>
                        </div>
                    </div>
                `;
                contenedorMeds.insertAdjacentHTML('beforeend', medHTML);
            });

            // 3. Mostrar el formulario y actualizar los iconos de Lucide
            document.getElementById('formulario-receta').classList.remove('d-none');
            lucide.createIcons();

        } catch (error) {
            console.error(error);
            estadoGrabacion.textContent = "Hubo un error al conectar con la IA.";
            estadoGrabacion.style.color = "#E74C3C";
        } finally {
            // Restaurar el botón a su estado original
            btnGrabar.disabled = false;
            btnGrabar.innerHTML = '<i data-lucide="mic" width="18"></i> Iniciar Dictado';
            lucide.createIcons();
        }
    }
    // --- LÓGICA PARA GUARDAR LA RECETA FINAL EN BASE DE DATOS ---
    const formGuardar = document.getElementById('form-guardar-receta');

    formGuardar.addEventListener('submit', async (e) => {
        e.preventDefault();

        const btnSubmit = formGuardar.querySelector('button[type="submit"]');
        const textoOriginal = btnSubmit.innerHTML;
        btnSubmit.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Procesando...';
        btnSubmit.disabled = true;

        try {
            // 1. Recolectar todos los medicamentos dinámicos
            const medicamentosFinales = [];
            const tarjetasMeds = document.querySelectorAll('#contenedor-medicamentos .card');

            tarjetasMeds.forEach(tarjeta => {
                medicamentosFinales.push({
                    nombre: tarjeta.querySelector('.med-nombre').value,
                    dosis: tarjeta.querySelector('.med-dosis').value,
                    frecuencia: tarjeta.querySelector('.med-frecuencia').value,
                    duracion: tarjeta.querySelector('.med-duracion').value
                });
            });

            // 2. AHORA SÍ: Construir y DEFINIR el objeto recetaFinal
            const recetaFinal = {
                paciente_nombre: document.getElementById('form-nombre').value,
                edad: document.getElementById('form-edad').value,
                peso: document.getElementById('form-peso').value,
                talla: document.getElementById('form-talla').value,
                temperatura: document.getElementById('form-temperatura').value,
                presion_arterial: document.getElementById('form-presion').value,
                diagnostico: document.getElementById('form-diagnostico').value,
                medicamentos: medicamentosFinales,
                indicaciones_adicionales: document.getElementById('form-indicaciones').value
            };

            // 3. Enviar a FastAPI
            const token = localStorage.getItem('token');
            const response = await fetch("http://127.0.0.1:8000/api/v1/recetas/guardar", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(recetaFinal) // Aquí se envía el objeto creado arriba
            });

            if (!response.ok) throw new Error("Error al guardar en la base de datos");

            // --- 4. LLENADO DE PLANTILLA E IMPRESIÓN DIRECTA ---
            // Como recetaFinal ya existe arriba, esta sección no fallará

            document.getElementById('print-doctor-nombre').textContent = localStorage.getItem('nombre_doctor') || "Dr. Titular";
            document.getElementById('print-fecha').textContent = new Date().toLocaleDateString('es-MX');

            document.getElementById('print-paciente').textContent = recetaFinal.paciente_nombre;
            document.getElementById('print-edad').textContent = recetaFinal.edad || "N/A";
            document.getElementById('print-peso').textContent = recetaFinal.peso || "N/A";
            document.getElementById('print-talla').textContent = recetaFinal.talla || "N/A";
            document.getElementById('print-temperatura').textContent = recetaFinal.temperatura || "N/A";
            document.getElementById('print-presion').textContent = recetaFinal.presion_arterial || "N/A";
            document.getElementById('print-diagnostico').textContent = recetaFinal.diagnostico;
            document.getElementById('print-indicaciones').textContent = recetaFinal.indicaciones_adicionales || "Sin indicaciones adicionales.";

            const printMeds = document.getElementById('print-medicamentos');
            printMeds.innerHTML = "";
            recetaFinal.medicamentos.forEach(med => {
                printMeds.innerHTML += `
                    <div class="mb-1">
                        <strong>${med.nombre}</strong> - ${med.dosis} 
                        <br><small class="text-muted ms-2">Tomar ${med.frecuencia} por ${med.duracion}</small>
                    </div>
                `;
            });

            // Lanza la impresión de inmediato
            window.print();

            // Limpiar la pantalla después de imprimir
            window.onafterprint = () => {
                document.getElementById('formulario-receta').classList.add('d-none');
                formGuardar.reset();
                document.getElementById('estado-grabacion').textContent = "";
            };

        } catch (error) {
            console.error(error);
            alert("❌ Hubo un error al procesar la receta.");
        } finally {
            btnSubmit.innerHTML = textoOriginal;
            btnSubmit.disabled = false;
        }
    });
});