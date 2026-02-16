/* ============================================================
   ELEMENTOS
============================================================ */
const audio = document.getElementById("audio");
const bigTitle = document.getElementById("big-title");
const prevBtn = document.getElementById("prev");
const nextBtn = document.getElementById("next");
const visualizer = document.getElementById("audio-visualizer");

let audioCtx = null;
let analyser = null;
let source = null;

const barsCount = 30;

/* ============================================================
   CREAR BARRAS
============================================================ */
function crearBarras() {
    visualizer.innerHTML = "";
    for (let i = 0; i < barsCount; i++) {
        const bar = document.createElement("div");
        bar.style.height = "4px";
        visualizer.appendChild(bar);
    }
}

crearBarras();

/* ============================================================
   INICIALIZAR AUDIO CONTEXT
============================================================ */
async function initAudio() {
    // Si ya existe, solo nos aseguramos de que no esté suspendido
    if (audioCtx) {
        if (audioCtx.state === "suspended") {
            await audioCtx.resume();
        }
        return;
    }

    // Crear el contexto (necesita interacción del usuario para activarse)
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 64;

    // Conectar el elemento de audio al analizador
    source = audioCtx.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.connect(audioCtx.destination);

    console.log("AudioContext iniciado correctamente");
}

/* ============================================================
   REPRODUCIR (CORREGIDO: ASYNC & UNMUTE)
============================================================ */
async function reproducir(url, titulo) {
    bigTitle.textContent = "Preparando...";

    try {
        // IMPORTANTE: Intentar despertar el audio con el click del usuario
        await initAudio();

        const res = await fetch("/preparar-stream", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url })
        });

        const data = await res.json();

        if (!res.ok) {
            alert(data.detail || "Error preparando la canción");
            bigTitle.textContent = "Error";
            return;
        }

        // Configuración del audio
        audio.pause();
        audio.src = data.url_stream;

        // El crossOrigin es vital si usas AnalyserNode con URLs externas
        audio.crossOrigin = "anonymous";

        audio.load();

        // Aseguramos que no esté muteado
        audio.volume = 1.0;
        audio.muted = false;

        // Intentar reproducir
        await audio.play();

        bigTitle.textContent = titulo;
        window.rutaTemporal = data.ruta;

    } catch (err) {
        console.error("Error en la reproducción:", err);
        bigTitle.textContent = "Error al reproducir";

        // Si el play falla por permisos, intentamos avisar
        if (err.name === "NotAllowedError") {
            alert("El navegador bloqueó el audio. Haz clic de nuevo.");
        }
    }
}

/* ============================================================
   VISUALIZADOR (ANIMACIÓN)
============================================================ */
function animate() {
    if (!analyser || audio.paused) return;

    const bars = visualizer.children;
    const data = new Uint8Array(analyser.frequencyBinCount);

    analyser.getByteFrequencyData(data);

    for (let i = 0; i < bars.length; i++) {
        const value = data[i] || 0;
        const height = (value / 255) * 60; // Máximo 60px

        if (bars[i]) {
            bars[i].style.height = `${height}px`;
            // Color dinámico tipo Spotify (verde que cambia según intensidad)
            bars[i].style.background = `rgb(29, 185, ${84 + (value / 2)})`;
        }
    }

    requestAnimationFrame(animate);
}

/* ============================================================
   EVENTOS AUDIO
============================================================ */
audio.addEventListener("play", () => {
    animate();
});

audio.addEventListener("ended", () => {
    bigTitle.textContent = "Selecciona una canción";
    // Reset de las barras al terminar
    const bars = visualizer.children;
    for (let bar of bars) {
        bar.style.height = "4px";
    }
});

/* ============================================================
   CONFIRMAR CANCIÓN
============================================================ */
async function añadirCancion() {

    if (!window.rutaTemporal) {
        alert("Primero reproduce la canción");
        return;
    }

    try {

        const res = await fetch("/confirmar-cancion", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                ruta: window.rutaTemporal
            })
        });

        const data = await res.json();

        if (!res.ok) {
            alert(data.detail || "Error al guardar");
            return;
        }

        // 👇 AQUÍ ESTÁ EL CAMBIO
        alert(data.mensaje);

        window.rutaTemporal = null;

    } catch (err) {
        console.error(err);
        alert("Error al conectar con el servidor");
    }
}

/* ============================================================
   BOTONES NAVEGACIÓN
============================================================ */
if (prevBtn) {
    prevBtn.onclick = () => alert("Usa la lista lateral para navegar");
}

if (nextBtn) {
    nextBtn.onclick = () => alert("Usa la lista lateral para navegar");
}