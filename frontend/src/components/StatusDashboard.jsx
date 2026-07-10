import SensorCard from './SensorCard'
import {
  getSueloInfo,
  getTemperaturaInfo,
  getHumedadAmbInfo,
  getLuzInfo,
  getCO2Info,
  getEstadoGlobal,
  isEstresHidrico,
} from '../utils/sensorHelpers'

// ── Skeleton de carga ──────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-4 animate-pulse">
      <div className="h-5 w-20 bg-slate-700 rounded mb-3" />
      <div className="h-8 w-14 bg-slate-700 rounded mb-2" />
      <div className="h-3 w-full bg-slate-700 rounded mb-4" />
      <div className="h-4 w-full bg-slate-700 rounded" />
    </div>
  )
}

// ── Banner de Estrés Hídrico ───────────────────────────────────────────
// Solo se muestra cuando los valores ACTUALES cumplen la condición.
function EstresHidricoBanner() {
  return (
    <div className="mb-4 rounded-2xl border border-red-500/60 bg-red-500/10 p-4 flex items-center gap-3 animate-fade-in">
      <span className="text-3xl flex-shrink-0">🏜️</span>
      <div>
        <p className="font-bold text-red-400 text-sm">¡ESTRÉS HÍDRICO ACTIVO!</p>
        <p className="text-xs text-slate-400 mt-0.5">
          Suelo seco + temperatura alta + radiación intensa simultáneamente. Active el riego.
        </p>
      </div>
    </div>
  )
}

// ── Componente principal ───────────────────────────────────────────────
export default function StatusDashboard({ sensores, rangos, loading }) {
  if (loading) {
    return (
      <div className="animate-fade-in">
        <div className="flex items-center justify-between mb-4">
          <div className="h-5 w-32 bg-slate-700 rounded animate-pulse" />
          <div className="h-5 w-24 bg-slate-700 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    )
  }

  if (!sensores) return null

  const sueloInfo  = getSueloInfo(sensores.humedad_suelo, rangos)
  const tempInfo   = getTemperaturaInfo(sensores.temperatura, rangos)
  const humAmbInfo = getHumedadAmbInfo(sensores.humedad_ambiental, rangos)
  const luzInfo    = getLuzInfo(sensores.luz, rangos)
  const co2Info    = getCO2Info(sensores.co2, rangos)

  const estadoGlobal = getEstadoGlobal([
    sueloInfo.estado, tempInfo.estado, humAmbInfo.estado, luzInfo.estado, co2Info.estado,
  ])

  // ✅ Bug fix: evaluar estrés hídrico con VALORES ACTUALES, no el historial
  const estresActivo = isEstresHidrico(sensores, rangos)

  const ESTADO_CFG = {
    ok:       { text: 'text-emerald-400', bg: 'bg-emerald-500/10', label: '✅ Planta Normal' },
    warning:  { text: 'text-amber-400',   bg: 'bg-amber-500/10',   label: '⚠️ Revisión Necesaria' },
    critical: { text: 'text-red-400',     bg: 'bg-red-500/10',     label: '🚨 Estado Crítico' },
  }
  const cfg = ESTADO_CFG[estadoGlobal]

  return (
    <div className="animate-fade-in">
      {/* Estado global */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-slate-200">Estado Actual</h2>
        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${cfg.bg} ${cfg.text}`}>
          {cfg.label}
        </span>
      </div>

      {/* Banner estrés hídrico — solo si se cumple AHORA */}
      {estresActivo && <EstresHidricoBanner />}

      {/* Grid de tarjetas */}
      <div className="grid grid-cols-2 gap-3">

        {/* Humedad del Suelo — modo porcentaje (% de humedad) */}
        <SensorCard
          titulo="Humedad Suelo"
          icono="🌱"
          etiqueta={sueloInfo.etiqueta}
          estado={sueloInfo.estado}
          percent={sueloInfo.pct}
          unidad="hum."
        />

        {/* Temperatura — modo estándar */}
        <SensorCard
          titulo="Temperatura"
          icono="🌡️"
          valor={sensores.temperatura.toFixed(1)}
          unidad="°C"
          etiqueta={tempInfo.etiqueta}
          estado={tempInfo.estado}
          min={rangos?.temperatura?.min}
          max={rangos?.temperatura?.max}
          barValue={sensores.temperatura}
          barMax={60}
        />

        {/* Humedad Ambiental — modo estándar */}
        <SensorCard
          titulo="Humedad Amb."
          icono="💧"
          valor={sensores.humedad_ambiental.toFixed(1)}
          unidad="%"
          etiqueta={humAmbInfo.etiqueta}
          estado={humAmbInfo.estado}
          min={rangos?.humedad_ambiental?.min}
          max={rangos?.humedad_ambiental?.max}
          barValue={sensores.humedad_ambiental}
          barMax={100}
        />

        {/* Radiación Solar — modo porcentaje */}
        <SensorCard
          titulo="Radiación Solar"
          icono="☀️"
          etiqueta={luzInfo.etiqueta}
          estado={luzInfo.estado}
          percent={luzInfo.pct}
          unidad="rad."
        />

        {/* CO₂ — Calidad de Aire */}
        <SensorCard
          titulo="CO₂ Ambiente"
          icono="💨"
          valor={sensores.co2 != null ? Math.round(sensores.co2) : '--'}
          unidad="ppm"
          etiqueta={co2Info.etiqueta}
          estado={co2Info.estado}
          min={rangos?.co2?.min ?? undefined}
          max={rangos?.co2?.max ?? 1000}
          barValue={sensores.co2}
          barMax={5000}
        />

      </div>

      <p className="text-center text-xs text-slate-600 mt-4">
        Actualización automática cada 5 segundos
      </p>
    </div>
  )
}
