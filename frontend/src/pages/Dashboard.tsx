import { useState, useMemo, Fragment } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getDashboardInfo, getMesesDisponibles } from '../api/client';
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, ReferenceLine } from 'recharts';
import { TrendingUp, Wallet, CreditCard, PiggyBank, Clock, Edit3, ChevronLeft, ChevronRight, FilterX, Calendar } from 'lucide-react';
import { formatARS, formatARSCompact, MESES_CORTO } from '../utils/format';
import MetricCard from '../components/ui/MetricCard';
import InlineEditForm from '../components/dashboard/InlineEditForm';

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

type FilterType = 'all' | 'ingreso' | 'tarjeta' | 'gasto';

export default function Dashboard() {
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [anio, setAnio] = useState(now.getFullYear());
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [pickerYear, setPickerYear] = useState(now.getFullYear());
  const [editingItem, setEditingItem] = useState<{id: number, tipo: any} | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard', mes, anio],
    queryFn: () => getDashboardInfo(mes, anio)
  });

  const { data: mesesDisponibles } = useQuery({
    queryKey: ['meses-disponibles'],
    queryFn: getMesesDisponibles
  });

  const handlePrevMonth = () => {
    if (!mesesDisponibles) return;
    const currentIndex = mesesDisponibles.findIndex((m: any) => m.mes === mes && m.anio === anio);
    if (currentIndex < mesesDisponibles.length - 1) {
      const next = mesesDisponibles[currentIndex + 1];
      setMes(next.mes);
      setAnio(next.anio);
      setActiveFilter('all');
    }
  };

  const handleNextMonth = () => {
    if (!mesesDisponibles) return;
    const currentIndex = mesesDisponibles.findIndex((m: any) => m.mes === mes && m.anio === anio);
    if (currentIndex > 0) {
      const next = mesesDisponibles[currentIndex - 1];
      setMes(next.mes);
      setAnio(next.anio);
      setActiveFilter('all');
    }
  };

  const filteredMovimientos = useMemo(() => {
    if (!data?.movimientos_mes) return [];
    if (activeFilter === 'all') return data.movimientos_mes;
    return data.movimientos_mes.filter((m: any) => m.tipo === activeFilter);
  }, [data, activeFilter]);

  const totalFiltrado = useMemo(() => {
    if (!filteredMovimientos) return 0;
    return filteredMovimientos.reduce((acc: number, curr: any) => {
      return curr.tipo === 'ingreso' ? acc + curr.monto : acc - curr.monto;
    }, 0);
  }, [filteredMovimientos]);

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
  const nombreMes = new Date(anio, mes - 1).toLocaleString('es-ES', { month: 'long' });

  // Ayudante para saber si un mes tiene datos en el picker
  const hasData = (m: number, a: number) => {
    return mesesDisponibles?.some((item: any) => item.mes === m && item.anio === a);
  };

  return (
    <main id="page-dashboard" className="space-y-6 px-4 py-4 lg:px-8 lg:py-8 pb-24 lg:pb-8">
      {/* Header con Navegación */}
      <header id="dashboard-header" className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-2 lg:mb-6">
        <div className="flex items-center gap-4">
          <button 
            id="btn-prev-month"
            onClick={handlePrevMonth}
            className="p-2 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-full transition-colors disabled:opacity-10"
            disabled={!mesesDisponibles || mesesDisponibles.findIndex((m: any) => m.mes === mes && m.anio === anio) === mesesDisponibles.length - 1}
          >
            <ChevronLeft size={24} />
          </button>
          
          <div className="relative">
            <button 
              id="btn-month-picker"
              onClick={() => {
                setShowMonthPicker(!showMonthPicker);
                setPickerYear(anio);
              }}
              className="group flex flex-col items-start outline-none"
            >
              <p id="dashboard-subtitle" className="text-gray-500 dark:text-neutral-500 font-medium text-[10px] lg:text-xs uppercase tracking-wider">Estado Financiero</p>
              <h1 id="dashboard-title" className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-neutral-100 capitalize flex items-center gap-2 group-hover:text-blue-600 transition-colors">
                {nombreMes} {anio}
                <ChevronLeft size={16} className={`transform transition-transform ${showMonthPicker ? 'rotate-90' : '-rotate-90'}`} />
              </h1>
            </button>

            {/* Modal Selector Estilo Calendario */}
            {showMonthPicker && (
              <div id="calendar-month-picker" className="absolute top-full left-0 mt-3 w-72 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-2xl shadow-2xl z-50 p-4 transition-all">
                <div className="flex items-center justify-between mb-4 border-b border-gray-100 dark:border-neutral-800 pb-2">
                  <button onClick={() => setPickerYear(pickerYear - 1)} className="p-2 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-full transition-colors">
                    <ChevronLeft size={18} />
                  </button>
                  <span className="text-sm font-bold text-gray-900 dark:text-neutral-100">{pickerYear}</span>
                  <button onClick={() => setPickerYear(pickerYear + 1)} className="p-2 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-full transition-colors">
                    <ChevronRight size={18} />
                  </button>
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => {
                    const active = hasData(m, pickerYear);
                    const isSelected = m === mes && pickerYear === anio;
                    
                    return (
                      <button
                        key={m}
                        onClick={() => {
                          if (active) {
                            setMes(m);
                            setAnio(pickerYear);
                            setShowMonthPicker(false);
                            setActiveFilter('all');
                          }
                        }}
                        disabled={!active}
                        className={`
                          relative h-12 rounded-xl text-xs font-bold uppercase transition-all
                          flex flex-col items-center justify-center gap-1
                          ${isSelected ? 'bg-blue-600 text-white shadow-lg scale-105 z-10' : 
                            active ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40' : 
                            'bg-gray-50 dark:bg-neutral-950 text-gray-300 dark:text-neutral-700 cursor-not-allowed'}
                        `}
                      >
                        {MESES_CORTO[m]}
                        {active && !isSelected && (
                          <span className="absolute bottom-1 w-1 h-1 bg-red-500 rounded-full" />
                        )}
                      </button>
                    );
                  })}
                </div>
                
                <div className="mt-4 pt-2 border-t border-gray-100 dark:border-neutral-800 flex justify-center">
                  <button 
                    onClick={() => {
                      setMes(now.getMonth() + 1);
                      setAnio(now.getFullYear());
                      setShowMonthPicker(false);
                    }}
                    className="text-[10px] font-bold text-gray-400 hover:text-blue-600 flex items-center gap-1 transition-colors"
                  >
                    <Calendar size={12} /> VOLVER A HOY
                  </button>
                </div>
              </div>
            )}
          </div>

          <button 
            id="btn-next-month"
            onClick={handleNextMonth}
            className="p-2 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-full transition-colors disabled:opacity-10"
            disabled={!mesesDisponibles || mesesDisponibles.findIndex((m: any) => m.mes === mes && m.anio === anio) === 0}
          >
            <ChevronRight size={24} />
          </button>
        </div>
      </header>

      {/* MetricCards Clickables */}
      <section id="dashboard-metrics" className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-6">
        <button id="btn-filter-ingresos" onClick={() => setActiveFilter(activeFilter === 'ingreso' ? 'all' : 'ingreso')} className="text-left outline-none">
          <MetricCard 
            id="metric-ingresos" label="Ingresos" value={data.ingreso} icon={TrendingUp} variant="success" 
            subtitle={activeFilter === 'ingreso' ? 'Filtrando...' : 'Clic para filtrar'}
          />
        </button>
        <button id="btn-filter-cuotas" onClick={() => setActiveFilter(activeFilter === 'tarjeta' ? 'all' : 'tarjeta')} className="text-left outline-none">
          <MetricCard 
            id="metric-cuotas" label="Cuotas" value={data.total_cuotas} icon={CreditCard} variant="warning" 
            subtitle={activeFilter === 'tarjeta' ? 'Filtrando...' : 'Clic para filtrar'}
          />
        </button>
        <button id="btn-filter-gastos" onClick={() => setActiveFilter(activeFilter === 'gasto' ? 'all' : 'gasto')} className="text-left outline-none">
          <MetricCard 
            id="metric-gastos" label="Gastos Fijos" value={data.total_gastos_mensuales} icon={Wallet} variant="warning" 
            subtitle={activeFilter === 'gasto' ? 'Filtrando...' : 'Clic para filtrar'}
          />
        </button>
        <button id="btn-filter-reset" onClick={() => setActiveFilter('all')} className="text-left outline-none">
          <MetricCard 
            id="metric-ahorro" 
            label="Ahorro Neto" 
            value={data.ahorro_proyectado} 
            icon={PiggyBank} 
            variant={data.ahorro_proyectado >= 0 ? "success" : "danger"} 
            subtitle={activeFilter === 'all' ? 'Ver todo' : 'Clic para limpiar'}
          />
        </button>
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
        <header id="header-movimientos-detalle" className="p-4 lg:p-6 border-b border-gray-100 dark:border-neutral-800 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="text-blue-500" size={20}/>
            <h2 id="title-movimientos-detalle" className="font-semibold text-gray-900 dark:text-neutral-100">
              Movimientos {activeFilter !== 'all' ? `(${activeFilter === 'ingreso' ? 'Ingresos' : activeFilter === 'tarjeta' ? 'Cuotas' : 'Gastos Fijos'})` : ''}
            </h2>
            <span id="badge-movimientos-count" className="text-xs font-medium text-gray-400 bg-gray-50 dark:bg-neutral-950 px-2 py-1 rounded ml-2">
              {filteredMovimientos.length} ítems
            </span>
          </div>

          {activeFilter !== 'all' && (
            <button 
              id="btn-clear-filter"
              onClick={() => setActiveFilter('all')}
              className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-lg transition-all"
            >
              <FilterX size={14} /> LIMPIAR FILTRO
            </button>
          )}
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
              {filteredMovimientos.map((mov: any) => (
                <Fragment key={`${mov.tipo}-${mov.id}`}>
                  <tr 
                    id={`row-movimiento-${mov.tipo}-${mov.id}`} 
                    className={`hover:bg-gray-50/50 transition-colors ${editingItem?.id === mov.id && editingItem?.tipo === mov.tipo ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}
                  >
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
                          {mov.tipo === 'tarjeta' ? mov.tarjeta_nombre : (mov.tipo === 'ingreso' ? 'Ingreso' : 'Gasto Fijo')}
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
                          if (editingItem?.id === mov.id && editingItem?.tipo === mov.tipo) {
                            setEditingItem(null);
                          } else {
                            setEditingItem({ id: mov.id, tipo: mov.tipo });
                          }
                        }}
                        className={`p-3 rounded-lg transition-all ${editingItem?.id === mov.id && editingItem?.tipo === mov.tipo ? 'text-blue-600 bg-blue-100 dark:bg-blue-900/40' : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'}`}
                        title="Editar"
                      >
                        <Edit3 size={18} />
                      </button>
                    </td>
                  </tr>
                  {/* Formulario Inline */}
                  {editingItem?.id === mov.id && editingItem?.tipo === mov.tipo && (
                    <tr id={`row-edit-${mov.tipo}-${mov.id}`}>
                      <td colSpan={4} className="p-0 border-none">
                        <InlineEditForm 
                          id={mov.id} 
                          tipo={mov.tipo} 
                          onClose={() => setEditingItem(null)} 
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
            {/* Totalizador */}
            <tfoot id="table-totalizer" className="bg-gray-50 dark:bg-neutral-950 border-t-2 border-gray-100 dark:border-neutral-800">
              <tr>
                <td colSpan={2} className="px-4 py-4 text-right text-xs font-bold text-gray-500 dark:text-neutral-400 uppercase tracking-widest">
                  Total {activeFilter !== 'all' ? 'Filtrado' : 'Movimientos'}
                </td>
                <td className="px-4 py-4 text-right">
                  <p id="total-sum-value" className={`text-lg font-bold ${totalFiltrado >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {totalFiltrado >= 0 ? '+' : ''} {formatARS(totalFiltrado)}
                  </p>
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </main>
  );
}
