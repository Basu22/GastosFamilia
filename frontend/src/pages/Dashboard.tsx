import { useQuery } from '@tanstack/react-query';
import { getDashboardInfo } from '../api/client';
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, ReferenceLine } from 'recharts';
import { TrendingUp, Wallet, CreditCard, PiggyBank, Clock } from 'lucide-react';
import { formatARS, formatARSCompact, MESES_CORTO } from '../utils/format';
import MetricCard from '../components/ui/MetricCard';

const DashboardSkeleton = () => (
  <div className="space-y-6 animate-pulse">
    <div className="h-12 bg-gray-200 rounded-lg w-1/3 mb-8" />
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-6 mb-6">
      {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-gray-100 rounded-xl border border-gray-200" />)}
    </div>
    <div className="h-64 bg-gray-100 rounded-3xl mb-6" />
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
      <div className="h-80 bg-gray-100 rounded-3xl" />
      <div className="h-80 bg-gray-100 rounded-3xl" />
    </div>
  </div>
);

export default function Dashboard() {
  const currentDate = new Date();
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard', currentDate.getMonth() + 1, currentDate.getFullYear()],
    queryFn: () => getDashboardInfo(currentDate.getMonth() + 1, currentDate.getFullYear())
  });

  if (isLoading) return <DashboardSkeleton />;
  
  if (error || !data) return (
    <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm">
      Error cargando el dashboard. Por favor, intente nuevamente.
    </div>
  );

  // Insertar mes actual al inicio de proyecciones
  const proyecciones = [
    { mes: data.mes, anio: data.anio, total_cuotas: data.total_cuotas, total_gastos_mensuales: data.total_gastos_mensuales, total_mes: data.total_mes, ingreso: data.ingreso },
    ...(data.proximos_6_meses || [])
  ];

  const cuotasTarjetas = data.cuotas_por_tarjeta || [];
  const alturaBarras = Math.max(200, cuotasTarjetas.filter((t: any) => t.monto > 0).length * 48);

  return (
    <main id="dashboard-view" className="space-y-6">
      <header id="dashboard-header" className="flex justify-between items-end mb-2 lg:mb-6">
        <div>
          <p className="text-gray-500 dark:text-neutral-500 font-bold text-[10px] uppercase tracking-wider">Estado Financiero</p>
          <h1 id="dashboard-title" className="text-2xl lg:text-3xl font-black text-gray-900 dark:text-neutral-100 capitalize tracking-tight">
            {currentDate.toLocaleString('es-ES', { month: 'long' })} {data.anio}
          </h1>
        </div>
      </header>

      <section id="dashboard-metrics" className="grid grid-cols-2 gap-2 lg:grid-cols-4 lg:gap-6">
        <MetricCard label="Ingresos" value={data.ingreso} icon={TrendingUp} variant="success" />
        <MetricCard label="Cuotas" value={data.total_cuotas} icon={CreditCard} variant="warning" />
        <MetricCard label="Gastos Fijos" value={data.total_gastos_mensuales} icon={Wallet} variant="warning" />
        <MetricCard 
          label="Ahorro Neto" 
          value={data.ahorro_proyectado} 
          icon={PiggyBank} 
          variant={data.ahorro_proyectado >= 0 ? "success" : "danger"} 
        />
      </section>

      {/* Próximos Vencimientos */}
      {data.proximos_vencimientos && data.proximos_vencimientos.length > 0 && (
        <section id="dashboard-vencimientos" className="bg-white dark:bg-neutral-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-neutral-800 mb-6 transition-colors">
          <header className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-800 dark:text-neutral-200 flex items-center gap-2">
              <Clock className="text-amber-500" size={20}/> Cuotas a Finalizar
            </h2>
            <span id="vencimientos-count-badge" className="text-xs font-medium text-gray-400 dark:text-neutral-500 bg-gray-50 dark:bg-neutral-950 px-2 py-1 rounded-lg">
              {data.proximos_vencimientos.length} avisos
            </span>
          </header>
          <div id="vencimientos-list" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.proximos_vencimientos.map((v: any, i: number) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50 dark:bg-neutral-950 border border-gray-100 dark:border-neutral-800 hover:border-gray-200 dark:hover:border-neutral-700 transition-all">
                <div className="w-1.5 h-10 rounded-full" style={{ backgroundColor: v.tarjeta_color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 dark:text-neutral-100 truncate">{v.descripcion}</p>
                  <p className="text-[10px] text-gray-400 dark:text-neutral-500 uppercase font-bold tracking-tight">{v.tarjeta_nombre}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900 dark:text-neutral-100">{formatARS(v.monto_cuota)}</p>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${v.cuotas_restantes === 1 ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'}`}>
                    {v.cuotas_restantes === 1 ? 'ÚLTIMA' : '2 RESTAN'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div id="dashboard-charts-container" className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
        <section id="dashboard-chart-cuotas" className="bg-white dark:bg-neutral-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-neutral-800 transition-colors">
          <h2 className="font-bold text-gray-800 dark:text-neutral-200 mb-6 flex items-center gap-2">
            <CreditCard className="text-blue-500" size={20}/> Cuotas por Tarjeta
          </h2>
          <div style={{ height: alturaBarras, minHeight: 250, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cuotasTarjetas} layout="vertical" margin={{ left: -10, right: 30 }}>
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="nombre" 
                  type="category" 
                  width={120} 
                  tick={{ fontSize: 13, fontWeight: 500, fill: '#6b7280' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip 
                  cursor={{ fill: '#00000010' }} 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: 'var(--tw-bg-opacity, #fff)' }}
                  formatter={(val: number) => [formatARS(val), 'Cuota']}
                />
                <Bar dataKey="monto" radius={[0, 6, 6, 0]} barSize={28}>
                  {cuotasTarjetas.map((entry: any, index: number) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section id="dashboard-chart-proyeccion" className="bg-white dark:bg-neutral-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-neutral-800 transition-colors">
          <h2 className="font-bold text-gray-800 dark:text-neutral-200 mb-6 flex items-center gap-2">
            <TrendingUp className="text-blue-500" size={20}/> Proyección 6 Meses
          </h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={proyecciones} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" opacity={0.2} />
                <XAxis 
                  dataKey="mes" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#9CA3AF', fontSize: 12 }} 
                  tickFormatter={(mes) => MESES_CORTO[mes]} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#9CA3AF', fontSize: 12 }} 
                  tickFormatter={(val) => formatARSCompact(val)} 
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(val: number) => [formatARS(val), '']} 
                  labelFormatter={(label) => `Mes: ${MESES_CORTO[label as number]}`} 
                />
                <ReferenceLine y={data.ingreso} stroke="#10B981" strokeDasharray="4 4" label={{ value: 'Ingreso', position: 'insideRight', fontSize: 10, fill: '#10B981' }} />
                <Line type="monotone" dataKey="total_cuotas" name="Cuotas" stroke="#8B5CF6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="total_mes" name="Gasto Total" stroke="#EF4444" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>
    </main>
  );
}
