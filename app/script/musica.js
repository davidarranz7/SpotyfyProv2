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

const playIcon = playBtn.querySelector("i");

let currentIndex = 0;
let shuffle = false;
let repeat = false;

let favorites = JSON.parse(localStorage.getItem("favorites")) || [];
let playlist = JSON.parse(localStorage.getItem("playlist")) || [];

/* ===== VISUALIZER SETUP ===== */

let audioCtx, analyser, source;
let animationId;

for (let i = 0; i < 40; i++) {
    const bar = document.createElement("div");
    visualizer.appendChild(bar);
}

/* ===== TOOLTIP + THUMB (NUEVO) ===== */

const tooltip = document.createElement("div");
tooltip.className = "progress-tooltip";
progressContainer.appendChild(tooltip);

const thumb = document.createElement("div");
thumb.className = "progress-thumb";
progressContainer.appendChild(thumb);

let isDragging = false;
let wasPlayingBeforeDrag = false;

function initAudio() {
    if (audioCtx) return;

    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;

    source = audioCtx.createMediaElementSource(audioPlayer);
    source.connect(analyser);
    analyser.connect(audioCtx.destination);
}

/* ===== ACTIVE SONG ROW ===== */

function setActiveSongRow(index) {
    document.querySelectorAll(".song-row").forEach(li => li.classList.remove("active"));
    const active = document.querySelector(`.song-row[data-index="${index}"]`);
    if (active) active.classList.add("active");
}

/* ===== PLAY SONG ===== */

function playSong(index) {
    if (index < 0 || index >= SONGS.length) return;

    currentIndex = index;
    audioPlayer.src = SONGS[index].url;
    songTitle.textContent = SONGS[index].titulo;
    audioPlayer.play();

    setActiveSongRow(index);
    updateLists();
}

/* ===== CONTROLS ===== */

playBtn.onclick = () =>
    audioPlayer.paused ? audioPlayer.play() : audioPlayer.pause();

document.getElementById("next-btn").onclick = () => {
    if (SONGS.length === 0) return;

    if (shuffle) {
        let next = currentIndex;
        if (SONGS.length > 1) {
            while (next === currentIndex) {
                next = Math.floor(Math.random() * SONGS.length);
            }
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
            while (prev === currentIndex) {
                prev = Math.floor(Math.random() * SONGS.length);
            }
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
    // UI inmediata (aunque no haya duration)
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

    // sincroniza thumb al cargar metadata
    if (audioPlayer.duration) {
        const pos = audioPlayer.currentTime / audioPlayer.duration;
        thumb.style.left = `${pos * 100}%`;
        progressBar.style.width = `${pos * 100}%`;
    }
});

/* ===== CLICK SEEK (sigue funcionando) ===== */

progressContainer.addEventListener("click", (e) => {
    // si estamos arrastrando, ignorar click final
    if (isDragging) return;

    if (!audioPlayer.duration || isNaN(audioPlayer.duration)) return;

    const pos = getPosFromEvent(e);
    audioPlayer.currentTime = pos * audioPlayer.duration;
    tooltip.style.opacity = 0;
});

/* ===== HOVER TOOLTIP ===== */

progressContainer.addEventListener("mousemove", (e) => {
    if (isDragging) return; // durante drag no mostramos tooltip

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

/* ===== DRAG THUMB (NUEVO) ===== */

thumb.addEventListener("mousedown", (e) => {
    e.preventDefault();
    if (!audioPlayer.duration || isNaN(audioPlayer.duration)) return;

    isDragging = true;
    tooltip.style.opacity = 0;

    wasPlayingBeforeDrag = !audioPlayer.paused;
    // opcional: pausar mientras arrastras (sensación más pro)
    audioPlayer.pause();

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

    // volver a reproducir si estaba sonando antes
    if (wasPlayingBeforeDrag) audioPlayer.play();
});

/* Touch (móvil) */
thumb.addEventListener("touchstart", (e) => {
    e.preventDefault();
    if (!audioPlayer.duration || isNaN(audioPlayer.duration)) return;

    isDragging = true;
    tooltip.style.opacity = 0;

    wasPlayingBeforeDrag = !audioPlayer.paused;
    audioPlayer.pause();

    const pos = getPosFromEvent(e);
    setProgressUIByPos(pos);
}, { passive: false });

document.addEventListener("touchmove", (e) => {
    if (!isDragging) return;
    if (!audioPlayer.duration || isNaN(audioPlayer.duration)) return;

    const pos = getPosFromEvent(e);
    setProgressUIByPos(pos);
}, { passive: false });

document.addEventListener("touchend", (e) => {
    if (!isDragging) return;
    if (!audioPlayer.duration || isNaN(audioPlayer.duration)) {
        isDragging = false;
        return;
    }

    // en touchend no tenemos clientX fiable, usamos posición actual del thumb
    const left = parseFloat(thumb.style.left) || 0;
    const pos = clamp01(left / 100);

    audioPlayer.currentTime = pos * audioPlayer.duration;

    isDragging = false;
    if (wasPlayingBeforeDrag) audioPlayer.play();
});

/* ===== AUTO NEXT ===== */

audioPlayer.addEventListener("ended", () => {
    if (repeat) {
        playSong(currentIndex);
    } else {
        document.getElementById("next-btn").click();
    }
});

/* ===== VISUALIZER ANIMATION ===== */

audioPlayer.addEventListener("play", () => {
    initAudio();
    vinyl.style.animationPlayState = "running";
    animate();

    playIcon.classList.remove("fa-play");
    playIcon.classList.add("fa-pause");
});

audioPlayer.addEventListener("pause", () => {
    vinyl.style.animationPlayState = "paused";
    cancelAnimationFrame(animationId);

    playIcon.classList.remove("fa-pause");
    playIcon.classList.add("fa-play");
});

function animate() {
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

/* ===== FAVORITOS ===== */

document.getElementById("like-current").onclick = () => {
    const song = SONGS[currentIndex];

    if (!favorites.find(s => s.url === song.url)) {
        favorites.push(song);
        localStorage.setItem("favorites", JSON.stringify(favorites));
        updateLists();
    }
};

document.getElementById("add-playlist").onclick = () => {
    const song = SONGS[currentIndex];

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

/* ===== VOLUME CONTROL ===== */

const volumeSlider = document.getElementById("volume-slider");
audioPlayer.volume = volumeSlider.value;

volumeSlider.addEventListener("input", () => {
    audioPlayer.volume = volumeSlider.value;
});