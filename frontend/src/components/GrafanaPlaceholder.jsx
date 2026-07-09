/**
 * GrafanaPlaceholder
 *
 * Espacio reservado para incrustar paneles de Grafana en el futuro.
 * Para activarlos, reemplaza el contenido de los <div> vacíos con
 * <iframe> apuntando a tu instancia de Grafana con los parámetros
 * kiosk=1 y auth token.
 *
 * Ejemplo:
 *   <iframe
 *     src="http://tu-grafana/d/panel-id?orgId=1&kiosk=1&theme=dark"
 *     width="100%"
 *     height="400"
 *     frameBorder="0"
 *   />
 */

function PlaceholderPanel({ altura = 400, titulo, subtitulo, index }) {
  return (
    <div className="mb-4">
      {titulo && (
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
          {titulo}
        </p>
      )}

      {/* Contenedor del iframe — dimensiones fijas */}
      <div
        id={`grafana-panel-${index}`}
        className="
          w-full rounded-2xl border-2 border-dashed border-slate-600/60
          bg-slate-800/40 flex flex-col items-center justify-center
          text-slate-500 transition-colors hover:border-slate-500
        "
        style={{ height: `${altura}px` }}
      >
        {/* Ícono central */}
        <div className="w-16 h-16 rounded-2xl bg-slate-700/50 flex items-center justify-center mb-3">
          <span className="text-3xl">📈</span>
        </div>

        {/* Texto */}
        <p className="font-semibold text-slate-400 text-sm">Panel de Grafana</p>
        {subtitulo && (
          <p className="text-xs text-slate-600 mt-1 text-center px-6">{subtitulo}</p>
        )}

        {/* Snippet de código */}
        <div className="mt-4 bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-2.5 max-w-xs w-full mx-4">
          <p className="text-[9px] text-slate-500 mb-1 uppercase font-semibold">Reemplazar con:</p>
          <code className="text-[10px] text-cyan-400 break-all leading-relaxed">
            {'<iframe src="http://grafana/d/..." />'}
          </code>
        </div>
      </div>
    </div>
  )
}

export default function GrafanaPlaceholder() {
  return (
    <div className="animate-fade-in">
      <h2 className="text-base font-bold text-slate-200 mb-1">Dashboards Grafana</h2>
      <p className="text-xs text-slate-400 mb-5 leading-relaxed">
        Espacio reservado para incrustar paneles de monitoreo en tiempo real.
        Configura tu instancia de Grafana y reemplaza los divs a continuación.
      </p>

      {/* Panel 1 — principal (grande) */}
      <PlaceholderPanel
        index={1}
        altura={420}
        titulo="Panel Principal — Series de Tiempo"
        subtitulo="Temperatura, Humedad Ambiental y Radiación Solar en el tiempo"
      />

      {/* Panel 2 — secundario (mediano) */}
      <PlaceholderPanel
        index={2}
        altura={280}
        titulo="Panel Secundario — Humedad del Suelo"
        subtitulo="Tendencia analógica de humedad de suelo y umbrales de alerta"
      />

      {/* Panel 3 — compacto */}
      <PlaceholderPanel
        index={3}
        altura={200}
        titulo="Panel de Alertas — Heatmap"
        subtitulo="Frecuencia de alertas por hora y tipo"
      />

      {/* Guía de integración */}
      <div className="mt-2 rounded-2xl border border-slate-700/60 bg-slate-800/40 p-4">
        <p className="text-xs font-semibold text-slate-300 mb-2">📋 Cómo integrar Grafana</p>
        <ol className="text-xs text-slate-400 space-y-1.5 list-decimal list-inside leading-relaxed">
          <li>Asegúrate de que Grafana esté corriendo y tenga acceso a tu datasource.</li>
          <li>Crea un panel en Grafana y copia la URL compartida.</li>
          <li>Reemplaza el <code className="text-cyan-400">&lt;div&gt;</code> por un <code className="text-cyan-400">&lt;iframe src="..."&gt;</code>.</li>
          <li>Añade <code className="text-amber-400">?kiosk=1&theme=dark</code> a la URL para modo kiosk.</li>
        </ol>
      </div>
    </div>
  )
}
