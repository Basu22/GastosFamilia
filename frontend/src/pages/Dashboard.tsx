import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDashboardInfo } from '../api/client';
import { reactivarGastoMensual } from '../api/gastos_mensuales';
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { TrendingUp, Wallet, CreditCard, PiggyBank, Edit3, ChevronLeft, ChevronRight, Calendar, ChevronDown, Plus, Landmark, Tag } from 'lucide-react';
import { formatARS, MESES_CORTO } from '../utils/format';
import MetricCard from '../components/ui/MetricCard';
import InlineEditForm from '../components/dashboard/InlineEditForm';
import InlineCreateForm from '../components/dashboard/InlineCreateForm';
import PanelArca from '../components/dashboard/PanelArca';
import { PanelReservas } from '../components/reservas/PanelReservas';
import ModalTarjetaDetalle from '../components/dashboard/ModalTarjetaDetalle';

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
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [tarjetaSeleccionada, setTarjetaSeleccionada] = useState<any | null>(null);
  
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

  // Agrupación de movimientos para PC (por Medio de Pago)
  const movimientosAgrupados = useMemo(() => {
    if (!data?.movimientos_mes) return { ingresos: [], tarjetas: [], reservas: [], efectivo: null };
    
    const ingresos = data.movimientos_mes.filter((m: any) => m.tipo === 'ingreso');
    const gastos = data.movimientos_mes.filter((m: any) => m.tipo !== 'ingreso');
    
    const tarjetasMap = new Map();
    const reservasMap = new Map();
    const efectivo: any = { nombre: 'Efectivo / Transf.', color: '#10B981', cuotas: [], fijos: [], variables: [], asignaciones: [], prestamos: [], total: 0 };
    
    gastos.forEach((m: any) => {
      const isTarjeta = m.tarjeta_nombre || m.tipo === 'tarjeta';
      const isReserva = m.reserva_nombre != null;
      
      if (isTarjeta && m.medio_pago !== 'Efectivo / Transf.') {
        const nombreTarjeta = m.tarjeta_nombre || m.medio_pago;
        if (!tarjetasMap.has(nombreTarjeta)) {
          tarjetasMap.set(nombreTarjeta, {
            nombre: nombreTarjeta, color: m.tarjeta_color || '#64748B',
            cuotas: [], fijos: [], variables: [], prestamos: [], total: 0
          });
        }
        const tData = tarjetasMap.get(nombreTarjeta);
        tData.total += m.monto;
        if (m.tipo === 'tarjeta') tData.cuotas.push(m);
        else if (m.es_fijo) tData.fijos.push(m);
        else tData.variables.push(m);
      } else if (isReserva) {
        const nombreReserva = m.reserva_nombre;
        if (!reservasMap.has(nombreReserva)) {
          reservasMap.set(nombreReserva, {
            nombre: nombreReserva, color: m.reserva_color || '#64748B',
            cuotas: [], fijos: [], variables: [], prestamos: [], total: 0
          });
        }
        const rData = reservasMap.get(nombreReserva);
        rData.total += m.monto;
        if (m.tipo === 'tarjeta') rData.cuotas.push(m);
        else if (m.es_fijo) rData.fijos.push(m);
        else rData.variables.push(m);
      } else {
        efectivo.total += m.monto;
        if (m.tipo === 'prestamo') efectivo.prestamos.push(m);
        else if (m.tipo === 'asignacion_reserva') efectivo.asignaciones.push(m);
        else if (m.es_fijo) efectivo.fijos.push(m);
        else efectivo.variables.push(m);
      }
    });

    const tarjetas = Array.from(tarjetasMap.values()).sort((a: any, b: any) => b.total - a.total);
    const reservas = Array.from(reservasMap.values()).sort((a: any, b: any) => b.total - a.total);

    return { ingresos, tarjetas, reservas, efectivo };
  }, [data]);

  const totalFiltrado = useMemo(() => {
    if (!data?.movimientos_mes) return 0;
    return data.movimientos_mes.reduce((acc: number, mov: any) => {
      if (mov.tipo !== 'ingreso' && mov.reserva_nombre) return acc; // Los gastos con reserva NO restan del balance mensual en UI
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
      <ModalTarjetaDetalle 
        tarjeta={tarjetaSeleccionada} 
        onClose={() => setTarjetaSeleccionada(null)} 
      />
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
      {(() => {
        // Calculate max length to keep all fonts at the same size
        const maxLen = Math.max(
          formatARS(data.ingreso).length + 2,
          formatARS(data.total_cuotas).length,
          formatARS(data.total_gastos_mensuales).length,
          formatARS(data.total_prestamos).length,
          formatARS(data.ahorro_proyectado).length + 2
        );
        const uniformTextSize = maxLen > 15 ? 'text-lg lg:text-xl xl:text-2xl' : maxLen > 12 ? 'text-xl lg:text-2xl xl:text-[1.7rem]' : 'text-2xl lg:text-3xl xl:text-4xl';

        return (
          <section id="section-metrics" className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 px-4 lg:px-0">
            <MetricCard id="metric-ingresos" label="Ingresos" value={data.ingreso} variant="success" icon={PiggyBank} textSizeClass={uniformTextSize} />
            <MetricCard id="metric-cuotas" label="Cuotas Fijas" value={data.total_cuotas} variant="warning" icon={CreditCard} textSizeClass={uniformTextSize} />
            <MetricCard id="metric-gastos" label="Gastos Fijos/Variables" value={data.total_gastos_mensuales} variant="danger" icon={Wallet} textSizeClass={uniformTextSize} />
            <MetricCard id="metric-prestamos" label="Préstamos" value={data.total_prestamos} variant="info" icon={Landmark} textSizeClass={uniformTextSize} />
            <MetricCard id="metric-ahorro" label="BALANCE DEL MES" value={data.ahorro_proyectado} variant={data.ahorro_proyectado >= 0 ? 'success' : 'danger'} icon={TrendingUp} textSizeClass={uniformTextSize} />
          </section>
        );
      })()}

      {/* GRID PRINCIPAL: Movimientos (L) | Gráficos (R - Desktop only) */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-10">
        
        {/* COLUMNA IZQUIERDA: Alertas y Detalle de Movimientos */}
        <div className="space-y-6">
          
          {/* Alertas de Cuotas por vencer */}
          {data.proximos_vencimientos?.length > 0 && (
            <section id="section-alertas-vencimiento" className="px-4 lg:px-0">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2 bg-aura-lavender/20 rounded-xl border border-aura-lavender/30">
                  <CreditCard className="text-aura-lavender" size={16} />
                </div>
                <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-white/90">Cuotas próximas a vencer</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* COLUMNA: QUEDAN 2 */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-3">
                    <span className="text-[10px] font-bold uppercase text-aura-lavender tracking-widest">Quedan 2 Cuotas</span>
                    <span className="text-[10px] font-bold text-aura-lavender bg-aura-lavender/10 px-3 py-1 rounded-full border border-aura-lavender/20 uppercase tracking-wider">
                      Total: {formatARS(data.proximos_vencimientos.filter((v: any) => v.cuotas_restantes === 2).reduce((acc: number, v: any) => acc + v.monto_cuota, 0))}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {data.proximos_vencimientos.filter((v: any) => v.cuotas_restantes === 2).map((v: any, i: number) => (
                      <div key={i} className="glass-card p-4 border-aura-lavender/10 flex items-center justify-between gap-4 transition-all hover:border-aura-lavender/30 group">
                        <div className="flex items-center gap-4">
                          <div className="w-1.5 h-8 rounded-full shadow-[0_0_12px_rgba(199,210,254,0.3)]" style={{ backgroundColor: v.tarjeta_color }} />
                          <div>
                            <p className="text-sm font-bold text-white leading-tight group-hover:text-aura-lavender transition-colors">{v.descripcion}</p>
                            <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-1">{v.tarjeta_nombre}</p>
                          </div>
                        </div>
                        <span className="text-sm font-bold text-aura-lavender tracking-tight">{formatARS(v.monto_cuota)}</span>
                      </div>
                    ))}
                    {data.proximos_vencimientos.filter((v: any) => v.cuotas_restantes === 2).length === 0 && (
                      <div className="text-center py-4 glass-card border-dashed border-white/5 opacity-50">
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest">Sin vencimientos el mes próximo</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* COLUMNA: ÚLTIMA CUOTA */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between px-3">
                    <span className="text-[10px] font-bold uppercase text-aura-mint tracking-widest">Última Cuota</span>
                    <span className="text-[10px] font-bold text-aura-mint bg-aura-mint/10 px-3 py-1 rounded-full border border-aura-mint/20 uppercase tracking-wider">
                      Total: {formatARS(data.proximos_vencimientos.filter((v: any) => v.cuotas_restantes === 1).reduce((acc: number, v: any) => acc + v.monto_cuota, 0))}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {data.proximos_vencimientos.filter((v: any) => v.cuotas_restantes === 1).map((v: any, i: number) => (
                      <div key={i} className="glass-card p-4 border-aura-mint/10 flex items-center justify-between gap-4 transition-all hover:border-aura-mint/30 group">
                        <div className="flex items-center gap-4">
                          <div className="w-1.5 h-8 rounded-full shadow-[0_0_12px_rgba(167,243,208,0.3)]" style={{ backgroundColor: v.tarjeta_color }} />
                          <div>
                            <p className="text-sm font-bold text-white leading-tight group-hover:text-aura-mint transition-colors">{v.descripcion}</p>
                            <p className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mt-1">{v.tarjeta_nombre}</p>
                          </div>
                        </div>
                        <span className="text-sm font-bold text-aura-mint tracking-tight">{formatARS(v.monto_cuota)}</span>
                      </div>
                    ))}
                    {data.proximos_vencimientos.filter((v: any) => v.cuotas_restantes === 1).length === 0 && (
                      <div className="text-center py-4 glass-card border-dashed border-white/5 opacity-50">
                        <p className="text-[10px] text-gray-400 uppercase tracking-widest">Sin vencimientos este mes</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* TOTALES POR TARJETA (Mobile & Desktop) */}
          {data.cuotas_por_tarjeta?.length > 0 && (
            <section id="section-totales-tarjetas" className="px-4 lg:px-0">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2 bg-aura-lavender/20 rounded-xl border border-aura-lavender/30">
                  <CreditCard className="text-aura-lavender" size={16} />
                </div>
                <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-white/90">A Pagar por Tarjeta</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {data.cuotas_por_tarjeta.map((t: any) => (
                  <div 
                    key={t.nombre} 
                    className="glass-card p-4 border border-white/5 flex flex-col justify-between hover:border-white/20 transition-all gap-2 cursor-pointer"
                    onClick={() => setTarjetaSeleccionada(t)}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.5)]" style={{ backgroundColor: t.color || '#64748B' }} />
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider truncate">{t.nombre}</span>
                    </div>
                    <span className="text-lg font-black text-white tracking-tight">{formatARS(t.monto)}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* PANEL DE RESERVAS */}
          <div className="mx-4 lg:mx-0">
            <PanelReservas mes={mes} anio={anio} disponible={data.ahorro_proyectado} movimientos={data.movimientos_mes} />
          </div>

          {/* MÓDULO ARCA */}
          <div className="mx-4 lg:mx-0">
            <PanelArca mes={mes} anio={anio} />
          </div>

          <section id="section-movimientos-detalle" className="glass-card border-white/5 mx-4 lg:mx-0 overflow-hidden shadow-2xl shadow-black/40">
            <header id="header-movimientos-detalle" className="p-8 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-6 bg-white/5 backdrop-blur-md">
              <div className="flex items-center gap-5">
                <div className="p-4 bg-aura-lavender/10 rounded-2xl border border-aura-lavender/20 shadow-[0_0_20px_rgba(199,210,254,0.1)]">
                  <Wallet className="text-aura-lavender" size={24}/>
                </div>
                <div className="flex flex-col">
                  <h2 id="title-movimientos-detalle" className="font-bold text-white text-xl tracking-tight">
                    Detalle de Movimientos
                  </h2>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mt-1">Gestión de flujo mensual</p>
                </div>
              </div>
              <div className="flex flex-col items-start sm:items-end p-4 bg-white/5 rounded-2xl border border-white/5 min-w-[200px]">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Balance del Mes</span>
                <p className={`text-2xl font-black tracking-tighter ${totalFiltrado >= 0 ? 'text-aura-mint' : 'text-aura-coral'}`}>
                  {totalFiltrado >= 0 ? '+' : ''} {formatARS(totalFiltrado)}
                </p>
              </div>
            </header>
            
            <div id="wrapper-movimientos-grid" className="bg-aura-bg/20">
              {/* VISTA MÓVIL (GRUPOS COLAPSABLES) */}
              <div className="flex flex-col gap-6 lg:hidden p-6 pb-12">
                <GrupoSimpleMobile
                  titulo="Ingresos" icon={PiggyBank} colorCls="text-aura-mint"
                  movimientos={movimientosAgrupados.ingresos}
                  expandido={seccionesAbiertas.has('ingresos')}
                  onToggle={() => toggleSeccion('ingresos')}
                  editingItem={editingItem} setEditingItem={setEditingItem}
                  creandoEnSeccion={creandoEnSeccion} setCreandoEnSeccion={setCreandoEnSeccion}
                  mes={mes} anio={anio}
                />
                
                {movimientosAgrupados.tarjetas.map((t: any) => (
                  <GrupoCompuestoMobile
                    key={t.nombre}
                    titulo={t.nombre} icon={CreditCard} colorCls="text-aura-lavender"
                    datos={t}
                    expandido={seccionesAbiertas.has(t.nombre)}
                    onToggle={() => toggleSeccion(t.nombre)}
                    editingItem={editingItem} setEditingItem={setEditingItem}
                    creandoEnSeccion={creandoEnSeccion} setCreandoEnSeccion={setCreandoEnSeccion}
                    mes={mes} anio={anio}
                  />
                ))}

                {movimientosAgrupados.reservas.map((r: any) => (
                  <GrupoCompuestoMobile
                    key={r.nombre}
                    titulo={r.nombre + " (Consumos)"} icon={Wallet} colorCls="text-gray-400"
                    datos={r}
                    expandido={seccionesAbiertas.has(r.nombre)}
                    onToggle={() => toggleSeccion(r.nombre)}
                    editingItem={editingItem} setEditingItem={setEditingItem}
                    creandoEnSeccion={creandoEnSeccion} setCreandoEnSeccion={setCreandoEnSeccion}
                    mes={mes} anio={anio}
                  />
                ))}

                {movimientosAgrupados.efectivo.total > 0 && (
                  <GrupoCompuestoMobile
                    titulo="Efectivo / Transferencia" icon={Wallet} colorCls="text-aura-coral"
                    datos={movimientosAgrupados.efectivo}
                    expandido={seccionesAbiertas.has('efectivo')}
                    onToggle={() => toggleSeccion('efectivo')}
                    editingItem={editingItem} setEditingItem={setEditingItem}
                    creandoEnSeccion={creandoEnSeccion} setCreandoEnSeccion={setCreandoEnSeccion}
                    mes={mes} anio={anio}
                  />
                )}
              </div>

              {/* VISTA DESKTOP (TABLA AGRUPADA) */}
              <div className="hidden lg:block overflow-x-auto px-6 pb-12">
                <table className="w-full text-left border-collapse">
                  <tbody className="divide-y divide-white/5">
                    <GrupoSimpleDesktop 
                      titulo="Ingresos" icon={PiggyBank} colorCls="text-aura-mint"
                      movimientos={movimientosAgrupados.ingresos}
                      expandido={seccionesAbiertas.has('ingresos')}
                      onToggle={() => toggleSeccion('ingresos')}
                      editingItem={editingItem} setEditingItem={setEditingItem}
                      creandoEnSeccion={creandoEnSeccion} setCreandoEnSeccion={setCreandoEnSeccion}
                      mes={mes} anio={anio}
                    />

                    {movimientosAgrupados.tarjetas.map((t: any) => (
                      <GrupoCompuestoDesktop
                        key={t.nombre}
                        titulo={t.nombre} icon={CreditCard} colorCls="text-aura-lavender"
                        datos={t}
                        expandido={seccionesAbiertas.has(t.nombre)}
                        onToggle={() => toggleSeccion(t.nombre)}
                        editingItem={editingItem} setEditingItem={setEditingItem}
                        creandoEnSeccion={creandoEnSeccion} setCreandoEnSeccion={setCreandoEnSeccion}
                        mes={mes} anio={anio}
                      />
                    ))}

                    {movimientosAgrupados.reservas.map((r: any) => (
                      <GrupoCompuestoDesktop
                        key={r.nombre}
                        titulo={r.nombre + " (Consumos)"} icon={Wallet} colorCls="text-gray-400"
                        datos={r}
                        expandido={seccionesAbiertas.has(r.nombre)}
                        onToggle={() => toggleSeccion(r.nombre)}
                        editingItem={editingItem} setEditingItem={setEditingItem}
                        creandoEnSeccion={creandoEnSeccion} setCreandoEnSeccion={setCreandoEnSeccion}
                        mes={mes} anio={anio}
                      />
                    ))}

                    {movimientosAgrupados.efectivo.total > 0 && (
                      <GrupoCompuestoDesktop
                        titulo="Efectivo / Transferencia" icon={Wallet} colorCls="text-aura-coral"
                        datos={movimientosAgrupados.efectivo}
                        expandido={seccionesAbiertas.has('efectivo')}
                        onToggle={() => toggleSeccion('efectivo')}
                        editingItem={editingItem} setEditingItem={setEditingItem}
                        creandoEnSeccion={creandoEnSeccion} setCreandoEnSeccion={setCreandoEnSeccion}
                        mes={mes} anio={anio}
                      />
                    )}
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
            <div className="h-[250px] w-full">
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

          <section className="glass-card aura-glow-pink p-8 border-pink-500/10">
            <h3 className="font-bold text-white mb-8 flex items-center gap-3 text-lg">
              <div className="p-2 bg-pink-500/20 rounded-xl text-pink-400"><Tag size={20}/></div>
              Gastos x Categoría
            </h3>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.gastos_por_categoria} layout="vertical" margin={{ left: -20 }}>
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
                            <p className="text-pink-400 font-bold mt-1 text-base">{formatARS(payload[0].value as number)}</p>
                          </div>
                        );
                      }
                      return null;
                    }} 
                  />
                  <Bar dataKey="monto" radius={[0, 12, 12, 0]} barSize={20}>
                    {data.gastos_por_categoria.map((entry: any, index: number) => (
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



// ─── COMPONENTES DE TABLA ─────────────────────────────────────────

function RenderItem({ mov, editingItem, setEditingItem, reactivarMutation, mes, anio }: any) {
  return (
    <div key={`${mov.tipo}-${mov.id}`} className="space-y-2">
      <div className={`group flex items-center justify-between p-4 rounded-2xl transition-all duration-300 ${editingItem?.id === mov.id && editingItem?.tipo === mov.tipo ? 'bg-aura-lavender/10 border border-aura-lavender/30' : 'bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10'} ${mov.activo === false ? 'opacity-40 line-through' : ''}`}>
        <div className="flex items-center gap-4">
          <div className="w-1 h-8 rounded-full" style={{ backgroundColor: mov.tarjeta_color || (mov.tipo === 'ingreso' ? '#A7F3D0' : (mov.es_fijo ? '#C7D2FE' : '#94a3b8')) }} />
          <div>
            <p className="text-[13px] lg:text-sm font-semibold text-white">
              {mov.descripcion}
              {mov.previsionado && (
                <span className="ml-3 text-[9px] bg-aura-gold/20 text-aura-gold border border-aura-gold/30 px-2 py-0.5 rounded-full uppercase font-bold tracking-[0.1em]">Previsionado</span>
              )}
            </p>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">{mov.origen}</span>
              {mov.tipo === 'tarjeta' && (
                <span className="text-[9px] text-aura-lavender font-bold uppercase tracking-widest opacity-80">Cuota {mov.cuota_actual}/{mov.cuotas_total}</span>
              )}
              {mov.activo === false && mov.fecha_baja && (
                <span className="text-[9px] font-bold text-red-400 uppercase tracking-widest bg-red-400/10 px-2 py-0.5 rounded-full border border-red-400/20">
                  Baja: {MESES_CORTO[parseInt(mov.fecha_baja.split('-')[1])]} {mov.fecha_baja.split('-')[0]} 🔴
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4 lg:gap-8">
          {mov.activo === false ? (
            <button
              onClick={() => {
                if (window.confirm(`¿Reactivar "${mov.descripcion}"?`)) {
                  reactivarMutation.mutate(mov.id);
                }
              }}
              disabled={reactivarMutation.isPending}
              className="text-[9px] px-3 py-1.5 font-bold rounded-lg border border-aura-mint/30 text-aura-mint hover:bg-aura-mint/10 transition-all uppercase whitespace-nowrap z-10 hover:!opacity-100 hover:!no-underline"
            >
              {reactivarMutation.isPending ? '...' : 'Reactivar'}
            </button>
          ) : (
            <p className={`text-sm lg:text-base font-bold tracking-tight ${mov.tipo === 'ingreso' ? 'text-aura-mint' : 'text-white'}`}>
              {formatARS(mov.monto)}
            </p>
          )}
          {mov.activo !== false && (
            <button 
              onClick={() => setEditingItem((editingItem?.id === mov.id && editingItem?.tipo === mov.tipo) ? null : { id: mov.id, tipo: mov.tipo })}
              className={`p-2 lg:p-3 rounded-xl transition-all ${editingItem?.id === mov.id && editingItem?.tipo === mov.tipo ? 'bg-aura-lavender text-aura-bg shadow-lg' : 'text-gray-500 hover:text-white hover:bg-white/10'}`}
            >
              <Edit3 size={16} />
            </button>
          )}
        </div>
      </div>
      
      {editingItem?.id === mov.id && editingItem?.tipo === mov.tipo && (
        <div className="glass-card p-6 border-aura-lavender/30 animate-in slide-in-from-top-4 duration-300">
          <InlineEditForm id={mov.id} tipo={mov.tipo} mesActual={mes} anioActual={anio} onClose={() => setEditingItem(null)} />
        </div>
      )}
    </div>
  );
}

function GrupoSimpleDesktop({ titulo, icon: Icon, colorCls, movimientos, expandido, onToggle, editingItem, setEditingItem, creandoEnSeccion, setCreandoEnSeccion, mes, anio }: any) {
  const total = movimientos.reduce((acc: number, m: any) => acc + m.monto, 0);
  const tipoSeccion = 'ingreso';
  const queryClient = useQueryClient();
  const reactivarMutation = useMutation({
    mutationFn: async (id: number) => reactivarGastoMensual(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['gastos-mensuales'] });
    }
  });

  return (
    <>
      <tr className="border-none">
        <td colSpan={4} className="px-6 py-4">
          <div className="flex items-center justify-between bg-aura-surface/30 backdrop-blur-md rounded-2xl p-4 border border-aura-border/20">
            <div className="flex items-center gap-4">
              <div className="flex items-center cursor-pointer group" onClick={onToggle}>
                <div className={`p-3 rounded-xl bg-white/5 border border-white/10 mr-4 transition-transform group-hover:scale-110`}>
                  <Icon size={18} className={colorCls} />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className={`text-[12px] font-bold uppercase tracking-[0.2em] ${colorCls}`}>{titulo}</span>
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
              <span className={`text-xl font-bold tracking-tight ${colorCls}`}>+{formatARS(total)}</span>
            </div>
          </div>
        </td>
      </tr>
      {creandoEnSeccion === tipoSeccion && (
        <tr>
          <td colSpan={4} className="px-6 pb-6">
            <div className="glass-card p-8 border-aura-lavender/20 animate-in slide-in-from-top-4 duration-300">
              <InlineCreateForm tipo={tipoSeccion as any} mes={mes} anio={anio} onClose={() => setCreandoEnSeccion(null)} />
            </div>
          </td>
        </tr>
      )}
      {expandido && (
        <tr>
          <td colSpan={4} className="px-6">
            <div className="space-y-3 mb-6">
              {movimientos.map((mov: any) => <RenderItem key={mov.id} mov={mov} editingItem={editingItem} setEditingItem={setEditingItem} reactivarMutation={reactivarMutation} mes={mes} anio={anio} />)}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function GrupoCompuestoDesktop({ titulo, icon: Icon, colorCls, datos, expandido, onToggle, editingItem, setEditingItem, mes, anio }: any) {
  const queryClient = useQueryClient();
  const reactivarMutation = useMutation({
    mutationFn: async (id: number) => reactivarGastoMensual(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['gastos-mensuales'] });
    }
  });

  const secciones = [
    { key: 'cuotas', label: 'Cuotas de Tarjeta', items: datos.cuotas },
    { key: 'fijos', label: 'Gastos Fijos', items: datos.fijos },
    { key: 'variables', label: 'Gastos Variables', items: datos.variables },
    { key: 'asignaciones', label: 'Asignaciones a Reservas', items: datos.asignaciones },
    { key: 'prestamos', label: 'Préstamos', items: datos.prestamos }
  ].filter(s => s.items?.length > 0);

  const cantMovimientos = secciones.reduce((acc, s) => acc + s.items.length, 0);

  return (
    <>
      <tr className="border-none">
        <td colSpan={4} className="px-6 py-4">
          <div className="flex items-center justify-between bg-aura-surface/30 backdrop-blur-md rounded-2xl p-4 border border-aura-border/20">
            <div className="flex items-center gap-4">
              <div className="flex items-center cursor-pointer group" onClick={onToggle}>
                <div className={`p-3 rounded-xl bg-white/5 border border-white/10 mr-4 transition-transform group-hover:scale-110`}>
                  <Icon size={18} className={colorCls} />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className={`text-[12px] font-bold uppercase tracking-[0.2em] ${colorCls}`}>{titulo}</span>
                    <ChevronDown size={14} className={`text-gray-500 transition-transform ${expandido ? '' : '-rotate-90'}`} />
                  </div>
                  <span className="text-[10px] font-medium text-gray-500 uppercase tracking-widest mt-0.5">{cantMovimientos} movimientos</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className={`text-xl font-bold tracking-tight ${colorCls}`}>-{formatARS(datos.total)}</span>
            </div>
          </div>
        </td>
      </tr>
      {expandido && (
        <tr>
          <td colSpan={4} className="px-6 pb-6">
            <div className="space-y-6">
              {secciones.map(sec => (
                <div key={sec.key} className="bg-white/5 rounded-2xl p-4 border border-white/5">
                  <div className="flex items-center justify-between mb-4 px-2">
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{sec.label}</h4>
                    <span className="text-xs font-bold text-white">{formatARS(sec.items.reduce((acc: number, m: any) => acc + m.monto, 0))}</span>
                  </div>
                  <div className="space-y-2">
                    {sec.items.map((mov: any) => <RenderItem key={mov.id} mov={mov} editingItem={editingItem} setEditingItem={setEditingItem} reactivarMutation={reactivarMutation} mes={mes} anio={anio} />)}
                  </div>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function GrupoSimpleMobile(props: any) {
  // Solo un wrapper para mobile, reutiliza la misma logica simplificada.
  return (
     <div className={`glass-card overflow-hidden transition-all duration-500 ${props.expandido ? 'aura-glow-lavender border-aura-lavender/20' : 'border-aura-border/20'}`}>
        <div className="flex items-center justify-between px-6 py-5 cursor-pointer" onClick={props.onToggle}>
            <div className="flex flex-col">
              <span className={`text-[10px] font-bold uppercase tracking-[0.2em] ${props.colorCls}`}>{props.titulo}</span>
              <span className="text-sm font-black text-white mt-1">+{formatARS(props.movimientos.reduce((a:number,m:any)=>a+m.monto,0))}</span>
            </div>
            <ChevronDown size={14} className={`text-gray-500 transition-transform ${props.expandido ? 'rotate-180' : ''}`} />
        </div>
        {props.expandido && (
          <div className="px-4 pb-4 space-y-2">
            {props.movimientos.map((mov: any) => <RenderItem key={mov.id} mov={mov} editingItem={props.editingItem} setEditingItem={props.setEditingItem} reactivarMutation={{isPending:false, mutate:()=>{}}} mes={props.mes} anio={props.anio} />)}
          </div>
        )}
     </div>
  );
}

function GrupoCompuestoMobile(props: any) {
  const { datos } = props;
  const secciones = [
    { key: 'cuotas', label: 'Cuotas', items: datos.cuotas },
    { key: 'fijos', label: 'Fijos', items: datos.fijos },
    { key: 'variables', label: 'Variables', items: datos.variables },
    { key: 'asignaciones', label: 'Asignaciones', items: datos.asignaciones },
    { key: 'prestamos', label: 'Préstamos', items: datos.prestamos }
  ].filter(s => s.items?.length > 0);

  return (
     <div className={`glass-card overflow-hidden transition-all duration-500 ${props.expandido ? 'aura-glow-lavender border-aura-lavender/20' : 'border-aura-border/20'}`}>
        <div className="flex items-center justify-between px-6 py-5 cursor-pointer" onClick={props.onToggle}>
            <div className="flex flex-col">
              <span className={`text-[10px] font-bold uppercase tracking-[0.2em] ${props.colorCls}`}>{props.titulo}</span>
              <span className="text-sm font-black text-white mt-1">-{formatARS(datos.total)}</span>
            </div>
            <ChevronDown size={14} className={`text-gray-500 transition-transform ${props.expandido ? 'rotate-180' : ''}`} />
        </div>
        {props.expandido && (
          <div className="px-4 pb-4 space-y-4">
            {secciones.map(sec => (
               <div key={sec.key} className="bg-white/5 rounded-xl p-3 border border-white/5">
                 <div className="flex items-center justify-between mb-3 px-1 border-b border-white/5 pb-2">
                    <h4 className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{sec.label}</h4>
                    <span className="text-xs font-bold text-white">{formatARS(sec.items.reduce((acc: number, m: any) => acc + m.monto, 0))}</span>
                 </div>
                 <div className="space-y-2">
                    {sec.items.map((mov: any) => <RenderItem key={mov.id} mov={mov} editingItem={props.editingItem} setEditingItem={props.setEditingItem} reactivarMutation={{isPending:false, mutate:()=>{}}} mes={props.mes} anio={props.anio} />)}
                 </div>
               </div>
            ))}
          </div>
        )}
     </div>
  );
}
