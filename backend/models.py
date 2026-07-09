from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from datetime import datetime, timezone

from database import Base


class ConfiguracionRango(Base):
    """
    Tabla de configuración de rangos por sensor.
    Almacena los umbrales mínimo y máximo aceptables para cada sensor.
    """
    __tablename__ = "configuracion_rangos"

    id = Column(Integer, primary_key=True, index=True)
    sensor_nombre = Column(String(50), unique=True, index=True, nullable=False)
    umbral_minimo = Column(Float, nullable=True)   # None = sin límite inferior
    umbral_maximo = Column(Float, nullable=True)   # None = sin límite superior
    actualizado_en = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class HistorialAlerta(Base):
    """
    Tabla de historial de alertas generadas por el sistema de validación.
    Incluye alertas individuales por sensor y la condición compuesta de Estrés Hídrico.
    """
    __tablename__ = "historial_alertas"

    id = Column(Integer, primary_key=True, index=True)
    tipo_alerta = Column(String(80), nullable=False)   # Ej: "ESTRES_HIDRICO", "TEMPERATURA_ALTO"
    descripcion = Column(Text, nullable=False)          # Mensaje legible
    valor_sensor = Column(Text, nullable=False)         # JSON con los valores que causaron la alerta
    severidad = Column(String(20), nullable=False)      # "WARNING" | "CRITICAL"
    creado_en = Column(DateTime, default=lambda: datetime.now(timezone.utc))
