let isOn = false;

function toggleLamp() {
    isOn = !isOn;
    // Aplicamos el cambio al body para que el CSS haga la magia del reveal
    document.body.setAttribute('data-on', isOn);
}

document.addEventListener("DOMContentLoaded", () => {
    // Escuchamos el cordel
    const pullCord = document.querySelector('.pull-cord');
    if (pullCord) {
        pullCord.addEventListener('click', toggleLamp);
    }

    // Lógica de Login (Fetch)
    const loginButton = document.getElementById("login-button");
    if (loginButton) {
        loginButton.addEventListener("click", () => {
            const usuario = document.getElementById("login-username").value.trim();
            const contrasena = document.getElementById("login-password").value.trim();
            const mensaje = document.getElementById("login-message");

            fetch("/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nombre_usuario: usuario, contrasena: contrasena })
            })
            .then(async res => {
                const data = await res.json();
                if (!res.ok) throw new Error(data.detail || "Error");
                window.location.href = data.redirect || "/menu";
            })
            .catch(err => {
                mensaje.textContent = err.message;
                mensaje.style.color = "#ff4444";
            });
        });
    }
});