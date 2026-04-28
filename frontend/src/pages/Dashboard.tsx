import { useState, useMemo, Fragment } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getDashboardInfo } from '../api/client';
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, LabelList } from 'recharts';
import { TrendingUp, Wallet, CreditCard, PiggyBank, Edit3, ChevronLeft, ChevronRight, Calendar, ChevronDown, Info, Plus, X } from 'lucide-react';
import { formatARS, formatARSCompact, MESES_CORTO } from '../utils/format';
import MetricCard from '../components/ui/MetricCard';
import InlineEditForm from '../components/dashboard/InlineEditForm';
import InlineCreateForm from '../components/dashboard/InlineCreateForm';

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
  const [editingItem, setEditingItem] = useState<{id: number, tipo: string} | null>(null);
  const [creandoEnSeccion, setCreandoEnSeccion] = useState<'ingreso' | 'gasto' | 'tarjeta' | null>(null);
  const [tarjetaFiltro, setTarjetaFiltro] = useState<string | null>(null);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  
  // Secciones abiertas (colapsables)
  const [seccionesAbiertas, setSeccionesAbiertas] = useState<Set<string>>(new Set());

  const toggleSeccion = (key: string) => {
    setSeccionesAbiertas(prev => {
      const nuevo = new Set(prev);
      if (nuevo.has(key)) nuevo.delete(key);
      else nuevo.add(key);
      return nuevo;
    });
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard', mes, anio],
    queryFn: () => getDashboardInfo(mes, anio)
  });

  // Agrupación de movimientos para PC
  const movimientosAgrupados = useMemo(() => {
    if (!data?.movimientos_mes) return { ingresos: [], cuotas: [], fijos: [], variables: [] };
    
    return {
      ingresos: data.movimientos_mes.filter((m: any) => m.tipo === 'ingreso'),
      cuotas: data.movimientos_mes.filter((m: any) => m.origen === 'Cuotas'),
      fijos: data.movimientos_mes.filter((m: any) => m.origen === 'Gastos Fijos'),
      variables: data.movimientos_mes.filter((m: any) => m.origen === 'Gastos Variados'),
    };
  }, [data]);

  // Totales por tarjeta para las pills
  const totalesPorTarjeta = useMemo(() => {
    if (!movimientosAgrupados.cuotas.length) return [];
    const mapa: Record<string, { nombre: string; total: number; color: string }> = {};
    
    movimientosAgrupados.cuotas.forEach((m: any) => {
      const key = m.medio_pago || 'Sin tarjeta';
      if (!mapa[key]) mapa[key] = { nombre: key, total: 0, color: m.tarjeta_color || '#64748B' };
      mapa[key].total += m.monto;
    });
    
    return Object.values(mapa).sort((a, b) => b.total - a.total);
  }, [movimientosAgrupados.cuotas]);

  const totalFiltrado = useMemo(() => {
    if (!data?.movimientos_mes) return 0;
    return data.movimientos_mes.reduce((acc: number, mov: any) => {
      return acc + (mov.tipo === 'ingreso' ? mov.monto : -mov.monto);
    }, 0);
  }, [data]);

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

  const goToToday = () => {
    setMes(new Date().getMonth() + 1);
    setAnio(new Date().getFullYear());
    setShowMonthPicker(false);
  };

  return (
    <main id="dashboard-container" className="space-y-6 lg:space-y-8 animate-in fade-in duration-500 pb-10">
      {/* Header con Selector de Fecha */}
      <header id="dashboard-header" className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between px-4 lg:px-0">
        <div>
          <h1 id="dashboard-title" className="text-2xl font-bold text-gray-900 dark:text-neutral-100 tracking-tight">Estado de Cuenta</h1>
          <p id="dashboard-subtitle" className="text-sm text-gray-500 mt-1 font-medium">Resumen mensual de ingresos y egresos</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Botón Hoy */}
          <button 
            onClick={goToToday}
            className="hidden md:flex items-center gap-2 px-4 py-2 bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 rounded-2xl text-[10px] font-black uppercase tracking-widest text-blue-600 hover:bg-blue-50 transition-all shadow-sm"
          >
            Hoy
          </button>

          <div id="date-selector" className="relative flex items-center gap-2 bg-white dark:bg-neutral-900 p-1.5 rounded-2xl border border-gray-100 dark:border-neutral-800 shadow-sm">
            <Calendar size={16} className="text-gray-400 ml-2" />
            <button id="btn-prev-month" onClick={prevMonth} className="p-2 hover:bg-gray-50 dark:hover:bg-neutral-800 rounded-xl transition-colors"><ChevronLeft size={20} /></button>
            
            <div 
              className="px-4 text-center min-w-[120px] cursor-pointer hover:bg-gray-50 dark:hover:bg-neutral-800 rounded-xl py-1 transition-all"
              onClick={() => setShowMonthPicker(!showMonthPicker)}
            >
              <span id="current-month" className="block text-sm font-black text-gray-900 dark:text-neutral-100 uppercase tracking-widest">{MESES_CORTO[mes]}</span>
              <span id="current-year" className="block text-[10px] font-bold text-gray-400">{anio}</span>
            </div>

            <button id="btn-next-month" onClick={nextMonth} className="p-2 hover:bg-gray-50 dark:hover:bg-neutral-800 rounded-xl transition-colors"><ChevronRight size={20} /></button>

            {/* Selector de Meses (Dropdown) */}
            {showMonthPicker && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 rounded-2xl shadow-2xl z-50 p-4 animate-in zoom-in-95 duration-200">
                <div className="grid grid-cols-3 gap-2">
                  {MESES_CORTO.slice(1).map((m, idx) => (
                    <button 
                      key={m}
                      onClick={() => { setMes(idx + 1); setShowMonthPicker(false); }}
                      className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all ${mes === idx + 1 ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-gray-100 dark:hover:bg-neutral-800 text-gray-500'}`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-50 dark:border-neutral-800">
                   <button onClick={() => setAnio(anio - 1)} className="p-1 hover:bg-gray-100 rounded-lg"><ChevronLeft size={16}/></button>
                   <span className="text-xs font-black text-gray-900 dark:text-neutral-100">{anio}</span>
                   <button onClick={() => setAnio(anio + 1)} className="p-1 hover:bg-gray-100 rounded-lg"><ChevronRight size={16}/></button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Métricas Principales */}
      <section id="section-metrics" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 px-4 lg:px-0">
        <MetricCard id="metric-ingresos" label="Ingresos" value={data.ingreso} variant="success" icon={PiggyBank} />
        <MetricCard id="metric-cuotas" label="Cuotas Tarjeta" value={data.total_cuotas} variant="warning" icon={CreditCard} />
        <MetricCard id="metric-gastos" label="Gastos Fijos/Var" value={data.total_gastos_mensuales} variant="danger" icon={Wallet} />
        <MetricCard id="metric-ahorro" label="Balance Mes" value={data.ahorro_proyectado} variant={data.ahorro_proyectado >= 0 ? 'default' : 'danger'} icon={TrendingUp} subtitle="Disponible para ahorro/gastos" />
      </section>

      {/* GRID PRINCIPAL: Movimientos (L) | Gráficos (R - Desktop only) */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8">
        
        {/* COLUMNA IZQUIERDA: Alertas y Detalle de Movimientos */}
        <div className="space-y-6">
          
          {/* Alertas de Cuotas por vencer */}
          {data.proximos_vencimientos?.length > 0 && (
            <section id="section-alertas-vencimiento" className="px-4 lg:px-0">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 bg-blue-600 rounded-lg shadow-lg shadow-blue-900/20">
                  <CreditCard className="text-white" size={14} />
                </div>
                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-900 dark:text-neutral-100">Cuotas próximas a vencer</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* COLUMNA: QUEDAN 2 */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-2">
                    <span className="text-[9px] font-black uppercase text-blue-600 tracking-tighter">Quedan 2 Cuotas</span>
                    <span className="text-xs font-black text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                      Total: {formatARS(data.proximos_vencimientos.filter((v: any) => v.cuotas_restantes === 2).reduce((acc: number, v: any) => acc + v.monto_cuota, 0))}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {data.proximos_vencimientos.filter((v: any) => v.cuotas_restantes === 2).map((v: any, i: number) => (
                      <div key={i} className="bg-white dark:bg-neutral-900 p-3 rounded-2xl border border-blue-100 dark:border-blue-900/30 shadow-sm flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-1.5 h-6 rounded-full" style={{ backgroundColor: v.tarjeta_color }} />
                          <div>
                            <p className="text-xs font-bold text-gray-900 dark:text-neutral-100 leading-tight">{v.descripcion}</p>
                            <p className="text-[9px] font-bold text-gray-400 uppercase">{v.tarjeta_nombre}</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-black text-blue-600 whitespace-nowrap">{formatARS(v.monto_cuota)}</span>
                      </div>
                    ))}
                    {data.proximos_vencimientos.filter((v: any) => v.cuotas_restantes === 2).length === 0 && (
                      <p className="text-[10px] text-gray-400 italic text-center py-2">Sin vencimientos el mes próximo</p>
                    )}
                  </div>
                </div>

                {/* COLUMNA: ÚLTIMA CUOTA */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-2">
                    <span className="text-[9px] font-black uppercase text-emerald-600 tracking-tighter">Última Cuota</span>
                    <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                      Total: {formatARS(data.proximos_vencimientos.filter((v: any) => v.cuotas_restantes === 1).reduce((acc: number, v: any) => acc + v.monto_cuota, 0))}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {data.proximos_vencimientos.filter((v: any) => v.cuotas_restantes === 1).map((v: any, i: number) => (
                      <div key={i} className="bg-white dark:bg-neutral-900 p-3 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 shadow-sm flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-1.5 h-6 rounded-full" style={{ backgroundColor: v.tarjeta_color }} />
                          <div>
                            <p className="text-xs font-bold text-gray-900 dark:text-neutral-100 leading-tight">{v.descripcion}</p>
                            <p className="text-[9px] font-bold text-gray-400 uppercase">{v.tarjeta_nombre}</p>
                          </div>
                        </div>
                        <span className="text-[10px] font-black text-emerald-600 whitespace-nowrap">{formatARS(v.monto_cuota)}</span>
                      </div>
                    ))}
                    {data.proximos_vencimientos.filter((v: any) => v.cuotas_restantes === 1).length === 0 && (
                      <p className="text-[10px] text-gray-400 italic text-center py-2">Sin vencimientos este mes</p>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}

          <section id="section-movimientos-detalle" className="bg-white dark:bg-neutral-900 rounded-3xl shadow-sm border border-gray-100 dark:border-neutral-800 transition-all overflow-hidden mx-4 lg:mx-0">
            <header id="header-movimientos-detalle" className="p-6 border-b border-gray-100 dark:border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                  <Wallet className="text-blue-600 dark:text-blue-400" size={20}/>
                </div>
                <h2 id="title-movimientos-detalle" className="font-bold text-gray-900 dark:text-neutral-100">
                  Detalle de Movimientos
                </h2>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">Saldo Mensual</span>
                <p className={`text-lg font-black ${totalFiltrado >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatARS(totalFiltrado)}
                </p>
              </div>
            </header>
            
            <div id="wrapper-movimientos-grid">
              {/* VISTA MÓVIL (CARDS) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:hidden p-4">
                {data.movimientos_mes.map((mov: any) => (
                  <Fragment key={`${mov.tipo}-${mov.id}`}>
                    <article 
                      onClick={() => setEditingItem(editingItem?.id === mov.id ? null : { id: mov.id, tipo: mov.tipo })}
                      className={`group relative bg-white dark:bg-neutral-900 p-4 rounded-2xl border transition-all cursor-pointer ${
                        editingItem?.id === mov.id ? 'border-blue-500 shadow-lg' : 'border-gray-100 dark:border-neutral-800'
                      }`}
                    >
                      <div className="absolute left-0 top-0 w-1.5 h-full rounded-l-2xl" style={{ backgroundColor: mov.tarjeta_color || (mov.tipo === 'ingreso' ? '#10B981' : (mov.es_fijo ? '#3B82F6' : '#64748B')) }} />
                      <div className="pl-3">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-bold text-gray-900 dark:text-neutral-100 flex-1 leading-tight">{mov.descripcion}</h4>
                          <p className={`text-sm font-black ${mov.tipo === 'ingreso' ? 'text-emerald-600' : 'text-gray-900 dark:text-neutral-100'} whitespace-nowrap ml-4`}>
                            {mov.tipo === 'ingreso' ? '+' : '-'} {formatARS(mov.monto)}
                          </p>
                        </div>
                        <div className="flex justify-between items-end">
                          <div className="space-y-1">
                            <span className="text-[9px] font-bold text-gray-400 bg-gray-50 dark:bg-neutral-950 px-1.5 py-0.5 rounded uppercase tracking-wider">{mov.medio_pago}</span>
                            {mov.tipo === 'tarjeta' && <p className="text-[9px] text-blue-500 font-bold uppercase tracking-tight">Cuota {mov.cuota_actual}/{mov.cuotas_total}</p>}
                          </div>
                          <Edit3 size={14} className={editingItem?.id === mov.id ? 'text-blue-500' : 'text-gray-300'} />
                        </div>
                      </div>
                    </article>
                    {editingItem?.id === mov.id && (
                      <div className="col-span-full bg-gray-50 dark:bg-neutral-950 p-4 rounded-2xl mb-4">
                        <InlineEditForm id={mov.id} tipo={mov.tipo} mesActual={mes} anioActual={anio} onClose={() => setEditingItem(null)} />
                      </div>
                    )}
                  </Fragment>
                ))}
              </div>

              {/* VISTA DESKTOP (TABLA AGRUPADA) */}
              <div className="hidden lg:block">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-neutral-950 text-[10px] uppercase font-bold text-gray-400 dark:text-neutral-500 tracking-widest border-b border-gray-100 dark:border-neutral-800">
                      <th className="px-6 py-4">Descripción / Concepto</th>
                      <th className="px-6 py-4">Medio de Pago</th>
                      <th className="px-6 py-4 text-right">Monto</th>
                      <th className="px-6 py-4 text-center w-20"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                    
                    {/* GRUPO: INGRESOS */}
                    <GrupoDesktop 
                      titulo="Ingresos" 
                      colorClass="text-emerald-600 dark:text-emerald-400"
                      bgClass="bg-emerald-50/50 dark:bg-emerald-950/10"
                      icon={PiggyBank}
                      movimientos={movimientosAgrupados.ingresos}
                      expandido={seccionesAbiertas.has('ingresos')}
                      onToggle={() => toggleSeccion('ingresos')}
                      editingItem={editingItem}
                      setEditingItem={setEditingItem}
                      creandoEnSeccion={creandoEnSeccion}
                      setCreandoEnSeccion={setCreandoEnSeccion}
                      mes={mes}
                      anio={anio}
                    />

                    {/* GRUPO: CUOTAS */}
                    <GrupoDesktop 
                      titulo="Cuotas de Tarjeta" 
                      colorClass="text-amber-600 dark:text-amber-400"
                      bgClass="bg-amber-50/50 dark:bg-amber-950/10"
                      icon={CreditCard}
                      movimientos={movimientosAgrupados.cuotas}
                      expandido={seccionesAbiertas.has('cuotas')}
                      onToggle={() => toggleSeccion('cuotas')}
                      editingItem={editingItem}
                      setEditingItem={setEditingItem}
                      totalesCards={totalesPorTarjeta}
                      tarjetaFiltro={tarjetaFiltro}
                      setTarjetaFiltro={setTarjetaFiltro}
                      creandoEnSeccion={creandoEnSeccion}
                      setCreandoEnSeccion={setCreandoEnSeccion}
                      mes={mes}
                      anio={anio}
                    />

                    {/* GRUPO: GASTOS FIJOS */}
                    <GrupoDesktop 
                      titulo="Gastos Fijos" 
                      colorClass="text-blue-600 dark:text-blue-400"
                      bgClass="bg-blue-50/50 dark:bg-blue-950/10"
                      icon={Wallet}
                      movimientos={movimientosAgrupados.fijos}
                      expandido={seccionesAbiertas.has('fijos')}
                      onToggle={() => toggleSeccion('fijos')}
                      editingItem={editingItem}
                      setEditingItem={setEditingItem}
                      creandoEnSeccion={creandoEnSeccion}
                      setCreandoEnSeccion={setCreandoEnSeccion}
                      mes={mes}
                      anio={anio}
                    />

                    {/* GRUPO: GASTOS VARIABLES */}
                    <GrupoDesktop 
                      titulo="Gastos Variados" 
                      colorClass="text-slate-600 dark:text-slate-400"
                      bgClass="bg-slate-50/50 dark:bg-slate-950/10"
                      icon={Info}
                      movimientos={movimientosAgrupados.variables}
                      expandido={seccionesAbiertas.has('variables')}
                      onToggle={() => toggleSeccion('variables')}
                      editingItem={editingItem}
                      setEditingItem={setEditingItem}
                      creandoEnSeccion={creandoEnSeccion}
                      setCreandoEnSeccion={setCreandoEnSeccion}
                      mes={mes}
                      anio={anio}
                    />
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>

        {/* COLUMNA DERECHA: Gráficos y Tendencia (Desktop Only) */}
        <aside className="hidden lg:flex lg:flex-col gap-6">
          <section className="bg-white dark:bg-neutral-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-neutral-800">
            <h3 className="font-bold text-gray-900 dark:text-neutral-100 mb-6 flex items-center gap-2">
              <CreditCard className="text-blue-500" size={18}/> Gastos x Tarjeta
            </h3>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.cuotas_por_tarjeta} layout="vertical">
                  <XAxis type="number" hide />
                  <YAxis dataKey="nombre" type="category" axisLine={false} tickLine={false} width={100} tick={{ fontSize: 11, fontWeight: 600 }} />
                  <Tooltip cursor={{ fill: 'transparent' }} content={({ active, payload }) => {
                    if (active && payload?.length) {
                      return (
                        <div className="bg-white dark:bg-neutral-900 p-3 rounded-xl border border-gray-100 dark:border-neutral-800 shadow-xl text-xs">
                          <p className="font-black text-gray-900 dark:text-neutral-100">{payload[0].payload.nombre}</p>
                          <p className="text-blue-600 font-bold mt-1">{formatARS(payload[0].value as number)}</p>
                        </div>
                      );
                    }
                    return null;
                  }} />
                  <Bar dataKey="monto" radius={[0, 8, 8, 0]} barSize={24}>
                    {data.cuotas_por_tarjeta.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                    <LabelList 
                      dataKey="monto" 
                      position="insideRight" 
                      content={(props: any) => {
                        const { x, y, width, value } = props;
                        if (width < 50) return null; // No mostrar si es muy angosta
                        return (
                          <text x={x + width - 10} y={y + 15} fill="#fff" fontSize={10} fontWeight="bold" textAnchor="end">
                            {formatARSCompact(value)}
                          </text>
                        );
                      }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="bg-white dark:bg-neutral-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-neutral-800">
            <h3 className="font-bold text-gray-900 dark:text-neutral-100 mb-6 flex items-center gap-2">
              <TrendingUp className="text-emerald-500" size={18}/> Tendencia 6 Meses
            </h3>
            <div className="h-[220px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.proximos_6_meses} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="mes" tickFormatter={(m) => MESES_CORTO[m]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} />
                  <YAxis hide domain={['auto', 'auto']} />
                  <Tooltip content={({ active, payload }) => {
                    if (active && payload?.length) {
                      return (
                        <div className="bg-white dark:bg-neutral-900 p-2 rounded-lg border border-gray-100 dark:border-neutral-800 shadow-md text-xs font-bold">
                          {formatARS(payload[0].value as number)}
                        </div>
                      );
                    }
                    return null;
                  }} />
                  <Line type="monotone" dataKey="total_mes" stroke="#3B82F6" strokeWidth={4} dot={{ r: 4, fill: '#3B82F6', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }}>
                    <LabelList dataKey="total_mes" position="top" formatter={(v: number) => formatARSCompact(v)} style={{ fontSize: '10px', fontWeight: 'bold', fill: '#64748B' }} />
                  </Line>
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        </aside>

      </div>
    </main>
  );
}

// Helper: Fila de Grupo para PC
function GrupoDesktop({ titulo, icon: Icon, colorClass, bgClass, movimientos, expandido, onToggle, editingItem, setEditingItem, totalesCards, tarjetaFiltro, setTarjetaFiltro, creandoEnSeccion, setCreandoEnSeccion, mes, anio }: any) {
  
  // Lógica de filtrado de movimientos
  const movimientosAMostrar = useMemo(() => {
    if (titulo === 'Cuotas de Tarjeta' && tarjetaFiltro) {
      return movimientos.filter((m: any) => m.medio_pago === tarjetaFiltro);
    }
    return movimientos;
  }, [movimientos, tarjetaFiltro, titulo]);

  const totalGrupo = movimientosAMostrar.reduce((acc: number, m: any) => acc + m.monto, 0);
  const tipoSeccion = titulo === 'Ingresos' ? 'ingreso' : titulo === 'Cuotas de Tarjeta' ? 'tarjeta' : 'gasto';

  return (
    <>
      <tr 
        className={`transition-colors border-t border-gray-100 dark:border-neutral-800 ${bgClass}`}
      >
        <td colSpan={4} className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center cursor-pointer" onClick={onToggle}>
                <div className={`p-1.5 rounded-lg ${bgClass} border border-current opacity-20 mr-3`}>
                  <Icon size={14} className={colorClass} />
                </div>
                <ChevronDown size={16} className={`text-gray-400 transition-transform ${expandido ? '' : '-rotate-90'}`} />
                <span className={`text-[11px] font-black uppercase tracking-widest ${colorClass} ml-2`}>{titulo}</span>
                <span className="text-[10px] font-bold text-gray-400 bg-white/50 px-2 py-0.5 rounded-full ml-3">{movimientos.length} items</span>
              </div>
              
              {/* Botón de creación rápida */}
              <button 
                onClick={() => setCreandoEnSeccion(creandoEnSeccion === tipoSeccion ? null : tipoSeccion)}
                className={`ml-4 p-1 rounded-full transition-all ${creandoEnSeccion === tipoSeccion ? 'bg-red-500 text-white rotate-45' : 'bg-blue-600 text-white hover:scale-110 shadow-lg shadow-blue-900/20'}`}
              >
                <Plus size={14} />
              </button>
            </div>
            
            <div className="flex items-center gap-4">
               {tarjetaFiltro && titulo === 'Cuotas de Tarjeta' && (
                 <span className="text-[10px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded animate-pulse uppercase">Filtrado por tarjeta</span>
               )}
               <span className={`text-sm font-black ${colorClass}`}>
                {titulo === 'Ingresos' ? '+' : '-'} {formatARS(totalGrupo)}
              </span>
            </div>
          </div>
        </td>
      </tr>

      {/* Formulario de Creación Inline */}
      {creandoEnSeccion === tipoSeccion && (
        <tr>
          <td colSpan={4} className="p-0 border-none">
            <InlineCreateForm 
              tipo={tipoSeccion as any} 
              mes={mes} 
              anio={anio} 
              onClose={() => setCreandoEnSeccion(null)} 
            />
          </td>
        </tr>
      )}

      {expandido && totalesCards && (
        <tr>
          <td colSpan={4} className="px-6 py-3 bg-amber-50/20 dark:bg-amber-950/5">
            <div className="flex flex-wrap gap-2">
              {totalesCards.map((t: any) => (
                <button 
                  key={t.nombre} 
                  onClick={() => setTarjetaFiltro(tarjetaFiltro === t.nombre ? null : t.nombre)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full shadow-sm transition-all hover:scale-105 active:scale-95 ${tarjetaFiltro === t.nombre ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-black' : 'opacity-70 hover:opacity-100'}`}
                  style={{ backgroundColor: t.color }}
                >
                  <span className="text-[9px] font-black text-white uppercase tracking-tighter">{t.nombre}</span>
                  <span className="text-[10px] font-black text-white">{formatARS(t.total)}</span>
                  {tarjetaFiltro === t.nombre && <X size={10} className="text-white ml-1" />}
                </button>
              ))}
              {tarjetaFiltro && (
                <button 
                  onClick={() => setTarjetaFiltro(null)}
                  className="text-[9px] font-bold text-gray-400 hover:text-gray-600 px-3 py-1.5"
                >
                  LIMPIAR FILTRO
                </button>
              )}
            </div>
          </td>
        </tr>
      )}

      {expandido && movimientosAMostrar.map((mov: any) => (
        <Fragment key={`${mov.tipo}-${mov.id}`}>
          <tr className={`group hover:bg-gray-50/80 transition-colors border-b border-gray-50 dark:border-neutral-800/50 ${editingItem?.id === mov.id ? 'bg-blue-50/50' : ''}`}>
            <td className="px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-6 rounded-full" style={{ backgroundColor: mov.tarjeta_color || (mov.tipo === 'ingreso' ? '#10B981' : (mov.es_fijo ? '#3B82F6' : '#64748B')) }} />
                <div>
                  <p className="text-sm font-bold text-gray-800 dark:text-neutral-200">{mov.descripcion}</p>
                  {mov.tipo === 'tarjeta' && (
                    <p className="text-[10px] text-blue-500 font-bold uppercase tracking-tight">Cuota {mov.cuota_actual}/{mov.cuotas_total}</p>
                  )}
                </div>
              </div>
            </td>
            <td className="px-6 py-4">
              <span className="text-[10px] font-bold text-gray-400 bg-gray-50 dark:bg-neutral-900 px-2 py-1 rounded-lg uppercase tracking-wider">{mov.medio_pago}</span>
            </td>
            <td className="px-6 py-4 text-right">
              <p className={`text-sm font-black ${mov.tipo === 'ingreso' ? 'text-emerald-600' : 'text-gray-900 dark:text-neutral-100'}`}>
                {formatARS(mov.monto)}
              </p>
            </td>
            <td className="px-6 py-4 text-center">
              <button 
                onClick={() => setEditingItem(editingItem?.id === mov.id ? null : { id: mov.id, tipo: mov.tipo })}
                className={`p-2 rounded-xl transition-all ${editingItem?.id === mov.id ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-300 hover:text-blue-600 hover:bg-blue-50'}`}
              >
                <Edit3 size={16} />
              </button>
            </td>
          </tr>
          {editingItem?.id === mov.id && (
            <tr>
              <td colSpan={4} className="p-4 bg-gray-50 dark:bg-neutral-950 border-none">
                <div className="max-w-2xl mx-auto bg-white dark:bg-neutral-900 p-6 rounded-3xl shadow-xl border border-blue-100 dark:border-blue-900/30">
                  <InlineEditForm id={mov.id} tipo={mov.tipo} mesActual={mes} anioActual={anio} onClose={() => setEditingItem(null)} />
                </div>
              </td>
            </tr>
          )}
        </Fragment>
      ))}
    </>
  );
}

