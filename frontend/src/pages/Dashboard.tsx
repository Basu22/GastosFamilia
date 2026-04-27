import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getDashboardInfo } from '../api/client';
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, ReferenceLine } from 'recharts';
import { TrendingUp, Wallet, CreditCard, PiggyBank, Clock, Edit3 } from 'lucide-react';
import { formatARS, formatARSCompact, MESES_CORTO } from '../utils/format';
import MetricCard from '../components/ui/MetricCard';

const DashboardSkeleton = () => (
  <div className="space-y-6 animate-pulse px-4 py-4 lg:px-8 lg:py-8">
    <div className="h-12 bg-gray-200 rounded-lg w-1/3 mb-8" />
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-6 mb-6">
      {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-gray-100 rounded-xl border border-gray-200" />)}
    </div>
    <div className="h-64 bg-gray-100 rounded-xl mb-6" />
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
      <div className="h-80 bg-gray-100 rounded-xl" />
      <div className="h-80 bg-gray-100 rounded-xl" />
    </div>
  </div>
);

export default function Dashboard() {
  const navigate = useNavigate();
  const currentDate = new Date();
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard', currentDate.getMonth() + 1, currentDate.getFullYear()],
    queryFn: () => getDashboardInfo(currentDate.getMonth() + 1, currentDate.getFullYear())
  });

  if (isLoading) return <DashboardSkeleton />;
  
  if (error || !data) return (
    <div id="dashboard-error-state" className="m-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 text-sm">
      Error cargando el dashboard. Por favor, intente nuevamente.
    </div>
  );

  const proyecciones = [
    { mes: data.mes, anio: data.anio, total_cuotas: data.total_cuotas, total_gastos_mensuales: data.total_gastos_mensuales, total_mes: data.total_mes, ingreso: data.ingreso },
    ...(data.proximos_6_meses || [])
  ];

  const cuotasTarjetas = data.cuotas_por_tarjeta || [];
  const alturaBarras = Math.max(200, cuotasTarjetas.filter((t: any) => t.monto > 0).length * 48);

  return (
    <main id="page-dashboard" className="space-y-6 px-4 py-4 lg:px-8 lg:py-8 pb-24 lg:pb-8">
      <header id="dashboard-header" className="flex justify-between items-end mb-2 lg:mb-6">
        <div>
          <p id="dashboard-subtitle" className="text-gray-500 dark:text-neutral-500 font-medium text-xs uppercase tracking-wider">Estado Financiero</p>
          <h1 id="dashboard-title" className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-neutral-100 capitalize">
            {currentDate.toLocaleString('es-ES', { month: 'long' })} {data.anio}
          </h1>
        </div>
      </header>

      <section id="dashboard-metrics" className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-6">
        <MetricCard id="metric-ingresos" label="Ingresos" value={data.ingreso} icon={TrendingUp} variant="success" />
        <MetricCard id="metric-cuotas" label="Cuotas" value={data.total_cuotas} icon={CreditCard} variant="warning" />
        <MetricCard id="metric-gastos" label="Gastos Fijos" value={data.total_gastos_mensuales} icon={Wallet} variant="warning" />
        <MetricCard id="metric-ahorro" 
          label="Ahorro Neto" 
          value={data.ahorro_proyectado} 
          icon={PiggyBank} 
          variant={data.ahorro_proyectado >= 0 ? "success" : "danger"} 
        />
      </section>

      {/* Próximos Vencimientos */}
      {data.proximos_vencimientos && data.proximos_vencimientos.length > 0 && (
        <section id="section-proximos-vencimientos" className="bg-white dark:bg-neutral-900 p-4 lg:p-6 rounded-xl shadow-sm border border-gray-200 dark:border-neutral-800 transition-all">
          <header id="header-vencimientos" className="flex items-center justify-between mb-4">
            <h2 id="title-vencimientos" className="font-semibold text-gray-900 dark:text-neutral-100 flex items-center gap-2">
              <Clock className="text-amber-500" size={20}/> Cuotas a Finalizar
            </h2>
          </header>
          <div id="vencimientos-list" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.proximos_vencimientos.map((v: any, i: number) => (
              <article key={i} id={`vencimiento-item-${i}`} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-neutral-950 border border-gray-100 dark:border-neutral-800">
                <div className="w-1.5 h-10 rounded-full" style={{ backgroundColor: v.tarjeta_color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-neutral-100 truncate">{v.descripcion}</p>
                  <p className="text-[10px] text-gray-500 dark:text-neutral-500 uppercase font-medium">{v.tarjeta_nombre}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900 dark:text-neutral-100">{formatARS(v.monto_cuota)}</p>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${v.cuotas_restantes === 1 ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
                    {v.cuotas_restantes === 1 ? 'ÚLTIMA' : '2 RESTAN'}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <div id="dashboard-charts-container" className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section id="section-chart-cuotas" className="bg-white dark:bg-neutral-900 p-4 lg:p-6 rounded-xl shadow-sm border border-gray-200 dark:border-neutral-800 transition-all">
          <header id="header-chart-cuotas">
            <h2 id="title-chart-cuotas" className="font-semibold text-gray-900 dark:text-neutral-100 mb-6 flex items-center gap-2">
              <CreditCard className="text-blue-500" size={20}/> Cuotas por Tarjeta
            </h2>
          </header>
          <div id="chart-cuotas-wrapper" style={{ height: alturaBarras, minHeight: 250, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cuotasTarjetas} layout="vertical" margin={{ left: -10, right: 30 }}>
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="nombre" 
                  type="category" 
                  width={120} 
                  tick={{ fontSize: 12, fontWeight: 500, fill: '#6b7280' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip 
                  cursor={{ fill: '#00000005' }} 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  formatter={(val: number) => [formatARS(val), 'Cuota']}
                />
                <Bar dataKey="monto" radius={[0, 4, 4, 0]} barSize={24}>
                  {cuotasTarjetas.map((entry: any, index: number) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section id="section-chart-proyeccion" className="bg-white dark:bg-neutral-900 p-4 lg:p-6 rounded-xl shadow-sm border border-gray-200 dark:border-neutral-800 transition-all">
          <header id="header-chart-proyeccion">
            <h2 id="title-chart-proyeccion" className="font-semibold text-gray-900 dark:text-neutral-100 mb-6 flex items-center gap-2">
              <TrendingUp className="text-blue-500" size={20}/> Proyección 6 Meses
            </h2>
          </header>
          <div id="chart-proyeccion-wrapper" className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={proyecciones} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" opacity={0.5} />
                <XAxis 
                  dataKey="mes" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#9CA3AF', fontSize: 11 }} 
                  tickFormatter={(mes) => MESES_CORTO[mes]} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#9CA3AF', fontSize: 11 }} 
                  tickFormatter={(val) => formatARSCompact(val)} 
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  formatter={(val: number) => [formatARS(val), '']} 
                  labelFormatter={(label) => `Mes: ${MESES_CORTO[label as number]}`} 
                />
                <ReferenceLine y={data.ingreso} stroke="#10B981" strokeDasharray="4 4" />
                <Line type="monotone" dataKey="total_cuotas" name="Cuotas" stroke="#8B5CF6" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="total_mes" name="Gasto Total" stroke="#EF4444" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* Detalle de Movimientos del Mes */}
      <section id="section-movimientos-detalle" className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-gray-200 dark:border-neutral-800 transition-all overflow-hidden mt-6">
        <header id="header-movimientos-detalle" className="p-4 lg:p-6 border-b border-gray-100 dark:border-neutral-800 flex items-center justify-between">
          <h2 id="title-movimientos-detalle" className="font-semibold text-gray-900 dark:text-neutral-100 flex items-center gap-2">
            <Wallet className="text-blue-500" size={20}/> Movimientos del Mes
          </h2>
          <span id="badge-movimientos-count" className="text-xs font-medium text-gray-400 bg-gray-50 dark:bg-neutral-950 px-2 py-1 rounded">
            {data.movimientos_mes?.length || 0} ítems
          </span>
        </header>
        
        <div id="wrapper-table-movimientos" className="overflow-x-auto">
          <table id="table-movimientos" className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-neutral-950 text-[10px] uppercase font-bold text-gray-400 dark:text-neutral-500 tracking-wider">
                <th className="px-4 py-3">Descripción</th>
                <th className="px-4 py-3">Tipo / Origen</th>
                <th className="px-4 py-3 text-right">Monto</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody id="body-table-movimientos" className="divide-y divide-gray-100 dark:divide-neutral-800">
              {data.movimientos_mes?.map((mov: any) => (
                <tr key={`${mov.tipo}-${mov.id}`} id={`row-movimiento-${mov.tipo}-${mov.id}`} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-4">
                    <p className="text-sm font-semibold text-gray-900 dark:text-neutral-100">{mov.descripcion}</p>
                    {mov.tipo === 'tarjeta' && (
                      <p className="text-[10px] text-blue-500 font-bold uppercase mt-0.5">Cuota {mov.cuota_actual}/{mov.cuotas_total}</p>
                    )}
                    {mov.es_fijo && (
                      <span className="text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-bold mt-1 inline-block">FIJO</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-600 dark:text-neutral-400 font-medium">
                        {mov.tipo === 'tarjeta' ? mov.tarjeta_nombre : mov.tipo}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <p className={`text-sm font-bold ${mov.tipo === 'ingreso' ? 'text-emerald-600' : 'text-gray-900 dark:text-neutral-100'}`}>
                      {mov.tipo === 'ingreso' ? '+' : '-'} {formatARS(mov.monto)}
                    </p>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <button 
                      id={`btn-edit-movimiento-${mov.tipo}-${mov.id}`}
                      onClick={() => {
                        if (mov.tipo === 'tarjeta') navigate(`/nuevo?edit=${mov.id}`);
                        else navigate(`/gastos?edit=${mov.id}&type=${mov.tipo}`);
                      }}
                      className="p-3 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      title="Editar"
                    >
                      <Edit3 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
