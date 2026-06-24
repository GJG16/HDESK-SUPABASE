import os
import sys

# Agregar el directorio raíz del backend al sys.path para que los módulos
# de nivel superior (models, database) sean importables desde sub-paquetes.
_backend_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if _backend_root not in sys.path:
    sys.path.insert(0, _backend_root)
