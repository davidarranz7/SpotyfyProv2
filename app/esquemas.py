from pydantic import BaseModel


class RegistroUsuario(BaseModel):
    nombre_usuario: str
    contrasena: str


class LoginUsuario(BaseModel):
    nombre_usuario: str
    contrasena: str

class URLMusica(BaseModel):
    url: str