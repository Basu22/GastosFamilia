import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTarjetas, createTarjeta, updateTarjeta, deleteTarjeta } from '../api/tarjetas';
import { CreditCard, Plus, Save, Edit3, X, Trash2 } from 'lucide-react';

const schema = z.object({
  nombre: z.string().min(3, 'Mínimo 3 caracteres'),
  usuario: z.enum(['baso', 'juli'], { required_error: 'Seleccioná un usuario' }),
  banco: z.string().min(1, 'Obligatorio'),
  tipo: z.enum(['visa', 'master', 'cencosud', 'amex'], { required_error: 'Seleccioná un tipo' }),
  color: z.string().min(4, 'Color requerido').max(7)
});

type FormValues = z.infer<typeof schema>;

export default function Tarjetas() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<number | null>(null);

  const { data: tarjetas, isLoading } = useQuery({
    queryKey: ['tarjetas'],
    queryFn: getTarjetas
  });

  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      color: '#3B82F6',
      usuario: 'baso',
      tipo: 'visa'
    }
  });

  const createMutation = useMutation({
    mutationFn: createTarjeta,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tarjetas'] });
      reset();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number, data: FormValues }) => updateTarjeta(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tarjetas'] });
      handleCancelEdit();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTarjeta,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tarjetas'] });
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

  const handleEditClick = (tarjeta: any) => {
    setEditingId(tarjeta.id);
    setValue('nombre', tarjeta.nombre);
    setValue('usuario', tarjeta.usuario);
    setValue('banco', tarjeta.banco);
    setValue('tipo', tarjeta.tipo);
    setValue('color', tarjeta.color);
    // Scroll to form smoothly
    document.getElementById('section-nueva-tarjeta')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    reset({
      color: '#3B82F6',
      usuario: 'baso',
      tipo: 'visa',
      nombre: '',
      banco: ''
    });
  };

  return (
    <main id="page-tarjetas" className="max-w-4xl mx-auto space-y-8">
      <header id="header-tarjetas" className="flex items-center gap-3">
        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
          <CreditCard className="text-blue-600 dark:text-blue-400" size={24} />
        </div>
        <div>
          <h1 id="title-tarjetas" className="text-2xl font-bold text-gray-900 dark:text-neutral-100">Mis Tarjetas</h1>
          <p className="text-gray-500 dark:text-neutral-400 text-sm">Gestioná las tarjetas de crédito de la familia</p>
        </div>
      </header>

      <section id="section-listado-tarjetas" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="animate-pulse h-32 bg-gray-200 rounded-xl" />
        ) : (
          tarjetas?.map((t: any) => (
            <article 
              key={t.id} 
              id={`tarjeta-${t.id}`}
              onClick={() => handleEditClick(t)}
              className={`bg-white dark:bg-neutral-900 rounded-xl border p-5 flex flex-col justify-between h-32 relative overflow-hidden shadow-sm hover:shadow-md transition-all cursor-pointer ${editingId === t.id ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-900/50' : 'border-gray-200 dark:border-neutral-800'}`}
            >
              <div 
                className="absolute top-0 left-0 w-full h-2" 
                style={{ backgroundColor: t.color || '#ccc' }}
              />
              <div className="flex justify-between items-start mt-2">
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-neutral-100">{t.nombre}</h3>
                  <p className="text-sm text-gray-500 dark:text-neutral-400 capitalize">{t.banco} • {t.tipo}</p>
                </div>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-neutral-300 uppercase">
                  {t.usuario}
                </span>
              </div>
              <div className="flex justify-between items-end mt-auto">
                <p className="text-xs text-gray-400 dark:text-neutral-500 font-medium tracking-widest">
                  **** **** **** ****
                </p>
                <Edit3 size={14} className="text-gray-400 dark:text-neutral-500" />
              </div>
            </article>
          ))
        )}
      </section>

      <section id="section-nueva-tarjeta" className="bg-white dark:bg-neutral-900 rounded-3xl border border-gray-100 dark:border-neutral-800 shadow-sm p-4 lg:p-8 transition-colors">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-neutral-100 flex items-center gap-2">
            {editingId ? (
              <><Edit3 size={20} className="text-blue-500 dark:text-blue-400" /> Editando Tarjeta</>
            ) : (
              <><Plus size={20} className="text-blue-500 dark:text-blue-400" /> Agregar Nueva Tarjeta</>
            )}
          </h2>
          {editingId && (
            <button 
              type="button" 
              onClick={handleCancelEdit}
              className="p-2 bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-neutral-400 rounded-full hover:bg-gray-200 dark:hover:bg-neutral-700 transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>
        
        <form id="form-nueva-tarjeta" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label htmlFor="input-nombre-tarjeta" className="text-sm font-semibold text-gray-700 dark:text-neutral-300">Nombre (Ej: BASO VISA)</label>
              <input 
                id="input-nombre-tarjeta"
                type="text"
                {...register('nombre')}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-950 text-gray-900 dark:text-neutral-100 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all uppercase"
              />
              {errors.nombre && <p className="text-xs font-medium text-red-500">{errors.nombre.message}</p>}
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="select-usuario" className="text-sm font-semibold text-gray-700 dark:text-neutral-300">Usuario</label>
              <select 
                id="select-usuario"
                {...register('usuario')}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-950 text-gray-900 dark:text-neutral-100 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              >
                <option value="baso">Baso</option>
                <option value="juli">Juli</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="input-banco" className="text-sm font-semibold text-gray-700 dark:text-neutral-300">Banco</label>
              <input 
                id="input-banco"
                type="text"
                {...register('banco')}
                placeholder="Ej: Santander, Galicia, etc."
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-950 text-gray-900 dark:text-neutral-100 placeholder:text-gray-400 dark:placeholder:text-neutral-600 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
              {errors.banco && <p className="text-xs font-medium text-red-500">{errors.banco.message}</p>}
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="select-tipo" className="text-sm font-semibold text-gray-700 dark:text-neutral-300">Franquicia</label>
              <select 
                id="select-tipo"
                {...register('tipo')}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-950 text-gray-900 dark:text-neutral-100 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              >
                <option value="visa">Visa</option>
                <option value="master">Mastercard</option>
                <option value="amex">American Express</option>
                <option value="cencosud">Cencosud</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="input-color" className="text-sm font-semibold text-gray-700 dark:text-neutral-300">Color de la tarjeta (para gráficos)</label>
              <div className="flex items-center gap-3">
                <input 
                  id="input-color"
                  type="color"
                  {...register('color')}
                  className="w-12 h-12 rounded-lg cursor-pointer border-0 p-0 bg-transparent"
                />
                <span className="text-sm text-gray-500 dark:text-neutral-400">Elegí un color distintivo</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            {editingId && (
              <>
                <button 
                  type="button"
                  onClick={() => {
                    if(window.confirm('¿Estás seguro de eliminar esta tarjeta? Las compras asociadas quedarán sin tarjeta.')) {
                      deleteMutation.mutate(editingId);
                    }
                  }}
                  disabled={deleteMutation.isPending}
                  className="px-4 py-4 rounded-xl font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-all flex-shrink-0"
                  title="Eliminar tarjeta"
                >
                  <Trash2 size={20} />
                </button>
                <button 
                  type="button"
                  onClick={handleCancelEdit}
                  className="w-full md:w-auto px-8 py-4 rounded-xl font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-all"
                >
                  Cancelar
                </button>
              </>
            )}
            <button 
              id="btn-guardar-tarjeta"
              type="submit"
              disabled={isSubmitting || createMutation.isPending || updateMutation.isPending || deleteMutation.isPending}
              className={`w-full md:w-auto px-8 flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-white transition-all disabled:opacity-70 disabled:active:scale-100 ${
                editingId ? 'bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98]' : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.98]'
              }`}
            >
              {createMutation.isPending || updateMutation.isPending ? 'Guardando...' : (
                <><Save size={20} /> {editingId ? 'Actualizar Tarjeta' : 'Guardar Tarjeta'}</>
              )}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
