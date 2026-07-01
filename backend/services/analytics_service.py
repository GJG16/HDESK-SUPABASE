import statistics
from typing import Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, case

import models

def generar_mapa_calor_departamentos(db: Session) -> Dict[str, Any]:
    """Genera el mapa de calor agrupando por departamentos usando SQL puro."""
    # Query agrupada por nombre de departamento
    resultados = db.query(
        models.DepartamentoNegocio.nombre.label('departamento'),
        func.count(models.Ticket.id).label('cantidad'),
        func.sum(
            case(
                (models.Ticket.criticidad.in_(['Alta', 'Critica']), 1),
                else_=0
            )
        ).label('criticos')
    ).select_from(models.Ticket).outerjoin(
        models.DepartamentoNegocio, 
        models.Ticket.id_departamento_origen == models.DepartamentoNegocio.id
    ).filter(
        models.Ticket.estado.in_(["Pendiente", "En Proceso"])
    ).group_by(
        models.DepartamentoNegocio.nombre
    ).order_by(
        func.count(models.Ticket.id).desc()
    ).all()

    if not resultados:
        return {"mensaje": "No hay tickets activos", "datos": [], "total": 0}

    total = sum(r.cantidad for r in resultados)
    datos = []
    
    for r in resultados:
        depto_nombre = r.departamento if r.departamento else "Sin Departamento"
        porcentaje = round((r.cantidad / total) * 100, 1) if total > 0 else 0.0
        datos.append({
            "departamento": depto_nombre,
            "cantidad": int(r.cantidad),
            "criticos": int(r.criticos) if r.criticos else 0,
            "porcentaje": float(porcentaje)
        })

    return {"datos": datos, "total": total}


def generar_forecasting_picos(db: Session) -> Dict[str, Any]:
    """Forecasting histórico de picos utilizando extracciones de fecha SQL."""
    # Extract DOW (0-6 donde 0 es Domingo, o 1-7 dependiendo de SQLite/Postgres)
    # y la hora del día.
    
    # Extraer directamente la fecha y hora a Python para evitar incompatibilidades 
    # entre dialectos SQLite (desarrollo) y Postgres (producción) con funciones DOW específicas.
    # Solo traemos los campos estrictamente necesarios, por lo que es ultra ligero (O(N) CPU, poca RAM).
    tickets = db.query(models.Ticket.fecha_creacion).all()
    
    if not tickets:
        return {"horas_pico_historicas": []}
        
    conteo_picos = {}
    
    for t in tickets:
        if not t.fecha_creacion:
            continue
        dia_semana = t.fecha_creacion.strftime('%A')
        hora = t.fecha_creacion.hour
        llave = (dia_semana, hora)
        conteo_picos[llave] = conteo_picos.get(llave, 0) + 1
        
    # Ordenar y obtener el top 5
    picos_ordenados = sorted(conteo_picos.items(), key=lambda x: x[1], reverse=True)[:5]
    
    datos = [
        {
            "dia_semana": llave[0],
            "hora": llave[1],
            "volumen_tickets": volumen
        }
        for llave, volumen in picos_ordenados
    ]

    return {"horas_pico_historicas": datos}


def generar_reporte_rendimiento(db: Session) -> Dict[str, Any]:
    """Genera reporte de rendimiento (tiempos de resolución) con estadísticas base."""
    # 1. Agrupación por Área (SQL)
    areas_res = db.query(
        models.Ticket.id_area,
        func.avg(models.Ticket.tiempo_resolucion_horas).label('promedio')
    ).filter(
        models.Ticket.estado == "Resuelto",
        models.Ticket.tiempo_resolucion_horas.isnot(None),
        models.Ticket.tiempo_resolucion_horas > 0
    ).group_by(models.Ticket.id_area).all()

    metricas_por_area = [
        {
            "id_area": r.id_area, 
            "tiempo_resolucion_horas": float(r.promedio) if r.promedio else None
        } 
        for r in areas_res
    ]

    # 2. Métricas Globales (Python list para stddev/median compatibles 100% con DBs locales y cloud)
    tiempos = db.query(models.Ticket.tiempo_resolucion_horas).filter(
        models.Ticket.estado == "Resuelto",
        models.Ticket.tiempo_resolucion_horas.isnot(None),
        models.Ticket.tiempo_resolucion_horas > 0
    ).all()

    tiempos_list = [float(t[0]) for t in tiempos if t[0] is not None]

    if not tiempos_list:
        return {"mensaje": "No hay suficientes datos de tickets resueltos para calcular métricas."}

    total_resueltos = db.query(func.count(models.Ticket.id)).filter(models.Ticket.estado == "Resuelto").scalar()

    metricas_globales = {
        "promedio_global_horas": round(statistics.mean(tiempos_list), 2),
        "mediana_horas": round(statistics.median(tiempos_list), 2),
        "desviacion_estandar": round(statistics.stdev(tiempos_list) if len(tiempos_list) > 1 else 0.0, 2),
        "total_resueltos": total_resueltos,
    }

    return {
        "metricas_por_area": metricas_por_area,
        "metricas_globales": metricas_globales
    }


def generar_reporte_dashboard(db: Session) -> Dict[str, Any]:
    """Genera conteos base para el Dashboard utilizando agregaciones SQL ultrarrápidas."""
    total_tickets = db.query(func.count(models.Ticket.id)).scalar()

    if total_tickets == 0:
        return {"total_tickets": 0, "por_estado": {}, "por_criticidad": {}, "por_area": {}}

    estados = db.query(
        models.Ticket.estado, 
        func.count(models.Ticket.id)
    ).group_by(models.Ticket.estado).all()
    
    criticidades = db.query(
        models.Ticket.criticidad, 
        func.count(models.Ticket.id)
    ).group_by(models.Ticket.criticidad).all()

    areas = db.query(
        models.AreaTecnica.nombre_area,
        func.count(models.Ticket.id)
    ).select_from(models.Ticket).outerjoin(
        models.AreaTecnica, models.Ticket.id_area == models.AreaTecnica.id
    ).group_by(models.AreaTecnica.nombre_area).all()

    por_estado = {e[0]: e[1] for e in estados if e[0]}
    por_criticidad = {c[0]: c[1] for c in criticidades if c[0]}
    por_area = {(a[0] if a[0] else "Sin Área"): a[1] for a in areas}

    return {
        "total_tickets": total_tickets,
        "por_estado": por_estado,
        "por_criticidad": por_criticidad,
        "por_area": por_area
    }
