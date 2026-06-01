import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { getTarjetas } from '../../api/tarjetas';
import { createMovimiento } from '../../api/movimientos';
import { createGastoMensual } from '../../api/gastos_mensuales';
import { createIngreso } from '../../api/ingresos';
import { createPrestamo } from '../../api/prestamos';
import { getCategorias } from '../../api/configuracion';
import { getReservas } from '../../api/reservas';
import { Save, X } from 'lucide-react';
import { NumericFormat } from 'react-number-format';

const schema = z.object({
  descripcion: z.string().min(3, 'Mínimo 3 caracteres'),
  categoria: z.string().optional().nullable(),
  monto: z.number().positive('Debe ser mayor a 0'),
  entidad: z.string().optional(),
  tarjeta_id: z.string().optional(),
  reserva_id: z.string().optional(),
  medio_pago: z.string().optional(),
  cuotas: z.number().optional(),
  fecha_primera_cuota: z.string().optional(),
  es_fijo: z.boolean().optional(),
  mes: z.number(),
  anio: z.number()
});

interface InlineCreateFormProps {
  tipo: 'tarjeta' | 'gasto' | 'ingreso' | 'gasto_fijo' | 'gasto_variado' | 'prestamo';
  mes: number;
  anio: number;
  onClose: () => void;
  defaultMedioPago?: string;
}

export default function InlineCreateForm({ tipo, mes, anio, onClose, defaultMedioPago }: InlineCreateFormProps) {
  const queryClient = useQueryClient();
  const [entryMode, setEntryMode] = useState<'total' | 'cuota'>('total');
  const { data: tarjetas } = useQuery({ queryKey: ['tarjetas'], queryFn: getTarjetas });
  const { data: categorias } = useQuery({ queryKey: ['categorias'], queryFn: getCategorias });
  const { data: reservas } = useQuery({ queryKey: ['reservas'], queryFn: getReservas });

  const { register, handleSubmit, control, setValue, watch, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      descripcion: '',
      categoria: '',
      monto: 0,
      entidad: '',
      cuotas: 1,
      fecha_primera_cuota: `${anio}-${mes.toString().padStart(2, '0')}-01`,
      es_fijo: tipo === 'gasto_fijo' || (tipo === 'gasto' ? true : false),
      mes: mes,
      anio: anio,
      medio_pago: defaultMedioPago || ""
    }
  });

  const cantCuotas = watch('cuotas');

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      let tarjeta_id = null;
      let reserva_id = null;
      if (data.medio_pago) {
        if (data.medio_pago.startsWith('tarjeta_')) tarjeta_id = parseInt(data.medio_pago.split('_')[1]);
        if (data.medio_pago.startsWith('reserva_')) reserva_id = parseInt(data.medio_pago.split('_')[1]);
      }

      const payload = { 
        ...data, 
        tarjeta_id,
        reserva_id
      };
      delete payload.medio_pago;
      
      if (tipo === 'tarjeta') {
        return createMovimiento({
          ...payload,
          monto_total: data.monto
        });
      } else if (tipo.startsWith('gasto')) {
        return createGastoMensual(payload);
      } else if (tipo === 'prestamo') {
        return createPrestamo({
          ...payload,
          monto_total: data.monto
        });
      } else {
        return createIngreso(payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      onClose();
    }
  });

  const handleMontoCuotaChange = (val: number | undefined) => {
    if (val && cantCuotas) setValue('monto', val * cantCuotas);
  };

  return (
    <div className="p-6 bg-blue-50/30 dark:bg-blue-900/5 border-y border-blue-100 dark:border-blue-900/30 animate-in slide-in-from-top duration-300">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">
          Nuevo {tipo === 'ingreso' ? 'Ingreso' : tipo === 'tarjeta' ? 'Gasto con Tarjeta' : tipo === 'prestamo' ? 'Préstamo Bancario' : tipo === 'gasto_fijo' ? 'Gasto Mensual' : 'Gasto Variado'}
        </h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
      </div>

      <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase">Descripción</label>
            <input 
              {...register('descripcion')}
              autoFocus
              placeholder="Ej: Supermercado, Sueldo, etc."
              className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
            {errors.descripcion && <p className="text-[10px] text-red-500">{errors.descripcion.message as string}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-gray-400 uppercase">Categoría</label>
            <select
              {...register('categoria')}
              className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
            >
              <option value="">Sin categoría</option>
              {categorias?.filter((c:any) => {
                if (tipo === 'ingreso') return c.tipo === 'Ingreso' || c.tipo === 'Ambos';
                return c.tipo === 'Gasto' || c.tipo.startsWith('Gasto') || c.tipo === 'Ambos';
              }).map((c: any) => (
                <option key={c.id} value={c.nombre}>{c.nombre}</option>
              ))}
            </select>
          </div>

          {(tipo === 'tarjeta' || tipo === 'prestamo') ? (
            <div className="col-span-full grid grid-cols-1 md:grid-cols-2 gap-4 bg-white dark:bg-neutral-900 p-4 rounded-2xl border border-gray-100 dark:border-neutral-800">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                   <label className="text-[10px] font-bold text-gray-400 uppercase">Monto Total</label>
                   <div className="flex bg-gray-100 dark:bg-black p-0.5 rounded-lg">
                    <button type="button" onClick={() => setEntryMode('total')} className={`px-2 py-0.5 text-[8px] font-bold rounded ${entryMode === 'total' ? 'bg-white dark:bg-neutral-800 text-blue-600 shadow-sm' : 'text-gray-500'}`}>TOTAL</button>
                    <button type="button" onClick={() => setEntryMode('cuota')} className={`px-2 py-0.5 text-[8px] font-bold rounded ${entryMode === 'cuota' ? 'bg-white dark:bg-neutral-800 text-blue-600 shadow-sm' : 'text-gray-500'}`}>CUOTA</button>
                  </div>
                </div>
                <Controller name="monto" control={control} render={({ field: { onChange, value, ref } }) => (
                  <NumericFormat 
                    getInputRef={ref} value={value} 
                    onValueChange={(v) => { onChange(v.floatValue); }}
                    disabled={entryMode === 'cuota'}
                    thousandSeparator="." decimalSeparator="," prefix="$ " 
                    className={`w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-sm font-black focus:ring-2 focus:ring-blue-500 outline-none ${entryMode === 'cuota' ? 'opacity-50' : ''}`} 
                  />
                )} />
                {entryMode === 'cuota' && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400">Monto por Cuota</label>
                    <NumericFormat 
                      onValueChange={(v) => handleMontoCuotaChange(v.floatValue)}
                      thousandSeparator="." decimalSeparator="," prefix="$ " 
                      className="w-full px-4 py-2 rounded-xl border border-blue-200 bg-white text-sm font-black focus:ring-2 focus:ring-blue-500 outline-none" 
                    />
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-gray-400 uppercase">Cuotas: {cantCuotas}</label>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 3, 6, 12, 18, 24].map(n => (
                    <button key={n} type="button" onClick={() => setValue('cuotas', n)} className={`py-2 rounded-xl text-[10px] font-bold border transition-all ${cantCuotas === n ? 'bg-blue-600 text-white border-blue-600 shadow-sm' : 'bg-white dark:bg-neutral-900 text-gray-500 border-gray-100 dark:border-neutral-800'}`}>{n}</button>
                  ))}
                </div>
                <input type="number" {...register('cuotas', { valueAsNumber: true })} className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-gray-50 dark:bg-neutral-800 text-xs font-bold" placeholder="Manual..." />
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Monto</label>
              <Controller name="monto" control={control} render={({ field: { onChange, value, ref } }) => (
                <NumericFormat 
                  getInputRef={ref} value={value} onValueChange={(v) => onChange(v.floatValue)}
                  thousandSeparator="." decimalSeparator="," prefix="$ " 
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-sm font-black focus:ring-2 focus:ring-blue-500 outline-none" 
                />
              )} />
            </div>
          )}

          {tipo === 'prestamo' ? (
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Entidad / Banco</label>
              <input 
                {...register('entidad')}
                placeholder="Ej: Banco Galicia, ICBC, etc."
                className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          ) : tipo !== 'ingreso' && (
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-gray-400 uppercase">Medio de Pago</label>
              <select 
                {...register('medio_pago')}
                className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">Efectivo / Transf.</option>
                {tarjetas?.map((t: any) => (
                  <option key={`t_${t.id}`} value={`tarjeta_${t.id}`}>💳 {t.nombre}</option>
                ))}
                {reservas?.map((r: any) => (
                  <option key={`r_${r.id}`} value={`reserva_${r.id}`}>📦 {r.nombre} (Reserva)</option>
                ))}
              </select>
            </div>
          )}

          {(tipo !== 'tarjeta' && tipo !== 'prestamo') && (
            <div className="flex items-center gap-3 h-10 mt-4">
              <input type="checkbox" {...register('es_fijo')} id="check-fijo-new" className="w-5 h-5 rounded border-gray-300" />
              <label htmlFor="check-fijo-new" className="text-xs font-bold text-gray-600 dark:text-neutral-400 cursor-pointer">Valor Fijo Mensual</label>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onClose} className="px-6 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-xl transition-all">CANCELAR</button>
          <button 
            type="submit" 
            disabled={mutation.isPending}
            className="flex items-center gap-2 px-8 py-2 bg-blue-600 text-white text-xs font-black rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-900/20 active:scale-95 transition-all"
          >
            <Save size={16} /> {mutation.isPending ? 'CREANDO...' : 'CREAR REGISTRO'}
          </button>
        </div>
      </form>
    </div>
  );
}
