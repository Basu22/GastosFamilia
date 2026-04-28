import { useState, useMemo, Fragment } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getDashboardInfo, getMesesDisponibles } from '../api/client';
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';
import { TrendingUp, Wallet, CreditCard, PiggyBank, Edit3, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { formatARS, MESES_CORTO } from '../utils/format';
import MetricCard from '../components/ui/MetricCard';
import InlineEditForm from '../components/dashboard/InlineEditForm';

const DashboardSkeleton = () => (
  <div className="space-y-6 animate-pulse px-4 py-4 lg:px-8 lg:py-8">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map(i => <div key={i} className="h-32 bg-gray-200 dark:bg-neutral-800 rounded-xl" />)}
    </div>
    <div className="h-80 bg-gray-200 dark:bg-neutral-800 rounded-xl" />
  </div>
);

export default function Dashboard() {
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [activeFilter, setActiveFilter] = useState<'all' | 'ingreso' | 'gasto' | 'tarjeta'>('all');
  const [editingItem, setEditingItem] = useState<{id: number, tipo: string} | null>(null);
  
  // Ordenamiento
  const [sortField, setSortField] = useState<'origen' | 'medio_pago' | 'monto'>('monto');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard', mes, anio],
    queryFn: () => getDashboardInfo(mes, anio)
  });

  const filteredMovimientos = useMemo(() => {
    if (!data?.movimientos_mes) return [];
    if (activeFilter === 'all') return data.movimientos_mes;
    return data.movimientos_mes.filter((m: any) => m.tipo === activeFilter);
  }, [data, activeFilter]);

  const finalMovimientos = useMemo(() => {
    const list = [...filteredMovimientos];
    
    // Separar Ingresos de Egresos
    const ingresosList = list.filter(m => m.tipo === 'ingreso').sort((a, b) => b.monto - a.monto);
    const otrosList = list.filter(m => m.tipo !== 'ingreso');

    // Ordenar los otros
    otrosList.sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];
      if (sortOrder === 'asc') return valA > valB ? 1 : -1;
      return valA < valB ? 1 : -1;
    });

    return [...ingresosList, ...otrosList];
  }, [filteredMovimientos, sortField, sortOrder]);

  const totalFiltrado = useMemo(() => {
    return filteredMovimientos.reduce((acc: number, mov: any) => {
      return acc + (mov.tipo === 'ingreso' ? mov.monto : -mov.monto);
    }, 0);
  }, [filteredMovimientos]);

  if (isLoading) return <DashboardSkeleton />;
  if (error || !data) return (
    <div id="dashboard-error-state" className="m-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700 text-sm">
      Error cargando el dashboard. Por favor, intente nuevamente.
    </div>
  );

  const prevMonth = () => {
    if (mes === 1) { setMes(12); setAnio(anio - 1); }
    else setMes(mes - 1);
  };

  const nextMonth = () => {
    if (mes === 12) { setMes(1); setAnio(anio + 1); }
    else setMes(mes + 1);
  };

  return (
    <main id="dashboard-container" className="space-y-6 lg:space-y-8 animate-in fade-in duration-500 pb-10">
      {/* Header con Selector de Fecha */}
      <header id="dashboard-header" className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between px-4 lg:px-0">
        <div>
          <h1 id="dashboard-title" className="text-2xl font-bold text-gray-900 dark:text-neutral-100 tracking-tight">Estado de Cuenta</h1>
          <p id="dashboard-subtitle" className="text-sm text-gray-500 mt-1">Resumen mensual de ingresos y egresos</p>
        </div>

        <div id="date-selector" className="flex items-center gap-2 bg-white dark:bg-neutral-900 p-1.5 rounded-2xl border border-gray-100 dark:border-neutral-800 shadow-sm">
          <Calendar size={16} className="text-gray-400 ml-2" />
          <button id="btn-prev-month" onClick={prevMonth} className="p-2 hover:bg-gray-50 dark:hover:bg-neutral-800 rounded-xl transition-colors"><ChevronLeft size={20} /></button>
          <div className="px-4 text-center min-w-[120px]">
            <span id="current-month" className="block text-sm font-bold text-gray-900 dark:text-neutral-100 uppercase tracking-widest">{MESES_CORTO[mes]}</span>
            <span id="current-year" className="block text-[10px] font-medium text-gray-400">{anio}</span>
          </div>
          <button id="btn-next-month" onClick={nextMonth} className="p-2 hover:bg-gray-50 dark:hover:bg-neutral-800 rounded-xl transition-colors"><ChevronRight size={20} /></button>
        </div>
      </header>

      {/* Métricas Principales */}
      <section id="section-metrics" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 px-4 lg:px-0">
        <MetricCard id="metric-ingresos" label="Ingresos" value={data.ingreso} variant="success" icon={PiggyBank} />
        <MetricCard id="metric-cuotas" label="Cuotas Tarjeta" value={data.total_cuotas} variant="warning" icon={CreditCard} />
        <MetricCard id="metric-gastos" label="Gastos Fijos/Var" value={data.total_gastos_mensuales} variant="danger" icon={Wallet} />
        <MetricCard id="metric-ahorro" label="Balance Mes" value={data.ahorro_proyectado} variant={data.ahorro_proyectado >= 0 ? 'default' : 'danger'} icon={TrendingUp} subtitle="Disponible para ahorro/gastos" />
      </section>

      {/* Gráficos */}
      <div id="section-charts" className="grid grid-cols-1 lg:grid-cols-3 gap-6 px-4 lg:px-0">
        <section id="chart-cuotas-tarjeta" className="lg:col-span-2 bg-white dark:bg-neutral-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-neutral-800">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-bold text-gray-900 dark:text-neutral-100 flex items-center gap-2"><CreditCard className="text-blue-500" size={18}/> Gastos por Tarjeta</h3>
          </div>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.cuotas_por_tarjeta} layout="vertical" margin={{ left: 20, right: 30 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="nombre" type="category" axisLine={false} tickLine={false} width={100} tick={{ fontSize: 12, fontWeight: 500 }} />
                <Tooltip cursor={{ fill: 'transparent' }} content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-white dark:bg-neutral-900 p-3 rounded-xl border border-gray-100 dark:border-neutral-800 shadow-xl">
                        <p className="text-xs font-bold text-gray-400 uppercase mb-1">{payload[0].payload.nombre}</p>
                        <p className="text-lg font-bold text-blue-600">{formatARS(payload[0].value as number)}</p>
                      </div>
                    );
                  }
                  return null;
                }} />
                <Bar dataKey="monto" radius={[0, 8, 8, 0]} barSize={32}>
                  {data.cuotas_por_tarjeta.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section id="chart-proyeccion" className="bg-white dark:bg-neutral-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-neutral-800">
          <h3 className="font-bold text-gray-900 dark:text-neutral-100 mb-8 flex items-center gap-2"><TrendingUp className="text-emerald-500" size={18}/> Tendencia</h3>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.proximos_6_meses}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="mes" tickFormatter={(m) => MESES_CORTO[m]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600 }} />
                <YAxis hide domain={['auto', 'auto']} />
                <Tooltip content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-white dark:bg-neutral-900 p-3 rounded-xl border border-gray-100 dark:border-neutral-800 shadow-xl">
                        <p className="text-lg font-bold text-gray-900 dark:text-neutral-100">{formatARS(payload[0].value as number)}</p>
                      </div>
                    );
                  }
                  return null;
                }} />
                <Line type="monotone" dataKey="total_mes" stroke="#3B82F6" strokeWidth={4} dot={{ r: 4, fill: '#3B82F6', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* Detalle de Movimientos del Mes */}
      <section id="section-movimientos-detalle" className="bg-white dark:bg-neutral-900 rounded-3xl shadow-sm border border-gray-200 dark:border-neutral-800 transition-all overflow-hidden mx-4 lg:mx-0">
        <header id="header-movimientos-detalle" className="p-4 lg:p-6 border-b border-gray-100 dark:border-neutral-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="text-blue-500" size={20}/>
              <h2 id="title-movimientos-detalle" className="font-semibold text-gray-900 dark:text-neutral-100">
                Detalle de Movimientos
              </h2>
            </div>
            {activeFilter !== 'all' && (
              <button 
                id="btn-clear-filter"
                onClick={() => setActiveFilter('all')}
                className="text-[10px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-lg transition-all"
              >
                LIMPIAR FILTRO
              </button>
            )}
          </div>

          {/* Selectores de Ordenamiento Estilo Mobile */}
          <div className="flex items-center gap-4 overflow-x-auto pb-2 scrollbar-hide">
            <span className="text-[10px] font-bold text-gray-400 uppercase whitespace-nowrap">Ordenar por:</span>
            <button 
              onClick={() => {
                if (sortField === 'origen') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                else { setSortField('origen'); setSortOrder('asc'); }
              }}
              className={`text-[10px] font-bold px-3 py-1.5 rounded-full transition-all whitespace-nowrap ${sortField === 'origen' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-500'}`}
            >
              TIPO {sortField === 'origen' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
            <button 
              onClick={() => {
                if (sortField === 'medio_pago') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                else { setSortField('medio_pago'); setSortOrder('asc'); }
              }}
              className={`text-[10px] font-bold px-3 py-1.5 rounded-full transition-all whitespace-nowrap ${sortField === 'medio_pago' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-500'}`}
            >
              MEDIO PAGO {sortField === 'medio_pago' && (sortOrder === 'asc' ? '↑' : '↓')}
            </button>
          </div>
        </header>
        
        <div id="wrapper-movimientos-grid" className="p-4 lg:p-6">
          {/* VISTA MÓVIL (CARDS) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:hidden">
            {finalMovimientos.map((mov: any) => (
              <Fragment key={`${mov.tipo}-${mov.id}`}>
                <article 
                  id={`card-movimiento-${mov.tipo}-${mov.id}`} 
                  onClick={() => {
                    if (editingItem?.id === mov.id && editingItem?.tipo === mov.tipo) setEditingItem(null);
                    else setEditingItem({ id: mov.id, tipo: mov.tipo });
                  }}
                  className={`group relative bg-white dark:bg-neutral-900 p-4 rounded-2xl border transition-all cursor-pointer overflow-hidden ${
                    editingItem?.id === mov.id && editingItem?.tipo === mov.tipo 
                      ? 'border-blue-500 shadow-lg ring-1 ring-blue-500' 
                      : 'border-gray-100 dark:border-neutral-800 hover:border-blue-200 dark:hover:border-blue-900/50 hover:shadow-md'
                  }`}
                >
                  <div className="absolute left-0 top-0 w-1.5 h-full transition-all group-hover:w-2" style={{ backgroundColor: mov.tarjeta_color || (mov.tipo === 'ingreso' ? '#10B981' : (mov.es_fijo ? '#3B82F6' : '#64748B')) }} />
                  <div className="pl-3">
                    <header className="flex justify-between items-start mb-2">
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-gray-900 dark:text-neutral-100 truncate pr-2">{mov.descripcion}</h4>
                        <div className="flex flex-wrap gap-2 mt-1">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                            mov.origen === 'Ingresos' ? 'bg-emerald-50 text-emerald-600' :
                            mov.origen === 'Gastos Fijos' ? 'bg-blue-50 text-blue-600' :
                            mov.origen === 'Cuotas' ? 'bg-amber-50 text-amber-600' :
                            'bg-gray-100 text-gray-500'
                          }`}>
                            {mov.origen}
                          </span>
                          <span className="text-[9px] font-bold text-gray-400 bg-gray-50 dark:bg-neutral-950 px-1.5 py-0.5 rounded uppercase">
                            {mov.medio_pago}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-base font-bold ${mov.tipo === 'ingreso' ? 'text-emerald-600' : 'text-gray-900 dark:text-neutral-100'}`}>
                          {mov.tipo === 'ingreso' ? '+' : '-'} {formatARS(mov.monto)}
                        </p>
                      </div>
                    </header>
                    <div className="flex justify-between items-center mt-4">
                      <div className="flex items-center gap-2">
                        {mov.tipo === 'tarjeta' && (
                          <p className="text-[10px] text-blue-500 font-bold uppercase">Cuota {mov.cuota_actual}/{mov.cuotas_total}</p>
                        )}
                        {mov.es_fijo && mov.tipo !== 'ingreso' && (
                          <span className="text-[9px] font-bold text-blue-400 uppercase">Fijo Mensual</span>
                        )}
                      </div>
                      <div className={`p-1.5 rounded-lg transition-all ${editingItem?.id === mov.id && editingItem?.tipo === mov.tipo ? 'bg-blue-100 text-blue-600' : 'text-gray-300'}`}>
                        <Edit3 size={14} />
                      </div>
                    </div>
                  </div>
                </article>
                {editingItem?.id === mov.id && editingItem?.tipo === mov.tipo && (
                  <div className="col-span-full mt-2"><InlineEditForm id={mov.id} tipo={mov.tipo} onClose={() => setEditingItem(null)} /></div>
                )}
              </Fragment>
            ))}
          </div>

          {/* VISTA DESKTOP (TABLA) */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-neutral-950 text-[10px] uppercase font-bold text-gray-400 dark:text-neutral-500 tracking-wider border-b border-gray-100 dark:border-neutral-800">
                  <th className="px-4 py-4">Descripción</th>
                  <th className="px-4 py-4">Tipo / Origen</th>
                  <th className="px-4 py-4">Medio de Pago</th>
                  <th className="px-4 py-4 text-right">Monto</th>
                  <th className="px-4 py-4 text-center w-20">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                {finalMovimientos.map((mov: any) => (
                  <Fragment key={`${mov.tipo}-${mov.id}`}>
                    <tr className={`group hover:bg-gray-50/50 transition-colors ${editingItem?.id === mov.id && editingItem?.tipo === mov.tipo ? 'bg-blue-50/30' : ''}`}>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-1.5 h-6 rounded-full" style={{ backgroundColor: mov.tarjeta_color || (mov.tipo === 'ingreso' ? '#10B981' : (mov.es_fijo ? '#3B82F6' : '#64748B')) }} />
                          <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-neutral-100">{mov.descripcion}</p>
                            {mov.tipo === 'tarjeta' && (
                              <p className="text-[10px] text-blue-500 font-bold uppercase">Cuota {mov.cuota_actual}/{mov.cuotas_total}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${
                          mov.origen === 'Ingresos' ? 'bg-emerald-50 text-emerald-600' :
                          mov.origen === 'Gastos Fijos' ? 'bg-blue-50 text-blue-600' :
                          mov.origen === 'Cuotas' ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {mov.origen}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-xs font-medium text-gray-600 dark:text-neutral-400">{mov.medio_pago}</p>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <p className={`text-sm font-bold ${mov.tipo === 'ingreso' ? 'text-emerald-600' : 'text-gray-900 dark:text-neutral-100'}`}>
                          {mov.tipo === 'ingreso' ? '+' : '-'} {formatARS(mov.monto)}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <button 
                          onClick={() => setEditingItem(editingItem?.id === mov.id ? null : { id: mov.id, tipo: mov.tipo })}
                          className={`p-2 rounded-lg transition-all ${editingItem?.id === mov.id ? 'bg-blue-100 text-blue-600' : 'text-gray-300 hover:text-blue-600 hover:bg-blue-50'}`}
                        >
                          <Edit3 size={16} />
                        </button>
                      </td>
                    </tr>
                    {editingItem?.id === mov.id && editingItem?.tipo === mov.tipo && (
                      <tr><td colSpan={5} className="p-0 border-none"><InlineEditForm id={mov.id} tipo={mov.tipo} onClose={() => setEditingItem(null)} /></td></tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* Totalizador Moderno */}
        <footer className="p-4 lg:p-6 bg-gray-50/50 dark:bg-neutral-950/50 border-t border-gray-100 dark:border-neutral-800 flex justify-between items-center">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">
            Saldo {activeFilter !== 'all' ? 'Filtrado' : 'del Mes'}
          </span>
          <p id="total-sum-value" className={`text-xl font-bold ${totalFiltrado >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {totalFiltrado >= 0 ? '+' : ''} {formatARS(totalFiltrado)}
          </p>
        </footer>
      </section>
    </main>
  );
}
