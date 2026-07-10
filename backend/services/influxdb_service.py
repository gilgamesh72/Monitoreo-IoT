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
INFLUX_URL    = os.getenv("INFLUX_URL", "https://us-east-1-1.aws.cloud2.influxdata.com")
INFLUX_TOKEN  = os.getenv("INFLUX_TOKEN", "1uAsc-b5DXuECfzVATJPifJgB4LXxqYhC73IXKSfZovPDbJ47V35I_irJLXrsVbdc7st9tsC0l1-9yNVfnafCQ==")
INFLUX_ORG    = os.getenv("INFLUX_ORG", "diana.postigo@unmsm.edu.pe")
INFLUX_BUCKET = os.getenv("INFLUX_BUCKET", "sensores_proyecto")

# ─── Cliente reutilizable ────────────────────────────────────────────
_client    = InfluxDBClient(url=INFLUX_URL, token=INFLUX_TOKEN, org=INFLUX_ORG)
_query_api = _client.query_api()

# ─── Mapeo InfluxDB → nombres internos ──────────────────────────────
CAMPO_MAP = {
    "co2_ppm":       "co2",
    "humedad":       "humedad_ambiental",
    "humedad_suelo": "humedad_suelo",
    "luz":           "luz",
    "temperatura":   "temperatura",
}

REQUERIDOS = {"temperatura", "humedad_ambiental", "luz", "humedad_suelo", "co2"}

# ─── Caché en memoria ────────────────────────────────────────────────
_cache: dict = {}

# ─── Plantilla de query Flux ─────────────────────────────────────────
_FLUX_TEMPLATE = """
from(bucket: "{bucket}")
  |> range(start: {ventana})
  |> filter(fn: (r) => r["_measurement"] == "lectura_sensores")
  |> filter(fn: (r) => r["_field"] == "co2_ppm"
                    or r["_field"] == "humedad"
                    or r["_field"] == "humedad_suelo"
                    or r["_field"] == "luz"
                    or r["_field"] == "temperatura")
  |> last()
"""

# Primero -2m (rápido ~1-2s), luego -24h como fallback (lento, solo si simulador parado)
_VENTANAS = ["-2m", "-24h"]


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
