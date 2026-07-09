import { useState, useEffect } from 'react'
import { actualizarRango } from '../services/api'

// ─────────────────────────────────────────────────────
//  Conversiones raw ↔ porcentaje para sensores analógicos
// ─────────────────────────────────────────────────────
// Humedad suelo: mayor raw = más seco → mostramos % de HUMEDAD
const rawToHumPct  = (raw) => Math.round(((4095 - (raw ?? 3200)) / 4095) * 100)
const humPctToRaw  = (pct) => Math.round((1 - pct / 100) * 4095)

// Luz: mayor raw = más radiación → mostramos % de radiación
const rawToLuzPct  = (raw) => Math.round(((raw ?? 0) / 4095) * 100)
const luzPctToRaw  = (pct) => Math.round((pct / 100) * 4095)

// ─────────────────────────────────────────────────────
//  Componente Slider con porcentaje
// ─────────────────────────────────────────────────────
function SliderField({ label, value, onChange, description, colorFrom, colorTo }) {
  const fillColor = colorFrom ?? '#06b6d4'   // cyan-500 por defecto
  const trackBg   = colorTo   ?? '#1e293b'   // slate-800

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
          {label}
        </label>
        <span className="text-xl font-bold text-white tabular-nums">{value}<span className="text-sm text-slate-400 font-normal">%</span></span>
      </div>

      {/* Track con relleno coloreado */}
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="
          w-full h-2 rounded-full appearance-none cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-5
          [&::-webkit-slider-thumb]:h-5
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-cyan-400
          [&::-webkit-slider-thumb]:cursor-pointer
          [&::-webkit-slider-thumb]:shadow-md
          [&::-webkit-slider-thumb]:shadow-cyan-500/40
          [&::-webkit-slider-thumb]:border-2
          [&::-webkit-slider-thumb]:border-slate-900
          [&::-moz-range-thumb]:w-5
          [&::-moz-range-thumb]:h-5
          [&::-moz-range-thumb]:rounded-full
          [&::-moz-range-thumb]:bg-cyan-400
          [&::-moz-range-thumb]:border-2
          [&::-moz-range-thumb]:border-slate-900
          [&::-moz-range-thumb]:cursor-pointer
        "
        style={{
          background: `linear-gradient(to right, ${fillColor} 0%, ${fillColor} ${value}%, #334155 ${value}%, #334155 100%)`,
        }}
      />

      <div className="flex justify-between text-[9px] text-slate-600">
        <span>0%</span>
        {description && <span className="text-slate-500 italic text-center px-1">{description}</span>}
        <span>100%</span>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────
//  Componente input numérico estándar
// ─────────────────────────────────────────────────────
function NumberField({ label, value, onChange, placeholder = 'Sin límite', unit = '' }) {
  return (
    <div>
      <label className="text-[10px] text-slate-400 font-semibold block mb-1 uppercase tracking-wider">
        {label} {unit && <span className="normal-case font-normal">({unit})</span>}
      </label>
      <input
        type="number"
        value={value ?? ''}
        onChange={e => onChange(e.target.value === '' ? null : Number(e.target.value))}
        placeholder={placeholder}
        className="
          w-full bg-slate-700/60 border border-slate-600/60 rounded-xl
          px-3 py-2.5 text-sm text-white placeholder-slate-600
          focus:outline-none focus:border-cyan-500/70 focus:bg-slate-700
          transition-colors
        "
      />
    </div>
  )
}

// ─────────────────────────────────────────────────────
//  Toast de confirmación
// ─────────────────────────────────────────────────────
function Toast({ toast }) {
  if (!toast) return null
  const ok = toast.tipo === 'ok'
  return (
    <div className={`mb-4 p-3 rounded-xl text-sm border animate-fade-in flex items-center gap-2 ${
      ok ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
         : 'bg-red-500/10 border-red-500/30 text-red-400'
    }`}>
      {ok ? '✅' : '❌'} {toast.msg}
    </div>
  )
}

// ─────────────────────────────────────────────────────
//  Panel principal de configuración
// ─────────────────────────────────────────────────────
export default function ConfigPanel({ rangos, onSave }) {
  // Estado en valores "display":
  //   suelo   → humPct  (% de humedad, 0 = seco, 100 = saturado)
  //   luz_min → luzMinPct, luz_max → luzMaxPct (% de radiación)
  //   temperatura y humedad ambiental → valores en sus unidades reales
  const [humPct,      setHumPct]      = useState(22)   // umbral mínimo de humedad suelo
  const [luzMinPct,   setLuzMinPct]   = useState(12)   // umbral mínimo de radiación
  const [luzMaxPct,   setLuzMaxPct]   = useState(73)   // umbral máximo de radiación
  const [tempMin,     setTempMin]     = useState(18)
  const [tempMax,     setTempMax]     = useState(35)
  const [humAmbMin,   setHumAmbMin]   = useState(40)
  const [humAmbMax,   setHumAmbMax]   = useState(80)
  const [saving,  setSaving]  = useState(false)
  const [toast,   setToast]   = useState(null)

  // Sincronizar con rangos del backend al cargar
  useEffect(() => {
    if (!rangos || Object.keys(rangos).length === 0) return

    if (rangos.humedad_suelo?.max != null)
      setHumPct(rawToHumPct(rangos.humedad_suelo.max))

    if (rangos.luz?.min != null)
      setLuzMinPct(rawToLuzPct(rangos.luz.min))
    if (rangos.luz?.max != null)
      setLuzMaxPct(rawToLuzPct(rangos.luz.max))

    if (rangos.temperatura?.min != null) setTempMin(rangos.temperatura.min)
    if (rangos.temperatura?.max != null) setTempMax(rangos.temperatura.max)
    if (rangos.humedad_ambiental?.min != null) setHumAmbMin(rangos.humedad_ambiental.min)
    if (rangos.humedad_ambiental?.max != null) setHumAmbMax(rangos.humedad_ambiental.max)
  }, [rangos])

  // Asegurar que luzMin nunca supere luzMax
  const handleLuzMin = (v) => setLuzMinPct(Math.min(v, luzMaxPct - 1))
  const handleLuzMax = (v) => setLuzMaxPct(Math.max(v, luzMinPct + 1))

  const handleSave = async () => {
    setSaving(true)
    try {
      await Promise.all([
        actualizarRango({
          sensor_nombre:  'humedad_suelo',
          umbral_minimo:  null,
          umbral_maximo:  humPctToRaw(humPct),   // % → raw
        }),
        actualizarRango({
          sensor_nombre:  'luz',
          umbral_minimo:  luzPctToRaw(luzMinPct),
          umbral_maximo:  luzPctToRaw(luzMaxPct),
        }),
        actualizarRango({
          sensor_nombre:  'temperatura',
          umbral_minimo:  tempMin,
          umbral_maximo:  tempMax,
        }),
        actualizarRango({
          sensor_nombre:  'humedad_ambiental',
          umbral_minimo:  humAmbMin,
          umbral_maximo:  humAmbMax,
        }),
      ])
      setToast({ tipo: 'ok', msg: 'Configuración guardada correctamente.' })
      await onSave()
    } catch {
      setToast({ tipo: 'error', msg: 'Error al guardar. Verifica la conexión con el backend.' })
    } finally {
      setSaving(false)
      setTimeout(() => setToast(null), 4000)
    }
  }

  return (
    <div className="animate-fade-in">
      <h2 className="text-base font-bold text-slate-200 mb-1">Configuración de Rangos</h2>
      <p className="text-xs text-slate-400 mb-4 leading-relaxed">
        Ajusta los umbrales de cada sensor. Las alertas se generan automáticamente
        cuando un valor sale de rango.
      </p>

      <Toast toast={toast} />

      <div className="space-y-3">

        {/* ── Humedad del Suelo (slider) ──────────────────── */}
        <div className="bg-slate-800/70 rounded-2xl p-4 border border-slate-700/60">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">🌱</span>
            <div>
              <p className="text-sm font-semibold text-slate-200">Humedad del Suelo</p>
              <p className="text-[10px] text-slate-500">Alerta si la humedad cae por debajo del umbral</p>
            </div>
          </div>

          <SliderField
            label="Umbral mínimo de humedad"
            value={humPct}
            onChange={setHumPct}
            description="← más húmedo · más seco →"
          />

          <p className="text-[11px] text-amber-400/80 mt-3 bg-amber-500/5 border border-amber-500/20 rounded-lg px-2.5 py-1.5">
            💡 Si la humedad baja de <strong>{humPct}%</strong>, se genera una alerta de suelo seco.
          </p>
        </div>

        {/* ── Temperatura (inputs numéricos) ─────────────── */}
        <div className="bg-slate-800/70 rounded-2xl p-4 border border-slate-700/60">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">🌡️</span>
            <div>
              <p className="text-sm font-semibold text-slate-200">Temperatura Ambiental</p>
              <p className="text-[10px] text-slate-500">Rango normal en grados Celsius (°C)</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Mínimo" value={tempMin} onChange={setTempMin} unit="°C" />
            <NumberField label="Máximo" value={tempMax} onChange={setTempMax} unit="°C" />
          </div>
        </div>

        {/* ── Humedad Ambiental (inputs numéricos) ────────── */}
        <div className="bg-slate-800/70 rounded-2xl p-4 border border-slate-700/60">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">💧</span>
            <div>
              <p className="text-sm font-semibold text-slate-200">Humedad Ambiental</p>
              <p className="text-[10px] text-slate-500">Rango normal en porcentaje (%)</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Mínimo" value={humAmbMin} onChange={setHumAmbMin} unit="%" />
            <NumberField label="Máximo" value={humAmbMax} onChange={setHumAmbMax} unit="%" />
          </div>
        </div>

        {/* ── Radiación Solar (dos sliders) ──────────────── */}
        <div className="bg-slate-800/70 rounded-2xl p-4 border border-slate-700/60">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl">☀️</span>
            <div>
              <p className="text-sm font-semibold text-slate-200">Radiación Solar</p>
              <p className="text-[10px] text-slate-500">Rango normal de intensidad luminosa</p>
            </div>
          </div>

          <div className="space-y-5">
            <SliderField
              label="Radiación mínima aceptable"
              value={luzMinPct}
              onChange={handleLuzMin}
              description="← oscuro · brillante →"
            />
            <SliderField
              label="Radiación máxima aceptable"
              value={luzMaxPct}
              onChange={handleLuzMax}
              description="← oscuro · brillante →"
            />
          </div>

          {/* Visualización del rango aceptable */}
          <div className="mt-4 bg-slate-900/50 rounded-xl p-3">
            <p className="text-[10px] text-slate-500 mb-2 font-semibold uppercase tracking-wider">Zona de operación normal</p>
            <div className="relative w-full h-4 bg-slate-700 rounded-full overflow-hidden">
              {/* Zona roja izquierda */}
              <div className="absolute left-0 top-0 h-full bg-red-500/40 rounded-l-full"
                   style={{ width: `${luzMinPct}%` }} />
              {/* Zona verde (rango aceptable) */}
              <div className="absolute top-0 h-full bg-emerald-500/50"
                   style={{ left: `${luzMinPct}%`, width: `${luzMaxPct - luzMinPct}%` }} />
              {/* Zona roja derecha */}
              <div className="absolute right-0 top-0 h-full bg-red-500/40 rounded-r-full"
                   style={{ width: `${100 - luzMaxPct}%` }} />
            </div>
            <div className="flex justify-between text-[9px] mt-1.5">
              <span className="text-red-400">Insuf. {luzMinPct}%</span>
              <span className="text-emerald-400">✓ Zona normal</span>
              <span className="text-red-400">{luzMaxPct}% Exceso</span>
            </div>
          </div>

          <p className="text-[11px] text-amber-400/80 mt-3 bg-amber-500/5 border border-amber-500/20 rounded-lg px-2.5 py-1.5">
            💡 Alerta si la radiación es menor de <strong>{luzMinPct}%</strong> o mayor de <strong>{luzMaxPct}%</strong>.
          </p>
        </div>

      </div>

      {/* Botón guardar */}
      <button
        id="btn-guardar-config"
        onClick={handleSave}
        disabled={saving}
        className="
          w-full mt-5 py-3.5 rounded-2xl font-bold text-sm tracking-wide
          transition-all duration-200 active:scale-[0.98]
          bg-cyan-500 hover:bg-cyan-400 text-slate-900
          disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed
          shadow-lg shadow-cyan-500/20
        "
      >
        {saving ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-slate-500 border-t-slate-900 rounded-full animate-spin" />
            Guardando…
          </span>
        ) : '💾 Guardar Configuración'}
      </button>

      <p className="text-center text-[11px] text-slate-600 mt-3">
        Los cambios se aplican en la próxima lectura de sensores.
      </p>
    </div>
  )
}
