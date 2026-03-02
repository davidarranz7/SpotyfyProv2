/* ============================================================
   ELEMENTOS
============================================================ */
const audio = document.getElementById("audio");
const bigTitle = document.getElementById("big-title");
const playBtn = document.getElementById("play-btn");
const vinyl = document.querySelector(".vinyl-record");
const progressBar = document.getElementById("progress-bar");
const progressContainer = document.getElementById("progress-container");
const timeCurrent = document.getElementById("time-current");
const timeTotal = document.getElementById("time-total");
const volumeSlider = document.getElementById("volume-slider");
const visualizer = document.getElementById("audio-visualizer");

/* ============================================================
   AUDIO CONTEXT
============================================================ */
let audioCtx = null;
let analyser = null;
let source = null;
let animationId = null;

const barsCount = 40;

/* ============================================================
   CREAR BARRAS
============================================================ */
function crearBarras() {
    if (!visualizer) return;

    visualizer.innerHTML = "";
    for (let i = 0; i < barsCount; i++) {
        const bar = document.createElement("div");
        bar.style.height = "6px";
        visualizer.appendChild(bar);
    }
}
crearBarras();

/* ============================================================
   INICIALIZAR AUDIO CONTEXT
============================================================ */
async function initAudio() {

    if (audioCtx) {
        if (audioCtx.state === "suspended") {
            await audioCtx.resume();
        }
        return;
    }

    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;

    source = audioCtx.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.connect(audioCtx.destination);
}

/* ============================================================
   REPRODUCIR
============================================================ */
async function reproducir(url, titulo) {

    bigTitle.textContent = "Preparando...";

    try {

        await initAudio();

        const res = await fetch("/preparar-stream", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url })
        });

        const data = await res.json();

        if (!res.ok) {
            showToast(data.detail || "Error preparando la canción", "error");
            bigTitle.textContent = "Error";
            return;
        }

        audio.pause();
        audio.src = data.url_stream;
        audio.crossOrigin = "anonymous";
        audio.load();

        audio.volume = volumeSlider ? volumeSlider.value : 1;
        audio.muted = false;

        await audio.play();

        bigTitle.textContent = titulo;
        window.rutaTemporal = data.ruta;

        showToast("Reproduciendo", "success");

    } catch (err) {
        console.error(err);
        bigTitle.textContent = "Error al reproducir";
        showToast("Error al reproducir", "error");
    }
}

/* ============================================================
   PLAY / PAUSE
============================================================ */
if (playBtn) {
    playBtn.onclick = () => {
        audio.paused ? audio.play() : audio.pause();
    };
}

audio.addEventListener("play", () => {
    if (vinyl) vinyl.style.animationPlayState = "running";
    animate();
    if (playBtn) playBtn.innerHTML = '<i class="fas fa-pause"></i>';
});

audio.addEventListener("pause", () => {
    if (vinyl) vinyl.style.animationPlayState = "paused";
    cancelAnimationFrame(animationId);
    if (playBtn) playBtn.innerHTML = '<i class="fas fa-play"></i>';
});

audio.addEventListener("ended", () => {
    if (vinyl) vinyl.style.animationPlayState = "paused";
    if (playBtn) playBtn.innerHTML = '<i class="fas fa-play"></i>';

    bigTitle.textContent = "Selecciona una canción";

    resetVisualizer();
});

/* ============================================================
   VISUALIZADOR
============================================================ */
function animate() {

    if (!analyser || audio.paused) return;

    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(data);

    const bars = visualizer.children;

    for (let i = 0; i < bars.length; i++) {
        const value = data[i] || 0;
        const height = (value / 255) * 60;

        if (bars[i]) {
            bars[i].style.height = `${Math.max(6, height)}px`;
        }
    }

    animationId = requestAnimationFrame(animate);
}

function resetVisualizer(){
    if (!visualizer) return;
    const bars = visualizer.children;
    for (let bar of bars) {
        bar.style.height = "6px";
    }
}

/* ============================================================
   PROGRESS BAR
============================================================ */
audio.addEventListener("timeupdate", () => {

    if (!audio.duration) return;

    const percent = (audio.currentTime / audio.duration) * 100;

    if (progressBar) progressBar.style.width = percent + "%";
    if (timeCurrent) timeCurrent.textContent = formatTime(audio.currentTime);
});

audio.addEventListener("loadedmetadata", () => {
    if (timeTotal) timeTotal.textContent = formatTime(audio.duration);
});

if (progressContainer) {
    progressContainer.onclick = (e) => {
        const rect = progressContainer.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        audio.currentTime = pos * audio.duration;
    };
}

/* ============================================================
   VOLUMEN
============================================================ */
if (volumeSlider) {
    audio.volume = volumeSlider.value;

    volumeSlider.addEventListener("input", () => {
        audio.volume = volumeSlider.value;
    });
}

/* ============================================================
   AÑADIR CANCIÓN
============================================================ */
async function añadirCancion() {

    if (!window.rutaTemporal) {
        showToast("Primero reproduce la canción", "error");
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
            showToast(data.detail || "Error al guardar", "error");
            return;
        }

        showToast(data.mensaje, "success");
        window.rutaTemporal = null;

    } catch (err) {
        console.error(err);
        showToast("Error al conectar con el servidor", "error");
    }
}

/* ============================================================
   NOTIFICACIÓN SUPERIOR MINIMAL
============================================================ */
function showToast(message, type = "success") {

    let notification = document.getElementById("top-notification");

    if (!notification) {
        notification = document.createElement("div");
        notification.id = "top-notification";
        document.body.appendChild(notification);
    }

    notification.className = type;
    notification.textContent = message;

    void notification.offsetWidth;

    notification.classList.add("show");

    setTimeout(() => {
        notification.classList.remove("show");
    }, 3000);
}

/* ============================================================
   UTILS
============================================================ */
function formatTime(secs) {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
}