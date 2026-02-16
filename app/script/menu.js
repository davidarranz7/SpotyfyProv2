const logoutBtn = document.getElementById("logout-btn");

if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
        window.location.href = "/logout";
    });
}

/* ===== MARCAR LINK ACTIVO AUTOMÁTICAMENTE ===== */

const currentPath = window.location.pathname;
const navLinks = document.querySelectorAll(".nav-link");

navLinks.forEach(link => {
    if (link.getAttribute("href") === currentPath) {
        link.style.color = "#1DB954";
        link.style.fontWeight = "600";
    }
});
