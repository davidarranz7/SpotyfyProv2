from fastapi import FastAPI, Request, Depends, HTTPException, Response
from fastapi.responses import HTMLResponse, RedirectResponse, JSONResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.database import engine, SessionLocal
from app.models import Base, Usuario, Cancion
from app.esquemas import RegistroUsuario, LoginUsuario, URLMusica

import yt_dlp
import os

import os
from dotenv import load_dotenv
from supabase import create_client, Client
from fastapi import FastAPI, Request, Depends, HTTPException
from fastapi.responses import HTMLResponse

import os
from dotenv import load_dotenv
from fastapi.responses import JSONResponse

from yt_dlp import YoutubeDL


import httpx

app = FastAPI()


load_dotenv()
# Configuración de Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

Base.metadata.create_all(bind=engine)

templates = Jinja2Templates(directory="app/estatico")


app.mount("/estilos", StaticFiles(directory="app/estilos"), name="estilos")
app.mount("/script", StaticFiles(directory="app/script"), name="script")



def obtener_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def require_login(request: Request):
    usuario = request.cookies.get("usuario")
    if not usuario:
        # Redirigir al login si no hay cookie
        raise HTTPException(status_code=303, headers={"Location": "/"})
    return usuario

# PÁGINAS

@app.get("/", response_class=HTMLResponse)
def login_page(request: Request):
    return templates.TemplateResponse(
        "login.html",
        {"request": request, "mode": "login"}
    )


@app.get("/register", response_class=HTMLResponse)
def register_page(request: Request):
    return templates.TemplateResponse(
        "login.html",
        {"request": request, "mode": "register"}
    )

@app.get("/menu")
def menu_page(
    request: Request,
    usuario: str = Depends(require_login)
):
    return templates.TemplateResponse(
        "principal.html",
        {
            "request": request,
            "usuario": usuario
        }
    )


@app.get("/logout")
def logout():
    response = RedirectResponse(url="/")
    response.delete_cookie("usuario")
    return response


@app.get("/musica")
def musica_page(
        request: Request,
        db: Session = Depends(obtener_db),
        usuario_nombre: str = Depends(require_login)
):
    # A. TUS CANCIONES PREDEFINIDAS
    canciones_predefinidas = [
        {
            "titulo": "Future Remix 98",
            "url": "https://irqgevvipamnmepevgrk.supabase.co/storage/v1/object/public/MUSICA/Future%20Remix%2098.mp3"
        },
        {
            "titulo": "Muska - Sexesexy",
            "url": "https://irqgevvipamnmepevgrk.supabase.co/storage/v1/object/public/MUSICA/Muska%20badGyal-sexesexy%20.mp3"
        },
        {
            "titulo": "Spada - Waiting",
            "url": "https://irqgevvipamnmepevgrk.supabase.co/storage/v1/object/public/MUSICA/Spada%20-%20Waiting%20ft.%20Chiara%20Galiazzo%20(Official%20Visualizer).mp3"
        }
    ]

    # B. CANCIONES DEL USUARIO (de la Base de Datos)
    usuario_db = db.query(Usuario).filter(Usuario.nombre_usuario == usuario_nombre).first()
    canciones_usuario = []

    if usuario_db:
        for c in usuario_db.canciones:
            canciones_usuario.append({
                "titulo": c.titulo,
                "url": c.url_archivo
            })

    # C. UNIMOS AMBAS LISTAS
    todas_las_canciones = canciones_predefinidas + canciones_usuario

    return templates.TemplateResponse(
        "musica.html",
        {
            "request": request,
            "usuario": usuario_nombre,
            "canciones": todas_las_canciones
        }
    )

@app.get("/subir-cancion", response_class=HTMLResponse)
def subir_cancion_page(
    request: Request,
    usuario: str = Depends(require_login)
):
    return templates.TemplateResponse(
        "subirCancion.html",
        {
            "request": request,
            "usuario": usuario
        }
    )



@app.post("/registro")
def registrar_usuario(
    datos: RegistroUsuario,
    db: Session = Depends(obtener_db)
):
    nuevo_usuario = Usuario(
        nombre_usuario=datos.nombre_usuario,
        contrasena=datos.contrasena
    )

    db.add(nuevo_usuario)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=400,
            detail="El usuario ya existe"
        )

    return {"mensaje": "Usuario registrado correctamente"}


@app.post("/login")
def login_usuario(
    datos: LoginUsuario,
    db: Session = Depends(obtener_db)
):
    # 1. CARGAMOS LAS CREDENCIALES MAESTRAS
    ADMIN_MAESTRO = os.getenv("ADMIN_USER", "admin")
    PASS_MAESTRA = os.getenv("ADMIN_PASS", "admin1234")

    # 2. VERIFICAMOS SI ES EL ADMIN
    if datos.nombre_usuario == ADMIN_MAESTRO and datos.contrasena == PASS_MAESTRA:
        response = JSONResponse({"mensaje": "Login Admin correcto", "redirect": "/admin-panel"})
        response.set_cookie(
            key="usuario",
            value=ADMIN_MAESTRO,
            httponly=True,
            samesite="lax"
        )
        return response

    # 3. SI NO ES ADMIN, BUSCAMOS EN LA BASE DE DATOS (USUARIOS NORMALES)
    usuario = db.query(Usuario).filter(
        Usuario.nombre_usuario == datos.nombre_usuario,
        Usuario.contrasena == datos.contrasena
    ).first()

    if not usuario:
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")

    response = JSONResponse({"mensaje": "Login correcto", "redirect": "/menu"})
    response.set_cookie(
        key="usuario",
        value=usuario.nombre_usuario,
        httponly=True,
        samesite="lax"
    )
    return response

@app.post("/procesar-musica")
async def procesar_musica(
        datos: URLMusica,
        db: Session = Depends(obtener_db),
        usuario_actual: str = Depends(require_login)
):
    url_video = datos.url
    archivo_temp = f"temp_{usuario_actual}_{os.getpid()}"


    ydl_opts = {
        'format': 'bestaudio/best',
        'outtmpl': f'{archivo_temp}.%(ext)s',
        'postprocessors': [{'key': 'FFmpegExtractAudio', 'preferredcodec': 'mp3', 'preferredquality': '192'}],
        'http_headers': {'User-Agent': 'Mozilla/5.0...'},  # El header que pusimos antes
    }

    try:
        # A. Descarga y conversión
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url_video, download=True)
            titulo = info.get('title', 'Cancion').replace("/", "-")
            archivo_final = f"{archivo_temp}.mp3"

        # B. Subida al Storage de Supabase (Crea carpeta por usuario)
        with open(archivo_final, "rb") as f:
            ruta_destino = f"{usuario_actual}/{titulo}.mp3"
            # Importante: El bucket en Supabase debe llamarse "MUSICA"
            supabase.storage.from_("MUSICA").upload(
                path=ruta_destino,
                file=f,
                file_options={"content-type": "audio/mpeg"}
            )

        # C. Obtener URL pública y guardar en SQLite
        url_real = supabase.storage.from_("MUSICA").get_public_url(ruta_destino)

        user_db = db.query(Usuario).filter(Usuario.nombre_usuario == usuario_actual).first()
        nueva_cancion = Cancion(titulo=titulo, url_archivo=url_real, usuario_id=user_db.id)

        db.add(nueva_cancion)
        db.commit()

        # D. Borrar archivo temporal del servidor
        if os.path.exists(archivo_final): os.remove(archivo_final)

        return {"mensaje": "Éxito", "titulo": titulo}

    except Exception as e:
        if os.path.exists(f"{archivo_temp}.mp3"): os.remove(f"{archivo_temp}.mp3")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/admin-panel", response_class=HTMLResponse)
def admin_page(
        request: Request,
        db: Session = Depends(obtener_db),
        usuario_actual: str = Depends(require_login)
):
    # Solo dejamos pasar si el nombre en la cookie es el del admin maestro
    if usuario_actual != os.getenv("ADMIN_USER", "admin"):
        return RedirectResponse(url="/menu")

    # Sacamos los usuarios de la BD para mostrarlos en la tabla
    usuarios_registrados = db.query(Usuario).all()

    return templates.TemplateResponse(
        "admin.html",
        {"request": request, "usuarios": usuarios_registrados}
    )


@app.delete("/api/usuarios/{usuario_id}")
def delete_user(
        usuario_id: int,
        db: Session = Depends(obtener_db),
        usuario_actual: str = Depends(require_login)
):
    # Seguridad: Solo el admin real puede borrar
    if usuario_actual != os.getenv("ADMIN_USER", "admin"):
        raise HTTPException(status_code=403)

    user = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    db.delete(user)
    db.commit()
    return {"status": "success"}


@app.get("/buscar", response_class=HTMLResponse)
async def buscar_musica(request: Request, q: str, usuario: str = Depends(require_login)):
    """Busca en YouTube usando la API oficial para evitar bloqueos"""
    url_api = "https://www.googleapis.com/youtube/v3/search"

    # YOUTUBE_API_KEY debe estar en tu archivo .env
    params = {
        "part": "snippet",
        "q": q,
        "key": os.getenv("YOUTUBE_API_KEY"),
        "maxResults": 10,
        "type": "video"
    }

    resultados = []

    # Usamos httpx para una petición rápida y asíncrona
    async with httpx.AsyncClient() as client:
        resp = await client.get(url_api, params=params)

        if resp.status_code == 200:
            data = resp.json()
            for item in data.get("items", []):
                # CORRECCIÓN: Validamos que el item tenga 'videoId' antes de intentar acceder a él
                # Esto evita que el programa falle si YouTube devuelve canales o listas
                if "videoId" in item["id"]:
                    resultados.append({
                        "titulo": item["snippet"]["title"],
                        "url": f"https://www.youtube.com/watch?v={item['id']['videoId']}",
                        "canal": item["snippet"]["channelTitle"],
                        "thumb": item["snippet"]["thumbnails"]["medium"]["url"]
                    })
        else:
            # Imprime el error en la consola para que puedas debuguear si algo sale mal
            print(f"Error en la API de YouTube: {resp.text}")

    return templates.TemplateResponse(
        "buscador.html",
        {
            "request": request,
            "usuario": usuario,
            "query": q,
            "resultados": resultados
        }
    )


from pydantic import BaseModel
import os


# --- MODELOS DE DATOS ---

class URLMusica(BaseModel):
    url: str


class ConfirmarRuta(BaseModel):
    ruta: str


# --- ENDPOINTS ---

@app.post("/preparar-stream")
async def preparar_stream(
        datos: URLMusica,
        usuario_actual: str = Depends(require_login)
):
    print("\n==============================")
    print("🎧 NUEVO PREPARAR STREAM")
    print("Usuario:", usuario_actual)
    print("URL recibida:", datos.url)
    print("==============================")

    url_video = datos.url
    archivo_temp = f"temp_{usuario_actual}_{os.getpid()}"

    ydl_opts = {
        'format': 'bestaudio/best',
        'outtmpl': f'{archivo_temp}.%(ext)s',
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': '192'
        }],
    }

    try:
        print("⬇ Descargando con yt_dlp...")
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url_video, download=True)
            titulo = info.get("title", "cancion").replace("/", "-")
            archivo_final = f"{archivo_temp}.mp3"

        print("✅ Descarga completada:", archivo_final)

        ruta_destino = f"INTERMEDIARIO/{usuario_actual}_{titulo}.mp3"
        print("📤 Subiendo a Supabase en:", ruta_destino)

        with open(archivo_final, "rb") as f:
            supabase.storage.from_("MUSICA").upload(
                path=ruta_destino,
                file=f,
                file_options={"content-type": "audio/mpeg"}
            )

        url_publica = supabase.storage.from_("MUSICA").get_public_url(ruta_destino)

        if os.path.exists(archivo_final):
            os.remove(archivo_final)
            print("🗑 Archivo temporal eliminado")

        return {
            "url_stream": url_publica,
            "titulo": titulo,
            "ruta": ruta_destino
        }

    except Exception as e:
        print("❌ ERROR EN PREPARAR STREAM:", str(e))
        if os.path.exists(f"{archivo_temp}.mp3"):
            os.remove(f"{archivo_temp}.mp3")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/confirmar-cancion")
async def confirmar_cancion(
        datos: ConfirmarRuta,  # <--- Corregido para recibir JSON
        db: Session = Depends(obtener_db),
        usuario_actual: str = Depends(require_login)
):
    ruta = datos.ruta  # Extraemos el string del modelo

    print("\n==============================")
    print("💾 CONFIRMAR CANCIÓN")
    print("Usuario:", usuario_actual)
    print("Ruta recibida:", ruta)
    print("==============================")

    try:
        nombre_archivo = ruta.split("/")[-1]
        nueva_ruta = f"{usuario_actual}/{nombre_archivo}"

        print("📂 Moviendo archivo a:", nueva_ruta)

        # Copiar archivo en el bucket MUSICA
        supabase.storage.from_("MUSICA").copy(ruta, nueva_ruta)

        # Borrar del intermediario
        supabase.storage.from_("MUSICA").remove([ruta])

        # Obtener URL definitiva
        url_real = supabase.storage.from_("MUSICA").get_public_url(nueva_ruta)

        # Buscar usuario en DB para el ID
        user_db = db.query(Usuario).filter(Usuario.nombre_usuario == usuario_actual).first()

        nueva_cancion = Cancion(
            titulo=nombre_archivo.replace(".mp3", ""),
            url_archivo=url_real,
            usuario_id=user_db.id
        )

        db.add(nueva_cancion)
        db.commit()

        print("✅ Guardado correctamente en carpeta de usuario")
        return {"mensaje": "Canción guardada en tu biblioteca"}

    except Exception as e:
        print("❌ ERROR EN CONFIRMAR CANCIÓN:", str(e))
        raise HTTPException(status_code=500, detail=str(e))