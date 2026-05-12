from .status import router as status_router
from .auth import router as auth_router
from .usuarios import router as usuarios_router
from .tickets import router as tickets_router

__all__ = ["status_router", "auth_router", "usuarios_router", "tickets_router"]
