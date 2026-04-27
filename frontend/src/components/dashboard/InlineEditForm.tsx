import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTarjetas } from '../../api/tarjetas';
import { getMovimiento, updateMovimiento, deleteMovimiento } from '../../api/movimientos';
import { updateGastoMensual, deleteGastoMensual, getGastosMensuales } from '../../api/gastos_mensuales';
import { updateIngreso, deleteIngreso, getIngresos } from '../../api/ingresos';
import { Save, Trash2 } from 'lucide-react';
import { NumericFormat } from 'react-number-format';

// Esquema unificado (soporta ambos tipos de datos)
const schema = z.object({
  descripcion: z.string().min(3, 'Mínimo 3 caracteres'),
  monto: z.number().positive('Debe ser mayor a 0'),
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
  tipo: 'tarjeta' | 'gasto' | 'ingreso';
  onClose: () => void;
}

export default function InlineEditForm({ id, tipo, onClose }: InlineEditFormProps) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [entryMode, setEntryMode] = useState<'total' | 'cuota'>('total');

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
          const list = tipo === 'gasto' ? await getGastosMensuales() : await getIngresos();
          const item = list.find((x: any) => x.id === id);
          if (item) {
            reset({
              descripcion: item.descripcion,
              monto: item.monto,
              mes: item.mes,
              anio: item.anio,
              es_fijo: item.es_fijo
            });
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
      if (tipo === 'tarjeta') {
        return updateMovimiento(id, {
          ...data,
          tarjeta_id: data.tarjeta_id ? parseInt(data.tarjeta_id) : null,
          monto_total: data.monto // Mapeo de nombre de campo
        });
      } else if (tipo === 'gasto') {
        return updateGastoMensual(id, data);
      } else {
        return updateIngreso(id, data);
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
      return deleteIngreso(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      onClose();
    }
  });

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

          {/* Monto (Dinamico para Tarjeta) */}
          {tipo === 'tarjeta' ? (
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

          {/* Campos específicos Tarjeta (Restantes) */}
          {tipo === 'tarjeta' && (
            <>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Tarjeta</label>
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
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Cuotas</label>
                <input 
                  type="number"
                  {...register('cuotas', { valueAsNumber: true })}
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </>
          )}

          {/* Campos específicos Fijos */}
          {tipo !== 'tarjeta' && (
            <div className="flex items-center gap-3 h-10 mt-4">
              <input type="checkbox" {...register('es_fijo')} id="check-fijo" className="w-5 h-5 rounded border-gray-300" />
              <label htmlFor="check-fijo" className="text-xs font-bold text-gray-600 dark:text-neutral-400 cursor-pointer">Valor Fijo Mensual</label>
            </div>
          )}
        </div>

        {/* Acciones */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-neutral-900">
          <button 
            type="button"
            onClick={() => { if(window.confirm('¿Eliminar este registro?')) removeMutation.mutate(); }}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-all"
          >
            <Trash2 size={16} /> ELIMINAR
          </button>

          <div className="flex items-center gap-2">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-lg transition-all"
            >
              CANCELAR
            </button>
            <button 
              type="submit"
              disabled={mutation.isPending}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-900/20 active:scale-95 transition-all"
            >
              <Save size={16} /> {mutation.isPending ? 'GUARDANDO...' : 'GUARDAR CAMBIOS'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
