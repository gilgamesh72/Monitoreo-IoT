import { useState, useEffect } from 'react'
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { getHistorial } from '../services/api'
import { isEstresHidrico } from '../utils/sensorHelpers'

// Componente auxiliar para no repetir código de gráficas
function ChartCard({ titulo, color, data, dataKey, yUnit = '', isArea = false }) {
  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-4 mb-4 animate-fade-in">
      <h3 className="text-sm font-bold text-slate-200 mb-3">{titulo}</h3>
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {isArea ? (
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis dataKey="hora" stroke="#94a3b8" fontSize={10} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', borderRadius: '8px' }}
                itemStyle={{ color: color }}
              />
              <Area type="step" dataKey={dataKey} stroke={color} fill={color} fillOpacity={0.3} isAnimationActive={false} />
            </AreaChart>
          ) : (
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis dataKey="hora" stroke="#94a3b8" fontSize={10} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', borderRadius: '8px', fontSize: '12px' }}
                itemStyle={{ color: color }}
                formatter={(value) => [`${value} ${yUnit}`, titulo]}
              />
              <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={false} activeDot={{ r: 6 }} isAnimationActive={false} />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default function Reportes({ rangos }) {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getHistorial().then((res) => {
      // Calculamos el estrés hídrico histórico para cada punto
      const dataProcesada = res.data.map(punto => ({
        ...punto,
        estres_estado: isEstresHidrico(punto, rangos) ? 1 : 0 // 1 si hubo estrés, 0 si estuvo normal
      }))
      setData(dataProcesada)
      setLoading(false)
    }).catch(err => {
      console.error("Error cargando historial", err)
      setLoading(false)
    })
  }, [rangos])

  if (loading) return <div className="text-center text-slate-400 mt-10">Cargando reportes históricos...</div>
  if (data.length === 0) return <div className="text-center text-slate-400 mt-10">No hay datos históricos suficientes.</div>

  return (
    <div className="pb-10">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-bold text-white">Análisis de la Última Hora</h2>
      </div>

      {/* Gráfica Binaria de Estrés Hídrico */}
      <ChartCard 
        titulo="Línea de Tiempo: Estrés Hídrico (1 = Activo, 0 = Normal)" 
        color="#ef4444" 
        data={data} 
        dataKey="estres_estado" 
        isArea={true} 
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
        <ChartCard titulo="Temperatura" color="#f59e0b" data={data} dataKey="temperatura" yUnit="°C" />
        <ChartCard titulo="Humedad Ambiental" color="#3b82f6" data={data} dataKey="humedad_ambiental" yUnit="%" />
        <ChartCard titulo="Humedad del Suelo" color="#10b981" data={data} dataKey="humedad_suelo" yUnit="hum." />
        <ChartCard titulo="Radiación Solar" color="#fbbf24" data={data} dataKey="luz" yUnit="lux" />
        <ChartCard titulo="Niveles de CO₂" color="#a855f7" data={data} dataKey="co2" yUnit="ppm" />
      </div>
    </div>
  )
}