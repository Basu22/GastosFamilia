import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTarjetas } from '../../api/tarjetas';
import { getMovimiento, updateMovimiento, deleteMovimiento } from '../../api/movimientos';
import { updateGastoMensual, deleteGastoMensual, getGastosMensuales, darBajaGastoMensual } from '../../api/gastos_mensuales';
import { updateIngreso, deleteIngreso, getIngresos } from '../../api/ingresos';
import { getPrestamos, updatePrestamo, deletePrestamo } from '../../api/prestamos';
import { Save, Trash2 } from 'lucide-react';
import { NumericFormat } from 'react-number-format';

// Esquema unificado (soporta ambos tipos de datos)
const schema = z.object({
  descripcion: z.string().min(3, 'Mínimo 3 caracteres'),
  monto: z.number().positive('Debe ser mayor a 0'),
  entidad: z.string().optional(),
  // Campos específicos de tarjeta
  tarjeta_id: z.string().optional(),
  cuotas: z.number().optional(),
  fecha_primera_cuota: z.string().optional(),
  // Campos específicos de fijos
  mes: z.number().optional(),
  anio: z.number().optional(),
  es_fijo: z.boolean().optional()
});

interface InlineEditFormProps {
  id: number;
  tipo: 'tarjeta' | 'gasto' | 'ingreso' | 'prestamo';
  mesActual: number;
  anioActual: number;
  onClose: () => void;
}

export default function InlineEditForm({ id, tipo, mesActual, anioActual, onClose }: InlineEditFormProps) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [entryMode, setEntryMode] = useState<'total' | 'cuota'>('total');
  const [cuotasMode, setCuotasMode] = useState<'preset' | 'manual'>('preset');
  const [isActiveGasto, setIsActiveGasto] = useState<boolean>(true);

  const { data: tarjetas } = useQuery({ queryKey: ['tarjetas'], queryFn: getTarjetas });

  const { register, handleSubmit, control, setValue, reset, watch, formState: { errors } } = useForm({
    resolver: zodResolver(schema)
  });

  const montoTotal = watch('monto');
  const cantCuotas = watch('cuotas');

  const handleMontoCuotaChange = (val: number | undefined) => {
    if (val && cantCuotas) {
      setValue('monto', val * cantCuotas);
    }
  };

  const handleMontoTotalChange = (val: number | undefined) => {
    if (val) {
      setValue('monto', val);
    }
  };

  // Cargar datos iniciales según el tipo
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        if (tipo === 'tarjeta') {
          const m = await getMovimiento(id);
          reset({
            descripcion: m.descripcion,
            monto: m.monto_total,
            tarjeta_id: m.tarjeta_id?.toString() || "",
            cuotas: m.cuotas,
            fecha_primera_cuota: m.fecha_primera_cuota
          });
        } else {
          const list = tipo === 'gasto' ? await getGastosMensuales() : tipo === 'ingreso' ? await getIngresos() : await getPrestamos();
          const item = list.find((x: any) => x.id === id);
          if (item) {
            reset({
              descripcion: item.descripcion,
              monto: item.monto_total || item.monto,
              entidad: item.entidad || "",
              mes: item.mes,
              anio: item.anio,
              es_fijo: item.es_fijo,
              tarjeta_id: item.tarjeta_id?.toString() || "",
              cuotas: item.cuotas,
              fecha_primera_cuota: item.fecha_primera_cuota
            });
            if (tipo === 'gasto') {
              setIsActiveGasto(item.activo !== false);
            }
          }
        }
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id, tipo, reset]);

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const payload = { 
        ...data, 
        tarjeta_id: data.tarjeta_id ? parseInt(data.tarjeta_id) : null,
        mes_edicion: mesActual,
        anio_edicion: anioActual
      };
      if (tipo === 'tarjeta') {
        return updateMovimiento(id, {
          ...payload,
          monto_total: data.monto // Mapeo de nombre de campo
        });
      } else if (tipo === 'gasto') {
        return updateGastoMensual(id, payload);
      } else if (tipo === 'prestamo') {
        return updatePrestamo(id, {
          ...payload,
          monto_total: data.monto
        });
      } else {
        return updateIngreso(id, payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      onClose();
    }
  });

  const removeMutation = useMutation({
    mutationFn: async () => {
      if (tipo === 'tarjeta') return deleteMovimiento(id);
      if (tipo === 'gasto') return deleteGastoMensual(id);
      if (tipo === 'prestamo') return deletePrestamo(id);
      return deleteIngreso(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      onClose();
    }
  });

  const bajaMutation = useMutation({
    mutationFn: async () => {
      if (tipo === 'gasto') return darBajaGastoMensual(id, mesActual, anioActual);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['gastos-mensuales'] });
      onClose();
    }
  });

  const esFijo = watch('es_fijo');
  const descripcionVal = watch('descripcion');

  if (loading) return <div className="p-8 text-center animate-pulse text-gray-400">Cargando datos...</div>;

  return (
    <div id={`inline-edit-${id}`} className="p-4 lg:p-6 bg-gray-50 dark:bg-neutral-950 border-y border-blue-100 dark:border-blue-900/30 overflow-hidden transition-all animate-in slide-in-from-top duration-300">
      <form id="form-inline-edit" onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          
          {/* Descripción */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase">Descripción</label>
            <input 
              {...register('descripcion')}
              className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
            {errors.descripcion && <p className="text-[10px] text-red-500">{errors.descripcion.message as string}</p>}
          </div>

          {/* Monto (Dinamico para Tarjeta y Prestamo) */}
          {(tipo === 'tarjeta' || tipo === 'prestamo') ? (
            <div className="col-span-full space-y-4 bg-white dark:bg-neutral-900 p-3 rounded-xl border border-gray-100 dark:border-neutral-800">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Modo de entrada</label>
                <div className="flex bg-gray-100 dark:bg-black p-0.5 rounded-lg">
                  <button type="button" onClick={() => setEntryMode('total')} className={`px-3 py-1 text-[9px] font-bold rounded-md transition-all ${entryMode === 'total' ? 'bg-white dark:bg-neutral-800 text-blue-600 shadow-sm' : 'text-gray-500'}`}>TOTAL</button>
                  <button type="button" onClick={() => setEntryMode('cuota')} className={`px-3 py-1 text-[9px] font-bold rounded-md transition-all ${entryMode === 'cuota' ? 'bg-white dark:bg-neutral-800 text-blue-600 shadow-sm' : 'text-gray-500'}`}>CUOTA</button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className={`text-[10px] font-bold ${entryMode === 'total' ? 'text-gray-600' : 'text-gray-400'}`}>Monto Total</label>
                  <Controller name="monto" control={control} render={({ field: { onChange, value, ref } }) => (
                    <NumericFormat 
                      getInputRef={ref} value={value} 
                      onValueChange={(v) => { onChange(v.floatValue); if(entryMode === 'total') handleMontoTotalChange(v.floatValue); }}
                      disabled={entryMode === 'cuota'}
                      thousandSeparator="." decimalSeparator="," prefix="$ " 
                      className={`w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-opacity ${entryMode === 'cuota' ? 'opacity-50' : ''}`} 
                    />
                  )} />
                </div>
                <div className="space-y-1">
                  <label className={`text-[10px] font-bold ${entryMode === 'cuota' ? 'text-gray-600' : 'text-gray-400'}`}>Monto Cuota</label>
                  <NumericFormat 
                    value={cantCuotas && cantCuotas > 0 ? Number(((montoTotal || 0) / cantCuotas).toFixed(2)) : 0}
                    onValueChange={(v) => { if(entryMode === 'cuota') handleMontoCuotaChange(v.floatValue); }}
                    disabled={entryMode === 'total'}
                    thousandSeparator="." decimalSeparator="," prefix="$ " 
                    className={`w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-opacity ${entryMode === 'total' ? 'opacity-50' : ''}`} 
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Monto</label>
              <Controller name="monto" control={control} render={({ field: { onChange, value, ref } }) => (
                <NumericFormat 
                  getInputRef={ref} value={value} onValueChange={(v) => onChange(v.floatValue)}
                  thousandSeparator="." decimalSeparator="," prefix="$ " 
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" 
                />
              )} />
            </div>
          )}

          {/* Campos específicos Tarjeta y Prestamo (Restantes) */}
          {(tipo === 'tarjeta' || tipo === 'prestamo') && (
            <>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">
                  {tipo === 'tarjeta' ? 'Tarjeta' : 'Entidad / Banco'}
                </label>
                {tipo === 'tarjeta' ? (
                  <select 
                    {...register('tarjeta_id')}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">Efectivo / Transf.</option>
                    {tarjetas?.map((t: any) => (
                      <option key={t.id} value={t.id}>{t.nombre}</option>
                    ))}
                  </select>
                ) : (
                  <input 
                    {...register('entidad')}
                    placeholder="Ej: Banco Galicia, ICBC, etc."
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                )}
              </div>
              <div className="col-span-full space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Cuotas</label>
                  <div className="flex bg-gray-100 dark:bg-black p-0.5 rounded-lg">
                    <button type="button" onClick={() => setCuotasMode('preset')} className={`px-2 py-1 text-[8px] font-bold rounded-md transition-all ${cuotasMode === 'preset' ? 'bg-white dark:bg-neutral-800 text-blue-600 shadow-sm' : 'text-gray-500'}`}>SUG.</button>
                    <button type="button" onClick={() => setCuotasMode('manual')} className={`px-2 py-1 text-[8px] font-bold rounded-md transition-all ${cuotasMode === 'manual' ? 'bg-white dark:bg-neutral-800 text-blue-600 shadow-sm' : 'text-gray-500'}`}>MAN.</button>
                  </div>
                </div>
                
                {cuotasMode === 'preset' ? (
                  <div className="grid grid-cols-6 gap-1.5">
                    {[1, 3, 6, 12, 18, 24].map(n => (
                      <button 
                        key={n} 
                        type="button" 
                        onClick={() => setValue('cuotas', n)} 
                        className={`py-2 rounded-lg text-[10px] font-bold border transition-all ${cantCuotas === n ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white dark:bg-neutral-900 text-gray-500 border-gray-100 dark:border-neutral-800'}`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="relative">
                    <input 
                      type="number"
                      {...register('cuotas', { valueAsNumber: true })}
                      className="w-full px-4 pr-16 py-2 rounded-lg border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                      min="1"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[8px] font-bold text-gray-400 uppercase tracking-widest pointer-events-none">
                      CUOTAS
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Campos específicos Fijos */}
          {(tipo !== 'tarjeta' && tipo !== 'prestamo') && (
            <>
              {tipo === 'gasto' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">Medio de Pago</label>
                  <select 
                    {...register('tarjeta_id')}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="">Efectivo / Transf.</option>
                    {tarjetas?.map((t: any) => (
                      <option key={t.id} value={t.id}>{t.nombre}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex items-center gap-3 h-10 mt-4">
                <input type="checkbox" {...register('es_fijo')} id="check-fijo" className="w-5 h-5 rounded border-gray-300" />
                <label htmlFor="check-fijo" className="text-xs font-bold text-gray-600 dark:text-neutral-400 cursor-pointer">Valor Fijo Mensual</label>
              </div>
            </>
          )}
        </div>

        {/* Acciones */}
        <div className="pt-4 border-t border-gray-100 dark:border-neutral-900">
          <div className="grid grid-cols-2 gap-3 md:flex md:items-center md:justify-between">
            {/* Columna 1: Guardar (Ocupa toda la altura en mobile) */}
            <button 
              type="submit"
              disabled={mutation.isPending}
              className="order-1 md:order-3 h-full md:h-auto flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 px-6 py-4 md:py-2 bg-blue-600 text-white rounded-2xl md:rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-900/20 active:scale-95 transition-all disabled:opacity-50"
            >
              <Save size={20} className="md:w-4 md:h-4" /> 
              <span className="text-[10px] md:text-xs font-black md:font-bold uppercase">
                {mutation.isPending ? '...' : 'Guardar'}
              </span>
            </button>

            {/* Columna 2: Cancelar y Eliminar (Stack vertical en mobile) */}
            <div className="order-2 flex flex-col gap-2 md:flex-row md:items-center">
              <button 
                type="button" 
                onClick={onClose}
                className="px-4 py-3 md:py-2 text-[10px] md:text-xs font-black md:font-bold text-gray-500 bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 rounded-xl md:border-none md:bg-transparent"
              >
                CANCELAR
              </button>
              <button 
                type="button"
                onClick={() => { if(window.confirm('¿Eliminar este registro?')) removeMutation.mutate(); }}
                className="flex items-center justify-center px-4 py-3 md:py-2 text-[10px] md:text-xs font-black md:font-bold text-red-500 bg-red-50 dark:bg-red-950/20 rounded-xl md:bg-transparent"
              >
                <Trash2 size={18} className="md:w-4 md:h-4" />
                <span className="hidden md:inline ml-2">ELIMINAR</span>
              </button>
            </div>
          </div>
        </div>

        {/* Sección Dar de Baja para Gastos Fijos */}
        {tipo === 'gasto' && esFijo && isActiveGasto && (
          <div className="mt-6 pt-4 border-t border-red-500/10">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-red-500/5 border border-red-500/10">
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-red-500 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                  Dar de baja este gasto fijo
                </h4>
                <p className="text-[10px] text-gray-500 dark:text-neutral-400">
                  El gasto dejará de proyectarse desde el próximo mes. El historial anterior queda preservado.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`¿Dar de baja "${descripcionVal}"? El gasto dejará de proyectarse desde el próximo mes. El historial queda preservado.`)) {
                    bajaMutation.mutate();
                  }
                }}
                disabled={bajaMutation.isPending}
                className="w-full md:w-auto px-4 py-2 rounded-xl text-xs font-bold bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20 transition-all active:scale-95 whitespace-nowrap disabled:opacity-50"
              >
                {bajaMutation.isPending ? 'PROCESANDO...' : 'DAR DE BAJA'}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
