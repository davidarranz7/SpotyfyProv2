const audioPlayer = document.getElementById("audio-player");
const songTitle = document.getElementById("current-song-title");
const visualizer = document.getElementById("audio-visualizer");
const progressBar = document.getElementById("progress-bar");
const progressContainer = document.getElementById("progress-container");
const timeCurrent = document.getElementById("time-current");
const timeTotal = document.getElementById("time-total");
const playBtn = document.getElementById("play-btn");
const vinyl = document.querySelector(".vinyl-record");

const shuffleBtn = document.getElementById("shuffle-btn");
const repeatBtn = document.getElementById("repeat-btn");
const queueBtn = document.getElementById("queue-btn");

const queueDropdown = document.getElementById("queue-dropdown");
const queueListEl = document.getElementById("queue-list");
const queueCountEl = document.getElementById("queue-count");
const queueClearBtn = document.getElementById("queue-clear");

const toastEl = document.getElementById("toast");

const playIcon = playBtn.querySelector("i");

let currentIndex = 0;
let shuffle = false;
let repeat = false;

let favorites = JSON.parse(localStorage.getItem("favorites")) || [];
let playlist = JSON.parse(localStorage.getItem("playlist")) || [];

// ✅ Cola persistente
const QUEUE_KEY = "queue_v1";
let queue = JSON.parse(localStorage.getItem(QUEUE_KEY)) || [];

/* ===== VISUALIZER SETUP ===== */

let audioCtx, analyser, source;
let animationId;

for (let i = 0; i < 40; i++) {
    const bar = document.createElement("div");
    visualizer.appendChild(bar);
}

/* ===== TOOLTIP + THUMB ===== */

const tooltip = document.createElement("div");
tooltip.className = "progress-tooltip";
progressContainer.appendChild(tooltip);

const thumb = document.createElement("div");
thumb.className = "progress-thumb";
progressContainer.appendChild(thumb);

let isDragging = false;
let wasPlayingBeforeDrag = false;

/* ===== AUDIO CONTEXT ===== */

function initAudio() {
    if (audioCtx) return;

    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;

    source = audioCtx.createMediaElementSource(audioPlayer);
    source.connect(analyser);
    analyser.connect(audioCtx.destination);
}

/* ===== UI HELPERS ===== */

function setActiveSongRow(index) {
    document.querySelectorAll(".song-row").forEach(li => li.classList.remove("active", "is-playing"));
    const active = document.querySelector(`.song-row[data-index="${index}"]`);
    if (active) active.classList.add("active");
}

function setPlayingState(isPlaying) {
    const active = document.querySelector(`.song-row[data-index="${currentIndex}"]`);
    if (active) active.classList.toggle("is-playing", isPlaying);
}

/* ===== TOAST ===== */

let toastTimer;
function showToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 1200);
}

/* ===== QUEUE STORAGE ===== */

function saveQueue() {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

function addToQueueByIndex(index) {
    const song = SONGS[index];
    if (!song) return;

    queue.push({ titulo: song.titulo, url: song.url });
    saveQueue();
    renderQueue();
    showToast("Añadida a cola ✅");
}

function removeFromQueue(pos) {
    queue.splice(pos, 1);
    saveQueue();
    renderQueue();
    showToast("Eliminada de cola 🗑️");
}

function clearQueue() {
    queue = [];
    saveQueue();
    renderQueue();
    showToast("Cola vaciada");
}

function renderQueue() {
    if (!queueListEl || !queueCountEl) return;

    queueListEl.innerHTML = "";

    if (queue.length === 0) {
        const li = document.createElement("li");
        li.className = "queue-item";
        li.style.cursor = "default";
        li.innerHTML = `<span class="queue-item-title" style="opacity:.7">No hay canciones en cola</span>`;
        queueListEl.appendChild(li);
        queueCountEl.textContent = "0 en cola";
        return;
    }

    queue.forEach((song, pos) => {
        const li = document.createElement("li");
        li.className = "queue-item";
        li.dataset.pos = String(pos);

        const title = document.createElement("span");
        title.className = "queue-item-title";
        title.textContent = song.titulo;

        const actions = document.createElement("div");
        actions.className = "queue-item-actions";

        const removeBtn = document.createElement("button");
        removeBtn.type = "button";
        removeBtn.className = "queue-remove-btn";
        removeBtn.title = "Quitar de cola";
        removeBtn.innerHTML = `<i class="fas fa-xmark"></i>`;

        removeBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            removeFromQueue(pos);
        });

        actions.appendChild(removeBtn);

        li.appendChild(title);
        li.appendChild(actions);

        // Click en item -> reproducir ese elemento de cola y quitarlo
        li.addEventListener("click", () => {
            const picked = queue.splice(pos, 1)[0];
            saveQueue();
            renderQueue();

            const idx = SONGS.findIndex(s => s.url === picked.url);
            if (idx !== -1) playSong(idx);
            else {
                // fallback por si no existe en SONGS
                audioPlayer.src = picked.url;
                songTitle.textContent = picked.titulo;
                audioPlayer.play();
            }

            showToast("Reproduciendo desde cola ▶️");
        });

        queueListEl.appendChild(li);
    });

    queueCountEl.textContent = `${queue.length} en cola`;
}

/* ===== QUEUE DROPDOWN TOGGLE ===== */

function toggleQueueDropdown(forceState) {
    const open = typeof forceState === "boolean"
        ? forceState
        : !queueDropdown.classList.contains("open");

    queueDropdown.classList.toggle("open", open);
    queueDropdown.setAttribute("aria-hidden", open ? "false" : "true");
}

queueBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleQueueDropdown();
});

document.addEventListener("click", (e) => {
    // cerrar si click fuera
    if (queueDropdown.classList.contains("open")) {
        const inside = queueDropdown.contains(e.target) || queueBtn.contains(e.target);
        if (!inside) toggleQueueDropdown(false);
    }
});

queueClearBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    clearQueue();
});

/* ===== ADD TO QUEUE BUTTONS IN LIST ===== */

document.querySelectorAll(".queue-add-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.index, 10);
        if (Number.isNaN(idx)) return;
        addToQueueByIndex(idx);
    });
});

/* ===== PLAY SONG ===== */

function playSong(index) {
    if (index < 0 || index >= SONGS.length) return;

    currentIndex = index;
    audioPlayer.src = SONGS[index].url;
    songTitle.textContent = SONGS[index].titulo;
    audioPlayer.play();

    setActiveSongRow(index);
    setPlayingState(true);
    updateLists();
}

/* ===== CONTROLS ===== */

playBtn.onclick = () =>
    audioPlayer.paused ? audioPlayer.play() : audioPlayer.pause();

document.getElementById("next-btn").onclick = () => {
    // ✅ primero cola
    if (queue.length > 0) {
        const nextFromQueue = queue.shift();
        saveQueue();
        renderQueue();

        const idx = SONGS.findIndex(s => s.url === nextFromQueue.url);
        if (idx !== -1) playSong(idx);
        else {
            audioPlayer.src = nextFromQueue.url;
            songTitle.textContent = nextFromQueue.titulo;
            audioPlayer.play();
        }
        showToast("Siguiente desde cola ▶️");
        return;
    }

    // si no hay cola, tu lógica normal
    if (SONGS.length === 0) return;

    if (shuffle) {
        let next = currentIndex;
        if (SONGS.length > 1) {
            while (next === currentIndex) next = Math.floor(Math.random() * SONGS.length);
        }
        currentIndex = next;
    } else {
        currentIndex = (currentIndex + 1) % SONGS.length;
    }

    playSong(currentIndex);
};

document.getElementById("prev-btn").onclick = () => {
    if (SONGS.length === 0) return;

    if (shuffle) {
        let prev = currentIndex;
        if (SONGS.length > 1) {
            while (prev === currentIndex) prev = Math.floor(Math.random() * SONGS.length);
        }
        currentIndex = prev;
    } else {
        currentIndex = (currentIndex - 1 + SONGS.length) % SONGS.length;
    }

    playSong(currentIndex);
};

shuffleBtn.onclick = () => {
    shuffle = !shuffle;
    shuffleBtn.classList.toggle("is-on", shuffle);
};

repeatBtn.onclick = () => {
    repeat = !repeat;
    repeatBtn.classList.toggle("is-on", repeat);
};

/* ===== PROGRESS HELPERS ===== */

function clamp01(x) {
    return Math.min(Math.max(x, 0), 1);
}

function getPosFromEvent(e) {
    const rect = progressContainer.getBoundingClientRect();
    const clientX = (e.touches && e.touches[0]) ? e.touches[0].clientX : e.clientX;
    const pos = (clientX - rect.left) / rect.width;
    return clamp01(pos);
}

function setProgressUIByPos(pos) {
    progressBar.style.width = `${pos * 100}%`;
    thumb.style.left = `${pos * 100}%`;

    if (audioPlayer.duration && !isNaN(audioPlayer.duration)) {
        const hoverTime = pos * audioPlayer.duration;
        timeCurrent.textContent = formatTime(hoverTime);
    }
}

/* ===== PROGRESS UPDATE ===== */

audioPlayer.addEventListener("timeupdate", () => {
    const { currentTime, duration } = audioPlayer;
    if (!duration) return;

    const pos = currentTime / duration;
    progressBar.style.width = `${pos * 100}%`;
    thumb.style.left = `${pos * 100}%`;

    timeCurrent.textContent = formatTime(currentTime);
});

audioPlayer.addEventListener("loadedmetadata", () => {
    timeTotal.textContent = formatTime(audioPlayer.duration);

    if (audioPlayer.duration) {
        const pos = audioPlayer.currentTime / audioPlayer.duration;
        thumb.style.left = `${pos * 100}%`;
        progressBar.style.width = `${pos * 100}%`;
    }
});

/* ===== CLICK SEEK ===== */

progressContainer.addEventListener("click", (e) => {
    if (isDragging) return;
    if (!audioPlayer.duration || isNaN(audioPlayer.duration)) return;

    const pos = getPosFromEvent(e);
    audioPlayer.currentTime = pos * audioPlayer.duration;
    tooltip.style.opacity = 0;
});

/* ===== HOVER TOOLTIP ===== */

progressContainer.addEventListener("mousemove", (e) => {
    if (isDragging) return;

    const pos = getPosFromEvent(e);

    if (!audioPlayer.duration || isNaN(audioPlayer.duration)) {
        tooltip.style.opacity = 0;
        return;
    }

    const hoverTime = pos * audioPlayer.duration;
    tooltip.textContent = formatTime(hoverTime);
    tooltip.style.left = `${pos * 100}%`;
    tooltip.style.opacity = 1;
});

progressContainer.addEventListener("mouseleave", () => {
    tooltip.style.opacity = 0;
});

/* ===== DRAG THUMB ===== */

thumb.addEventListener("mousedown", (e) => {
    e.preventDefault();
    if (!audioPlayer.duration || isNaN(audioPlayer.duration)) return;

    isDragging = true;
    tooltip.style.opacity = 0;

    wasPlayingBeforeDrag = !audioPlayer.paused;
    audioPlayer.pause();
    setPlayingState(false);

    const pos = getPosFromEvent(e);
    setProgressUIByPos(pos);
});

document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    if (!audioPlayer.duration || isNaN(audioPlayer.duration)) return;

    const pos = getPosFromEvent(e);
    setProgressUIByPos(pos);
});

document.addEventListener("mouseup", (e) => {
    if (!isDragging) return;
    if (!audioPlayer.duration || isNaN(audioPlayer.duration)) {
        isDragging = false;
        return;
    }

    const pos = getPosFromEvent(e);
    audioPlayer.currentTime = pos * audioPlayer.duration;

    isDragging = false;

    if (wasPlayingBeforeDrag) {
        audioPlayer.play();
        setPlayingState(true);
    }
});

/* Touch */
thumb.addEventListener("touchstart", (e) => {
    e.preventDefault();
    if (!audioPlayer.duration || isNaN(audioPlayer.duration)) return;

    isDragging = true;
    tooltip.style.opacity = 0;

    wasPlayingBeforeDrag = !audioPlayer.paused;
    audioPlayer.pause();
    setPlayingState(false);

    const pos = getPosFromEvent(e);
    setProgressUIByPos(pos);
}, { passive: false });

document.addEventListener("touchmove", (e) => {
    if (!isDragging) return;
    if (!audioPlayer.duration || isNaN(audioPlayer.duration)) return;

    const pos = getPosFromEvent(e);
    setProgressUIByPos(pos);
}, { passive: false });

document.addEventListener("touchend", () => {
    if (!isDragging) return;
    if (!audioPlayer.duration || isNaN(audioPlayer.duration)) {
        isDragging = false;
        return;
    }

    const left = parseFloat(thumb.style.left) || 0;
    const pos = clamp01(left / 100);

    audioPlayer.currentTime = pos * audioPlayer.duration;

    isDragging = false;
    if (wasPlayingBeforeDrag) {
        audioPlayer.play();
        setPlayingState(true);
    }
});

/* ===== AUTO NEXT ===== */

audioPlayer.addEventListener("ended", () => {
    setPlayingState(false);

    if (repeat) {
        playSong(currentIndex);
        return;
    }

    // ✅ prioridad cola al terminar
    if (queue.length > 0) {
        document.getElementById("next-btn").click();
        return;
    }

    // normal
    document.getElementById("next-btn").click();
});

/* ===== VISUALIZER + ICONS ===== */

audioPlayer.addEventListener("play", () => {
    initAudio();
    vinyl.style.animationPlayState = "running";
    animate();

    playIcon.classList.remove("fa-play");
    playIcon.classList.add("fa-pause");

    setPlayingState(true);
});

audioPlayer.addEventListener("pause", () => {
    vinyl.style.animationPlayState = "paused";
    cancelAnimationFrame(animationId);

    playIcon.classList.remove("fa-pause");
    playIcon.classList.add("fa-play");

    setPlayingState(false);
});

function animate() {
    if (!analyser) return;

    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(data);

    const bars = visualizer.children;

    for (let i = 0; i < bars.length; i++) {
        const value = data[i];
        const height = (value / 255) * 60;
        bars[i].style.height = `${Math.max(6, height)}px`;
    }

    animationId = requestAnimationFrame(animate);
}

/* ===== FAVORITOS / PLAYLIST ===== */

document.getElementById("like-current").onclick = () => {
    const song = SONGS[currentIndex];
    if (!song) return;

    if (!favorites.find(s => s.url === song.url)) {
        favorites.push(song);
        localStorage.setItem("favorites", JSON.stringify(favorites));
        updateLists();
    }
};

document.getElementById("add-playlist").onclick = () => {
    const song = SONGS[currentIndex];
    if (!song) return;

    if (!playlist.find(s => s.url === song.url)) {
        playlist.push(song);
        localStorage.setItem("playlist", JSON.stringify(playlist));
        updateLists();
    }
};

function updateLists() {
    const favList = document.getElementById("favorites-list");
    favList.innerHTML = "";
    favorites.forEach(s => {
        const li = document.createElement("li");
        li.textContent = s.titulo;
        favList.appendChild(li);
    });

    const playList = document.getElementById("playlist-list");
    playList.innerHTML = "";
    playlist.forEach(s => {
        const li = document.createElement("li");
        li.textContent = s.titulo;
        playList.appendChild(li);
    });
}

/* ===== UTILS ===== */

function formatTime(secs) {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
}

updateLists();
renderQueue();

/* ===== VOLUME CONTROL ===== */

const volumeSlider = document.getElementById("volume-slider");
audioPlayer.volume = volumeSlider.value;

volumeSlider.addEventListener("input", () => {
    audioPlayer.volume = volumeSlider.value;
});