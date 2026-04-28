import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// APIs
import { getGastosMensuales, createGastoMensual, updateGastoMensual, deleteGastoMensual } from '../api/gastos_mensuales';
import { getIngresos, createIngreso, updateIngreso, deleteIngreso } from '../api/ingresos';
import { getTarjetas } from '../api/tarjetas';
import { createMovimiento, previewMovimiento, getMovimientos, updateMovimiento, deleteMovimiento } from '../api/movimientos';

// UI
import { formatARS } from '../utils/format';
import { Plus, Edit3, Trash2, TrendingDown, TrendingUp, CreditCard, Info, History } from 'lucide-react';
import { NumericFormat } from 'react-number-format';

// Esquemas de Validación
const schemaFijos = z.object({
  descripcion: z.string().min(3, 'Mínimo 3 caracteres'),
  monto: z.number({ invalid_type_error: 'Debe ser numérico' }).positive('Debe ser mayor a 0'),
  mes: z.number().min(1).max(12),
  anio: z.number().min(2020).max(2050),
  es_fijo: z.boolean().default(false),
  tarjeta_id: z.string().optional()
});

const schemaCuotas = z.object({
  tarjeta_id: z.string().optional(),
  descripcion: z.string().min(3, 'Mínimo 3 caracteres'),
  monto_total: z.number({ invalid_type_error: 'Debe ser un número válido' }).positive('El monto debe ser mayor a 0'),
  cuotas: z.number().int().min(1),
  fecha_primera_cuota: z.string().min(1, 'Seleccioná una fecha'),
  notas: z.string().optional()
});

type FijosType = z.infer<typeof schemaFijos>;
type CuotasType = z.infer<typeof schemaCuotas>;

type TabType = 'egresos' | 'tarjetas' | 'ingresos';

export default function Movimientos() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabType>('egresos');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [entryMode, setEntryMode] = useState<'total' | 'cuota'>('total');
  const [cuotasMode, setCuotasMode] = useState<'preset' | 'manual'>('preset');

  // Queries
  const { data: tarjetas } = useQuery({ queryKey: ['tarjetas'], queryFn: getTarjetas });
  const { data: egresos, isLoading: loadingEgresos } = useQuery({ queryKey: ['gastos_mensuales'], queryFn: () => getGastosMensuales() });
  const { data: ingresos, isLoading: loadingIngresos } = useQuery({ queryKey: ['ingresos'], queryFn: () => getIngresos() });
  const { data: movimientos, isLoading: loadingMovimientos } = useQuery({ queryKey: ['movimientos'], queryFn: () => getMovimientos() });

  // Forms
  const formFijos = useForm<FijosType>({
    resolver: zodResolver(schemaFijos),
    defaultValues: { 
      descripcion: '',
      monto: 0,
      mes: new Date().getMonth() + 1, 
      anio: new Date().getFullYear(), 
      es_fijo: false,
      tarjeta_id: ''
    }
  });

  const formCuotas = useForm<CuotasType>({
    resolver: zodResolver(schemaCuotas),
    defaultValues: { 
      tarjeta_id: '',
      descripcion: '',
      monto_total: 0,
      cuotas: 1, 
      fecha_primera_cuota: new Date().toISOString().split('T')[0],
      notas: ''
    }
  });

  // Lógica de cálculo dual de montos
  const montoTotal = formCuotas.watch('monto_total') as number;
  const cantCuotas = formCuotas.watch('cuotas') as number;
  const fechaInicio = formCuotas.watch('fecha_primera_cuota') as string;

  const handleMontoCuotaChange = (val: number | undefined) => {
    if (val && cantCuotas) {
      formCuotas.setValue('monto_total', val * cantCuotas);
    }
  };

  const handleMontoTotalChange = (val: number | undefined) => {
    if (val) {
      formCuotas.setValue('monto_total', val);
    }
  };

  // Efecto para capturar edición o tab desde URL
  useEffect(() => {
    const tabParam = searchParams.get('tab') as TabType;
    if (tabParam) setActiveTab(tabParam);
  }, [searchParams]);

  useEffect(() => {
    const loadPreview = async () => {
      if (activeTab === 'tarjetas' && montoTotal > 0 && cantCuotas >= 1 && fechaInicio) {
        try {
          const p = await previewMovimiento(montoTotal, cantCuotas, fechaInicio);
          setPreviewData(p);
        } catch (e) { setPreviewData(null); }
      } else { setPreviewData(null); }
    };
    const tid = setTimeout(loadPreview, 300);
    return () => clearTimeout(tid);
  }, [montoTotal, cantCuotas, fechaInicio, activeTab]);

  // Mutations
  const mutationFijos = useMutation({
    mutationFn: (data: any) => {
      const payload = { ...data, tarjeta_id: data.tarjeta_id ? parseInt(data.tarjeta_id) : null };
      if (editingId) return activeTab === 'egresos' ? updateGastoMensual(editingId, payload) : updateIngreso(editingId, payload);
      return activeTab === 'egresos' ? createGastoMensual(payload) : createIngreso(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: [activeTab === 'egresos' ? 'gastos_mensuales' : 'ingresos'] });
      handleCancel();
    }
  });

  const mutationCuotas = useMutation({
    mutationFn: (data: any) => {
      const payload = { ...data, tarjeta_id: data.tarjeta_id ? parseInt(data.tarjeta_id) : null };
      if (editingId) return updateMovimiento(editingId, payload);
      return createMovimiento(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['movimientos'] });
      handleCancel();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => {
      if (activeTab === 'tarjetas') return deleteMovimiento(id);
      return activeTab === 'egresos' ? deleteGastoMensual(id) : deleteIngreso(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: [activeTab === 'egresos' ? 'gastos_mensuales' : (activeTab === 'tarjetas' ? 'movimientos' : 'ingresos')] });
      handleCancel();
    }
  });

  const handleEdit = (item: any) => {
    setEditingId(item.id);
    if (activeTab === 'tarjetas') {
      formCuotas.reset({
        tarjeta_id: item.tarjeta_id?.toString() || "",
        descripcion: item.descripcion,
        monto_total: item.monto_total,
        cuotas: item.cuotas,
        fecha_primera_cuota: item.fecha_primera_cuota,
        notas: item.notas || ""
      });
    } else {
      formFijos.reset({
        descripcion: item.descripcion,
        monto: item.monto,
        mes: item.mes,
        anio: item.anio,
        es_fijo: item.es_fijo,
        tarjeta_id: item.tarjeta_id?.toString() || ""
      });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancel = () => {
    setEditingId(null);
    formFijos.reset();
    formCuotas.reset({ cuotas: 1, fecha_primera_cuota: new Date().toISOString().split('T')[0] });
    setSearchParams({});
  };

  const currentList = activeTab === 'egresos' ? egresos : (activeTab === 'tarjetas' ? movimientos : ingresos);
  const isLoading = activeTab === 'egresos' ? loadingEgresos : (activeTab === 'tarjetas' ? loadingMovimientos : loadingIngresos);

  return (
    <main id="page-movimientos" className="max-w-4xl mx-auto space-y-6 px-4 py-4 lg:px-8 lg:py-8 pb-24 lg:pb-12">
      <header id="header-movimientos">
        <p className="text-gray-500 dark:text-neutral-500 font-medium text-xs uppercase tracking-wider">Gestión Financiera</p>
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-neutral-100">Movimientos</h1>
      </header>

      {/* Tabs Principales */}
      <nav className="flex bg-gray-100 dark:bg-neutral-900 p-1.5 rounded-2xl shadow-inner transition-all">
        {[
          { id: 'egresos', label: 'Egresos', icon: TrendingDown, color: 'text-red-500', bg: 'bg-red-50' },
          { id: 'tarjetas', label: 'Tarjetas', icon: CreditCard, color: 'text-blue-500', bg: 'bg-blue-50' },
          { id: 'ingresos', label: 'Ingresos', icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-50' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => { setActiveTab(t.id as TabType); handleCancel(); }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs lg:text-sm font-bold transition-all ${
              activeTab === t.id 
                ? `bg-white dark:bg-neutral-800 shadow-md ${t.color}` 
                : 'text-gray-500 dark:text-neutral-500 hover:text-gray-700'
            }`}
          >
            <t.icon size={18} />
            {t.label}
          </button>
        ))}
      </nav>

      {/* Formulario Dinámico */}
      <section className={`rounded-2xl border p-4 lg:p-8 transition-all shadow-sm ${
        activeTab === 'egresos' ? 'bg-red-50/20 border-red-100 dark:border-red-900/30' : 
        activeTab === 'tarjetas' ? 'bg-blue-50/20 border-blue-100 dark:border-blue-900/30' : 
        'bg-emerald-50/20 border-emerald-100 dark:border-emerald-900/30'
      }`}>
        <h2 className="text-lg font-bold mb-6 flex items-center gap-2 text-gray-900 dark:text-neutral-100">
          {editingId ? <Edit3 size={20} /> : <Plus size={20} />}
          {editingId ? 'Editar' : 'Nuevo'} {activeTab === 'egresos' ? 'Gasto Mensual' : activeTab === 'tarjetas' ? 'Compra en Cuotas' : 'Ingreso'}
        </h2>

        {activeTab === 'tarjetas' ? (
          <form 
            onSubmit={formCuotas.handleSubmit((d) => {
              if (!editingId && !window.confirm('¿Confirmás el alta de esta nueva compra?')) return;
              mutationCuotas.mutate(d);
            })} 
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 dark:text-neutral-300">Medio de Pago</label>
                <select {...formCuotas.register('tarjeta_id')} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-sm outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Efectivo / Transferencia</option>
                  {tarjetas?.map((t: any) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 dark:text-neutral-300">Descripción</label>
                <input {...formCuotas.register('descripcion')} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="Ej: Supermercado" />
              </div>

              {/* Selector de Modo de Entrada */}
              <div className="col-span-full space-y-3">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">¿Cómo querés ingresar el monto?</label>
                <div className="flex bg-gray-100 dark:bg-neutral-900 p-1 rounded-xl w-full md:w-80">
                  <button 
                    type="button" 
                    onClick={() => setEntryMode('total')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${entryMode === 'total' ? 'bg-white dark:bg-neutral-800 text-blue-600 shadow-sm' : 'text-gray-500'}`}
                  >
                    MONTO TOTAL
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setEntryMode('cuota')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${entryMode === 'cuota' ? 'bg-white dark:bg-neutral-800 text-blue-600 shadow-sm' : 'text-gray-500'}`}
                  >
                    VALOR CUOTA
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className={`text-sm font-semibold ${entryMode === 'total' ? 'text-gray-700 dark:text-neutral-300' : 'text-gray-400'}`}>Monto Total</label>
                <Controller name="monto_total" control={formCuotas.control} render={({ field: { onChange, value, ref } }) => (
                  <NumericFormat 
                    getInputRef={ref} 
                    value={value} 
                    onValueChange={(v) => {
                      onChange(v.floatValue);
                      if (entryMode === 'total') handleMontoTotalChange(v.floatValue);
                    }} 
                    disabled={entryMode === 'cuota'}
                    thousandSeparator="." decimalSeparator="," prefix="$ " 
                    className={`w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-xl font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-opacity ${entryMode === 'cuota' ? 'opacity-50' : ''}`} 
                  />
                )} />
              </div>

              <div className="space-y-2">
                <label className={`text-sm font-semibold ${entryMode === 'cuota' ? 'text-gray-700 dark:text-neutral-300' : 'text-gray-400'}`}>Monto de la Cuota</label>
                <NumericFormat 
                  value={cantCuotas > 0 ? Number(((montoTotal || 0) / cantCuotas).toFixed(2)) : 0} 
                  onValueChange={(v) => {
                    if (entryMode === 'cuota') handleMontoCuotaChange(v.floatValue);
                  }}
                  disabled={entryMode === 'total'}
                  thousandSeparator="." decimalSeparator="," prefix="$ " 
                  className={`w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-xl font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-opacity ${entryMode === 'total' ? 'opacity-50' : ''}`} 
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 dark:text-neutral-300">Fecha Inicio</label>
                <input type="date" {...formCuotas.register('fecha_primera_cuota')} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="col-span-full space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-gray-700 dark:text-neutral-300">Cantidad de Cuotas</label>
                  <div className="flex bg-gray-100 dark:bg-neutral-900 p-1 rounded-xl w-48">
                    <button 
                      type="button" 
                      onClick={() => setCuotasMode('preset')}
                      className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${cuotasMode === 'preset' ? 'bg-white dark:bg-neutral-800 text-blue-600 shadow-sm' : 'text-gray-500'}`}
                    >
                      SUGERENCIAS
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setCuotasMode('manual')}
                      className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg transition-all ${cuotasMode === 'manual' ? 'bg-white dark:bg-neutral-800 text-blue-600 shadow-sm' : 'text-gray-500'}`}
                    >
                      MANUAL
                    </button>
                  </div>
                </div>

                {cuotasMode === 'preset' ? (
                  <div className="grid grid-cols-6 gap-2">
                    {[1, 3, 6, 12, 18, 24].map(n => (
                      <button key={n} type="button" onClick={() => formCuotas.setValue('cuotas', n)} className={`py-3 rounded-xl font-bold border transition-all ${cantCuotas === n ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white dark:bg-neutral-900 text-gray-500 border-gray-100 dark:border-neutral-800 hover:bg-gray-50'}`}>{n}</button>
                    ))}
                  </div>
                ) : (
                  <div className="relative">
                    <input 
                      type="number" 
                      {...formCuotas.register('cuotas', { valueAsNumber: true })} 
                      className="w-full px-4 pr-20 py-3 rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-xl font-bold outline-none focus:ring-2 focus:ring-blue-500"
                      min="1"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-neutral-500 font-bold text-[10px] uppercase tracking-[0.2em] pointer-events-none">
                      CUOTAS
                    </div>
                  </div>
                )}
              </div>
            </div>
            {previewData && (
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800 flex gap-3">
                <Info className="text-blue-500" size={20} />
                <p className="text-sm text-blue-900 dark:text-blue-300">Pagarás <span className="font-bold">{formatARS(previewData.monto_cuota)}</span> por mes durante {previewData.cuotas} meses.</p>
              </div>
            )}
            <div className="flex gap-3 pt-4">
              {editingId && (
                <button type="button" onClick={() => { if(window.confirm('¿Borrar compra?')) deleteMutation.mutate(editingId); }} className="px-5 py-4 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-all"><Trash2 size={20} /></button>
              )}
              <button type="submit" disabled={mutationCuotas.isPending} className="flex-1 py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 dark:shadow-none active:scale-95 transition-all">{mutationCuotas.isPending ? 'Guardando...' : 'Guardar Compra'}</button>
            </div>
          </form>
        ) : (
          <form 
            onSubmit={formFijos.handleSubmit((d) => {
              const label = activeTab === 'egresos' ? 'gasto' : 'ingreso';
              if (!editingId && !window.confirm(`¿Confirmás el alta de este nuevo ${label}?`)) return;
              mutationFijos.mutate(d);
            })} 
            className="space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 dark:text-neutral-300">Descripción</label>
                <input {...formFijos.register('descripcion')} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder={activeTab === 'egresos' ? 'Luz, Alquiler...' : 'Sueldo, Bono...'} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700 dark:text-neutral-300">Monto</label>
                <Controller name="monto" control={formFijos.control} render={({ field: { onChange, value, ref } }) => (
                  <NumericFormat getInputRef={ref} value={value} onValueChange={(v) => onChange(v.floatValue)} thousandSeparator="." decimalSeparator="," prefix="$ " className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-xl font-bold outline-none focus:ring-2 focus:ring-blue-500" />
                )} />
              </div>
              <div className="flex gap-4">
                <div className="flex-1 space-y-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-neutral-300">Mes</label>
                  <input type="number" {...formFijos.register('mes', { valueAsNumber: true })} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-sm outline-none" />
                </div>
                <div className="flex-1 space-y-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-neutral-300">Año</label>
                  <input type="number" {...formFijos.register('anio', { valueAsNumber: true })} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-sm outline-none" />
                </div>
              </div>
              
              {activeTab === 'egresos' && (
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 dark:text-neutral-300">Medio de Pago</label>
                  <select {...formFijos.register('tarjeta_id')} className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-sm outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Efectivo / Transferencia</option>
                    {tarjetas?.map((t: any) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                  </select>
                </div>
              )}

              <div className="flex items-center gap-3 bg-white dark:bg-neutral-950 px-4 py-3 rounded-xl border border-gray-200 dark:border-neutral-800">
                <input type="checkbox" {...formFijos.register('es_fijo')} id="check-fijo" className="w-5 h-5 rounded border-gray-300 text-blue-600" />
                <label htmlFor="check-fijo" className="text-sm font-semibold text-gray-700 dark:text-neutral-300 cursor-pointer">Valor FIJO mensual</label>
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              {editingId && (
                <button type="button" onClick={() => { if(window.confirm('¿Borrar registro?')) deleteMutation.mutate(editingId); }} className="px-5 py-4 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-all"><Trash2 size={20} /></button>
              )}
              <button type="submit" disabled={mutationFijos.isPending} className={`flex-1 py-4 font-bold rounded-xl text-white shadow-lg active:scale-95 transition-all ${activeTab === 'egresos' ? 'bg-red-600 hover:bg-red-700 shadow-red-200 dark:shadow-none' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200 dark:shadow-none'}`}>
                {mutationFijos.isPending ? 'Guardando...' : (editingId ? 'Actualizar' : 'Guardar')}
              </button>
            </div>
          </form>
        )}
      </section>

      {/* Listado Histórico */}
      <section className="space-y-4">
        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
          <History size={16} /> Últimos {activeTab} registrados
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? (
            <div className="col-span-full h-32 bg-gray-100 dark:bg-neutral-900 animate-pulse rounded-2xl" />
          ) : currentList?.length === 0 ? (
            <div className="col-span-full py-12 text-center text-gray-400 bg-white dark:bg-neutral-900 rounded-2xl border border-dashed border-gray-200 dark:border-neutral-800">
              <p className="text-4xl mb-2">📭</p>
              <p className="text-sm font-medium">Sin registros guardados</p>
            </div>
          ) : (
            currentList?.map((item: any) => (
              <article 
                key={item.id} 
                onClick={() => handleEdit(item)}
                className="group relative bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-gray-100 dark:border-neutral-800 hover:border-blue-200 dark:hover:border-blue-900/50 hover:shadow-md cursor-pointer transition-all overflow-hidden"
              >
                <div className={`absolute left-0 top-0 w-1 h-full transition-all group-hover:w-1.5 ${activeTab === 'egresos' ? 'bg-red-500' : (activeTab === 'tarjetas' ? 'bg-blue-500' : 'bg-emerald-500')}`} />
                <div className="pl-2">
                  <header className="flex justify-between items-start mb-1">
                    <h4 className="font-bold text-gray-900 dark:text-neutral-100 truncate pr-2">{item.descripcion}</h4>
                    {item.es_fijo && <span className="text-[9px] font-bold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">FIJO</span>}
                  </header>
                  <p className="text-[10px] text-gray-400 font-medium uppercase">
                    {activeTab === 'tarjetas' ? (item.tarjeta_nombre || 'Sin Tarjeta') : `${item.mes}/${item.anio}`}
                  </p>
                  <div className="mt-3 flex justify-between items-end">
                    <p className="text-lg font-bold text-gray-900 dark:text-neutral-100">
                      {formatARS(activeTab === 'tarjetas' ? item.monto_total : item.monto)}
                    </p>
                    {activeTab === 'tarjetas' && (
                      <span className="text-[10px] font-bold text-blue-500">{item.cuotas} CUOTAS</span>
                    )}
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
