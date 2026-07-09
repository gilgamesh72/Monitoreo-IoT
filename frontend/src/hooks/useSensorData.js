import { useState, useEffect, useCallback, useRef } from 'react'
import { getSensores, validarSensores, getRangos, getAlertas } from '../services/api'

const POLL_INTERVAL_MS = 5000  // Actualiza cada 5 segundos

/**
 * Hook central que gestiona el estado de la aplicación IoT.
 *
 * - Hace polling de sensores y alertas cada 5 segundos.
 * - Dispara validación en el backend después de cada lectura.
 * - Expone funciones para refrescar rangos y alertas manualmente.
 */
export function useSensorData() {
  const [sensores, setSensores]     = useState(null)
  const [rangos, setRangos]         = useState({})
  const [alertas, setAlertas]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)
  const intervalRef = useRef(null)

  // ── Fetchers individuales ─────────────────────────────

  const fetchRangos = useCallback(async () => {
    try {
      const res = await getRangos()
      const dict = {}
      res.data.forEach(r => {
        dict[r.sensor_nombre] = { min: r.umbral_minimo, max: r.umbral_maximo }
      })
      setRangos(dict)
    } catch (e) {
      console.warn('[IoT] Error al obtener rangos:', e.message)
    }
  }, [])

  const fetchAlertas = useCallback(async () => {
    try {
      const res = await getAlertas()
      setAlertas(res.data)
    } catch (e) {
      console.warn('[IoT] Error al obtener alertas:', e.message)
    }
  }, [])

  const fetchSensores = useCallback(async () => {
    try {
      const res = await getSensores()
      const datos = res.data
      setSensores(datos)
      setLastUpdate(new Date())
      setError(null)

      // Validar en backend (genera alertas si es necesario)
      try {
        await validarSensores(datos)
        await fetchAlertas()
      } catch (e) {
        console.warn('[IoT] Error en validación:', e.message)
      }
    } catch (e) {
      setError('No se puede conectar al servidor. Verifica que el backend esté corriendo.')
    } finally {
      setLoading(false)
    }
  }, [fetchAlertas])

  // ── Efecto principal — carga inicial + polling ────────

  useEffect(() => {
    fetchRangos()
    fetchSensores()

    intervalRef.current = setInterval(fetchSensores, POLL_INTERVAL_MS)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [fetchRangos, fetchSensores])

  return {
    sensores,
    rangos,
    alertas,
    loading,
    error,
    lastUpdate,
    refetchRangos: fetchRangos,
    refetchAlertas: fetchAlertas,
    refetchSensores: fetchSensores,
  }
}
