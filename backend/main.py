"""
Monitor IoT para Planta Industrial — Backend API
================================================
FastAPI + SQLite (SQLAlchemy) + InfluxDB Cloud

Endpoints:
  GET  /api/sensores/actual      → Lectura real desde InfluxDB (último punto ≤30 s)
  POST /api/sensores/validar     → Valida datos y registra alertas
  GET  /api/config/rangos        → Lista rangos configurados
  POST /api/config/rangos        → Crea o actualiza un rango
  GET  /api/alertas              → Historial de alertas (desc)
  DELETE /api/alertas/{id}       → Elimina una alerta
"""

from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import List

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

import models
import schemas
from database import engine, SessionLocal, get_db
from services.influxdb_service import obtener_ultimo_dato, obtener_historial
from services.validation import validar_todos_sensores


# ─────────────────────────────────────────────
#  Inicialización de la BD y datos por defecto
# ─────────────────────────────────────────────

RANGOS_POR_DEFECTO = [
    {"sensor_nombre": "humedad_suelo",    "umbral_minimo": None,  "umbral_maximo": 3200.0},
    {"sensor_nombre": "temperatura",      "umbral_minimo": 18.0,  "umbral_maximo": 35.0},
    {"sensor_nombre": "humedad_ambiental","umbral_minimo": 40.0,  "umbral_maximo": 80.0},
    {"sensor_nombre": "luz",              "umbral_minimo": 500.0, "umbral_maximo": 3000.0},
    {"sensor_nombre": "co2",              "umbral_minimo": None,  "umbral_maximo": 1000.0},
]


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Crea las tablas e inserta rangos por defecto si no existen."""
    models.Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        for rango in RANGOS_POR_DEFECTO:
            existe = (
                db.query(models.ConfiguracionRango)
                .filter_by(sensor_nombre=rango["sensor_nombre"])
                .first()
            )
            if not existe:
                db.add(models.ConfiguracionRango(**rango))
        db.commit()
    finally:
        db.close()

    yield  # Aplicación corriendo


# ─────────────────────────────────────────────
#  Aplicación FastAPI
# ─────────────────────────────────────────────

app = FastAPI(
    title="🏭 Monitor IoT — Planta Industrial",
    description="API REST para monitoreo de sensores IoT con detección de Estrés Hídrico.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────
#  SENSORES
# ─────────────────────────────────────────────

@app.get(
    "/api/sensores/actual",
    response_model=schemas.DatosSensor,
    tags=["Sensores"],
    summary="Obtiene la lectura actual de sensores desde InfluxDB",
)
def obtener_sensores_actual():
    """
    Consulta el punto más reciente (últimos 30 s) desde InfluxDB Cloud.
    Devuelve los valores actuales de: temperatura, humedad ambiental,
    luz analógica, humedad de suelo analógica y CO₂ (ppm).

    Responde HTTP 503 si no hay datos disponibles (simulador apagado
    o sin conectividad con InfluxDB).
    """
    try:
        return obtener_ultimo_dato()
    except RuntimeError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Error al conectar con InfluxDB: {e}",
        )
@app.get(
    "/api/sensores/historial",
    tags=["Sensores"],
    summary="Obtiene el historial de datos de la última hora"
)
def obtener_sensores_historial():
    try:
        return obtener_historial("-1h")
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))

@app.post(
    "/api/sensores/validar",
    response_model=schemas.ResultadoValidacion,
    tags=["Sensores"],
    summary="Valida datos de sensores y registra alertas",
)
def validar_sensores(datos: schemas.DatosSensor, db: Session = Depends(get_db)):
    """
    Recibe el JSON con los valores de todos los sensores,
    los compara con los rangos configurados y registra alertas
    si algún valor está fuera de rango.

    La condición de **Estrés Hídrico** (compuesta) tiene prioridad máxima.
    """
    resultado = validar_todos_sensores(datos.model_dump(), db)
    return resultado


# ─────────────────────────────────────────────
#  CONFIGURACIÓN DE RANGOS
# ─────────────────────────────────────────────

@app.get(
    "/api/config/rangos",
    response_model=List[schemas.Rango],
    tags=["Configuración"],
    summary="Lista todos los rangos configurados",
)
def obtener_rangos(db: Session = Depends(get_db)):
    """Devuelve la configuración actual de umbrales para todos los sensores."""
    return db.query(models.ConfiguracionRango).all()


@app.post(
    "/api/config/rangos",
    response_model=schemas.Rango,
    tags=["Configuración"],
    summary="Crea o actualiza el rango de un sensor",
)
def upsert_rango(rango: schemas.RangoCreate, db: Session = Depends(get_db)):
    """
    Si el sensor ya tiene rango configurado, lo actualiza.
    Si no existe, crea una nueva entrada.
    """
    existente = (
        db.query(models.ConfiguracionRango)
        .filter_by(sensor_nombre=rango.sensor_nombre)
        .first()
    )
    if existente:
        existente.umbral_minimo = rango.umbral_minimo
        existente.umbral_maximo = rango.umbral_maximo
        existente.actualizado_en = datetime.now(timezone.utc)
        db.commit()
        db.refresh(existente)
        return existente

    nuevo = models.ConfiguracionRango(**rango.model_dump())
    db.add(nuevo)
    db.commit()
    db.refresh(nuevo)
    return nuevo


# ─────────────────────────────────────────────
#  HISTORIAL DE ALERTAS
# ─────────────────────────────────────────────

@app.get(
    "/api/alertas",
    response_model=List[schemas.Alerta],
    tags=["Alertas"],
    summary="Obtiene el historial de alertas",
)
def obtener_alertas(db: Session = Depends(get_db)):
    """
    Devuelve las últimas 100 alertas ordenadas de más reciente a más antigua.
    """
    return (
        db.query(models.HistorialAlerta)
        .order_by(models.HistorialAlerta.creado_en.desc())
        .limit(100)
        .all()
    )


@app.delete(
    "/api/alertas/{alerta_id}",
    tags=["Alertas"],
    summary="Elimina una alerta del historial",
)
def eliminar_alerta(alerta_id: int, db: Session = Depends(get_db)):
    """Elimina permanentemente una alerta del historial por su ID."""
    alerta = (
        db.query(models.HistorialAlerta)
        .filter(models.HistorialAlerta.id == alerta_id)
        .first()
    )
    if not alerta:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Alerta con id={alerta_id} no encontrada.",
        )
    db.delete(alerta)
    db.commit()
    return {"mensaje": f"Alerta {alerta_id} eliminada correctamente."}


# ─────────────────────────────────────────────
#  Health check
# ─────────────────────────────────────────────

@app.get("/", tags=["Sistema"])
def root():
    return {
        "sistema": "Monitor IoT — Planta Industrial",
        "version": "1.0.0",
        "docs": "/docs",
        "estado": "operativo ✅",
    }
