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

VALOR_MAX_ADC = {
    "humedad_suelo": 4095,
    "luz": 1023
}

def aplicar_correcciones(nombre_local: str, valor_crudo: float) -> float:
    """Aplica la inversión matemática de los sensores y los topes lógicos"""
    valor = float(valor_crudo)
    
    if nombre_local in VALOR_MAX_ADC:
        # Aquí invertimos: Mayor valor crudo (ej. 4095) = Menos humedad (0)
        valor = VALOR_MAX_ADC[nombre_local] - valor
        valor = max(0.0, valor) # Evitar errores de voltaje negativo
        
    if nombre_local == "co2":
        # Asegurar que el CO2 siempre esté entre 10 y 1000 ppm
        valor = max(10.0, min(1000.0, valor))
        
    return round(valor, 2)

# Construimos la consulta automáticamente
_campos_flux = ' or '.join([f'r["_field"] == "{c}"' for c in CAMPO_MAP.keys()])

# ¡Filtro "_measurement" eliminado! Ahora busca en todo el bucket "invernadero"
_FLUX_TEMPLATE = f"""
from(bucket: "{{bucket}}")
  |> range(start: {{ventana}})
  |> filter(fn: (r) => {_campos_flux})
  |> last()
"""

_VENTANAS = ["-2m", "-5m", "-15m"]

def _query_ventana(ventana: str) -> dict:
    flux = _FLUX_TEMPLATE.format(bucket=INFLUX_BUCKET, ventana=ventana)
    tablas = _query_api.query(flux)
    resultado = {}
    for tabla in tablas:
        for fila in tabla.records:
            nombre_local = CAMPO_MAP.get(fila.get_field())
            if nombre_local and fila.get_value() is not None:
                resultado[nombre_local] = aplicar_correcciones(nombre_local, fila.get_value())
    return resultado

def obtener_ultimo_dato() -> dict:
    global _cache
    for ventana in _VENTANAS:
        try:
            resultado = _query_ventana(ventana)
            if resultado: 
                # Actualiza SOLO los sensores que están enviando datos.
                # Los desconectados conservarán su valor de la caché.
                _cache.update(resultado)
                return _cache
        except Exception as e:
            print(f"[InfluxDB] Fallo query {ventana}: {e}")
            
    # Si todo falla, devuelve los datos por defecto para que la web no se caiga
    return _cache

def obtener_historial(ventana="-1h") -> list:
    flux = f"""
    from(bucket: "{INFLUX_BUCKET}")
      |> range(start: {ventana})
      |> filter(fn: (r) => {_campos_flux})
      |> aggregateWindow(every: 1m, fn: mean, createEmpty: false)
      |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
    """
    try:
        tablas = _query_api.query(flux)
        historial = []
        for tabla in tablas:
            for fila in tabla.records:
                dt = fila.get_time()
                hora_str = dt.astimezone().strftime("%H:%M") if dt else ""
                punto = {"hora": hora_str}
                
                for campo_db, nombre_local in CAMPO_MAP.items():
                    if campo_db in fila.values and fila.values[campo_db] is not None:
                        val_crudo = fila.values[campo_db]
                        punto[nombre_local] = aplicar_correcciones(nombre_local, val_crudo)
                        
                if len(punto) > 1:
                    historial.append(punto)
        return historial
    except Exception as e:
        print(f"Error consultando historial: {e}")
        return []