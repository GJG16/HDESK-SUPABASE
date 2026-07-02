# Modelado de Comportamiento (UML)

Para complementar el diagrama de clases, aquí se presentan los diagramas de comportamiento del sistema Helpdesk, ilustrando cómo interactúan los objetos a lo largo del tiempo.

---

## 1. Diagrama de Estados (State Machine) — Ciclo de Vida del Ticket

Este diagrama muestra los estados por los que pasa un objeto `Ticket` desde su creación hasta su cierre, y los eventos que desencadenan las transiciones.

```mermaid
stateDiagram-v2
    [*] --> Pendiente : Operador crea Ticket
    
    Pendiente --> EnProceso : Especialista toma el Ticket
    Pendiente --> Resuelto : Solucionado inmediatamente (First Contact Resolution)
    
    state EnProceso {
        [*] --> Investigando
        Investigando --> EsperandoUsuario : Falta información
        EsperandoUsuario --> Investigando : Usuario responde
        Investigando --> Escalado : Requiere otro nivel/área
        Escalado --> Investigando : Retoma el control
    }
    
    EnProceso --> Resuelto : Especialista marca como solucionado
    Resuelto --> EnProceso : Usuario rechaza solución / Reabre ticket
    Resuelto --> Cerrado : Pasan 48h sin objeciones
    
    Cerrado --> [*]

    note right of Pendiente
      El SLA de respuesta 
      comienza aquí
    end note
    
    note right of Resuelto
      CSAT (Encuesta de Satisfacción)
      se habilita en este estado
    end note
```

---

## 2. Diagrama de Secuencia — Flujo de Triaje Inteligente

Muestra la interacción de los objetos en la capa de Presentación, Servicio y Datos cuando un Operador crea un nuevo Ticket y el sistema realiza la asignación automática.

```mermaid
sequenceDiagram
    autonumber
    actor Operador
    participant TicketsRouter as :TicketsRouter
    participant TicketService as :TicketService
    participant AreaTecnica as :AreaTecnica (DB)
    participant Ticket as :Ticket (Entity)
    participant ConnectionManager as :ConnectionManager
    
    Operador->>TicketsRouter: POST /tickets/triaje (TicketCreate)
    activate TicketsRouter
    
    TicketsRouter->>TicketService: motor_de_triaje(descripcion, db)
    activate TicketService
    
    TicketService->>AreaTecnica: Consultar palabras clave
    activate AreaTecnica
    AreaTecnica-->>TicketService: Lista de palabras clave por área
    deactivate AreaTecnica
    
    note over TicketService: Calcula coincidencias de<br/>palabras clave en descripción
    
    alt Hay coincidencias claras
        TicketService-->>TicketsRouter: id_area recomendada
    else No hay coincidencias claras
        TicketService-->>TicketsRouter: id_area = Soporte General (Default)
    end
    deactivate TicketService
    
    TicketsRouter->>Ticket: new Ticket(id_area, estado='Pendiente'...)
    activate Ticket
    Ticket-->>TicketsRouter: Instancia del Ticket
    deactivate Ticket
    
    TicketsRouter->>Ticket: db.add(ticket) / db.commit()
    
    TicketsRouter->>ConnectionManager: notificar_nuevo_ticket(ticket)
    activate ConnectionManager
    ConnectionManager-->>ConnectionManager: Emitir evento WebSocket a Especialistas
    deactivate ConnectionManager
    
    TicketsRouter-->>Operador: 201 Created (TicketResponse)
    deactivate TicketsRouter
```

---

## 3. Diagrama de Secuencia — Resolución y Notificación (WebSockets)

Describe el flujo cuando un Técnico resuelve un ticket, incluyendo la actualización del historial y las notificaciones en tiempo real a los clientes conectados.

```mermaid
sequenceDiagram
    autonumber
    actor Tecnico
    participant TicketsRouter as :TicketsRouter
    participant TicketService as :TicketService
    participant Database as :Database
    participant ConnectionManager as :ConnectionManager
    actor UsuarioFinal
    
    Tecnico->>TicketsRouter: PATCH /tickets/{id} (estado='Resuelto')
    activate TicketsRouter
    
    TicketsRouter->>Database: get_ticket(id)
    Database-->>TicketsRouter: Ticket
    
    TicketsRouter->>TicketsRouter: ticket.estado = 'Resuelto'
    TicketsRouter->>TicketsRouter: ticket.fecha_resolucion = datetime.now()
    
    TicketsRouter->>TicketService: registrar_historial_ticket(...)
    activate TicketService
    TicketService->>Database: INSERT tb_historial_tickets
    TicketService-->>TicketsRouter: Historial registrado
    deactivate TicketService
    
    TicketsRouter->>TicketService: registrar_auditoria(...)
    activate TicketService
    TicketService->>Database: INSERT auditoria
    TicketService-->>TicketsRouter: Auditoría registrada
    deactivate TicketService
    
    TicketsRouter->>Database: db.commit()
    
    TicketsRouter->>ConnectionManager: send_message_to_ticket(id, "Ticket Resuelto")
    activate ConnectionManager
    ConnectionManager--)UsuarioFinal: [WebSocket] Notificación: "Su ticket fue resuelto"
    deactivate ConnectionManager
    
    TicketsRouter-->>Tecnico: 200 OK (TicketResponse)
    deactivate TicketsRouter
```
