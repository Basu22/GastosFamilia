import { useState, useMemo, Fragment } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getDashboardInfo } from '../api/client';
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, LabelList } from 'recharts';
import { TrendingUp, Wallet, CreditCard, PiggyBank, Edit3, ChevronLeft, ChevronRight, Calendar, ChevronDown, Info, Plus, X } from 'lucide-react';
import { formatARS, formatARSCompact, MESES_CORTO } from '../utils/format';
import MetricCard from '../components/ui/MetricCard';
import InlineEditForm from '../components/dashboard/InlineEditForm';
import InlineCreateForm from '../components/dashboard/InlineCreateForm';
import PanelArca from '../components/dashboard/PanelArca';

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
    <main id="dashboard-container" className="space-y-10 lg:space-y-12 animate-in fade-in duration-700 pb-12">
      {/* Header con Selector de Fecha */}
      <header id="dashboard-header" className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between px-4 lg:px-0">
        <div>
          <h1 id="dashboard-title" className="text-3xl lg:text-4xl font-bold text-white tracking-tight">Estado de Cuenta</h1>
          <p id="dashboard-subtitle" className="text-sm lg:text-base text-gray-400 mt-2 font-medium">Gestioná el balance familiar con claridad y paz.</p>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={goToToday}
            className="hidden md:flex items-center gap-2 px-6 py-3 bg-aura-surface/40 backdrop-blur-md border border-aura-border/50 rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] text-aura-lavender hover:bg-aura-surface/60 transition-all active:scale-95"
          >
            Hoy
          </button>

          <div id="date-selector" className="relative flex items-center gap-3 bg-aura-surface/40 backdrop-blur-md p-2 rounded-3xl border border-aura-border/50 shadow-xl">
            <Calendar size={18} className="text-aura-lavender ml-3 opacity-70" />
            <button id="btn-prev-month" onClick={prevMonth} className="p-3 hover:bg-white/5 rounded-2xl text-aura-lavender transition-all active:scale-75"><ChevronLeft size={24} /></button>
            
            <div 
              className="px-6 text-center min-w-[140px] cursor-pointer hover:bg-white/5 rounded-2xl py-2 transition-all group"
              onClick={() => setShowMonthPicker(!showMonthPicker)}
            >
              <span id="current-month" className="block text-sm font-bold text-white uppercase tracking-[0.25em] group-hover:text-aura-lavender transition-colors">{MESES_CORTO[mes]}</span>
              <span id="current-year" className="block text-[10px] font-bold text-aura-mint/60 mt-0.5 uppercase tracking-widest">{anio}</span>
            </div>

            <button id="btn-next-month" onClick={nextMonth} className="p-3 hover:bg-white/5 rounded-2xl text-aura-lavender transition-all active:scale-75"><ChevronRight size={24} /></button>

            {/* Selector de Meses (Dropdown) */}
            {showMonthPicker && (
              <div className="absolute top-full left-0 right-0 mt-4 glass-card z-50 p-6 animate-in zoom-in-95 fade-in duration-300">
                <div className="grid grid-cols-3 gap-3">
                  {MESES_CORTO.slice(1).map((m, idx) => (
                    <button 
                      key={m}
                      onClick={() => { setMes(idx + 1); setShowMonthPicker(false); }}
                      className={`py-3 rounded-2xl text-[10px] font-bold uppercase tracking-wider transition-all ${mes === idx + 1 ? 'bg-aura-lavender text-aura-bg shadow-lg shadow-aura-lavender/20' : 'hover:bg-white/5 text-gray-400'}`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-6 pt-6 border-t border-aura-border/30">
                   <button onClick={() => setAnio(anio - 1)} className="p-2 hover:bg-white/10 rounded-xl text-aura-lavender"><ChevronLeft size={20}/></button>
                   <span className="text-sm font-bold text-white tracking-widest">{anio}</span>
                   <button onClick={() => setAnio(anio + 1)} className="p-2 hover:bg-white/10 rounded-xl text-aura-lavender"><ChevronRight size={20}/></button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Métricas Principales */}
      <section id="section-metrics" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 px-4 lg:px-0">
        <MetricCard id="metric-ingresos" label="Ingresos" value={data.ingreso} variant="success" icon={PiggyBank} />
        <MetricCard id="metric-cuotas" label="Cuotas Tarjeta" value={data.total_cuotas} variant="warning" icon={CreditCard} />
        <MetricCard id="metric-gastos" label="Gastos Fijos/Var" value={data.total_gastos_mensuales} variant="danger" icon={Wallet} />
        <MetricCard id="metric-ahorro" label="Balance Mes" value={data.ahorro_proyectado} variant={data.ahorro_proyectado >= 0 ? 'default' : 'danger'} icon={TrendingUp} subtitle="Disponible para ahorro/gastos" />
      </section>

      {/* GRID PRINCIPAL: Movimientos (L) | Gráficos (R - Desktop only) */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-10">
        
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

          {/* MÓDULO ARCA */}
          <div className="mx-4 lg:mx-0">
            <PanelArca mes={mes} anio={anio} />
          </div>

          <section id="section-movimientos-detalle" className="bg-white dark:bg-neutral-900 rounded-3xl shadow-sm border border-gray-100 dark:border-neutral-800 transition-all overflow-hidden mx-4 lg:mx-0">
            <header id="header-movimientos-detalle" className="p-6 border-b border-gray-100 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-2xl">
                  <Wallet className="text-blue-600 dark:text-blue-400" size={24}/>
                </div>
                <h2 id="title-movimientos-detalle" className="font-bold text-gray-900 dark:text-neutral-100 text-lg leading-tight">
                  Detalle de<br />Movimientos
                </h2>
              </div>
              <div className="text-left sm:text-right sm:pb-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Saldo Mensual</span>
                <p className={`text-xl font-black ${totalFiltrado >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatARS(totalFiltrado)}
                </p>
              </div>
            </header>
            
            <div id="wrapper-movimientos-grid">
              {/* VISTA MÓVIL (GRUPOS COLAPSABLES) */}
              <div className="flex flex-col gap-3 lg:hidden p-4">
                <GrupoMobile
                  titulo="Ingresos"
                  colorClass="text-emerald-600 dark:text-emerald-400"
                  bgClass="bg-emerald-50 dark:bg-emerald-950/20"
                  borderColor="border-emerald-200 dark:border-emerald-900/50"
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
                <GrupoMobile
                  titulo="Cuotas de Tarjeta"
                  colorClass="text-amber-600 dark:text-amber-400"
                  bgClass="bg-amber-50 dark:bg-amber-950/20"
                  borderColor="border-amber-200 dark:border-amber-900/50"
                  icon={CreditCard}
                  movimientos={movimientosAgrupados.cuotas}
                  expandido={seccionesAbiertas.has('cuotas')}
                  onToggle={() => toggleSeccion('cuotas')}
                  editingItem={editingItem}
                  setEditingItem={setEditingItem}
                  creandoEnSeccion={creandoEnSeccion}
                  setCreandoEnSeccion={setCreandoEnSeccion}
                  totalesCards={totalesPorTarjeta}
                  tarjetaFiltro={tarjetaFiltro}
                  setTarjetaFiltro={setTarjetaFiltro}
                  mes={mes}
                  anio={anio}
                />
                <GrupoMobile
                  titulo="Gastos Fijos"
                  colorClass="text-blue-600 dark:text-blue-400"
                  bgClass="bg-blue-50 dark:bg-blue-950/20"
                  borderColor="border-blue-200 dark:border-blue-900/50"
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
                <GrupoMobile
                  titulo="Gastos Variados"
                  colorClass="text-slate-600 dark:text-slate-400"
                  bgClass="bg-slate-50 dark:bg-slate-950/20"
                  borderColor="border-slate-200 dark:border-slate-900/50"
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
        <aside className="hidden lg:flex lg:flex-col gap-10">
          <section className="glass-card aura-glow-lavender p-8 border-aura-lavender/10">
            <h3 className="font-bold text-white mb-8 flex items-center gap-3 text-lg">
              <div className="p-2 bg-aura-lavender/20 rounded-xl text-aura-lavender"><CreditCard size={20}/></div>
              Gastos x Tarjeta
            </h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.cuotas_por_tarjeta} layout="vertical" margin={{ left: -20 }}>
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="nombre" 
                    type="category" 
                    axisLine={false} 
                    tickLine={false} 
                    width={100} 
                    tick={{ fontSize: 11, fontWeight: 600, fill: '#94a3b8' }} 
                  />
                  <Tooltip 
                    cursor={{ fill: 'rgba(255, 255, 255, 0.03)' }} 
                    content={({ active, payload }) => {
                      if (active && payload?.length) {
                        return (
                          <div className="glass-card p-4 border-aura-border/50 text-xs shadow-2xl">
                            <p className="font-bold text-white">{payload[0].payload.nombre}</p>
                            <p className="text-aura-lavender font-bold mt-1 text-base">{formatARS(payload[0].value as number)}</p>
                          </div>
                        );
                      }
                      return null;
                    }} 
                  />
                  <Bar dataKey="monto" radius={[0, 12, 12, 0]} barSize={20}>
                    {data.cuotas_por_tarjeta.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          <section className="glass-card aura-glow-mint p-8 border-aura-mint/10">
            <h3 className="font-bold text-white mb-8 flex items-center gap-3 text-lg">
              <div className="p-2 bg-aura-mint/20 rounded-xl text-aura-mint"><TrendingUp size={20}/></div>
              Tendencia 6 Meses
            </h3>
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.proximos_6_meses} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <XAxis 
                    dataKey="mes" 
                    tickFormatter={(m) => MESES_CORTO[m]} 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} 
                  />
                  <YAxis hide domain={['auto', 'auto']} />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload?.length) {
                        return (
                          <div className="glass-card p-3 border-aura-border/50 text-sm font-bold text-aura-mint">
                            {formatARS(payload[0].value as number)}
                          </div>
                        );
                      }
                      return null;
                    }} 
                  />
                  <Line 
                    type="basis" 
                    dataKey="total_mes" 
                    stroke="#A7F3D0" 
                    strokeWidth={4} 
                    dot={{ r: 0 }} 
                    activeDot={{ r: 6, fill: '#A7F3D0', stroke: '#0F1219', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        </aside>

      </div>
    </main>
  );
}

// ─── Vista Desktop: Fila de Grupo para tabla ─────────────────────────────────────────
function GrupoDesktop({ titulo, icon: Icon, colorClass, bgClass, movimientos, expandido, onToggle, editingItem, setEditingItem, totalesCards, tarjetaFiltro, setTarjetaFiltro, creandoEnSeccion, setCreandoEnSeccion, mes, anio }: any) {
  
  const movimientosAMostrar = useMemo(() => {
    if (titulo === 'Cuotas de Tarjeta' && tarjetaFiltro) {
      return movimientos.filter((m: any) => m.medio_pago === tarjetaFiltro);
    }
    return movimientos;
  }, [movimientos, tarjetaFiltro, titulo]);

  const totalGrupo = movimientosAMostrar.reduce((acc: number, m: any) => acc + m.monto, 0);
  const tipoSeccion = titulo === 'Ingresos' ? 'ingreso' : titulo === 'Cuotas de Tarjeta' ? 'tarjeta' : 'gasto';

  const auraColor = titulo === 'Ingresos' ? 'text-aura-mint' : titulo === 'Cuotas de Tarjeta' ? 'text-aura-lavender' : 'text-aura-coral';

  return (
    <>
      <tr className="border-none">
        <td colSpan={4} className="px-6 py-4">
          <div className="flex items-center justify-between bg-aura-surface/30 backdrop-blur-md rounded-2xl p-4 border border-aura-border/20">
            <div className="flex items-center gap-4">
              <div className="flex items-center cursor-pointer group" onClick={onToggle}>
                <div className={`p-3 rounded-xl bg-white/5 border border-white/10 mr-4 transition-transform group-hover:scale-110`}>
                  <Icon size={18} className={auraColor} />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className={`text-[12px] font-bold uppercase tracking-[0.2em] ${auraColor}`}>{titulo}</span>
                    <ChevronDown size={14} className={`text-gray-500 transition-transform ${expandido ? '' : '-rotate-90'}`} />
                  </div>
                  <span className="text-[10px] font-medium text-gray-500 uppercase tracking-widest mt-0.5">{movimientos.length} movimientos</span>
                </div>
              </div>
              
              <button 
                onClick={() => setCreandoEnSeccion(creandoEnSeccion === tipoSeccion ? null : tipoSeccion)}
                className={`ml-4 p-2 rounded-xl transition-all duration-300 ${creandoEnSeccion === tipoSeccion ? 'bg-aura-coral text-aura-bg rotate-45' : 'bg-aura-lavender text-aura-bg hover:scale-110 shadow-lg shadow-aura-lavender/20'}`}
              >
                <Plus size={16} strokeWidth={3} />
              </button>
            </div>
            
            <div className="flex flex-col items-end">
              <span className={`text-xl font-bold tracking-tight ${auraColor}`}>
                {titulo === 'Ingresos' ? '+' : '-'} {formatARS(totalGrupo)}
              </span>
            </div>
          </div>
        </td>
      </tr>

      {creandoEnSeccion === tipoSeccion && (
        <tr>
          <td colSpan={4} className="px-6 pb-6">
            <div className="glass-card p-8 border-aura-lavender/20 animate-in slide-in-from-top-4 duration-300">
              <InlineCreateForm 
                tipo={tipoSeccion as any} 
                mes={mes} 
                anio={anio} 
                onClose={() => setCreandoEnSeccion(null)} 
              />
            </div>
          </td>
        </tr>
      )}

      {expandido && totalesCards && (
        <tr>
          <td colSpan={4} className="px-10 py-4">
            <div className="flex flex-wrap gap-3">
              {totalesCards.map((t: any) => (
                <button 
                  key={t.nombre} 
                  onClick={() => setTarjetaFiltro(tarjetaFiltro === t.nombre ? null : t.nombre)}
                  className={`flex items-center gap-3 px-4 py-2 rounded-2xl backdrop-blur-md transition-all hover:scale-105 active:scale-95 border ${tarjetaFiltro === t.nombre ? 'ring-2 ring-white ring-offset-4 ring-offset-aura-bg border-white' : 'border-white/10 opacity-70 hover:opacity-100'}`}
                  style={{ backgroundColor: `${t.color}33`, borderColor: `${t.color}66` }}
                >
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} />
                  <span className="text-[10px] font-bold text-white uppercase tracking-wider">{t.nombre}</span>
                  <span className="text-xs font-bold text-white">{formatARS(t.total)}</span>
                </button>
              ))}
            </div>
          </td>
        </tr>
      )}

      {expandido && (
        <tr>
          <td colSpan={4} className="px-6">
            <div className="space-y-3 mb-6">
              {movimientosAMostrar.map((mov: any) => (
                <div 
                  key={`${mov.tipo}-${mov.id}`}
                  className={`group flex items-center justify-between p-5 rounded-2xl transition-all duration-300 ${editingItem?.id === mov.id ? 'bg-aura-lavender/10 border border-aura-lavender/30' : 'bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10'}`}
                >
                  <div className="flex items-center gap-5">
                    <div className="w-1 h-10 rounded-full" style={{ backgroundColor: mov.tarjeta_color || (mov.tipo === 'ingreso' ? '#A7F3D0' : (mov.es_fijo ? '#C7D2FE' : '#94a3b8')) }} />
                    <div>
                      <p className="text-base font-semibold text-white">
                        {mov.descripcion}
                        {mov.previsionado && (
                          <span className="ml-3 text-[9px] bg-aura-gold/20 text-aura-gold border border-aura-gold/30 px-2 py-0.5 rounded-full uppercase font-bold tracking-[0.1em]">Previsionado</span>
                        )}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{mov.medio_pago}</span>
                        {mov.tipo === 'tarjeta' && (
                          <span className="text-[10px] text-aura-lavender font-bold uppercase tracking-widest opacity-80">Cuota {mov.cuota_actual}/{mov.cuotas_total}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-8">
                    <p className={`text-lg font-bold tracking-tight ${mov.tipo === 'ingreso' ? 'text-aura-mint' : 'text-white'}`}>
                      {formatARS(mov.monto)}
                    </p>
                    <button 
                      onClick={() => setEditingItem(editingItem?.id === mov.id ? null : { id: mov.id, tipo: mov.tipo })}
                      className={`p-3 rounded-xl transition-all ${editingItem?.id === mov.id ? 'bg-aura-lavender text-aura-bg shadow-lg' : 'text-gray-500 hover:text-white hover:bg-white/10'}`}
                    >
                      <Edit3 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}

      {editingItem && expandido && (
        <tr>
          <td colSpan={4} className="px-6 pb-8">
            {movimientosAMostrar.some((m: any) => m.id === editingItem.id) && (
              <div className="glass-card p-10 border-aura-lavender/30 animate-in zoom-in-95 duration-300">
                <InlineEditForm id={editingItem.id} tipo={editingItem.tipo} mesActual={mes} anioActual={anio} onClose={() => setEditingItem(null)} />
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

function GrupoMobile({ titulo, icon: Icon, colorClass, bgClass, borderColor, movimientos, expandido, onToggle, editingItem, setEditingItem, totalesCards, tarjetaFiltro, setTarjetaFiltro, creandoEnSeccion, setCreandoEnSeccion, mes, anio }: any) {

  const movimientosAMostrar = useMemo(() => {
    if (titulo === 'Cuotas de Tarjeta' && tarjetaFiltro) {
      return movimientos.filter((m: any) => m.medio_pago === tarjetaFiltro);
    }
    return movimientos;
  }, [movimientos, tarjetaFiltro, titulo]);

  const totalGrupo = movimientosAMostrar.reduce((acc: number, m: any) => acc + m.monto, 0);
  const tipoSeccion = titulo === 'Ingresos' ? 'ingreso' : titulo === 'Cuotas de Tarjeta' ? 'tarjeta' : 'gasto';
  
  const auraColor = titulo === 'Ingresos' ? 'text-aura-mint' : titulo === 'Cuotas de Tarjeta' ? 'text-aura-lavender' : 'text-aura-coral';

  return (
    <div className={`glass-card overflow-hidden transition-all duration-500 ${expandido ? 'aura-glow-lavender border-aura-lavender/20' : 'border-aura-border/20'}`}>
      <div className={`flex items-center justify-between px-6 py-6 transition-colors ${expandido ? 'bg-white/5' : ''}`}>
        <div className="flex flex-col gap-1 min-w-0" onClick={onToggle}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl bg-white/5 border border-white/10`}>
              <Icon size={18} className={auraColor} />
            </div>
            <div className="flex flex-col">
              <span className={`text-[10px] font-bold uppercase tracking-[0.2em] ${auraColor}`}>{titulo}</span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xl font-bold text-white tracking-tight">
                  {titulo === 'Ingresos' ? '+' : '-'} {formatARS(totalGrupo)}
                </span>
                <ChevronDown size={16} className={`text-gray-500 transition-transform ${expandido ? 'rotate-180' : ''}`} />
              </div>
            </div>
          </div>
        </div>

        <button
          onClick={() => setCreandoEnSeccion(creandoEnSeccion === tipoSeccion ? null : tipoSeccion)}
          className={`p-3 rounded-2xl transition-all duration-300 ${creandoEnSeccion === tipoSeccion ? 'bg-aura-coral text-aura-bg rotate-45' : 'bg-aura-lavender text-aura-bg shadow-lg shadow-aura-lavender/20'}`}
        >
          <Plus size={20} strokeWidth={3} />
        </button>
      </div>

      {creandoEnSeccion === tipoSeccion && (
        <div className="px-6 py-6 bg-aura-surface/50 animate-in slide-in-from-top-4 duration-300">
          <InlineCreateForm tipo={tipoSeccion as any} mes={mes} anio={anio} onClose={() => setCreandoEnSeccion(null)} />
        </div>
      )}

      {expandido && (
        <div className="px-4 pb-6 space-y-3 animate-in fade-in duration-500">
          {movimientosAMostrar.map((mov: any) => (
            <div 
              key={`${mov.tipo}-${mov.id}`} 
              className={`p-5 rounded-2xl border transition-all ${editingItem?.id === mov.id ? 'bg-aura-lavender/10 border-aura-lavender/40' : 'bg-white/5 border-white/5'}`}
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <div className="w-1 h-10 rounded-full" style={{ backgroundColor: mov.tarjeta_color || (mov.tipo === 'ingreso' ? '#A7F3D0' : (mov.es_fijo ? '#C7D2FE' : '#94a3b8')) }} />
                  <div>
                    <p className="text-base font-bold text-white leading-tight">{mov.descripcion}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{mov.medio_pago}</span>
                      {mov.tipo === 'tarjeta' && (
                        <span className="text-[10px] text-aura-lavender font-bold uppercase tracking-widest">Cuota {mov.cuota_actual}/{mov.cuotas_total}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`text-base font-bold tracking-tight ${mov.tipo === 'ingreso' ? 'text-aura-mint' : 'text-white'}`}>
                    {formatARS(mov.monto)}
                  </span>
                  <button 
                    onClick={() => setEditingItem(editingItem?.id === mov.id ? null : { id: mov.id, tipo: mov.tipo })}
                    className={`p-2 rounded-xl ${editingItem?.id === mov.id ? 'bg-aura-lavender text-aura-bg' : 'text-gray-500 bg-white/5'}`}
                  >
                    <Edit3 size={16} />
                  </button>
                </div>
              </div>
              {editingItem?.id === mov.id && (
                <div className="mt-6 pt-6 border-t border-aura-border/20">
                  <InlineEditForm id={mov.id} tipo={mov.tipo} mesActual={mes} anioActual={anio} onClose={() => setEditingItem(null)} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
