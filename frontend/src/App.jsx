import { useState } from 'react'
import { useSensorData } from './hooks/useSensorData'
import StatusDashboard from './components/StatusDashboard'
import ConfigPanel from './components/ConfigPanel'
import AlertHistory from './components/AlertHistory'
import Reportes from './components/Reportes'
// ── Definición de tabs ─────────────────────────────────────────────────
const TABS = [
  { id: 'dashboard', label: 'Estado',   icon: '📊' },
  { id: 'config',    label: 'Config',   icon: '⚙️' },
  { id: 'alertas',   label: 'Alertas',  icon: '🔔' },
{ id: 'reportes',  label: 'Reportes', icon: '📈' },
]

// ── Header ─────────────────────────────────────────────────────────────
function Header({ lastUpdate, error, onRefresh, refreshing }) {
  return (
    <header className="
      sticky top-0 z-20 bg-slate-900/80 backdrop-blur-md
      border-b border-slate-800 px-4 py-3
    ">
      <div className="flex items-center justify-between max-w-xl mx-auto">
        {/* Logo + Título */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30 flex-shrink-0">
            <span className="text-lg">🏭</span>
          </div>
          <div>
            <h1 className="text-sm font-bold text-white leading-tight">Monitor IoT Industrial</h1>
            {lastUpdate ? (
              <p className="text-[10px] text-slate-500">
                {lastUpdate.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </p>
            ) : (
              <p className="text-[10px] text-slate-600">Conectando…</p>
            )}
          </div>
        </div>

        {/* Estado de conexión + botón refresh */}
        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="
              w-8 h-8 rounded-xl bg-slate-800 border border-slate-700
              flex items-center justify-center text-slate-400
              hover:text-white hover:border-slate-600 transition-all
              disabled:opacity-40
            "
            title="Refrescar ahora"
          >
            <span className={`text-sm ${refreshing ? 'animate-spin' : ''}`}>🔄</span>
          </button>

          <div className={`
            flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1.5 rounded-full
            ${error
              ? 'bg-red-500/15 text-red-400 border border-red-500/25'
              : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'}
          `}>
            <span className={`w-1.5 h-1.5 rounded-full ${error ? 'bg-red-400' : 'bg-emerald-400 animate-pulse'}`} />
            {error ? 'Sin señal' : 'En vivo'}
          </div>
        </div>
      </div>
    </header>
  )
}

// ── Bottom Nav ─────────────────────────────────────────────────────────
function BottomNav({ activeTab, setActiveTab, alertCount }) {
  return (
    <nav className="
      fixed bottom-0 inset-x-0 z-20
      bg-slate-900/90 backdrop-blur-md border-t border-slate-800
      safe-area-inset-bottom
    ">
      <div className="flex max-w-xl mx-auto">
        {TABS.map(tab => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              id={`tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex-1 flex flex-col items-center py-3 gap-0.5 relative
                transition-colors duration-150
                ${isActive ? 'text-cyan-400' : 'text-slate-600 hover:text-slate-400'}
              `}
            >
              {/* Badge de alertas */}
              {tab.id === 'alertas' && alertCount > 0 && (
                <span className="
                  absolute top-2 right-[calc(50%-16px)] translate-x-3
                  min-w-[16px] h-4 bg-red-500 rounded-full
                  text-white text-[9px] font-bold flex items-center justify-center px-1
                ">
                  {alertCount > 99 ? '99+' : alertCount}
                </span>
              )}

              <span className="text-xl leading-none">{tab.icon}</span>
              <span className="text-[9px] font-semibold uppercase tracking-wider">{tab.label}</span>

              {/* Línea activa */}
              {isActive && (
                <span className="absolute bottom-0 inset-x-4 h-0.5 bg-cyan-400 rounded-full" />
              )}
            </button>
          )
        })}
      </div>
    </nav>
  )
}

// ── Error banner ───────────────────────────────────────────────────────
function ErrorBanner({ error }) {
  if (!error) return null
  return (
    <div className="mx-0 mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-xs flex items-start gap-2 animate-fade-in">
      <span className="text-base flex-shrink-0">⚠️</span>
      <span>{error} Asegúrate de que el backend corra en <code className="text-amber-400">localhost:8000</code>.</span>
    </div>
  )
}

// ── Componente raíz ────────────────────────────────────────────────────
export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [refreshing, setRefreshing] = useState(false)

  const {
    sensores,
    rangos,
    alertas,
    loading,
    error,
    lastUpdate,
    refetchRangos,
    refetchAlertas,
    refetchSensores,
  } = useSensorData()

  const handleRefresh = async () => {
    setRefreshing(true)
    await refetchSensores()
    setTimeout(() => setRefreshing(false), 500)
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <Header
        lastUpdate={lastUpdate}
        error={error}
        onRefresh={handleRefresh}
        refreshing={refreshing}
      />

      {/* Contenido principal */}
      <main className="max-w-xl mx-auto px-4 pt-4 pb-24">
        <ErrorBanner error={error} />

        {activeTab === 'dashboard' && (
          <StatusDashboard
            sensores={sensores}
            rangos={rangos}
            loading={loading}
            alertas={alertas}
          />
        )}
        {activeTab === 'config' && (
          <ConfigPanel
            rangos={rangos}
            onSave={refetchRangos}
          />
        )}
        {activeTab === 'alertas' && (
          <AlertHistory
            alertas={alertas}
            onDelete={refetchAlertas}
          />
        )}
        {activeTab === 'reportes' && (
          <Reportes rangos={rangos} />
        )}
      </main>

      <BottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        alertCount={alertas.length}
      />
    </div>
  )
}
