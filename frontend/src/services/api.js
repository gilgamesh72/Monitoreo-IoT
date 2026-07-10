import axios from 'axios'

const API = axios.create({
  baseURL: 'http://localhost:8000',
  timeout: 15000,  // 15 s — InfluxDB Cloud puede tardar hasta ~8 s
  headers: { 'Content-Type': 'application/json' },
})

// ── Sensores ──────────────────────────────────────
/** Obtiene los valores actuales de los sensores (simulados). */
export const getSensores = () => API.get('/api/sensores/actual')
/** Obtiene el historial de la última hora */
export const getHistorial = () => API.get('/api/sensores/historial')
/** Envía datos al backend para validar y generar alertas. */
export const validarSensores = (datos) => API.post('/api/sensores/validar', datos)

// ── Configuración ─────────────────────────────────
/** Obtiene todos los rangos configurados. */
export const getRangos = () => API.get('/api/config/rangos')

/** Crea o actualiza el rango de un sensor. */
export const actualizarRango = (rango) => API.post('/api/config/rangos', rango)

// ── Alertas ───────────────────────────────────────
/** Obtiene el historial de alertas ordenadas de más reciente a más antigua. */
export const getAlertas = () => API.get('/api/alertas')

/** Elimina una alerta del historial por su ID. */
export const eliminarAlerta = (id) => API.delete(`/api/alertas/${id}`)
