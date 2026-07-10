"""
Verificador en tiempo real de InfluxDB.
Ejecutar desde la carpeta backend con: python verificar_influx.py
Presiona Ctrl+C para detener.

IMPORTANTE: consulta cada 15s para no saturar el rate limit de InfluxDB Cloud.
Si corres este script Y el backend al mismo tiempo, ambos comparten el cupo
de peticiones. Demasiadas consultas seguidas provocan errores 404 transitorios.
"""
import sys
import time
from datetime import datetime, timezone
sys.stdout.reconfigure(encoding='utf-8')

from influxdb_client import InfluxDBClient
import os
from dotenv import load_dotenv

load_dotenv()

INFLUX_URL    = os.getenv("INFLUX_URL", "https://us-east-1-1.aws.cloud2.influxdata.com")
INFLUX_TOKEN  = os.getenv("INFLUX_TOKEN", "1uAsc-b5DXuECfzVATJPifJgB4LXxqYhC73IXKSfZovPDbJ47V35I_irJLXrsVbdc7st9tsC0l1-9yNVfnafCQ==")
INFLUX_ORG    = os.getenv("INFLUX_ORG", "diana.postigo@unmsm.edu.pe")
INFLUX_BUCKET = os.getenv("INFLUX_BUCKET", "sensores_proyecto")

INTERVALO_S = 15  # cada 15s — evita saturar el rate limit

client    = InfluxDBClient(url=INFLUX_URL, token=INFLUX_TOKEN, org=INFLUX_ORG)
query_api = client.query_api()

FLUX = f"""
from(bucket: "{INFLUX_BUCKET}")
  |> range(start: -24h)
  |> filter(fn: (r) => r["_measurement"] == "lectura_sensores")
  |> filter(fn: (r) => r["_field"] == "co2_ppm"
                    or r["_field"] == "humedad"
                    or r["_field"] == "humedad_suelo"
                    or r["_field"] == "luz"
                    or r["_field"] == "temperatura")
  |> last()
"""

print("=" * 60)
print("  VERIFICADOR InfluxDB - sensores_proyecto")
print(f"  Consulta cada {INTERVALO_S}s  |  Ctrl+C para salir")
print("=" * 60)

ciclo = 0
while True:
    ciclo += 1
    ahora_str = datetime.now().strftime("%H:%M:%S")
    print(f"\n[{ahora_str}] Ciclo #{ciclo}")

    try:
        tablas = query_api.query(FLUX)

        if not tablas:
            print("  BUCKET VACIO — no hay datos en las ultimas 24h")
        else:
            datos = {}
            tiempo_dato = None
            for tabla in tablas:
                for fila in tabla.records:
                    datos[fila.get_field()] = fila.get_value()
                    tiempo_dato = fila.get_time()

            if tiempo_dato:
                ahora_utc = datetime.now(timezone.utc)
                seg = (ahora_utc - tiempo_dato).total_seconds()
                t_local = tiempo_dato.astimezone().strftime("%H:%M:%S")
                estado = "ACTIVO" if seg < 30 else f"DETENIDO (hace {seg:.0f}s)"
                print(f"  Ultimo dato: {t_local}  |  Simulador: {estado}")

            print(f"  temperatura   : {datos.get('temperatura', 'N/A')}")
            print(f"  co2_ppm       : {datos.get('co2_ppm', 'N/A')}")
            print(f"  humedad       : {datos.get('humedad', 'N/A')}")
            print(f"  humedad_suelo : {datos.get('humedad_suelo', 'N/A')}")
            print(f"  luz           : {datos.get('luz', 'N/A')}")

    except Exception as e:
        msg = str(e)
        if "404" in msg or "not found" in msg.lower():
            print(f"  [404 transitorio] InfluxDB Cloud rechazo la peticion (rate limit). Reintentara en {INTERVALO_S}s.")
        elif "429" in msg:
            print(f"  [429 rate limit] Demasiadas peticiones. Reintentara en {INTERVALO_S}s.")
        else:
            print(f"  ERROR: {type(e).__name__}: {e}")

    time.sleep(INTERVALO_S)
