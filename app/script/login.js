let isOn = false;

function toggleLamp() {
  isOn = !isOn;
  document.body.setAttribute("data-on", String(isOn));
}

document.addEventListener("DOMContentLoaded", () => {
  // Cordel lámpara (táctil + ratón + teclado) SIN doble evento
  const pullCord = document.querySelector(".pull-cord");

  if (pullCord) {
    pullCord.addEventListener(
      "pointerup",
      (e) => {
        e.preventDefault();
        toggleLamp();
      },
      { passive: false }
    );

    // Accesibilidad: Enter / Space
    pullCord.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggleLamp();
      }
    });
  }

  // LOGIN
  const loginButton = document.getElementById("login-button");
  if (loginButton) {
    loginButton.addEventListener("click", () => {
      const usuario = document.getElementById("login-username").value.trim();
      const contrasena = document.getElementById("login-password").value.trim();
      const mensaje = document.getElementById("login-message");

      fetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre_usuario: usuario, contrasena: contrasena }),
      })
        .then(async (res) => {
          const data = await res.json();
          if (!res.ok) throw new Error(data.detail || "Error");
          window.location.href = data.redirect || "/menu";
        })
        .catch((err) => {
          mensaje.textContent = err.message;
          mensaje.style.color = "#ff4444";
        });
    });
  }

  // REGISTER
  const registerButton = document.getElementById("register-button");
  if (registerButton) {
    registerButton.addEventListener("click", () => {
      const usuario = document.getElementById("register-username").value.trim();
      const contrasena = document.getElementById("register-password").value.trim();
      const mensaje = document.getElementById("register-message");

      fetch("/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre_usuario: usuario, contrasena: contrasena }),
      })
        .then(async (res) => {
          const data = await res.json();
          if (!res.ok) throw new Error(data.detail || "Error");
          window.location.href = data.redirect || "/";
        })
        .catch((err) => {
          mensaje.textContent = err.message;
          mensaje.style.color = "#ff4444";
        });
    });
  }
});