/**
 * Helpers para traducir valores de sensores a etiquetas legibles y estados de color.
 *
 * Conversiones de escala para sensores analógicos (0-4095):
 *   humedad_suelo: valor MAYOR = suelo MÁS SECO
 *     → % humedad = ((4095 - raw) / 4095) * 100
 *   luz: valor MAYOR = más radiación
 *     → % radiación = (raw / 4095) * 100
 */

// ─────────────────────────────────────────────────────
//  Humedad de suelo
//  raw 0-4095  |  mayor valor = suelo MÁS SECO
//  Se muestra como % de HUMEDAD (invertido, más intuitivo)
// ─────────────────────────────────────────────────────
export function getSueloInfo(rawValor, rangos) {
  const max = rangos?.humedad_suelo?.max ?? 3200
  // % humedad: 0% = seco total (raw 4095), 100% = saturado (raw 0)
  const humedadPct = Math.round(((4095 - rawValor) / 4095) * 100)

  if (rawValor > max)          return { etiqueta: 'Suelo Críticamente Seco', estado: 'critical', pct: humedadPct }
  if (rawValor > max * 0.88)  return { etiqueta: 'Suelo Seco',               estado: 'warning',  pct: humedadPct }
  if (rawValor > 2000)         return { etiqueta: 'Humedad Moderada',         estado: 'ok',       pct: humedadPct }
  if (rawValor > 800)          return { etiqueta: 'Humedad Normal 🌿',        estado: 'ok',       pct: humedadPct }
  return                              { etiqueta: 'Suelo Saturado 💦',         estado: 'ok',       pct: humedadPct }
}

// ─────────────────────────────────────────────────────
//  Temperatura ambiental (°C)
// ─────────────────────────────────────────────────────
export function getTemperaturaInfo(valor, rangos) {
  const min = rangos?.temperatura?.min ?? 18
  const max = rangos?.temperatura?.max ?? 35

  if (valor > max + 5)  return { etiqueta: 'Temperatura Crítica 🔴',  estado: 'critical' }
  if (valor > max)      return { etiqueta: 'Temperatura Elevada ♨️',  estado: 'warning'  }
  if (valor < min - 3)  return { etiqueta: 'Temperatura Muy Baja 🧊', estado: 'warning'  }
  if (valor < min)      return { etiqueta: 'Temperatura Baja ❄️',     estado: 'warning'  }
  return                       { etiqueta: 'Temperatura Normal ✅',   estado: 'ok'       }
}

// ─────────────────────────────────────────────────────
//  Humedad ambiental (%)
// ─────────────────────────────────────────────────────
export function getHumedadAmbInfo(valor, rangos) {
  const min = rangos?.humedad_ambiental?.min ?? 40
  const max = rangos?.humedad_ambiental?.max ?? 80

  if (valor > max + 10)  return { etiqueta: 'Humedad Excesiva 🌊',       estado: 'warning' }
  if (valor > max)       return { etiqueta: 'Humedad Alta 💧',            estado: 'warning' }
  if (valor < min - 10)  return { etiqueta: 'Humedad Muy Baja 🌵',       estado: 'warning' }
  if (valor < min)       return { etiqueta: 'Humedad Baja',               estado: 'warning' }
  return                        { etiqueta: 'Humedad Ambiental Óptima ✅', estado: 'ok'     }
}

// ─────────────────────────────────────────────────────
//  Luz / Radiación solar  (0-4095)
//  Se muestra como % de radiación: (raw / 4095) * 100
// ─────────────────────────────────────────────────────
export function getLuzInfo(rawValor, rangos) {
  const min = rangos?.luz?.min ?? 500
  const max = rangos?.luz?.max ?? 3000
  // % radiación: 0% = oscuridad, 100% = radiación máxima
  const luzPct = Math.round((rawValor / 4095) * 100)

  if (rawValor > max + 500)  return { etiqueta: 'Radiación Extrema ☀️🔴',       estado: 'critical', pct: luzPct }
  if (rawValor > max)        return { etiqueta: 'Radiación Solar Alta ☀️',       estado: 'warning',  pct: luzPct }
  if (rawValor < min / 2)    return { etiqueta: 'Sin Luz — Noche 🌙',            estado: 'ok',       pct: luzPct }
  if (rawValor < min)        return { etiqueta: 'Luz Insuficiente 🌥️',           estado: 'warning',  pct: luzPct }
  return                            { etiqueta: 'Nivel de Luz Normal ✅',         estado: 'ok',       pct: luzPct }
}

// ─────────────────────────────────────────────────────
//  Estado global de la planta
// ─────────────────────────────────────────────────────
export function getEstadoGlobal(estados) {
  if (estados.some(e => e === 'critical')) return 'critical'
  if (estados.some(e => e === 'warning'))  return 'warning'
  return 'ok'
}

// ─────────────────────────────────────────────────────
//  Detección de Estrés Hídrico basada en valores actuales
//  (sin depender del historial)
// ─────────────────────────────────────────────────────
export function isEstresHidrico(sensores, rangos) {
  if (!sensores || !rangos) return false
  const sueloMax = rangos?.humedad_suelo?.max ?? 3200
  const tempMax  = rangos?.temperatura?.max   ?? 35
  const luzMax   = rangos?.luz?.max           ?? 3000
  return (
    sensores.humedad_suelo > sueloMax &&
    sensores.temperatura   > tempMax  &&
    sensores.luz           > luzMax
  )
}
