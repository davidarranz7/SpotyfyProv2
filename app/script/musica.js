const audioPlayer = document.getElementById("audio-player");
const songTitle = document.getElementById("current-song-title");
const visualizer = document.getElementById("audio-visualizer");
const progressBar = document.getElementById("progress-bar");
const progressContainer = document.getElementById("progress-container");
const timeCurrent = document.getElementById("time-current");
const timeTotal = document.getElementById("time-total");
const playBtn = document.getElementById("play-btn");
const vinyl = document.querySelector(".vinyl-record");

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

function initAudio() {
    if (audioCtx) return;

    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;

    source = audioCtx.createMediaElementSource(audioPlayer);
    source.connect(analyser);
    analyser.connect(audioCtx.destination);
}

/* ===== PLAY SONG ===== */

function playSong(index) {
    if (index < 0 || index >= SONGS.length) return;

    currentIndex = index;
    audioPlayer.src = SONGS[index].url;
    songTitle.textContent = SONGS[index].titulo;
    audioPlayer.play();
    updateLists();
}

/* ===== CONTROLS ===== */

playBtn.onclick = () =>
    audioPlayer.paused ? audioPlayer.play() : audioPlayer.pause();

document.getElementById("next-btn").onclick = () => {
    if (shuffle) {
        currentIndex = Math.floor(Math.random() * SONGS.length);
    } else {
        currentIndex = (currentIndex + 1) % SONGS.length;
    }
    playSong(currentIndex);
};

document.getElementById("prev-btn").onclick = () => {
    currentIndex = (currentIndex - 1 + SONGS.length) % SONGS.length;
    playSong(currentIndex);
};

document.getElementById("shuffle-btn").onclick = (e) => {
    shuffle = !shuffle;
    e.target.classList.toggle("liked");
};

document.getElementById("repeat-btn").onclick = (e) => {
    repeat = !repeat;
    e.target.classList.toggle("liked");
};

/* ===== PROGRESS ===== */

audioPlayer.addEventListener("timeupdate", () => {
    const { currentTime, duration } = audioPlayer;
    if (!duration) return;

    progressBar.style.width = `${(currentTime / duration) * 100}%`;
    timeCurrent.textContent = formatTime(currentTime);
});

audioPlayer.addEventListener("loadedmetadata", () => {
    timeTotal.textContent = formatTime(audioPlayer.duration);
});

progressContainer.onclick = (e) => {
    const rect = progressContainer.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    audioPlayer.currentTime = pos * audioPlayer.duration;
};

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
});

audioPlayer.addEventListener("pause", () => {
    vinyl.style.animationPlayState = "paused";
    cancelAnimationFrame(animationId);
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
