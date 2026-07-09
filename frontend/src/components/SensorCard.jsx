/**
 * SensorCard — Tarjeta individual de sensor IoT
 *
 * Modos de visualización:
 *   - Estándar: muestra valor numérico + mini barra al fondo
 *   - Porcentaje (percent !== undefined): barra grande prominente con %
 *
 * Props:
 *   titulo    {string}   Nombre del sensor
 *   icono     {string}   Emoji representativo
 *   valor     {string}   Valor numérico formateado (solo en modo estándar)
 *   unidad    {string}   Unidad de medida
 *   etiqueta  {string}   Descripción legible del estado
 *   estado    {string}   "ok" | "warning" | "critical"
 *   percent   {number}   Si se pasa, activa el modo de barra de porcentaje
 *   min       {number}   Umbral mínimo configurado (modo estándar)
 *   max       {number}   Umbral máximo configurado (modo estándar)
 *   barValue  {number}   Valor actual para mini barra (modo estándar)
 *   barMax    {number}   Valor máximo de la mini barra (modo estándar)
 */

const STATUS = {
  ok: {
    border: 'border-emerald-500/60',
    bg:     'bg-emerald-500/5',
    badge:  'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
    bar:    'bg-emerald-400',
    label:  'NORMAL',
    shadow: 'shadow-emerald-900/40',
  },
  warning: {
    border: 'border-amber-500/70',
    bg:     'bg-amber-500/5',
    badge:  'bg-amber-500/20 text-amber-400 border border-amber-500/30',
    bar:    'bg-amber-400',
    label:  'ALERTA',
    shadow: 'shadow-amber-900/40',
  },
  critical: {
    border: 'border-red-500/80',
    bg:     'bg-red-500/8',
    badge:  'bg-red-500/25 text-red-400 border border-red-500/40',
    bar:    'bg-red-400',
    label:  'CRÍTICO',
    shadow: 'shadow-red-900/50',
  },
}

export default function SensorCard({
  titulo, icono, valor, unidad, etiqueta,
  estado = 'ok', percent,
  min, max, barValue, barMax,
}) {
  const cfg     = STATUS[estado] ?? STATUS.ok
  const isPct   = percent !== undefined
  const barPct  = barMax ? Math.min(100, Math.max(0, (barValue / barMax) * 100)) : 0

  return (
    <div
      className={`
        relative rounded-2xl border p-4 shadow-lg transition-all duration-500 animate-fade-in
        ${cfg.border} ${cfg.bg} ${cfg.shadow}
        ${estado === 'critical' ? 'ring-1 ring-red-500/30' : ''}
      `}
    >
      {/* Pulso en crítico */}
      {estado === 'critical' && (
        <span className="absolute top-3 right-3 flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
        </span>
      )}

      {/* Encabezado */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xl leading-none">{icono}</span>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
            {titulo}
          </p>
        </div>
        <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold tracking-wide ${cfg.badge}`}>
          {cfg.label}
        </span>
      </div>

      {/* ── Modo PORCENTAJE ── */}
      {isPct ? (
        <>
          {/* Número grande */}
          <div className="flex items-baseline gap-0.5 mb-2">
            <span className="text-3xl font-bold text-white tabular-nums">{percent}</span>
            <span className="text-base font-semibold text-slate-400">%</span>
            {unidad && <span className="text-[10px] text-slate-600 ml-1">{unidad}</span>}
          </div>

          {/* Etiqueta */}
          <p className="text-xs font-medium text-slate-300 leading-snug mb-3 min-h-[2rem]">
            {etiqueta}
          </p>

          {/* Barra grande */}
          <div className="w-full bg-slate-700/60 rounded-full h-4 overflow-hidden">
            <div
              className={`h-4 rounded-full transition-all duration-700 ease-out ${cfg.bar}`}
              style={{ width: `${percent}%` }}
            />
          </div>
          <div className="flex justify-between text-[9px] text-slate-600 mt-1">
            <span>0%</span>
            <span>100%</span>
          </div>
        </>
      ) : (
        /* ── Modo ESTÁNDAR ── */
        <>
          <div className="mb-1">
            <span className="text-2xl font-bold text-white tabular-nums">{valor}</span>
            <span className="text-xs text-slate-500 ml-1">{unidad}</span>
          </div>

          <p className="text-xs font-medium text-slate-300 leading-snug mb-3 min-h-[2rem]">
            {etiqueta}
          </p>

          {barMax !== undefined && (
            <>
              <div className="w-full bg-slate-700/60 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-2.5 rounded-full transition-all duration-700 ease-out ${cfg.bar}`}
                  style={{ width: `${barPct}%` }}
                />
              </div>
              {(min !== undefined || max !== undefined) && (
                <div className="flex justify-between text-[9px] text-slate-600 mt-1">
                  <span>{min != null ? `Mín: ${min}` : ''}</span>
                  <span>{max != null ? `Máx: ${max}` : ''}</span>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
