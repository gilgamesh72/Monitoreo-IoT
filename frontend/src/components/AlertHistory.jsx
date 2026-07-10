import { useState } from 'react'
import { eliminarAlerta } from '../services/api'

// ── Mapeo de tipo → etiqueta visual ───────────────────────────────────
const TIPO_LABELS = {
  ESTRES_HIDRICO:           { emoji: '', label: 'Estrés Hídrico' },
  TEMPERATURA_ALTO:         { emoji: '', label: 'Temperatura Alta' },
  TEMPERATURA_BAJO:         { emoji: '', label: 'Temperatura Baja' },
  HUMEDAD_SUELO_ALTO:       { emoji: '', label: 'Suelo Muy Seco' },
  HUMEDAD_SUELO_BAJO:       { emoji: '', label: 'Suelo Saturado' },
  HUMEDAD_AMBIENTAL_ALTO:   { emoji: '', label: 'Humedad Alta' },
  HUMEDAD_AMBIENTAL_BAJO:   { emoji: '', label: 'Humedad Baja' },
  LUZ_ALTO:                 { emoji: '', label: 'Radiación Alta' },
  LUZ_BAJO:                 { emoji: '', label: 'Luz Insuficiente' },
}

const SEVERIDAD = {
  CRITICAL: {
    bg:     'bg-red-500/8',
    border: 'border-red-500/40',
    badge:  'bg-red-500/20 text-red-400 border border-red-500/30',
    dot:    'bg-red-400',
  },
  WARNING: {
    bg:     'bg-amber-500/8',
    border: 'border-amber-500/40',
    badge:  'bg-amber-500/20 text-amber-400 border border-amber-500/30',
    dot:    'bg-amber-400',
  },
}

function formatFecha(isoString) {
  const d = new Date(isoString)
  return d.toLocaleString('es', {
    day:    '2-digit',
    month:  'short',
    year:   'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  })
}

function AlertaItem({ alerta, onDelete }) {
  const [deleting, setDeleting] = useState(false)
  const cfg  = SEVERIDAD[alerta.severidad] ?? SEVERIDAD.WARNING
  const tipo = TIPO_LABELS[alerta.tipo_alerta] ?? { emoji: '', label: alerta.tipo_alerta }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await eliminarAlerta(alerta.id)
      onDelete()
    } catch (e) {
      console.error(e)
      setDeleting(false)
    }
  }

  return (
    <div className={`rounded-2xl border ${cfg.border} ${cfg.bg} p-4 animate-fade-in`}>
      <div className="flex items-start gap-3">
        {/* Indicador de severidad */}
        <div className="flex flex-col items-center pt-0.5 gap-1.5 flex-shrink-0">
          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot} ${alerta.severidad === 'CRITICAL' ? 'animate-pulse' : ''}`} />
        </div>

        {/* Contenido */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            <span>{tipo.emoji}</span>
            <span className="text-xs font-bold text-slate-200">{tipo.label}</span>
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${cfg.badge}`}>
              {alerta.severidad}
            </span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed mb-1.5">
            {alerta.descripcion}
          </p>
          <p className="text-[10px] text-slate-600">
            {formatFecha(alerta.creado_en)}
          </p>
        </div>

        {/* Botón eliminar */}
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="
            text-slate-600 hover:text-red-400 transition-colors
            flex-shrink-0 p-1 rounded-lg hover:bg-red-500/10
            disabled:opacity-40
          "
          title="Eliminar alerta"
          aria-label="Eliminar alerta"
        >
          {deleting ? (
            <span className="w-4 h-4 border border-slate-500 border-t-red-400 rounded-full animate-spin block" />
          ) : '🗑️'}
        </button>
      </div>
    </div>
  )
}

export default function AlertHistory({ alertas, onDelete }) {
  const [clearingAll, setClearingAll] = useState(false) // <-- Estado agregado

  const criticas  = alertas.filter(a => a.severidad === 'CRITICAL')
  const warnings  = alertas.filter(a => a.severidad === 'WARNING')

  // <-- Función agregada para manejar "Limpiar todo"
  const handleClearAll = async () => {
    setClearingAll(true)
    try {
      // Elimina todas las alertas concurrentemente
      await Promise.all(alertas.map(a => eliminarAlerta(a.id)))
      onDelete() // Recarga las alertas desde el componente padre
    } catch (error) {
      console.error("Error al limpiar todas las alertas:", error)
    } finally {
      setClearingAll(false)
    }
  }

  return (
    <div className="animate-fade-in">
      {/* Encabezado */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-slate-200">Historial de Alertas</h2>
        <div className="flex items-center gap-2">
          {alertas.length > 0 && (
            <button
              onClick={handleClearAll}
              disabled={clearingAll}
              className="text-[10px] text-slate-500 hover:text-red-400 transition-colors disabled:opacity-40 flex items-center gap-1"
            >
              {clearingAll
                ? <span className="w-3 h-3 border border-slate-500 border-t-red-400 rounded-full animate-spin" />
                : '🗑️'
              }
              Limpiar todo
            </button>
          )}
          {criticas.length > 0 && (
            <span className="text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 rounded-full font-bold">
              {criticas.length} críticas
            </span>
          )}
          {warnings.length > 0 && (
            <span className="text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">
              {warnings.length} alertas
            </span>
          )}
        </div>
      </div>

      {/* Estado vacío */}
      {alertas.length === 0 ? (
        <div className="text-center py-16 animate-fade-in">
          <p className="text-5xl mb-3"></p>
          <p className="font-semibold text-slate-300 text-base">Sin alertas registradas</p>
          <p className="text-sm text-slate-500 mt-1">
            Todos los sensores operan dentro de los rangos configurados.
          </p>
        </div>
      ) : (
        <>
          {/* Críticas primero */}
          {criticas.length > 0 && (
            <section className="mb-4">
              <h3 className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                Críticas
              </h3>
              <div className="space-y-2">
                {criticas.map(a => (
                  <AlertaItem key={a.id} alerta={a} onDelete={onDelete} />
                ))}
              </div>
            </section>
          )}

          {/* Warnings */}
          {warnings.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                Advertencias
              </h3>
              <div className="space-y-2">
                {warnings.map(a => (
                  <AlertaItem key={a.id} alerta={a} onDelete={onDelete} />
                ))}
              </div>
            </section>
          )}

          <p className="text-center text-[11px] text-slate-600 mt-4">
            Mostrando las últimas 100 alertas · Toca 🗑️ para eliminar
          </p>
        </>
      )}
    </div>
  )
}