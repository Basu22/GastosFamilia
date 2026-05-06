import { useState, useMemo } from 'react';
import { useMutation } from '@tanstack/react-query';
import { 
  Calculator, 
  ChevronDown, 
  ChevronUp, 
  TrendingUp, 
  Wallet, 
  CreditCard, 
  PiggyBank, 
  Plus, 
  Minus,
  Info
} from 'lucide-react';
import { formatARS, MESES_CORTO } from '../utils/format';
import { calcularSimulacion } from '../api/client';
import { SimuladorMes } from '../types/simulador';
import { NumericFormat } from 'react-number-format';

export default function Simulador() {
  // Estados del formulario
  const [descripcion, setDescripcion] = useState('Nueva Compra');
  const [montoTotal, setMontoTotal] = useState<number>(100000);
  const [montoCuota, setMontoCuota] = useState<number>(Math.round(100000 / 12));
  const [cuotas, setCuotas] = useState<number>(12);
  
  // Fecha inicial (Mes actual por defecto)
  const today = new Date();
  const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  const [fechaInicio, setFechaInicio] = useState(currentMonthStr);

  // Estados de UI
  const [expandidas, setExpandidas] = useState<Set<string>>(new Set());

  // Mutation para calcular
  const mutation = useMutation({
    mutationFn: calcularSimulacion
  });

  // Manejadores del formulario
  const handleMontoTotalChange = (val: number) => {
    setMontoTotal(val);
    if (cuotas > 0) setMontoCuota(Math.round(val / cuotas));
  };

  const handleMontoCuotaChange = (val: number) => {
    setMontoCuota(val);
    setMontoTotal(Math.round(val * cuotas));
  };

  const handleCuotasChange = (val: number) => {
    const n = Math.max(1, Math.min(60, val));
    setCuotas(n);
    if (montoTotal > 0) setMontoCuota(Math.round(montoTotal / n));
  };

  const toggleFila = (clave: string) => {
    setExpandidas(prev => {
      const nuevo = new Set(prev);
      if (nuevo.has(clave)) nuevo.delete(clave);
      else nuevo.add(clave);
      return nuevo;
    });
  };

  const handleSimular = () => {
    mutation.mutate({
      monto_total: montoTotal,
      cuotas: cuotas,
      fecha_primera_cuota: fechaInicio,
      descripcion: descripcion
    });
  };

  // Opciones de fecha (próximos 6 meses)
  const opcionesFecha = useMemo(() => {
    const options = [];
    const d = new Date();
    for (let i = 0; i < 6; i++) {
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const label = `${MESES_CORTO[month]} ${year}`;
      const value = `${year}-${String(month).padStart(2, '0')}`;
      options.push({ label, value });
      d.setMonth(d.getMonth() + 1);
    }
    return options;
  }, []);

  return (
    <main id="page-simulador" className="max-w-6xl mx-auto space-y-6 pb-24 lg:pb-8">
      {/* Header */}
      <header className="px-4 lg:px-0">
        <h1 className="text-2xl lg:text-3xl font-black text-gray-900 dark:text-neutral-100 flex items-center gap-3">
          <div className="p-2 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-200 dark:shadow-none">
            <Calculator size={24} />
          </div>
          Simulador de Cuotas
        </h1>
        <p className="text-sm text-gray-500 dark:text-neutral-400 mt-2 font-medium">
          Calculá el impacto de una compra antes de realizarla.
        </p>
      </header>

      {/* Formulario */}
      <section id="simulador-form" className="bg-white dark:bg-neutral-900 rounded-3xl border border-gray-100 dark:border-neutral-800 p-6 shadow-sm mx-4 lg:mx-0">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Descripción */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Descripción</label>
            <input 
              type="text" 
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="w-full h-12 px-4 rounded-2xl bg-gray-50 dark:bg-neutral-800 border-none focus:ring-2 focus:ring-blue-500 font-bold text-gray-900 dark:text-neutral-100 transition-all"
              placeholder="Ej: Placard, Notebook..."
            />
          </div>

          {/* Monto Total */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Monto Total</label>
            <NumericFormat 
              value={montoTotal}
              onValueChange={(values) => handleMontoTotalChange(Number(values.value))}
              thousandSeparator="."
              decimalSeparator=","
              prefix="$ "
              allowNegative={false}
              className="w-full h-12 px-4 rounded-2xl bg-gray-50 dark:bg-neutral-800 border-none focus:ring-2 focus:ring-blue-500 font-black text-gray-900 dark:text-neutral-100 transition-all"
            />
          </div>

          {/* Monto Cuota */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Monto Cuota</label>
            <NumericFormat 
              value={montoCuota}
              onValueChange={(values) => handleMontoCuotaChange(Number(values.value))}
              thousandSeparator="."
              decimalSeparator=","
              prefix="$ "
              allowNegative={false}
              className="w-full h-12 px-4 rounded-2xl bg-gray-50 dark:bg-neutral-800 border-none focus:ring-2 focus:ring-blue-500 font-black text-gray-900 dark:text-neutral-100 transition-all"
            />
          </div>

          {/* Fecha Inicio */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Primer Mes</label>
            <select 
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="w-full h-12 px-4 rounded-2xl bg-gray-50 dark:bg-neutral-800 border-none focus:ring-2 focus:ring-blue-500 font-bold text-gray-900 dark:text-neutral-100 transition-all"
            >
              {opcionesFecha.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Cuotas Slider */}
        <div className="mt-8 space-y-4">
          <div className="flex justify-between items-end">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1">Cantidad de Cuotas</label>
            <span className="text-3xl font-black text-blue-600">{cuotas}</span>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => handleCuotasChange(cuotas - 1)}
              className="p-3 bg-gray-100 dark:bg-neutral-800 rounded-xl hover:bg-gray-200 dark:hover:bg-neutral-700 transition-colors"
            >
              <Minus size={20} />
            </button>
            <input 
              type="range" 
              min={1} 
              max={60} 
              value={cuotas}
              onChange={(e) => handleCuotasChange(Number(e.target.value))}
              className="flex-1 accent-blue-600 h-2 rounded-lg cursor-pointer"
            />
            <button 
              onClick={() => handleCuotasChange(cuotas + 1)}
              className="p-3 bg-gray-100 dark:bg-neutral-800 rounded-xl hover:bg-gray-200 dark:hover:bg-neutral-700 transition-colors"
            >
              <Plus size={20} />
            </button>
          </div>

          {/* Cuotas Rápidas */}
          <div className="flex flex-wrap gap-2 pt-2">
            {[1, 3, 6, 12, 18, 24, 36].map(n => (
              <button 
                key={n}
                onClick={() => handleCuotasChange(n)}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
                  cuotas === n 
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-200 dark:shadow-none' 
                    : 'bg-gray-100 dark:bg-neutral-800 text-gray-500 dark:text-neutral-400 hover:bg-gray-200'
                }`}
              >
                {n}x
              </button>
            ))}
          </div>
        </div>

        {/* Botón Simular */}
        <div className="mt-8">
          <button 
            onClick={handleSimular}
            disabled={mutation.isPending}
            className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-lg shadow-xl shadow-blue-200 dark:shadow-none transition-all active:scale-[0.98] flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {mutation.isPending ? 'Calculando...' : (
              <>
                <TrendingUp size={24} />
                SIMULAR IMPACTO MENSUAL
              </>
            )}
          </button>
        </div>
      </section>

      {/* Resultados de la Simulación */}
      {mutation.data && (
        <section id="simulacion-resultados" className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-4">

          {/* VISTA MOBILE — Cápsulas de mes */}
          <div className="lg:hidden px-4 space-y-3">
            {mutation.data.map((mesData, idx) => (
              <CapsulaMes key={idx} mes={mesData} />
            ))}
            <p className="text-[10px] text-center text-gray-400 uppercase font-bold tracking-widest pt-2">
              * Los cálculos se basan en tu proyección actual de ingresos y gastos fijos.
            </p>
          </div>

          {/* VISTA DESKTOP — Tabla existente */}
          <div className="hidden lg:block px-0 overflow-x-auto pb-4">
          <div className="inline-block min-w-full align-middle">
            <div className="overflow-hidden border border-gray-100 dark:border-neutral-800 rounded-3xl shadow-sm bg-white dark:bg-neutral-900">
              <table className="min-w-full divide-y divide-gray-100 dark:divide-neutral-800">
                <thead className="bg-gray-50 dark:bg-neutral-800/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Concepto</th>
                    {mutation.data.map((mes, idx) => (
                      <th key={idx} className="px-6 py-4 text-center text-[10px] font-black text-gray-900 dark:text-neutral-100 uppercase tracking-widest min-w-[120px]">
                        {MESES_CORTO[mes.mes]} {mes.anio}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                  {/* Fila: Ingresos */}
                  <RowCategoria 
                    label="Ingresos" 
                    icon={PiggyBank} 
                    colorClass="text-emerald-600 dark:text-emerald-400"
                    bgClass="bg-emerald-50/50 dark:bg-emerald-950/10"
                    data={mutation.data}
                    valKey="total_ingresos"
                    detalleKey="detalle_ingresos"
                    isExpanded={expandidas.has('ingresos')}
                    onToggle={() => toggleFila('ingresos')}
                  />

                  {/* Fila: Cuotas Reales */}
                  <RowCategoria 
                    label="Cuotas Actuales" 
                    icon={CreditCard} 
                    colorClass="text-amber-600 dark:text-amber-400"
                    bgClass="bg-amber-50/50 dark:bg-amber-950/10"
                    data={mutation.data}
                    valKey="total_cuotas"
                    detalleKey="detalle_cuotas"
                    isExpanded={expandidas.has('cuotas')}
                    onToggle={() => toggleFila('cuotas')}
                  />

                  {/* Fila: Gastos Fijos */}
                  <RowCategoria 
                    label="Gastos Fijos" 
                    icon={Wallet} 
                    colorClass="text-blue-600 dark:text-blue-400"
                    bgClass="bg-blue-50/50 dark:bg-blue-950/10"
                    data={mutation.data}
                    valKey="total_gastos_fijos"
                    detalleKey="detalle_gastos_fijos"
                    isExpanded={expandidas.has('fijos')}
                    onToggle={() => toggleFila('fijos')}
                  />

                  {/* Fila: Gastos Variables */}
                  <RowCategoria 
                    label="Gastos Variables" 
                    icon={Info} 
                    colorClass="text-slate-600 dark:text-slate-400"
                    bgClass="bg-slate-50/50 dark:bg-slate-950/10"
                    data={mutation.data}
                    valKey="total_gastos_variables"
                    detalleKey="detalle_gastos_variables"
                    isExpanded={expandidas.has('variables')}
                    onToggle={() => toggleFila('variables')}
                  />

                  {/* Fila: Ahorro Real (Subtotal) */}
                  <tr className="bg-gray-50/30 dark:bg-neutral-800/20 font-bold border-t-2 border-gray-100 dark:border-neutral-800">
                    <td className="px-6 py-4 text-xs text-gray-500 dark:text-neutral-400 uppercase tracking-wider">Ahorro Proyectado Real</td>
                    {mutation.data.map((mes, idx) => (
                      <td key={idx} className="px-6 py-4 text-center text-sm font-black text-gray-700 dark:text-neutral-300">
                        {formatARS(mes.ahorro_real)}
                      </td>
                    ))}
                  </tr>

                  {/* SEPARADOR SIMULACIÓN */}
                  <tr className="h-4 bg-orange-50/20 dark:bg-orange-950/5">
                    <td colSpan={mutation.data.length + 1}></td>
                  </tr>

                  {/* Fila: Cuota Simulada */}
                  <tr className="bg-orange-100 dark:bg-orange-950/30 border-l-4 border-orange-500">
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-2">
                        <Calculator size={14} className="text-orange-600" />
                        <span className="text-[10px] font-black text-orange-700 dark:text-orange-400 uppercase tracking-widest">CUOTA SIMULADA</span>
                      </div>
                    </td>
                    {mutation.data.map((mes, idx) => (
                      <td key={idx} className={`px-6 py-5 text-center text-lg font-black text-orange-600 dark:text-orange-400 ${mes.cuota_simulada === 0 ? 'opacity-20' : ''}`}>
                        {formatARS(mes.cuota_simulada)}
                      </td>
                    ))}
                  </tr>

                  {/* Fila: Ahorro Final (Impacto) */}
                  <tr className="border-t-2 border-gray-100 dark:border-neutral-800">
                    <td className="px-6 py-6 text-xs font-black text-gray-900 dark:text-neutral-100 uppercase tracking-widest">AHORRO FINAL (IMPACTO)</td>
                    {mutation.data.map((mes, idx) => (
                      <td key={idx} className="px-6 py-6 text-center">
                        <div className={`inline-block px-4 py-2 rounded-2xl text-lg font-black ${
                          mes.ahorro_simulado >= 0 
                            ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400' 
                            : 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400 animate-pulse'
                        }`}>
                          {formatARS(mes.ahorro_simulado)}
                        </div>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          
          <p className="mt-4 text-[10px] text-center text-gray-400 uppercase font-bold tracking-widest">
            * Los cálculos se basan en tu proyección actual de ingresos y gastos fijos.
          </p>
          </div>{/* fin hidden lg:block */}

        </section>
      )}
    </main>
  );
}

// Subcomponente para filas colapsables
interface RowCategoriaProps {
  label: string;
  icon: any;
  colorClass: string;
  bgClass: string;
  data: SimuladorMes[];
  valKey: keyof SimuladorMes;
  detalleKey: keyof SimuladorMes;
  isExpanded: boolean;
  onToggle: () => void;
}

function RowCategoria({ label, icon: Icon, colorClass, bgClass, data, valKey, detalleKey, isExpanded, onToggle }: RowCategoriaProps) {
  return (
    <>
      <tr 
        onClick={onToggle}
        className={`cursor-pointer hover:bg-gray-50/80 dark:hover:bg-neutral-800/50 transition-colors group ${bgClass}`}
      >
        <td className="px-6 py-4">
          <div className="flex items-center gap-2">
            <Icon size={14} className={colorClass} />
            <span className={`text-[10px] font-black uppercase tracking-widest ${colorClass}`}>{label}</span>
            {isExpanded ? <ChevronUp size={14} className="text-gray-300" /> : <ChevronDown size={14} className="text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity" />}
          </div>
        </td>
        {data.map((mes, idx) => (
          <td key={idx} className={`px-6 py-4 text-center text-xs font-bold ${colorClass}`}>
            {formatARS(mes[valKey] as number)}
          </td>
        ))}
      </tr>

      {/* Detalle expandido */}
      {isExpanded && (
        <tr className="bg-white dark:bg-neutral-900 border-none">
          <td colSpan={data.length + 1} className="p-0">
            <div className="py-2 space-y-1">
              {/* Aquí asumimos que todos los meses tienen los mismos conceptos en detalle */}
              {/* Usamos el primer mes para sacar la lista de conceptos por nombre */}
              {(data[0][detalleKey] as any[]).map((_, itemIdx) => (
                <div key={itemIdx} className="flex border-b border-gray-50 dark:border-neutral-800/50 last:border-none">
                  <div className="px-6 py-2 text-[10px] font-bold text-gray-400 w-[200px] flex-shrink-0 uppercase tracking-widest truncate">
                    {(data[0][detalleKey] as any[])[itemIdx].descripcion}
                  </div>
                  {data.map((mes, idx) => {
                    const item = (mes[detalleKey] as any[])[itemIdx];
                    const monto = item ? (item.monto_proyectado || item.monto_cuota) : 0;
                    const subInfo = item && item.cuota_actual ? `(${item.cuota_actual}/${item.cuotas_total})` : '';
                    return (
                      <div key={idx} className="px-6 py-2 text-center text-[10px] font-bold text-gray-500 dark:text-neutral-400 min-w-[120px] flex-1">
                        {formatARS(monto)} <span className="text-[9px] opacity-60">{subInfo}</span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Vista Mobile: Cápsula de un mes simulado ───────────────────────────────

interface CapsulaMesProps {
  mes: SimuladorMes;
}

function CapsulaMes({ mes }: CapsulaMesProps) {
  const [expandido, setExpandido] = useState(false);

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-gray-100 dark:border-neutral-800 shadow-sm overflow-hidden">

      {/* Header: Mes/Año + toggle */}
      <button
        onClick={() => setExpandido(!expandido)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-neutral-800/50 transition-colors hover:bg-gray-100 dark:hover:bg-neutral-800"
      >
        <span className="text-sm font-black text-gray-900 dark:text-neutral-100 uppercase tracking-wide">
          {MESES_CORTO[mes.mes]} {mes.anio}
        </span>
        <ChevronDown
          size={16}
          className={`text-gray-400 transition-transform duration-200 ${expandido ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Cuota Simulada — siempre visible */}
      <div className="flex items-center justify-between px-4 py-3 bg-orange-50 dark:bg-orange-950/20 border-l-4 border-orange-500">
        <div className="flex items-center gap-2">
          <Calculator size={14} className="text-orange-600" />
          <span className="text-[10px] font-black text-orange-700 dark:text-orange-400 uppercase tracking-widest">
            Cuota Simulada
          </span>
        </div>
        <span className={`text-base font-black text-orange-600 dark:text-orange-400 ${
          mes.cuota_simulada === 0 ? 'opacity-30' : ''
        }`}>
          {formatARS(mes.cuota_simulada)}
        </span>
      </div>

      {/* Ahorro Final — siempre visible */}
      <div className="flex items-center justify-between px-4 py-3">
        <span className="text-[10px] font-black text-gray-500 dark:text-neutral-400 uppercase tracking-widest">
          Ahorro Final
        </span>
        <span className={`text-sm font-black px-3 py-1 rounded-xl ${
          mes.ahorro_simulado >= 0
            ? 'bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400'
            : 'bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400 animate-pulse'
        }`}>
          {formatARS(mes.ahorro_simulado)}
        </span>
      </div>

      {/* Detalle expandible */}
      {expandido && (
        <div className="border-t border-gray-100 dark:border-neutral-800 px-4 py-3 space-y-2">
          <LineaDetalle label="Ingresos"       valor={mes.total_ingresos}        colorClass="text-emerald-600" signo="+" />
          <LineaDetalle label="Cuotas Actuales" valor={mes.total_cuotas}          colorClass="text-amber-600"  signo="-" />
          <LineaDetalle label="Gastos Fijos"   valor={mes.total_gastos_fijos}    colorClass="text-blue-600"   signo="-" />
          <LineaDetalle label="Gastos Variables" valor={mes.total_gastos_variables} colorClass="text-slate-600" signo="-" />
          <div className="border-t border-gray-100 dark:border-neutral-800 pt-2">
            <LineaDetalle label="Ahorro Real"  valor={mes.ahorro_real}            colorClass="text-gray-700 dark:text-neutral-300" signo="" />
          </div>
        </div>
      )}
    </div>
  );
}

// Sub-componente auxiliar para cada fila de detalle
interface LineaDetalleProps {
  label: string;
  valor: number;
  colorClass: string;
  signo: string;
}

function LineaDetalle({ label, valor, colorClass, signo }: LineaDetalleProps) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] font-bold text-gray-400 dark:text-neutral-500 uppercase tracking-widest">{label}</span>
      <span className={`text-xs font-black ${colorClass}`}>
        {signo && <span className="mr-0.5">{signo}</span>}{formatARS(valor)}
      </span>
    </div>
  );
}
