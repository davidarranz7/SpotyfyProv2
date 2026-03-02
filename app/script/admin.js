// ================================
// MOSTRAR / OCULTAR CONTRASEÑA
// ================================
function togglePassword(btn) {
    const input = btn.parentElement.querySelector('.pass-input');
    const icon = btn.querySelector('i');

    if (input.type === "password") {
        input.type = "text";
        icon.classList.replace('fa-eye', 'fa-eye-slash');
    } else {
        input.type = "password";
        icon.classList.replace('fa-eye-slash', 'fa-eye');
    }
}


// ================================
// ELIMINAR USUARIO
// ================================
async function eliminarUsuario(id, nombre) {
    if (!confirm(`¿Estás seguro de que quieres eliminar a ${nombre}? Esta acción no se puede deshacer.`)) {
        return;
    }

    try {
        const response = await fetch(`/api/usuarios/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            document.getElementById(`row-${id}`).remove();
            alert("Usuario eliminado correctamente");
        } else {
            alert("Error al eliminar el usuario");
        }
    } catch (error) {
        console.error("Error:", error);
    }
}


// ================================
// VER CANCIONES DE USUARIO
// ================================
async function verCanciones(usuarioId, nombreUsuario) {
    try {
        const response = await fetch(`/api/usuarios/${usuarioId}/canciones`);
        if (!response.ok) {
            alert("Error al cargar canciones");
            return;
        }

        const canciones = await response.json();

        // Eliminar contenedor anterior si existe
        const existente = document.getElementById(`songs-${usuarioId}`);
        if (existente) {
            existente.remove();
            return;
        }

        const filaUsuario = document.getElementById(`row-${usuarioId}`);

        const nuevaFila = document.createElement("tr");
        nuevaFila.id = `songs-${usuarioId}`;

        const celda = document.createElement("td");
        celda.colSpan = 4;

        let html = `<div class="song-container">
                        <h3>Canciones de ${nombreUsuario}</h3>`;

        if (canciones.length === 0) {
            html += `<p>No tiene canciones.</p>`;
        } else {
            html += `<ul class="song-list">`;
            canciones.forEach(c => {
                html += `
                    <li id="song-${c.id}">
                        <span>${c.titulo}</span>
                        <button class="btn-delete-song"
                            onclick="eliminarCancion(${c.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </li>
                `;
            });
            html += `</ul>`;
        }

        html += `</div>`;

        celda.innerHTML = html;
        nuevaFila.appendChild(celda);

        filaUsuario.after(nuevaFila);

    } catch (error) {
        console.error("Error:", error);
    }
}


// ================================
// ELIMINAR CANCIÓN
// ================================
async function eliminarCancion(cancionId) {
    if (!confirm("¿Eliminar esta canción?")) return;

    try {
        const response = await fetch(`/api/canciones/${cancionId}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            const elemento = document.getElementById(`song-${cancionId}`);
            if (elemento) elemento.remove();
        } else {
            alert("Error al eliminar la canción");
        }
    } catch (error) {
        console.error("Error:", error);
    }
}