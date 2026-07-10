import { useState, useEffect, useCallback, useRef } from 'react'
import { getSensores, validarSensores, getRangos, getAlertas } from '../services/api'

// Pausa entre el final de una respuesta y el inicio de la siguiente petición.
// (La consulta a InfluxDB puede tardar ~3-8 s, por lo que el intervalo real
//  será: tiempo_de_respuesta + POLL_PAUSE_MS)
const POLL_PAUSE_MS = 5000

/**
 * Hook central que gestiona el estado de la aplicación IoT.
 *
 * - Usa polling SECUENCIAL (espera respuesta antes del siguiente ciclo).
 * - Mantiene los últimos datos visibles incluso si hay un error puntual.
 * - Dispara validación en el backend después de cada lectura exitosa.
 */
export function useSensorData() {
  const [sensores, setSensores]     = useState(null)
  const [rangos, setRangos]         = useState({})
  const [alertas, setAlertas]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)
  const timerRef  = useRef(null)
  const activeRef = useRef(true)   // false cuando el componente desmonta

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
      // Mantener los últimos datos visibles — solo mostramos el warning
      // El polling continúa normalmente para recuperarse solo
      const msg = e.response?.status === 503
        ? 'InfluxDB sin datos recientes. Reintentando...'
        : 'No se puede conectar al servidor. Verifica que el backend esté corriendo.'
      setError(msg)
      console.warn('[IoT] Error al obtener sensores:', e.message)
    } finally {
      setLoading(false)
    }
  }, [fetchAlertas])

  // ── Efecto principal — carga inicial + polling SECUENCIAL ────────
  // Usamos setTimeout recursivo para que cada ciclo espere la respuesta
  // anterior. Así evitamos que requests lentas a InfluxDB se solapen.

  useEffect(() => {
    activeRef.current = true

    const loop = async () => {
      if (!activeRef.current) return
      await fetchSensores()
      if (activeRef.current) {
        timerRef.current = setTimeout(loop, POLL_PAUSE_MS)
      }
    }

    fetchRangos()
    loop()

    return () => {
      activeRef.current = false
      if (timerRef.current) clearTimeout(timerRef.current)
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
