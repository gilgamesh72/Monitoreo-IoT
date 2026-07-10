import json
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session

from models import ConfiguracionRango, HistorialAlerta


# ─────────────────────────────────────────────
#  Utilidades
# ─────────────────────────────────────────────

def obtener_rangos_dict(db: Session) -> dict:
    """
    Devuelve los rangos configurados como diccionario:
    { "temperatura": {"min": 18, "max": 35}, ... }
    """
    rangos = db.query(ConfiguracionRango).all()
    return {
        r.sensor_nombre: {
            "min": r.umbral_minimo,
            "max": r.umbral_maximo,
        }
        for r in rangos
    }


def _alerta_reciente(db: Session, tipo: str, segundos: int = 60) -> bool:
    """
    Verifica si ya existe una alerta del mismo tipo en los últimos N segundos.
    Evita inundar el historial cuando se hace polling frecuente.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(seconds=segundos)
    reciente = (
        db.query(HistorialAlerta)
        .filter(
            HistorialAlerta.tipo_alerta == tipo,
            HistorialAlerta.creado_en > cutoff,
        )
        .first()
    )
    return reciente is not None


# ─────────────────────────────────────────────
#  Detección de Estrés Hídrico (condición compuesta)
# ─────────────────────────────────────────────

def detectar_estres_hidrico(datos: dict, rangos: dict, db: Session) -> bool:
    """
    Detecta la condición de Estrés Hídrico.

    Se cumple cuando SIMULTÁNEAMENTE:
      - humedad_suelo > umbral_maximo  → suelo críticamente seco
      - temperatura   > umbral_maximo  → temperatura elevada
      - luz           > umbral_maximo  → radiación solar intensa

    Si se detecta y no existe una alerta reciente (<60 s), inserta
    un registro CRITICAL en historial_alertas.

    Returns:
        True si la condición de estrés hídrico se cumple.
    """
    suelo_max = (rangos.get("humedad_suelo") or {}).get("max") or 3200.0
    temp_max  = (rangos.get("temperatura")   or {}).get("max") or 35.0
    luz_max   = (rangos.get("luz")           or {}).get("max") or 3000.0

    suelo_muy_seco = datos["humedad_suelo"] > suelo_max
    temp_alta      = datos["temperatura"]   > temp_max
    luz_alta       = datos["luz"]           > luz_max

    if suelo_muy_seco and temp_alta and luz_alta:
        if not _alerta_reciente(db, "ESTRES_HIDRICO"):
            suelo_pct = int((4095 - datos['humedad_suelo']) / 4095 * 100)
            luz_pct   = int(datos['luz'] / 4095 * 100)
            alerta = HistorialAlerta(
                tipo_alerta="ESTRES_HIDRICO",
                descripcion=(
                    f"Suelo {suelo_pct}% húmedo · "
                    f"{datos['temperatura']}°C · "
                    f"Radiación {luz_pct}%. Activar riego."
                ),
                valor_sensor=json.dumps(datos),
                severidad="CRITICAL",
                creado_en=datetime.now(timezone.utc),
            )
            db.add(alerta)
            db.commit()
        return True

    return False


# ─────────────────────────────────────────────
#  Validación de sensores individuales
# ─────────────────────────────────────────────

def _validar_individual(nombre: str, valor: float, rango: dict, db: Session) -> bool:
    """
    Valida un único sensor contra su rango configurado.
    Registra alerta si está fuera de rango (con deduplicación de 60 s).

    Returns:
        True si el sensor está fuera de rango.
    """
    min_val = rango.get("min")
    max_val = rango.get("max")

    fuera_rango = False
    tipo = ""
    desc = ""
    severidad = "WARNING"

    NOMBRES = {
        "temperatura":       "Temperatura",
        "humedad_ambiental": "Humedad Amb.",
        "luz":               "Radiación Solar",
        "humedad_suelo":     "Humedad Suelo",
        "co2":               "Calidad de Aire (CO₂)",
    }
    nombre_legible = NOMBRES.get(nombre, nombre)

    if min_val is not None and valor < min_val:
        fuera_rango = True
        tipo = f"{nombre.upper()}_BAJO"
        if nombre == "humedad_ambiental":
            desc = f"{nombre_legible}: {valor:.1f}% — debajo del mínimo ({min_val}%)"
        elif nombre == "temperatura":
            desc = f"{nombre_legible}: {valor:.1f}°C — debajo del mínimo ({min_val}°C)"
        else:
            desc = f"{nombre_legible}: {valor:.0f} — debajo del mínimo ({min_val})"
    elif max_val is not None and valor > max_val:
        fuera_rango = True
        tipo = f"{nombre.upper()}_ALTO"
        if nombre == "humedad_ambiental":
            desc = f"{nombre_legible}: {valor:.1f}% — supera el máximo ({max_val}%)"
        elif nombre == "temperatura":
            desc = f"{nombre_legible}: {valor:.1f}°C — supera el máximo ({max_val}°C)"
        elif nombre == "humedad_suelo":
            pct = int((4095 - valor) / 4095 * 100)
            desc = f"{nombre_legible}: {pct}% humedad — suelo muy seco"
        elif nombre == "luz":
            pct = int(valor / 4095 * 100)
            desc = f"{nombre_legible}: {pct}% de radiación — supera el máximo"
        elif nombre == "co2":
            desc = f"{nombre_legible}: {valor:.0f} ppm — supera el máximo aceptable ({max_val:.0f} ppm)"
        else:
            desc = f"{nombre_legible}: {valor:.0f} — supera el máximo ({max_val})"

    if fuera_rango and not _alerta_reciente(db, tipo):
        alerta = HistorialAlerta(
            tipo_alerta=tipo,
            descripcion=desc,
            valor_sensor=json.dumps({nombre: valor}),
            severidad=severidad,
            creado_en=datetime.now(timezone.utc),
        )
        db.add(alerta)
        db.commit()

    return fuera_rango


# ─────────────────────────────────────────────
#  Orquestador principal de validación
# ─────────────────────────────────────────────

def validar_todos_sensores(datos: dict, db: Session) -> dict:
    """
    Valida el conjunto completo de datos de sensores.

    1. Primero comprueba la condición compuesta de Estrés Hídrico.
       Si se detecta, NO se crean alertas individuales para los sensores
       involucrados (para evitar duplicados en el historial).
    2. Si NO hay estrés hídrico, valida cada sensor individualmente.

    Returns:
        Diccionario con el resultado de la validación.
    """
    rangos = obtener_rangos_dict(db)

    # 1. Condición compuesta (prioridad máxima)
    estres = detectar_estres_hidrico(datos, rangos, db)

    # 2. Alertas individuales (solo si no hay estrés hídrico)
    alertas_individuales: list[str] = []
    if not estres:
        for sensor, valor in datos.items():
            rango = rangos.get(sensor, {})
            if _validar_individual(sensor, valor, rango, db):
                alertas_individuales.append(sensor)

    total_alertas = (1 if estres else 0) + len(alertas_individuales)

    return {
        "estres_hidrico": estres,
        "alertas_individuales": alertas_individuales,
        "datos": datos,
        "mensaje": (
            "⚠️ Estrés Hídrico crítico detectado."
            if estres
            else f"{total_alertas} alerta(s) registrada(s)."
            if alertas_individuales
            else "✅ Todos los sensores dentro de rango."
        ),
    }
