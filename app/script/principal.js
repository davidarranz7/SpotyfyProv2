/* ===== SALUDO DINÁMICO SEGÚN HORA ===== */

const greeting = document.getElementById("greeting");

const hour = new Date().getHours();
let message = "Bienvenido";

if (hour < 12) message = "Buenos días";
else if (hour < 20) message = "Buenas tardes";
else message = "Buenas noches";

if (greeting) {
    greeting.textContent = `${message}, ${greeting.textContent.split(", ")[1]}`;
}

/* ===== ESTADÍSTICAS DESDE LOCALSTORAGE ===== */

const favorites = JSON.parse(localStorage.getItem("favorites")) || [];
const playlist = JSON.parse(localStorage.getItem("playlist")) || [];

document.getElementById("stat-favorites").textContent = favorites.length;
document.getElementById("stat-playlists").textContent = playlist.length;

/* ===== CONTADOR DE SESIÓN ACTIVA ===== */

let minutes = 0;
setInterval(() => {
    minutes++;
    document.getElementById("stat-session").textContent = minutes + "m";
}, 60000);

/* ===== RELLENAR FAVORITOS ===== */

const favoritesGrid = document.getElementById("favorites-grid");

favorites.slice(0,4).forEach(song => {
    const card = document.createElement("div");
    card.classList.add("card");

    card.innerHTML = `
        <div class="card-cover"></div>
        <div class="card-title">${song.titulo}</div>
        <div class="card-sub">Favorita</div>
    `;

    favoritesGrid.appendChild(card);
});

/* ===== CONTINUAR ESCUCHANDO (MOCK FUTURO BACKEND) ===== */

const continueGrid = document.getElementById("continue-grid");

if (playlist.length > 0) {
    playlist.slice(0,4).forEach(song => {
        const card = document.createElement("div");
        card.classList.add("card");

        card.innerHTML = `
            <div class="card-cover"></div>
            <div class="card-title">${song.titulo}</div>
            <div class="card-sub">En playlist</div>
        `;

        continueGrid.appendChild(card);
    });
}

/* ===== BOTÓN EXPLORAR ===== */

document.getElementById("explore-btn").addEventListener("click", () => {
    alert("Próximamente: Tendencias globales con IA 🎵");
});
