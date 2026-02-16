from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    nombre_usuario = Column(String, unique=True, index=True, nullable=False)
    contrasena = Column(String, nullable=False)

    # Relación: Un usuario puede tener muchas canciones
    # El backref crea automáticamente una propiedad .usuario en cada canción
    canciones = relationship("Cancion", back_populates="propietario")


class Cancion(Base):
    __tablename__ = "canciones"

    id = Column(Integer, primary_key=True, index=True)
    titulo = Column(String, nullable=False)
    url_archivo = Column(String, nullable=False)  # Aquí guardaremos la URL de Supabase

    # El "vínculo" clave: guardamos el ID del usuario que la subió
    usuario_id = Column(Integer, ForeignKey("usuarios.id"))

    # Relación inversa para saber quién es el dueño de la canción
    propietario = relationship("Usuario", back_populates="canciones")