from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, List

router = APIRouter(prefix="/ws", tags=["WebSockets"])

class ConnectionManager:
    def __init__(self):
        # Mapea ticket_id a una lista de WebSockets
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, ticket_id: int):
        await websocket.accept()
        if ticket_id not in self.active_connections:
            self.active_connections[ticket_id] = []
        self.active_connections[ticket_id].append(websocket)
        print(f"WS Client connected to ticket {ticket_id}")

    def disconnect(self, websocket: WebSocket, ticket_id: int):
        if ticket_id in self.active_connections:
            if websocket in self.active_connections[ticket_id]:
                self.active_connections[ticket_id].remove(websocket)
            if not self.active_connections[ticket_id]:
                del self.active_connections[ticket_id]
        print(f"WS Client disconnected from ticket {ticket_id}")

    async def send_message_to_ticket(self, ticket_id: int, message: dict):
        if ticket_id in self.active_connections:
            for connection in self.active_connections[ticket_id]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    print(f"Error sending ws message: {e}")

manager = ConnectionManager()

@router.websocket("/ticket/{ticket_id}")
async def websocket_endpoint(websocket: WebSocket, ticket_id: int):
    await manager.connect(websocket, ticket_id)
    try:
        while True:
            # En Helpdesk, normalmente el frontend no envía WS de vuelta,
            # pero mantenemos el loop para detectar desconexiones.
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, ticket_id)
