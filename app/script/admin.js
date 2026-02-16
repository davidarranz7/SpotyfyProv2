// Función para mostrar/ocultar contraseña
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

// Función para eliminar usuario
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