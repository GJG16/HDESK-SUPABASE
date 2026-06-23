import models

def enriquecer_usuario(usuario: models.Usuario) -> dict:
    """Convierte un objeto Usuario SQLAlchemy a dict enriquecido."""
    return {
        "id": usuario.id,
        "nombre": usuario.nombre,
        "email": usuario.email,
        "rol": usuario.rol,
        "especialidad": usuario.especialidad,
        "extension": usuario.extension,
        "id_departamento": usuario.id_departamento,
        "id_area_tecnica": usuario.id_area_tecnica,
        "nombre_departamento": usuario.departamento.nombre if usuario.departamento else None,
        "nombre_area_tecnica": usuario.area_tecnica.nombre_area if usuario.area_tecnica else None,
        "activo": usuario.activo,
        "ultimo_acceso": usuario.ultimo_acceso,
    }
