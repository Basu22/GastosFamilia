import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getDashboardInfo } from '../api/client';
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { TrendingUp, Wallet, CreditCard, PiggyBank, ChevronLeft, ChevronRight, Calendar, Landmark, Tag } from 'lucide-react';
import { formatARS, MESES_CORTO } from '../utils/format';
import MetricCard from '../components/ui/MetricCard';
import PanelArca from '../components/dashboard/PanelArca';
import { PanelReservas } from '../components/reservas/PanelReservas';
import ModalTarjetaDetalle from '../components/dashboard/ModalTarjetaDetalle';
import { getReservas } from '../api/reservas';

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
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [filtroPago, setFiltroPago] = useState<'tarjeta' | 'movimiento'>('tarjeta');
  const [activeDetail, setActiveDetail] = useState<{ type: 'tarjeta'; name: string } | { type: 'movimiento'; name: 'cuota' | 'fijo' | 'variable' | 'efectivo' | 'ingreso' } | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard', mes, anio],
    queryFn: () => getDashboardInfo(mes, anio)
  });

  const { data: listReservas } = useQuery({
    queryKey: ['reservas'],
    queryFn: getReservas
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
          const tarjetaObj = data?.cuotas_por_tarjeta?.find((t: any) => t.nombre === nombreTarjeta);
          tarjetasMap.set(nombreTarjeta, {
            nombre: nombreTarjeta, color: m.tarjeta_color || '#64748B',
            tarjeta_id: tarjetaObj?.tarjeta_id,
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
          const resObj = listReservas?.find((r: any) => r.nombre === nombreReserva);
          reservasMap.set(nombreReserva, {
            nombre: nombreReserva, color: m.reserva_color || '#64748B',
            reserva_id: resObj?.id,
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
  }, [data, listReservas]);


  const selectedDetailData = useMemo(() => {
    if (!activeDetail || !data?.cuotas_por_tarjeta) return null;

    if (activeDetail.type === 'tarjeta') {
      const tarjeta = data.cuotas_por_tarjeta.find((t: any) => t.nombre === activeDetail.name);
      if (!tarjeta) return null;

      const details = tarjeta.detalle || [];
      const cuotas = details.filter((item: any) => item.tipo === 'cuota');
      const fijos = details.filter((item: any) => item.tipo === 'fijo');
      const variables = details.filter((item: any) => item.tipo === 'variable');

      return {
        type: 'tarjeta' as const,
        name: tarjeta.nombre,
        color: tarjeta.color,
        monto: tarjeta.monto,
        tarjeta_id: tarjeta.tarjeta_id,
        groups: [
          { key: 'cuotas', label: 'Cuotas de Tarjeta', items: cuotas },
          { key: 'fijos', label: 'Gastos Fijos', items: fijos },
          { key: 'variables', label: 'Gastos Variables', items: variables },
        ].filter(g => g.items.length > 0)
      };
    } else if (activeDetail.name === 'efectivo') {
      const items: any[] = [];
      const ef = movimientosAgrupados.efectivo;
      if (ef) {
        const collect = (arr: any[], typeName: string) => {
          arr.forEach((item: any) => {
            items.push({
              id: item.id,
              edit_tipo: item.tipo,
              descripcion: item.descripcion,
              monto: item.monto,
              tipo: typeName,
              tarjeta_nombre: 'Efectivo / Transf.',
              tarjeta_color: '#10B981'
            });
          });
        };
        collect(ef.fijos, 'fijo');
        collect(ef.variables, 'variable');
        collect(ef.asignaciones, 'asignación');
        collect(ef.prestamos, 'préstamo');
      }

      return {
        type: 'movimiento' as const,
        name: 'Efectivo / Transferencia',
        color: '#10B981',
        monto: ef?.total || 0,
        items: items
      };
    } else if (activeDetail.name === 'ingreso') {
      const items: any[] = [];
      const ing = movimientosAgrupados.ingresos;
      if (ing) {
        ing.forEach((item: any) => {
          items.push({
            id: item.id,
            edit_tipo: 'ingreso',
            descripcion: item.descripcion,
            monto: item.monto,
            tipo: 'ingreso',
            tarjeta_nombre: 'Ingresos',
            tarjeta_color: '#10B981'
          });
        });
      }

      return {
        type: 'movimiento' as const,
        name: 'Ingresos',
        color: '#10B981',
        monto: data.ingreso || 0,
        items: items
      };
    } else {
      const items: any[] = [];
      data.cuotas_por_tarjeta.forEach((t: any) => {
        t.detalle?.forEach((item: any) => {
          if (item.tipo === activeDetail.name) {
            items.push({
              ...item,
              tarjeta_nombre: t.nombre,
              tarjeta_color: t.color
            });
          }
        });
      });

      const total = items.reduce((acc, m) => acc + m.monto, 0);
      const label = activeDetail.name === 'cuota' 
        ? 'Cuotas de Tarjeta' 
        : activeDetail.name === 'fijo' 
          ? 'Gastos Fijos' 
          : 'Gastos Variables';
      const color = activeDetail.name === 'cuota'
        ? '#8B5CF6' 
        : activeDetail.name === 'fijo'
          ? '#3B82F6' 
          : '#EC4899';

      return {
        type: 'movimiento' as const,
        name: label,
        color: color,
        monto: total,
        items: items
      };
    }
  }, [activeDetail, data, movimientosAgrupados]);

  const totalesMovimiento = useMemo(() => {
    if (!data?.cuotas_por_tarjeta) return { cuotas: 0, fijos: 0, variables: 0, efectivo: 0 };
    
    let cuotas = 0;
    let fijos = 0;
    let variables = 0;
    
    data.cuotas_por_tarjeta.forEach((t: any) => {
      t.detalle?.forEach((item: any) => {
        if (item.tipo === 'cuota') cuotas += item.monto;
        else if (item.tipo === 'fijo') fijos += item.monto;
        else if (item.tipo === 'variable') variables += item.monto;
      });
    });

    const efectivoTotal = movimientosAgrupados.efectivo?.total || 0;
    
    return { cuotas, fijos, variables, efectivo: efectivoTotal };
  }, [data, movimientosAgrupados]);

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
        detailData={selectedDetailData} 
        mesActual={mes}
        anioActual={anio}
        activeName={activeDetail?.type === 'movimiento' ? activeDetail.name : undefined}
        onClose={() => setActiveDetail(null)} 
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
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-aura-lavender/20 rounded-xl border border-aura-lavender/30">
                    <CreditCard className="text-aura-lavender" size={16} />
                  </div>
                  <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-white/90">Filtro</h3>
                </div>
                
                {/* Filtros visuales / Tabs */}
                <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5 self-start sm:self-auto shadow-md">
                  <button 
                    onClick={() => setFiltroPago('tarjeta')}
                    className={`px-4 py-2 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all ${
                      filtroPago === 'tarjeta' 
                        ? 'bg-aura-lavender text-aura-bg shadow-lg shadow-aura-lavender/20' 
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Por Tarjeta
                  </button>
                  <button 
                    onClick={() => setFiltroPago('movimiento')}
                    className={`px-4 py-2 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all ${
                      filtroPago === 'movimiento' 
                        ? 'bg-aura-lavender text-aura-bg shadow-lg shadow-aura-lavender/20' 
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Por Movimiento
                  </button>
                </div>
              </div>

              {filtroPago === 'tarjeta' ? (
                <div className="space-y-4">
                  <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-1 px-1">A PAGAR</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3">
                    {data.cuotas_por_tarjeta.map((t: any) => (
                      <div 
                        key={t.nombre} 
                        className="glass-card p-4 border border-white/5 flex flex-col justify-between hover:border-white/20 hover:scale-[1.02] active:scale-95 transition-all gap-2 cursor-pointer"
                        onClick={() => setActiveDetail({ type: 'tarjeta', name: t.nombre })}
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.5)]" style={{ backgroundColor: t.color || '#64748B' }} />
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider truncate">{t.nombre}</span>
                        </div>
                        <span className="text-lg font-black text-white tracking-tight">{formatARS(t.monto)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3">
                  {/* Ingresos */}
                  <div 
                    className="glass-card p-4 border border-white/5 flex flex-col justify-between hover:border-white/20 hover:scale-[1.02] active:scale-95 transition-all gap-2 cursor-pointer"
                    onClick={() => setActiveDetail({ type: 'movimiento', name: 'ingreso' })}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" style={{ backgroundColor: '#10B981' }} />
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider truncate">Ingresos</span>
                    </div>
                    <span className="text-lg font-black text-white tracking-tight">{formatARS(data.ingreso)}</span>
                  </div>

                  {/* Cuotas de Tarjeta */}
                  <div 
                    className="glass-card p-4 border border-white/5 flex flex-col justify-between hover:border-white/20 hover:scale-[1.02] active:scale-95 transition-all gap-2 cursor-pointer"
                    onClick={() => setActiveDetail({ type: 'movimiento', name: 'cuota' })}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full shadow-[0_0_8px_rgba(139,92,246,0.5)]" style={{ backgroundColor: '#8B5CF6' }} />
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider truncate">Cuotas de Tarjeta</span>
                    </div>
                    <span className="text-lg font-black text-white tracking-tight">{formatARS(totalesMovimiento.cuotas)}</span>
                  </div>
                  
                  {/* Gastos Fijos */}
                  <div 
                    className="glass-card p-4 border border-white/5 flex flex-col justify-between hover:border-white/20 hover:scale-[1.02] active:scale-95 transition-all gap-2 cursor-pointer"
                    onClick={() => setActiveDetail({ type: 'movimiento', name: 'fijo' })}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]" style={{ backgroundColor: '#3B82F6' }} />
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider truncate">Gastos Fijos</span>
                    </div>
                    <span className="text-lg font-black text-white tracking-tight">{formatARS(totalesMovimiento.fijos)}</span>
                  </div>

                  {/* Gastos Variables */}
                  <div 
                    className="glass-card p-4 border border-white/5 flex flex-col justify-between hover:border-white/20 hover:scale-[1.02] active:scale-95 transition-all gap-2 cursor-pointer"
                    onClick={() => setActiveDetail({ type: 'movimiento', name: 'variable' })}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full shadow-[0_0_8px_rgba(236,72,153,0.5)]" style={{ backgroundColor: '#EC4899' }} />
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider truncate">Gastos Variables</span>
                    </div>
                    <span className="text-lg font-black text-white tracking-tight">{formatARS(totalesMovimiento.variables)}</span>
                  </div>

                  {/* Efectivo / Transferencia */}
                  <div 
                    className="glass-card p-4 border border-white/5 flex flex-col justify-between hover:border-white/20 hover:scale-[1.02] active:scale-95 transition-all gap-2 cursor-pointer"
                    onClick={() => setActiveDetail({ type: 'movimiento', name: 'efectivo' })}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]" style={{ backgroundColor: '#10B981' }} />
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider truncate">Efectivo / Transf.</span>
                    </div>
                    <span className="text-lg font-black text-white tracking-tight">{formatARS(totalesMovimiento.efectivo)}</span>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* PANEL DE RESERVAS */}
          <div className="mx-4 lg:mx-0">
            <PanelReservas mes={mes} anio={anio} disponible={data.ahorro_proyectado} movimientos={data.movimientos_mes} />
          </div>

          {/* MÓDULO ARCA */}
          <div className="mx-4 lg:mx-0">
            <PanelArca mes={mes} anio={anio} />
              </div>        </div>

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




