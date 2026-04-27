import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getGastosMensuales, createGastoMensual, updateGastoMensual, deleteGastoMensual } from '../api/gastos_mensuales';
import { getIngresos, createIngreso, updateIngreso, deleteIngreso } from '../api/ingresos';
import { formatARS } from '../utils/format';
import { Plus, Save, Edit3, Trash2, TrendingDown, TrendingUp } from 'lucide-react';
import { NumericFormat } from 'react-number-format';

const schema = z.object({
  descripcion: z.string().min(3, 'Mínimo 3 caracteres'),
  monto: z.number({ invalid_type_error: 'Debe ser numérico' }).positive('Debe ser mayor a 0'),
  mes: z.number().min(1).max(12),
  anio: z.number().min(2020).max(2050),
  es_fijo: z.boolean().default(false)
});

type FormValues = z.infer<typeof schema>;

export default function Gastos() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [tab, setTab] = useState<'egresos' | 'ingresos'>('egresos');
  const [editingId, setEditingId] = useState<number | null>(null);

  const editIdParam = searchParams.get('edit');
  const typeParam = searchParams.get('type');

  const { data: egresos, isLoading: loadingEgresos } = useQuery({ queryKey: ['gastos_mensuales'], queryFn: () => getGastosMensuales() });
  const { data: ingresos, isLoading: loadingIngresos } = useQuery({ queryKey: ['ingresos'], queryFn: () => getIngresos() });

  const { register, handleSubmit, reset, setValue, control, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      mes: new Date().getMonth() + 1,
      anio: new Date().getFullYear(),
      es_fijo: false
    }
  });

  // Efecto para capturar edición desde Dashboard
  useEffect(() => {
    if (editIdParam && typeParam && (egresos || ingresos)) {
      const id = parseInt(editIdParam);
      const isIngreso = typeParam === 'ingreso';
      setTab(isIngreso ? 'ingresos' : 'egresos');
      
      const list = isIngreso ? ingresos : egresos;
      const item = list?.find((x: any) => x.id === id);
      
      if (item) {
        handleEditClick(item);
        // Limpiar parámetros para no re-editar al recargar
        setSearchParams({});
      }
    }
  }, [editIdParam, typeParam, egresos, ingresos]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: any) => tab === 'egresos' ? createGastoMensual(data) : createIngreso(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tab === 'egresos' ? ['gastos_mensuales'] : ['ingresos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      handleCancelEdit();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number, data: FormValues }) => tab === 'egresos' ? updateGastoMensual(id, data) : updateIngreso(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tab === 'egresos' ? ['gastos_mensuales'] : ['ingresos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      handleCancelEdit();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => tab === 'egresos' ? deleteGastoMensual(id) : deleteIngreso(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tab === 'egresos' ? ['gastos_mensuales'] : ['ingresos'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      handleCancelEdit();
    }
  });

  const onSubmit = (data: FormValues) => {
    if (editingId) {
      updateMutation.mutate({ id: editingId, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEditClick = (item: any) => {
    setEditingId(item.id);
    setValue('descripcion', item.descripcion);
    setValue('monto', item.monto);
    setValue('mes', item.mes);
    setValue('anio', item.anio);
    setValue('es_fijo', item.es_fijo);
    document.getElementById('section-form-gastos')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    reset({
      descripcion: '',
      monto: undefined,
      mes: new Date().getMonth() + 1,
      anio: new Date().getFullYear(),
      es_fijo: false
    });
  };

  const listToRender = tab === 'egresos' ? egresos : ingresos;
  const isLoading = tab === 'egresos' ? loadingEgresos : loadingIngresos;
  const isEditingEgreso = tab === 'egresos';

  return (
    <main id="page-gastos" className="max-w-4xl mx-auto space-y-6 px-4 py-4 lg:px-8 lg:py-8 pb-24">
      <header id="header-gastos" className="mb-2 lg:mb-6">
        <p id="gastos-subtitle" className="text-gray-500 dark:text-neutral-500 font-medium text-xs uppercase tracking-wider">Gestión de Flujo</p>
        <h1 id="title-gastos" className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-neutral-100">Ingresos & Egresos</h1>
      </header>

      {/* Tabs */}
      <nav id="nav-tabs-gastos" className="flex bg-gray-100 dark:bg-neutral-900 p-1 rounded-xl transition-colors">
        <button
          id="btn-tab-egresos"
          onClick={() => { setTab('egresos'); handleCancelEdit(); }}
          className={`flex-1 h-11 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 ${tab === 'egresos' ? 'bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 shadow-sm' : 'text-gray-500 dark:text-neutral-500'}`}
        >
          <TrendingDown size={16} className={tab === 'egresos' ? 'text-red-500' : ''} /> Egresos
        </button>
        <button
          id="btn-tab-ingresos"
          onClick={() => { setTab('ingresos'); handleCancelEdit(); }}
          className={`flex-1 h-11 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 ${tab === 'ingresos' ? 'bg-white dark:bg-neutral-800 text-gray-900 dark:text-neutral-100 shadow-sm' : 'text-gray-500 dark:text-neutral-500'}`}
        >
          <TrendingUp size={16} className={tab === 'ingresos' ? 'text-emerald-500' : ''} /> Ingresos
        </button>
      </nav>

      {/* Formulario */}
      <section id="section-form-gastos" className={`rounded-xl border shadow-sm p-4 lg:p-6 transition-all ${isEditingEgreso ? 'bg-red-50/20 border-red-100 dark:border-red-900/30' : 'bg-emerald-50/20 border-emerald-100 dark:border-emerald-900/30'}`}>
        <header id="header-form-gastos" className="mb-6">
          <h2 id="title-form-gastos" className="text-lg font-bold text-gray-900 dark:text-neutral-100 flex items-center gap-2">
            {editingId ? (
              <><Edit3 size={20} className={isEditingEgreso ? 'text-red-500' : 'text-emerald-500'} /> Editando {isEditingEgreso ? 'Egreso' : 'Ingreso'}</>
            ) : (
              <><Plus size={20} className={isEditingEgreso ? 'text-red-500' : 'text-emerald-500'} /> Agregar Nuevo {isEditingEgreso ? 'Egreso' : 'Ingreso'}</>
            )}
          </h2>
        </header>
        
        <form id="form-gastos" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label htmlFor="input-desc" className="text-sm font-semibold text-gray-700 dark:text-neutral-300">Descripción</label>
              <input 
                id="input-desc" type="text" {...register('descripcion')} placeholder={isEditingEgreso ? 'Ej: Expensas, Luz...' : 'Ej: Sueldo...'}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-gray-900 dark:text-neutral-100 placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
              {errors.descripcion && <p id="error-desc" className="text-xs text-red-500 font-medium">{errors.descripcion.message}</p>}
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="input-monto" className="text-sm font-semibold text-gray-700 dark:text-neutral-300">Monto ($)</label>
              <Controller
                name="monto"
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
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-gray-900 dark:text-neutral-100 font-bold text-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                )}
              />
              {errors.monto && <p id="error-monto" className="text-xs text-red-500 font-medium">{errors.monto.message}</p>}
            </div>

            <div className="flex gap-4">
              <div className="flex-1 flex flex-col gap-2">
                <label htmlFor="input-mes" className="text-sm font-semibold text-gray-700 dark:text-neutral-300">Mes (1-12)</label>
                <input 
                  id="input-mes" type="number" {...register('mes', { valueAsNumber: true })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-gray-900 dark:text-neutral-100 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="flex-1 flex flex-col gap-2">
                <label htmlFor="input-anio" className="text-sm font-semibold text-gray-700 dark:text-neutral-300">Año</label>
                <input 
                  id="input-anio" type="number" {...register('anio', { valueAsNumber: true })}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-gray-900 dark:text-neutral-100 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            <div id="wrapper-fijo" className="flex items-center gap-3 bg-white dark:bg-neutral-950 px-4 py-3 rounded-xl border border-gray-200 dark:border-neutral-800 transition-colors">
              <input 
                id="input-fijo" type="checkbox" {...register('es_fijo')}
                className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <label htmlFor="input-fijo" className="text-sm font-semibold text-gray-700 dark:text-neutral-300 cursor-pointer">
                Es un valor FIJO mensual
              </label>
            </div>
          </div>

          <div id="actions-form-gastos" className="flex gap-3 pt-4">
            {editingId && (
              <>
                <button 
                  id="btn-delete-gasto"
                  type="button" 
                  onClick={() => { if(window.confirm('¿Eliminar registro?')) deleteMutation.mutate(editingId); }}
                  className="px-5 py-4 rounded-xl font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-all flex-shrink-0"
                  title="Eliminar"
                >
                  <Trash2 size={20} />
                </button>
                <button 
                  id="btn-cancel-edit"
                  type="button" onClick={handleCancelEdit}
                  className="w-full md:w-auto px-8 py-4 rounded-xl font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-all"
                >
                  Cancelar
                </button>
              </>
            )}
            <button 
              id="btn-submit-gasto"
              type="submit" 
              disabled={isSubmitting || createMutation.isPending || updateMutation.isPending}
              className={`w-full md:w-auto px-8 flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-white shadow-lg transition-all active:scale-95 disabled:opacity-50 ${
                editingId ? 'bg-blue-600 hover:bg-blue-700' : (isEditingEgreso ? 'bg-red-600 hover:bg-red-700 shadow-red-200' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200')
              }`}
            >
              <Save size={20} /> {editingId ? 'Actualizar' : 'Guardar'}
            </button>
          </div>
        </form>
      </section>

      {/* Listado */}
      <section id="section-listado-gastos" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div id="skeleton-listado" className="animate-pulse h-24 bg-gray-100 rounded-xl col-span-full" />
        ) : listToRender?.length === 0 ? (
          <article id="empty-state-gastos" className="col-span-full text-center py-16 text-gray-400 bg-white dark:bg-neutral-900 rounded-xl border border-dashed border-gray-200">
            <p className="text-5xl mb-4">📭</p>
            <p className="font-semibold text-gray-500">No hay registros este mes</p>
          </article>
        ) : (
          listToRender?.map((item: any) => (
            <article 
              key={item.id} 
              id={`item-gasto-${item.id}`}
              onClick={() => handleEditClick(item)}
              className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-800 p-4 flex flex-col justify-between cursor-pointer hover:shadow-md hover:border-gray-300 dark:hover:border-neutral-700 transition-all relative overflow-hidden"
            >
              <div className={`absolute top-0 left-0 w-1 h-full ${isEditingEgreso ? 'bg-red-500' : 'bg-emerald-500'}`} />
              <div className="pl-3">
                <header className="flex justify-between items-start mb-1">
                  <h3 className="font-bold text-gray-900 dark:text-neutral-100 truncate pr-2">{item.descripcion}</h3>
                  {item.es_fijo && <span className="text-[9px] uppercase font-bold bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded flex-shrink-0">FIJO</span>}
                </header>
                <p className="text-xs text-gray-400 dark:text-neutral-500">Vigente: {item.mes}/{item.anio}</p>
                <p className="text-xl font-bold mt-3 text-gray-900 dark:text-neutral-100">{formatARS(item.monto)}</p>
              </div>
            </article>
          ))
        )}
      </section>
    </main>
  );
}
