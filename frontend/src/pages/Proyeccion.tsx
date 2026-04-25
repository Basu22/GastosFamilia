import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, CartesianGrid, Legend
} from 'recharts';
import { TrendingUp, TrendingDown, PiggyBank, Edit3, RotateCcw, ChevronDown, ChevronUp, BarChart2 } from 'lucide-react';
import { NumericFormat } from 'react-number-format';
import { getProyeccion, upsertOverride, MesProyectado, DetalleItem } from '../api/proyeccion';
import { getOverrides } from '../api/proyeccion';
import { formatARS, formatARSCompact, MESES_CORTO } from '../utils/format';

// ─── Tipos locales ────────────────────────────────────────────────────────────

interface CeldaEditando {
  tipo: 'ingreso' | 'gasto_mensual';
  referencia_id: number;
  mes: number;
  anio: number;
  valor_actual: number;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const ProyeccionSkeleton = () => (
  <div className="space-y-6 animate-pulse">
    <div className="h-10 bg-gray-200 dark:bg-neutral-800 rounded-lg w-1/3" />
    <div className="h-64 bg-gray-100 dark:bg-neutral-900 rounded-3xl" />
    <div className="space-y-3">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="h-16 bg-gray-100 dark:bg-neutral-900 rounded-xl" />
      ))}
    </div>
  </div>
);

// ─── Tooltip del gráfico ──────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-xl p-3 shadow-lg text-sm min-w-[200px]">
      <p className="font-bold text-gray-800 dark:text-neutral-200 mb-2">
        {MESES_CORTO[label as number]} {payload[0]?.payload?.anio}
      </p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex justify-between gap-4">
          <span style={{ color: p.fill || p.stroke }} className="font-medium">{p.name}</span>
          <span className="font-bold text-gray-800 dark:text-neutral-200">{formatARS(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

// ─── Componente de celda editable ────────────────────────────────────────────

interface CeldaEditableProps {
  item: DetalleItem;
  tipo: 'ingreso' | 'gasto_mensual';
  mes: number;
  anio: number;
  esPasado: boolean;
  onGuardar: (celda: CeldaEditando, nuevo_monto: number) => void;
}

const CeldaEditable: React.FC<CeldaEditableProps> = ({
  item, tipo, mes, anio, esPasado, onGuardar
}) => {
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState<number | undefined>(item.monto_proyectado);

  const handleConfirmar = () => {
    if (valor !== undefined && valor !== item.monto_proyectado) {
      onGuardar({ tipo, referencia_id: item.id, mes, anio, valor_actual: item.monto_proyectado }, valor);
    }
    setEditando(false);
  };

  if (esPasado) {
    return (
      <span className="text-sm font-medium text-gray-600 dark:text-neutral-400">
        {formatARS(item.monto_proyectado)}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {editando ? (
        <NumericFormat
          autoFocus
          value={valor}
          onValueChange={(vals) => setValor(vals.floatValue)}
          thousandSeparator="."
          decimalSeparator=","
          prefix="$ "
          className="w-40 h-11 px-3 py-2 text-base rounded-xl border border-blue-400 dark:border-blue-600 bg-white dark:bg-neutral-950 text-gray-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          onBlur={handleConfirmar}
          onKeyDown={(e) => { if (e.key === 'Enter') handleConfirmar(); if (e.key === 'Escape') setEditando(false); }}
        />
      ) : (
        <button
          id={`btn-edit-proyeccion-${tipo}-${item.id}-${mes}-${anio}`}
          onClick={() => { setEditando(true); setValor(item.monto_proyectado); }}
          className={`flex items-center gap-2 h-11 text-base font-bold rounded-xl px-3 transition-all active:scale-95 bg-gray-50 dark:bg-neutral-800/50 border border-transparent hover:border-gray-200 dark:hover:border-neutral-700 group
            ${item.tiene_override ? 'text-amber-600 dark:text-amber-400 border-amber-200/50 dark:border-amber-900/30' : 'text-gray-800 dark:text-neutral-200'}`}
          title={item.tiene_override ? `Base: ${formatARS(item.monto_base)}` : 'Click para editar'}
        >
          {formatARS(item.monto_proyectado)}
          {item.tiene_override && <span className="text-[10px] font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded ml-0.5">CUSTOM</span>}
          <Edit3 size={14} className="text-gray-400 dark:text-neutral-500 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors" />
        </button>
      )}
    </div>
  );
};

// ─── Fila de mes ─────────────────────────────────────────────────────────────

interface FilaMesProps {
  mes_data: MesProyectado;
  onGuardar: (celda: CeldaEditando, nuevo_monto: number) => void;
  expandido: boolean;
  onToggleExpand: () => void;
}

const FilaMes: React.FC<FilaMesProps> = ({ mes_data, onGuardar, expandido, onToggleExpand }) => {
  const ahorro = mes_data.ahorro_proyectado;
  const esPositivo = ahorro >= 0;
  const esPasado = mes_data.es_pasado;

  return (
    <>
      <tr
        id={`row-proyeccion-${mes_data.mes}-${mes_data.anio}`}
        className={`border-b border-gray-100 dark:border-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-800/50 transition-colors cursor-pointer flex flex-col lg:table-row
          ${esPasado ? 'opacity-60' : ''}`}
        onClick={onToggleExpand}
      >
        {/* VISTA MÓVIL (Solo visible en < lg) */}
        <td className="lg:hidden p-4 space-y-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              {expandido ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
              <span className="font-black text-gray-900 dark:text-neutral-100">{MESES_CORTO[mes_data.mes]} {mes_data.anio}</span>
              {esPasado && <span className="text-[9px] text-gray-400 dark:text-neutral-600 uppercase font-bold bg-gray-100 dark:bg-neutral-800 px-1 rounded">pasado</span>}
            </div>
            <span className={`font-black text-lg ${esPositivo ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
              {formatARS(ahorro)}
            </span>
          </div>

          <div className="flex justify-between items-center gap-1 overflow-x-auto no-scrollbar py-1 border-t border-gray-50 dark:border-neutral-800/50 pt-2">
            <div className="flex flex-col min-w-[65px]">
              <span className="text-[9px] uppercase font-bold text-gray-400 dark:text-neutral-500">Ingresos</span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-500">{formatARSCompact(mes_data.total_ingresos)}</span>
            </div>
            <div className="flex flex-col min-w-[65px]">
              <span className="text-[9px] uppercase font-bold text-gray-400 dark:text-neutral-500">G. Fijos</span>
              <span className="text-xs font-bold text-red-600 dark:text-red-500">{formatARSCompact(mes_data.total_gastos_mensuales)}</span>
            </div>
            <div className="flex flex-col min-w-[65px]">
              <span className="text-[9px] uppercase font-bold text-gray-400 dark:text-neutral-500">Cuotas</span>
              <span className="text-xs font-bold text-violet-600 dark:text-violet-500">{formatARSCompact(mes_data.total_cuotas)}</span>
            </div>
            <div className="flex flex-col min-w-[65px]">
              <span className="text-[9px] uppercase font-bold text-gray-400 dark:text-neutral-500">Egresos</span>
              <span className="text-xs font-bold text-gray-700 dark:text-neutral-300">{formatARSCompact(mes_data.total_egresos)}</span>
            </div>
          </div>
        </td>

        {/* VISTA DESKTOP (Solo visible en >= lg) */}
        {/* Mes */}
        <td className="hidden lg:table-cell py-4 px-4 font-bold text-gray-900 dark:text-neutral-100 whitespace-nowrap">
          <div className="flex items-center gap-2">
            {expandido ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
            {MESES_CORTO[mes_data.mes]} {mes_data.anio}
            {esPasado && <span className="text-[10px] text-gray-400 dark:text-neutral-600 uppercase font-bold">pasado</span>}
          </div>
        </td>

        {/* Ingresos */}
        <td className="hidden lg:table-cell py-4 px-4 text-right">
          <span className="font-bold text-emerald-700 dark:text-emerald-400">
            {formatARS(mes_data.total_ingresos)}
          </span>
        </td>

        {/* Gastos Fijos */}
        <td className="hidden lg:table-cell py-4 px-4 text-right">
          <span className="font-medium text-red-600 dark:text-red-400">
            {formatARS(mes_data.total_gastos_mensuales)}
          </span>
        </td>

        {/* Cuotas */}
        <td className="hidden lg:table-cell py-4 px-4 text-right">
          <span className="font-medium text-violet-700 dark:text-violet-400">
            {formatARS(mes_data.total_cuotas)}
          </span>
        </td>

        {/* Total Egresos */}
        <td className="hidden lg:table-cell py-4 px-4 text-right">
          <span className="font-bold text-gray-800 dark:text-neutral-200">
            {formatARS(mes_data.total_egresos)}
          </span>
        </td>

        {/* Ahorro */}
        <td className="hidden lg:table-cell py-4 px-4 text-right">
          <span className={`font-bold text-lg ${esPositivo ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            {formatARS(ahorro)}
          </span>
        </td>
      </tr>

      {/* Expansión con detalle editable */}
      {expandido && !esPasado && (
        <tr className="bg-gray-50/80 dark:bg-neutral-900/60 border-b border-gray-100 dark:border-neutral-800">
          <td colSpan={6} className="px-4 py-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {/* Detalle Ingresos */}
              <div>
                <p className="text-xs font-bold uppercase text-emerald-700 dark:text-emerald-500 mb-2 flex items-center gap-1">
                  <TrendingUp size={12} /> Ingresos
                </p>
                <div className="space-y-1">
                  {mes_data.detalle_ingresos.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-2 py-1 border-b border-gray-100 dark:border-neutral-800 last:border-0">
                      <span className="text-gray-600 dark:text-neutral-400 truncate flex-1">{item.descripcion}</span>
                      <CeldaEditable
                        item={item}
                        tipo="ingreso"
                        mes={mes_data.mes}
                        anio={mes_data.anio}
                        esPasado={false}
                        onGuardar={onGuardar}
                      />
                    </div>
                  ))}
                  {mes_data.detalle_ingresos.length === 0 && (
                    <p className="text-gray-400 dark:text-neutral-600 text-xs italic">Sin ingresos registrados</p>
                  )}
                </div>
              </div>

              {/* Detalle Gastos */}
              <div>
                <p className="text-xs font-bold uppercase text-red-600 dark:text-red-500 mb-2 flex items-center gap-1">
                  <TrendingDown size={12} /> Gastos Fijos/Variables
                </p>
                <div className="space-y-1">
                  {mes_data.detalle_gastos.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-2 py-1 border-b border-gray-100 dark:border-neutral-800 last:border-0">
                      <span className="text-gray-600 dark:text-neutral-400 truncate flex-1">{item.descripcion}</span>
                      <CeldaEditable
                        item={item}
                        tipo="gasto_mensual"
                        mes={mes_data.mes}
                        anio={mes_data.anio}
                        esPasado={false}
                        onGuardar={onGuardar}
                      />
                    </div>
                  ))}
                  {mes_data.detalle_gastos.length === 0 && (
                    <p className="text-gray-400 dark:text-neutral-600 text-xs italic">Sin gastos registrados</p>
                  )}
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

// ─── Página Principal ─────────────────────────────────────────────────────────

export default function Proyeccion() {
  const queryClient = useQueryClient();
  const [expandido, setExpandido] = useState<string | null>(null);

  const { data: proyeccion, isLoading, error } = useQuery({
    queryKey: ['proyeccion'],
    queryFn: getProyeccion,
  });

  const mutation = useMutation({
    mutationFn: (data: { tipo: 'ingreso' | 'gasto_mensual'; referencia_id: number; mes: number; anio: number; monto: number }) =>
      upsertOverride(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['proyeccion'] });
    },
  });

  const handleGuardar = useCallback((celda: CeldaEditando, nuevo_monto: number) => {
    mutation.mutate({
      tipo: celda.tipo,
      referencia_id: celda.referencia_id,
      mes: celda.mes,
      anio: celda.anio,
      monto: nuevo_monto,
    });
  }, [mutation]);

  const toggleExpand = (key: string) => {
    setExpandido(prev => prev === key ? null : key);
  };

  if (isLoading) return <ProyeccionSkeleton />;
  if (error || !proyeccion) return (
    <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 p-4 text-red-700 dark:text-red-400 text-sm">
      Error cargando la proyección. Intente nuevamente.
    </div>
  );

  // Datos para el gráfico
  const datosGrafico = proyeccion.map(m => ({
    mes: m.mes,
    anio: m.anio,
    Cuotas: m.total_cuotas,
    'Gastos Fijos': m.total_gastos_mensuales,
    Ingresos: m.total_ingresos,
  }));

  // Métricas resumen
  const mejorMes = proyeccion.reduce((a, b) => a.ahorro_proyectado > b.ahorro_proyectado ? a : b);
  const peorMes = proyeccion.reduce((a, b) => a.ahorro_proyectado < b.ahorro_proyectado ? a : b);
  const mesesEnRojo = proyeccion.filter(m => m.ahorro_proyectado < 0).length;
  const promedioAhorro = proyeccion.reduce((s, m) => s + m.ahorro_proyectado, 0) / proyeccion.length;

  return (
    <section id="page-proyeccion" className="max-w-5xl mx-auto space-y-8">
      <header id="header-proyeccion" className="flex items-start gap-3">
        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
          <BarChart2 className="text-blue-600 dark:text-blue-400" size={24} />
        </div>
        <div>
          <h1 id="title-proyeccion" className="text-2xl font-bold text-gray-900 dark:text-neutral-100">
            Proyección Financiera
          </h1>
          <p className="text-gray-500 dark:text-neutral-400 text-sm">
            Próximos 12 meses · Tocá cualquier fila para ajustar valores
          </p>
        </div>
      </header>

      {/* Métricas resumen */}
      <section id="proyeccion-metricas" className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-4">
        <article className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 rounded-xl p-3 lg:p-4 transition-colors">
          <p className="text-[10px] lg:text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-500 opacity-70">Mejor Mes</p>
          <p className="text-lg lg:text-xl font-black text-emerald-700 dark:text-emerald-400 mt-1 leading-tight">{formatARS(mejorMes.ahorro_proyectado)}</p>
          <p className="text-[10px] lg:text-xs text-emerald-600 dark:text-emerald-500/70 mt-0.5 font-semibold">{MESES_CORTO[mejorMes.mes]} {mejorMes.anio}</p>
        </article>
        <article className={`border rounded-xl p-3 lg:p-4 transition-colors ${peorMes.ahorro_proyectado < 0 ? 'bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-900/50' : 'bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/50'}`}>
          <p className={`text-[10px] lg:text-xs font-bold uppercase tracking-wider opacity-70 ${peorMes.ahorro_proyectado < 0 ? 'text-red-700 dark:text-red-500' : 'text-amber-700 dark:text-amber-500'}`}>Mes Ajustado</p>
          <p className={`text-lg lg:text-xl font-black mt-1 leading-tight ${peorMes.ahorro_proyectado < 0 ? 'text-red-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'}`}>{formatARS(peorMes.ahorro_proyectado)}</p>
          <p className={`text-[10px] lg:text-xs mt-0.5 font-semibold ${peorMes.ahorro_proyectado < 0 ? 'text-red-600 dark:text-red-500/70' : 'text-amber-600 dark:text-amber-500/70'}`}>{MESES_CORTO[peorMes.mes]} {peorMes.anio}</p>
        </article>
        <article className="bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/50 rounded-xl p-3 lg:p-4 transition-colors">
          <p className="text-[10px] lg:text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-500 opacity-70">Ahorro Promedio</p>
          <p className={`text-lg lg:text-xl font-black mt-1 leading-tight ${promedioAhorro >= 0 ? 'text-blue-700 dark:text-blue-400' : 'text-red-700 dark:text-red-400'}`}>{formatARS(promedioAhorro)}</p>
          <p className="text-[10px] lg:text-xs text-blue-600 dark:text-blue-500/70 mt-0.5 font-semibold">por mes</p>
        </article>
        <article className={`border rounded-xl p-3 lg:p-4 transition-colors ${mesesEnRojo > 0 ? 'bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-900/50' : 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/50'}`}>
          <p className={`text-[10px] lg:text-xs font-bold uppercase tracking-wider opacity-70 ${mesesEnRojo > 0 ? 'text-red-700 dark:text-red-500' : 'text-emerald-700 dark:text-emerald-500'}`}>Meses en Rojo</p>
          <p className={`text-2xl lg:text-3xl font-black mt-1 leading-tight ${mesesEnRojo > 0 ? 'text-red-700 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400'}`}>{mesesEnRojo}</p>
          <p className={`text-[10px] lg:text-xs mt-0.5 font-semibold ${mesesEnRojo > 0 ? 'text-red-600 dark:text-red-500/70' : 'text-emerald-600 dark:text-emerald-500/70'}`}>de 12 proyectados</p>
        </article>
      </section>

      {/* Gráfico de barras apiladas */}
      <section id="proyeccion-grafico" className="bg-white dark:bg-neutral-900 rounded-3xl border border-gray-100 dark:border-neutral-800 p-4 lg:p-6 transition-colors">
        <h2 className="font-bold text-gray-800 dark:text-neutral-200 mb-6">Vista General — 12 Meses</h2>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={datosGrafico} margin={{ top: 5, right: 10, left: -10, bottom: 0 }} barSize={24}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" opacity={0.3} />
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
              tickFormatter={(v) => formatARSCompact(v)}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '12px', paddingTop: '16px' }}
              formatter={(value) => <span className="text-gray-600 dark:text-neutral-400">{value}</span>}
            />
            {/* Ingresos como línea de referencia dinámica → usamos ReferenceLine por mes */}
            <Bar dataKey="Gastos Fijos" stackId="egresos" fill="#EF4444" fillOpacity={0.85} radius={[0, 0, 0, 0]} name="Gastos Fijos" />
            <Bar dataKey="Cuotas" stackId="egresos" fill="#8B5CF6" fillOpacity={0.85} radius={[4, 4, 0, 0]} name="Cuotas" />
            <Bar dataKey="Ingresos" fill="#10B981" fillOpacity={0.25} radius={[4, 4, 0, 0]} name="Ingresos" />
          </BarChart>
        </ResponsiveContainer>
      </section>

      {/* Tabla interactiva */}
      <section id="proyeccion-tabla" className="bg-white dark:bg-neutral-900 rounded-3xl border border-gray-100 dark:border-neutral-800 overflow-hidden transition-colors">
        <div className="px-4 py-4 lg:px-6 border-b border-gray-100 dark:border-neutral-800 flex items-center justify-between">
          <h2 className="font-bold text-gray-800 dark:text-neutral-200">
            Detalle Mes a Mes
          </h2>
          <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
            <Edit3 size={12} />
            Tocá una fila para editar valores proyectados
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="hidden lg:table-header-group">
              <tr className="border-b border-gray-100 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-950">
                <th className="text-left py-3 px-4 font-semibold text-gray-500 dark:text-neutral-500 uppercase text-xs tracking-wide">Mes</th>
                <th className="text-right py-3 px-4 font-semibold text-emerald-600 dark:text-emerald-500 uppercase text-xs tracking-wide">Ingresos</th>
                <th className="text-right py-3 px-4 font-semibold text-red-600 dark:text-red-500 uppercase text-xs tracking-wide">G. Fijos</th>
                <th className="text-right py-3 px-4 font-semibold text-violet-600 dark:text-violet-500 uppercase text-xs tracking-wide">Cuotas</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-500 dark:text-neutral-500 uppercase text-xs tracking-wide">Total Egreso</th>
                <th className="text-right py-3 px-4 font-semibold text-gray-500 dark:text-neutral-500 uppercase text-xs tracking-wide">Ahorro</th>
              </tr>
            </thead>
            <tbody>
              {proyeccion.map((mes_data) => {
                const key = `${mes_data.mes}-${mes_data.anio}`;
                return (
                  <FilaMes
                    key={key}
                    mes_data={mes_data}
                    onGuardar={handleGuardar}
                    expandido={expandido === key}
                    onToggleExpand={() => toggleExpand(key)}
                  />
                );
              })}
            </tbody>
          </table>
        </div>

        {mutation.isPending && (
          <div className="px-4 py-3 bg-blue-50 dark:bg-blue-950/30 border-t border-blue-100 dark:border-blue-900/50 text-blue-700 dark:text-blue-400 text-xs font-medium">
            Guardando cambio...
          </div>
        )}
        {mutation.isSuccess && (
          <div className="px-4 py-3 bg-emerald-50 dark:bg-emerald-950/30 border-t border-emerald-100 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400 text-xs font-medium">
            ✓ Cambio guardado. La proyección se actualizó.
          </div>
        )}
      </section>

      <p className="text-xs text-center text-gray-400 dark:text-neutral-600">
        Los valores con etiqueta <span className="font-bold text-amber-600 dark:text-amber-500">CUSTOM</span> están sobreescritos para este mes.
        Tocar el valor y borrar para ingresar el importe base.
      </p>
    </section>
  );
}
