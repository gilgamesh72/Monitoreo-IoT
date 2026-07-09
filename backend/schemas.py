from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


# ─────────────────────────────────────────────
#  Rangos de Configuración
# ─────────────────────────────────────────────

class RangoCreate(BaseModel):
    sensor_nombre: str = Field(..., example="temperatura")
    umbral_minimo: Optional[float] = Field(None, example=18.0)
    umbral_maximo: Optional[float] = Field(None, example=35.0)


class Rango(RangoCreate):
    id: int
    actualizado_en: datetime

    model_config = {"from_attributes": True}


# ─────────────────────────────────────────────
#  Historial de Alertas
# ─────────────────────────────────────────────

class AlertaBase(BaseModel):
    tipo_alerta: str
    descripcion: str
    valor_sensor: str   # JSON serializado
    severidad: str


class Alerta(AlertaBase):
    id: int
    creado_en: datetime

    model_config = {"from_attributes": True}


# ─────────────────────────────────────────────
#  Datos de Sensores IoT
# ─────────────────────────────────────────────

class DatosSensor(BaseModel):
    temperatura: float = Field(..., ge=-40, le=100, description="Temperatura ambiental en °C")
    humedad_ambiental: float = Field(..., ge=0, le=100, description="Humedad ambiental en %")
    luz: float = Field(..., ge=0, le=4095, description="Radiación solar (valor analógico 0-4095)")
    humedad_suelo: float = Field(..., ge=0, le=4095, description="Humedad suelo analógica (mayor = más seco)")


class ResultadoValidacion(BaseModel):
    estres_hidrico: bool
    alertas_individuales: list[str]
    datos: dict
    mensaje: str
