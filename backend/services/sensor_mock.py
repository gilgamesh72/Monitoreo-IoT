import random


def generar_datos_sensor() -> dict:
    """
    Simula la lectura de sensores IoT desde una base de datos externa.

    Escenarios posibles:
      - 25%: Estrés hídrico crítico (suelo seco + temp alta + luz intensa)
      - 20%: Temperatura fuera de rango
      - 55%: Valores normales con variación natural

    Rangos de los sensores:
      - temperatura:       valor en °C  (típico: 15–45)
      - humedad_ambiental: valor en %   (típico: 20–95)
      - luz:               analógico    (0–4095, mayor = más luminoso)
      - humedad_suelo:     analógico    (0–4095, mayor = más SECO)
    """
    roll = random.random()

    # Escenario Estrés Hídrico (condición compuesta crítica)
    if roll < 0.25:
        return {
            "temperatura": round(random.uniform(37.0, 45.0), 1),
            "humedad_ambiental": round(random.uniform(15.0, 38.0), 1),
            "luz": round(random.uniform(3100.0, 4095.0), 1),
            "humedad_suelo": round(random.uniform(3300.0, 4095.0), 1),
        }

    # Escenario temperatura elevada
    if roll < 0.45:
        return {
            "temperatura": round(random.uniform(36.0, 42.0), 1),
            "humedad_ambiental": round(random.uniform(30.0, 70.0), 1),
            "luz": round(random.uniform(800.0, 2800.0), 1),
            "humedad_suelo": round(random.uniform(1000.0, 2800.0), 1),
        }

    # Operación normal con variación natural
    return {
        "temperatura": round(random.uniform(18.0, 34.0), 1),
        "humedad_ambiental": round(random.uniform(42.0, 78.0), 1),
        "luz": round(random.uniform(500.0, 2900.0), 1),
        "humedad_suelo": round(random.uniform(500.0, 3100.0), 1),
    }
