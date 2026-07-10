"""
Servicio de lectura real desde InfluxDB Cloud.
Consulta el punto más reciente de la measurement 'lectura_sensores'.

Estrategia de velocidad:
  - Query RÁPIDA  (-2m):  escanea solo 2 min de datos → respuesta ~1-2 s
  - Query LENTA   (-24h): fallback si el simulador lleva rato parado → ~5-8 s
  - Caché en memoria: si ambas queries fallan, devuelve el último dato exitoso
  - Sin reintentos con sleep: el caché ya protege contra errores transitorios
"""

from influxdb_client import InfluxDBClient
import os
from dotenv import load_dotenv

# Cargar `.env` en desarrollo/local
load_dotenv()

# ─── Credenciales (obtenidas desde variables de entorno) ─────────────
INFLUX_URL    = os.getenv("INFLUX_URL")
INFLUX_TOKEN  = os.getenv("INFLUX_TOKEN")
INFLUX_ORG    = os.getenv("INFLUX_ORG")
INFLUX_BUCKET = os.getenv("INFLUX_BUCKET")

# ─── Cliente reutilizable ────────────────────────────────────────────
_client    = InfluxDBClient(url=INFLUX_URL, token=INFLUX_TOKEN, org=INFLUX_ORG)
_query_api = _client.query_api()

# ─── Mapeo InfluxDB → nombres internos ──────────────────────────────
CAMPO_MAP = {
    "calidad_aire_cruda":       "co2",
    "humedad_ambiente":       "humedad_ambiental",
    "humedad_suelo_cruda": "humedad_suelo",
    "luz_cruda":           "luz",
    "temperatura":   "temperatura",
}

REQUERIDOS = {"temperatura", "humedad_ambiental", "luz", "humedad_suelo", "co2"}

# ─── Caché en memoria ────────────────────────────────────────────────
_cache: dict = {}

# ─── Plantilla de query Flux ─────────────────────────────────────────
_FLUX_TEMPLATE = """
from(bucket: "{bucket}")
  |> range(start: {ventana})
  |> filter(fn: (r) => r["_measurement"] == "monitoreo_invernadero")
  |> filter(fn: (r) => r["_field"] == "calidad_aire_cruda"
                    or r["_field"] == "humedad_ambiente"
                    or r["_field"] == "humedad_suelo_cruda"
                    or r["_field"] == "luz_cruda"
                    or r["_field"] == "temperatura")
  |> last()
"""

# Primero -2m (rápido ~1-2s), luego -24h como fallback (lento, solo si simulador parado)
_VENTANAS = ["-2m", "-5m"]


def _query_ventana(ventana: str) -> dict:
    """Ejecuta la query con la ventana indicada. Lanza excepción si falla."""
    flux = _FLUX_TEMPLATE.format(bucket=INFLUX_BUCKET, ventana=ventana)
    tablas = _query_api.query(flux)
    resultado: dict[str, float] = {}
    for tabla in tablas:
        for fila in tabla.records:
            nombre_local = CAMPO_MAP.get(fila.get_field())
            if nombre_local and fila.get_value() is not None:
                resultado[nombre_local] = round(float(fila.get_value()), 2)
    return resultado


def obtener_ultimo_dato() -> dict:
    """
    Devuelve la lectura más reciente de InfluxDB.

    Flujo:
      1. Query rápida -2m  → si tiene los 5 campos, retorna y actualiza caché.
      2. Query lenta  -24h → si el simulador lleva rato parado (datos > 2 min).
      3. Caché              → si ambas queries fallan (error de red transitorio).
      4. RuntimeError 503  → solo si nunca hubo dato exitoso (primera vez sin datos).
    """
    global _cache

    for ventana in _VENTANAS:
        try:
            resultado = _query_ventana(ventana)
            if REQUERIDOS.issubset(resultado.keys()):
                _cache = resultado   # guardar dato fresco en caché
                return resultado
            # Si vino vacío (sin datos en esa ventana), prueba la siguiente
        except Exception as e:
            print(f"[InfluxDB] Fallo query {ventana}: {e}. Probando siguiente ventana o caché...")

    # ── Fallback: caché ──────────────────────────────────────────────
    if _cache:
        print("[InfluxDB] Usando caché (ambas queries fallaron).")
        return _cache

    raise RuntimeError(
        "Sin datos en InfluxDB y sin caché. "
        "Inicia el simulador con: node simulador.js"
    )
def obtener_historial(ventana="-1h") -> list:
    """
    Obtiene el historial de datos agrupados por minuto para generar las gráficas.
    """
    # ⚠️ OJO: Usa el measurement actual que te esté funcionando (ej. "sensores_v3" o "lectura_sensores")
    flux = f"""
    from(bucket: "{INFLUX_BUCKET}")
      |> range(start: {ventana})
      |> filter(fn: (r) => r["_measurement"] == "monitoreo_invernadero") 
      |> filter(fn: (r) => r["_field"] == "calidad_aire_cruda"
                        or r["_field"] == "humedad_ambiente"
                        or r["_field"] == "humedad_suelo_cruda"
                        or r["_field"] == "luz_cruda"
                        or r["_field"] == "temperatura")
      |> aggregateWindow(every: 1m, fn: mean, createEmpty: false)
      |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
    """
    try:
        tablas = _query_api.query(flux)
        historial = []
        for tabla in tablas:
            for fila in tabla.records:
                dt = fila.get_time()
                # Formato de hora simple ej. "14:30"
                hora_str = dt.astimezone().strftime("%H:%M") if dt else ""
                
                punto = {"hora": hora_str}
                # Mapeamos a los nombres exactos que espera el frontend
                if "temperatura" in fila.values and fila.values["temperatura"] is not None:
                    punto["temperatura"] = round(fila.values["temperatura"], 2)
                if "humedad" in fila.values and fila.values["humedad"] is not None:
                    punto["humedad_ambiental"] = round(fila.values["humedad"], 2)
                if "humedad_suelo" in fila.values and fila.values["humedad_suelo"] is not None:
                    punto["humedad_suelo"] = round(fila.values["humedad_suelo"], 2)
                if "luz" in fila.values and fila.values["luz"] is not None:
                    punto["luz"] = round(fila.values["luz"], 2)
                if "co2_ppm" in fila.values and fila.values["co2_ppm"] is not None:
                    punto["co2"] = round(fila.values["co2_ppm"], 2)
                
                if len(punto) > 1: # Si tiene datos además de la hora
                    historial.append(punto)
        return historial
    except Exception as e:
        print(f"Error consultando historial: {e}")
        return []