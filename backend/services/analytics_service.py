import pandas as pd
import numpy as np
from sqlalchemy.orm import Session
from typing import Dict, Any

import models

def generar_mapa_calor_departamentos(db: Session) -> Dict[str, Any]:
    tickets_activos = db.query(models.Ticket).filter(
        models.Ticket.estado.in_(["Pendiente", "En Proceso"])
    ).all()

    if not tickets_activos:
        return {"mensaje": "No hay tickets activos", "datos": [], "total": 0}

    data = [{
        "id": t.id,
        "titulo": t.titulo,
        "estado": t.estado,
        "criticidad": t.criticidad,
        "id_departamento_origen": t.id_departamento_origen,
        "fecha_creacion": t.fecha_creacion,
    } for t in tickets_activos]

    df = pd.DataFrame(data)
    departamentos = db.query(models.DepartamentoNegocio).all()
    depto_map = {d.id: d.nombre for d in departamentos}
    df["departamento"] = df["id_departamento_origen"].map(depto_map).fillna("Sin Departamento")

    resumen = (
        df.groupby("departamento")
        .agg(
            cantidad=("id", "count"),
            criticos=("criticidad", lambda x: (x.isin(["Alta", "Critica"])).sum()),
        )
        .reset_index()
        .sort_values("cantidad", ascending=False)
    )

    total = int(resumen["cantidad"].sum())
    resumen["porcentaje"] = np.round((resumen["cantidad"] / total) * 100, 1)

    resumen_limpio = resumen.replace({np.nan: 0}).to_dict(orient="records")
    for item in resumen_limpio:
        item["cantidad"] = int(item["cantidad"])
        item["criticos"] = int(item["criticos"])
        item["porcentaje"] = float(item["porcentaje"])

    return {"datos": resumen_limpio, "total": total}

def generar_forecasting_picos(db: Session) -> Dict[str, Any]:
    tickets = db.query(models.Ticket.fecha_creacion, models.Ticket.id).all()
    
    if not tickets:
        return {"mensaje": "Sin datos históricos suficientes."}
        
    df = pd.DataFrame(tickets, columns=["fecha", "id"])
    df['fecha'] = pd.to_datetime(df['fecha'])
    df['dia_semana'] = df['fecha'].dt.day_name()
    df['hora'] = df['fecha'].dt.hour
    
    picos = df.groupby(['dia_semana', 'hora']).count().reset_index()
    picos.rename(columns={'id': 'volumen_tickets'}, inplace=True)
    top_picos = picos.sort_values(by='volumen_tickets', ascending=False).head(5)
    
    return {"horas_pico_historicas": top_picos.to_dict(orient='records')}

def generar_reporte_rendimiento(db: Session) -> Dict[str, Any]:
    tickets_resueltos = db.query(models.Ticket).filter(models.Ticket.estado == "Resuelto").all()

    if not tickets_resueltos:
        return {"mensaje": "No hay suficientes datos de tickets resueltos para calcular métricas."}

    data = [{
        "id": t.id,
        "id_area": t.id_area,
        "tiempo_resolucion_horas": float(t.tiempo_resolucion_horas) if t.tiempo_resolucion_horas else 0.0
    } for t in tickets_resueltos]

    df = pd.DataFrame(data)
    df["tiempo_resolucion_horas"] = df["tiempo_resolucion_horas"].replace(0.0, np.nan)
    resumen = df.groupby("id_area")["tiempo_resolucion_horas"].mean().reset_index()
    resumen_limpio = resumen.replace({np.nan: None}).to_dict(orient="records")

    tiempos_validos = df["tiempo_resolucion_horas"].dropna().values
    metricas_globales = {}
    if len(tiempos_validos) > 0:
        metricas_globales = {
            "promedio_global_horas": round(float(np.mean(tiempos_validos)), 2),
            "mediana_horas": round(float(np.median(tiempos_validos)), 2),
            "desviacion_estandar": round(float(np.std(tiempos_validos)), 2),
            "total_resueltos": len(tickets_resueltos),
        }

    return {
        "metricas_por_area": resumen_limpio,
        "metricas_globales": metricas_globales
    }

def generar_reporte_dashboard(db: Session) -> Dict[str, Any]:
    todos = db.query(models.Ticket).all()
    if not todos:
        return {"total_tickets": 0, "por_estado": {}, "por_criticidad": {}}

    data = [{"estado": t.estado, "criticidad": t.criticidad} for t in todos]
    df = pd.DataFrame(data)

    conteo_estado = df["estado"].value_counts().to_dict()
    conteo_criticidad = df["criticidad"].value_counts().to_dict()

    return {
        "total_tickets": len(todos),
        "por_estado": conteo_estado,
        "por_criticidad": conteo_criticidad
    }
