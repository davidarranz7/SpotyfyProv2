document.getElementById('form-subir').addEventListener('submit', async (e) => {
    e.preventDefault();

    const urlInput = document.getElementById('url-yt').value;
    const btnSubmit = document.getElementById('btn-submit');
    const loadingArea = document.getElementById('loading-area');
    const mensajeExito = document.getElementById('mensaje-exito');

    // 1. Mostrar estado de carga y bloquear botón
    btnSubmit.disabled = true;
    btnSubmit.style.opacity = "0.5";
    loadingArea.classList.remove('hidden');
    mensajeExito.classList.add('hidden');

    try {
        // 2. Enviar la URL al servidor
        // Nota: Esta es la ruta que crearemos luego en FastAPI
        const response = await fetch('/procesar-musica', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url: urlInput })
        });

        const data = await response.json();

        if (response.ok) {
            // 3. Éxito: Mostrar mensaje y redirigir
            loadingArea.classList.add('hidden');
            mensajeExito.classList.remove('hidden');

            setTimeout(() => {
                window.location.href = '/musica';
            }, 2000);
        } else {
            // 4. Error: Avisar al usuario
            alert("Error: " + (data.detail || "No se pudo procesar la canción"));
            resetForm(btnSubmit, loadingArea);
        }

    } catch (error) {
        console.error("Error en la petición:", error);
        alert("Hubo un fallo al conectar con el servidor.");
        resetForm(btnSubmit, loadingArea);
    }
});

function resetForm(btn, loading) {
    btn.disabled = false;
    btn.style.opacity = "1";
    loading.classList.add('hidden');
}