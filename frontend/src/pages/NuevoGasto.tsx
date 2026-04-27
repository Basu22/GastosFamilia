import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getTarjetas } from '../api/tarjetas';
import { createMovimiento, previewMovimiento, getMovimiento, updateMovimiento, deleteMovimiento } from '../api/movimientos';
import { formatARS } from '../utils/format';
import { CreditCard, Info, Save, Trash2, Edit3 } from 'lucide-react';
import { NumericFormat } from 'react-number-format';

const schema = z.object({
  tarjeta_id: z.string().optional(),
  descripcion: z.string().min(3, 'Mínimo 3 caracteres'),
  monto_total: z.number({ invalid_type_error: 'Debe ser un número válido' }).positive('El monto debe ser mayor a 0'),
  cuotas: z.number().int().min(1),
  fecha_primera_cuota: z.string().min(1, 'Seleccioná una fecha'),
  notas: z.string().optional()
});

type FormValues = z.infer<typeof schema>;

export default function NuevoGasto() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [previewData, setPreviewData] = useState<any>(null);

  const editIdParam = searchParams.get('edit');
  const editingId = editIdParam ? parseInt(editIdParam) : null;

  const { data: tarjetas } = useQuery({
    queryKey: ['tarjetas'],
    queryFn: getTarjetas
  });

  const { data: existingMov, isLoading: loadingMov } = useQuery({
    queryKey: ['movimiento', editingId],
    queryFn: () => getMovimiento(editingId!),
    enabled: !!editingId
  });

  const { register, handleSubmit, watch, setValue, control, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      cuotas: 1,
      fecha_primera_cuota: new Date().toISOString().split('T')[0]
    }
  });

  // Cargar datos si estamos editando
  useEffect(() => {
    if (existingMov) {
      reset({
        tarjeta_id: existingMov.tarjeta_id?.toString() || "",
        descripcion: existingMov.descripcion,
        monto_total: existingMov.monto_total,
        cuotas: existingMov.cuotas,
        fecha_primera_cuota: existingMov.fecha_primera_cuota,
        notas: existingMov.notas || ""
      });
    }
  }, [existingMov, reset]);

  const montoTotal = watch('monto_total');
  const cuotas = watch('cuotas');
  const fechaInicio = watch('fecha_primera_cuota');

  useEffect(() => {
    const loadPreview = async () => {
      if (montoTotal > 0 && cuotas >= 1 && fechaInicio) {
        try {
          const preview = await previewMovimiento(montoTotal, cuotas, fechaInicio);
          setPreviewData(preview);
        } catch (e) {
          setPreviewData(null);
        }
      } else {
        setPreviewData(null);
      }
    };
    const debounceId = setTimeout(loadPreview, 300);
    return () => clearTimeout(debounceId);
  }, [montoTotal, cuotas, fechaInicio]);

  const createMutation = useMutation({
    mutationFn: createMovimiento,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['movimientos'] });
      navigate('/dashboard');
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => updateMovimiento(editingId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['movimientos'] });
      navigate('/dashboard');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteMovimiento(editingId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['movimientos'] });
      navigate('/dashboard');
    }
  });

  const onSubmit = (data: FormValues) => {
    const payload = {
      tarjeta_id: data.tarjeta_id ? parseInt(data.tarjeta_id) : null,
      descripcion: data.descripcion,
      monto_total: data.monto_total,
      cuotas: data.cuotas,
      fecha_primera_cuota: data.fecha_primera_cuota,
      notas: data.notas
    };

    if (editingId) updateMutation.mutate(payload);
    else createMutation.mutate(payload);
  };

  const botonesCuotas = [1, 3, 6, 12, 18, 24];

  return (
    <main id="page-nuevo-gasto" className="max-w-2xl mx-auto space-y-8 px-4 py-4 lg:px-8 lg:py-8 pb-24">
      <header id="header-nuevo-gasto" className="flex items-center gap-3">
        <div id="icon-container-nuevo" className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
          {editingId ? <Edit3 className="text-blue-600 dark:text-blue-400" size={24} /> : <CreditCard className="text-blue-600 dark:text-blue-400" size={24} />}
        </div>
        <div>
          <h1 id="title-nuevo-gasto" className="text-2xl font-bold text-gray-900 dark:text-neutral-100">
            {editingId ? 'Editar Gasto' : 'Nuevo Gasto'}
          </h1>
          <p id="subtitle-nuevo-gasto" className="text-gray-500 dark:text-neutral-400 text-sm">
            {editingId ? 'Modificá los detalles de la compra' : 'Registrá una compra nueva'}
          </p>
        </div>
      </header>

      {loadingMov ? (
        <section id="skeleton-nuevo-gasto" className="animate-pulse h-64 bg-gray-100 rounded-xl" />
      ) : (
        <form id="form-nuevo-gasto" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <section id="section-form-inputs" className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-800 shadow-sm p-4 lg:p-8 space-y-6 transition-colors">
            <div className="space-y-2">
              <label htmlFor="select-tarjeta" className="text-sm font-semibold text-gray-700 dark:text-neutral-300">Medio de Pago</label>
              <div className="relative">
                <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-neutral-500" size={20} />
                <select 
                  id="select-tarjeta"
                  {...register('tarjeta_id')}
                  className="w-full px-4 py-3 pl-11 rounded-xl border border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-950 text-gray-900 dark:text-neutral-100 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none"
                >
                  <option value="">Efectivo / Transferencia (Sin tarjeta)</option>
                  {tarjetas?.map((t: any) => (
                    <option key={t.id} value={t.id}>{t.nombre}</option>
                  ))}
                </select>
              </div>
              {errors.tarjeta_id && <p id="error-tarjeta" className="text-xs font-medium text-red-500">{errors.tarjeta_id.message}</p>}
            </div>

            <div className="space-y-2">
              <label htmlFor="input-descripcion" className="text-sm font-semibold text-gray-700 dark:text-neutral-300">Descripción</label>
              <input 
                id="input-descripcion"
                type="text"
                {...register('descripcion')}
                placeholder="Ej: Televisor 50 pulgadas"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-950 text-gray-900 dark:text-neutral-100 placeholder:text-gray-400 dark:placeholder:text-neutral-600 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
              {errors.descripcion && <p id="error-desc" className="text-xs font-medium text-red-500">{errors.descripcion.message}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label htmlFor="input-monto" className="text-sm font-semibold text-gray-700 dark:text-neutral-300">Monto Total ($)</label>
                <Controller
                  name="monto_total"
                  control={control}
                  render={({ field: { onChange, value, ref } }) => (
                    <NumericFormat
                      id="input-monto"
                      getInputRef={ref}
                      value={value}
                      onValueChange={(values) => onChange(values.floatValue)}
                      thousandSeparator="."
                      decimalSeparator=","
                      prefix="$ "
                      placeholder="$ 0,00"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-950 text-gray-900 dark:text-neutral-100 placeholder:text-gray-400 dark:placeholder:text-neutral-600 text-xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                  )}
                />
                {errors.monto_total && <p id="error-monto" className="text-xs font-medium text-red-500">{errors.monto_total.message}</p>}
              </div>
            </div>
          </section>

          {/* Fecha Primera Cuota */}
          <section id="section-fecha" className="flex flex-col gap-2">
            <label htmlFor="input-fecha-primera" className="text-sm font-semibold text-gray-700 dark:text-neutral-300">Fecha de la primera cuota</label>
            <input 
              id="input-fecha-primera"
              type="date"
              {...register('fecha_primera_cuota')}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-gray-900 dark:text-neutral-100 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </section>

          {/* Selector de Cuotas */}
          <section id="section-cuotas" className="flex flex-col gap-2">
            <label id="label-cuotas" className="text-sm font-semibold text-gray-700 dark:text-neutral-300">Cantidad de cuotas</label>
            <div id="grid-botones-cuotas" className="grid grid-cols-3 md:grid-cols-6 gap-2">
              {botonesCuotas.map(num => (
                <button
                  key={num}
                  id={`btn-cuota-${num}`}
                  type="button"
                  onClick={() => setValue('cuotas', num)}
                  className={`py-3 rounded-xl font-bold transition-all border ${
                    cuotas === num 
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-900/50' 
                      : 'bg-white dark:bg-neutral-900 text-gray-600 dark:text-neutral-400 border-gray-200 dark:border-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-800'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </section>

          {/* Preview Panel */}
          {previewData && (
            <article id="panel-preview" className="bg-blue-50 dark:bg-blue-950/40 rounded-xl p-4 border border-blue-100 dark:border-blue-900/50 flex items-start gap-3 transition-colors">
              <Info id="icon-preview" className="text-blue-500 shrink-0 mt-0.5" size={20} />
              <div id="text-preview">
                <p className="text-sm text-blue-900 dark:text-blue-300 font-medium">Vas a pagar <strong className="text-blue-950 dark:text-blue-100">{formatARS(previewData.monto_cuota)}</strong> por mes durante {previewData.cuotas} meses.</p>
              </div>
            </article>
          )}

          {/* Botones de Acción */}
          <div id="actions-nuevo-gasto" className="flex gap-3 pt-4">
            {editingId && (
              <>
                <button 
                  id="btn-delete-movimiento"
                  type="button"
                  onClick={() => { if(window.confirm('¿Eliminar gasto y todas sus cuotas?')) deleteMutation.mutate(); }}
                  disabled={deleteMutation.isPending}
                  className="px-5 py-4 rounded-xl font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-all flex-shrink-0"
                >
                  <Trash2 size={20} />
                </button>
                <button 
                  id="btn-cancel-nuevo"
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="w-full md:w-auto px-8 py-4 rounded-xl font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-all"
                >
                  Cancelar
                </button>
              </>
            )}
            <button 
              id="btn-submit-nuevo"
              type="submit"
              disabled={isSubmitting || createMutation.isPending || updateMutation.isPending}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-70 shadow-lg shadow-blue-200"
            >
              {createMutation.isPending || updateMutation.isPending ? 'Guardando...' : <><Save size={20} /> {editingId ? 'Actualizar Gasto' : 'Guardar Gasto'}</>}
            </button>
          </div>
        </form>
      )}
    </main>
  );
}
