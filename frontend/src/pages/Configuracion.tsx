import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Settings, Plus, CreditCard, Tag, Trash2, Edit3, Save, RefreshCw, Mail } from 'lucide-react';
import { ejecutarImportacion, getHistorialImportacion } from '../api/client';
import LogAccordion from '../components/LogAccordion';

const API_URL = import.meta.env.VITE_API_URL || '/api';

interface MedioPago {
  id?: number;
  nombre: string;
  tipo: string;
  color: string;
}

interface Categoria {
  id?: number;
  nombre: string;
  icono: string;
  color: string;
}

export default function Configuracion() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'medios' | 'categorias' | 'gmail'>('medios');
  const [editingId, setEditingId] = useState<number | null>(null);

  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState('Efectivo');
  const [color, setColor] = useState('#3B82F6');
  const [icono, setIcono] = useState('Tag');

  const { data: medios } = useQuery({ queryKey: ['medios-pago'], queryFn: () => axios.get(`${API_URL}/configuracion/medios-pago`).then(res => res.data) });
  const { data: categorias } = useQuery({ queryKey: ['categorias'], queryFn: () => axios.get(`${API_URL}/configuracion/categorias`).then(res => res.data) });

  const mutationMedio = useMutation({
    mutationFn: (data: MedioPago) => editingId ? axios.put(`${API_URL}/configuracion/medios-pago/${editingId}`, data) : axios.post(`${API_URL}/configuracion/medios-pago`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['medios-pago'] }); resetForm(); }
  });

  const mutationCat = useMutation({
    mutationFn: (data: Categoria) => editingId ? axios.put(`${API_URL}/configuracion/categorias/${editingId}`, data) : axios.post(`${API_URL}/configuracion/categorias`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['categorias'] }); resetForm(); }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => axios.delete(`${API_URL}/configuracion/${activeTab === 'medios' ? 'medios-pago' : 'categorias'}/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: [activeTab === 'medios' ? 'medios-pago' : 'categorias'] }); }
  });

  const { data: historial } = useQuery({ queryKey: ['historial-importacion'], queryFn: getHistorialImportacion });
  
  const logsAgrupados = useMemo(() => {
    if (!historial) return {};
    return historial.reduce((acc: any, log: any) => {
      const key = log.descripcion || log.referente;
      if (!acc[key]) acc[key] = [];
      acc[key].push(log);
      return acc;
    }, {});
  }, [historial]);

  const mutationImportar = useMutation({
    mutationFn: ejecutarImportacion,
    onSuccess: () => { 
      queryClient.invalidateQueries({ queryKey: ['historial-importacion'] }); 
      alert("¡Importación finalizada!");
    }
  });

  const resetForm = () => {
    setEditingId(null);
    setNombre('');
    setTipo('Efectivo');
    setColor('#3B82F6');
    setIcono('Tag');
  };

  const handleEdit = (item: any) => {
    setEditingId(item.id);
    setNombre(item.nombre);
    setColor(item.color);
    if (activeTab === 'medios') setTipo(item.tipo);
    else setIcono(item.icono);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === 'medios') mutationMedio.mutate({ nombre, tipo, color });
    else mutationCat.mutate({ nombre, icono, color });
  };

  return (
    <main className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <header className="flex items-center justify-between px-4 lg:px-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-neutral-100 flex items-center gap-2">
            <Settings className="text-blue-600" size={28} /> Configuración
          </h1>
          <p className="text-sm text-gray-500 mt-1">Gestioná tus medios de pago y categorías</p>
        </div>
      </header>

      <nav className="flex p-1.5 bg-gray-100/80 dark:bg-neutral-900/80 backdrop-blur-sm rounded-2xl mx-4 lg:mx-0 border border-gray-200 dark:border-neutral-800">
        <button 
          onClick={() => { setActiveTab('medios'); resetForm(); }}
          className={`flex-1 flex flex-col md:flex-row items-center justify-center gap-1.5 md:gap-3 py-3 md:py-4 rounded-xl text-[10px] md:text-sm font-black uppercase tracking-tight md:tracking-widest transition-all duration-300 ${activeTab === 'medios' ? 'bg-white dark:bg-neutral-800 text-blue-600 shadow-lg shadow-blue-900/10' : 'text-gray-400 hover:text-gray-600 dark:hover:text-neutral-300'}`}
        >
          <CreditCard size={20} className={activeTab === 'medios' ? 'text-blue-600 scale-110' : 'text-gray-400'} />
          <span className="leading-tight text-center">Medios<br className="md:hidden" /> de Pago</span>
        </button>
        <button 
          onClick={() => { setActiveTab('categorias'); resetForm(); }}
          className={`flex-1 flex flex-col md:flex-row items-center justify-center gap-1.5 md:gap-3 py-3 md:py-4 rounded-xl text-[10px] md:text-sm font-black uppercase tracking-tight md:tracking-widest transition-all duration-300 ${activeTab === 'categorias' ? 'bg-white dark:bg-neutral-800 text-blue-600 shadow-lg shadow-blue-900/10' : 'text-gray-400 hover:text-gray-600 dark:hover:text-neutral-300'}`}
        >
          <Tag size={20} className={activeTab === 'categorias' ? 'text-blue-600 scale-110' : 'text-gray-400'} />
          <span className="leading-tight text-center">Categorías</span>
        </button>
        <button 
          onClick={() => { setActiveTab('gmail'); resetForm(); }}
          className={`flex-1 flex flex-col md:flex-row items-center justify-center gap-1.5 md:gap-3 py-3 md:py-4 rounded-xl text-[10px] md:text-sm font-black uppercase tracking-tight md:tracking-widest transition-all duration-300 ${activeTab === 'gmail' ? 'bg-white dark:bg-neutral-800 text-blue-600 shadow-lg shadow-blue-900/10' : 'text-gray-400 hover:text-gray-600 dark:hover:text-neutral-300'}`}
        >
          <Mail size={20} className={activeTab === 'gmail' ? 'text-blue-600 scale-110' : 'text-gray-400'} />
          <span className="leading-tight text-center">Importador<br className="md:hidden" /> Gmail</span>
        </button>
      </nav>

      {activeTab !== 'gmail' && (
        <>
          <section className="bg-white dark:bg-neutral-950 p-6 rounded-3xl border border-gray-100 dark:border-neutral-900 shadow-sm mx-4 lg:mx-0">
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
              {editingId ? <Edit3 size={20} className="text-amber-500" /> : <Plus size={20} className="text-blue-500" />}
              {editingId ? 'Editar' : 'Nuevo'} {activeTab === 'medios' ? 'Medio de Pago' : 'Categoría'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Nombre</label>
                  <input 
                    value={nombre} onChange={e => setNombre(e.target.value)} required
                    placeholder="Ej: Mercado Pago, Comida, etc."
                    className="w-full px-4 py-4 rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">{activeTab === 'medios' ? 'Tipo' : 'Icono'}</label>
                  {activeTab === 'medios' ? (
                    <select 
                      value={tipo} onChange={e => setTipo(e.target.value)}
                      className="w-full px-4 py-4 rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 outline-none"
                    >
                      <option value="Efectivo">Efectivo / Transferencia</option>
                      <option value="Tarjeta">Tarjeta de Crédito</option>
                      <option value="Debito">Tarjeta de Débito</option>
                    </select>
                  ) : (
                    <input 
                      value={icono} onChange={e => setIcono(e.target.value)} required
                      className="w-full px-4 py-4 rounded-xl border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 outline-none"
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Color Distintivo</label>
                  <div className="flex items-center gap-4">
                    <input 
                      type="color" value={color} onChange={e => setColor(e.target.value)}
                      className="w-12 h-12 rounded-xl border-none cursor-pointer bg-transparent"
                    />
                    <span className="text-sm font-mono text-gray-500">{color}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                {editingId && (
                  <button type="button" onClick={resetForm} className="px-6 py-4 bg-gray-100 text-gray-500 rounded-xl font-bold hover:bg-gray-200 transition-all">Cancelar</button>
                )}
                <button type="submit" className="flex-1 py-4 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-200 dark:shadow-none hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2">
                  <Save size={20} /> {editingId ? 'Actualizar' : 'Guardar'}
                </button>
              </div>
            </form>
          </section>

          <section className="px-4 lg:px-0 pb-10">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4 mt-8">Listado Actual</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(activeTab === 'medios' ? medios : categorias)?.map((item: any) => (
                <article key={item.id} className="group relative bg-white dark:bg-neutral-900/30 p-5 rounded-2xl border border-gray-100 dark:border-neutral-800 hover:border-blue-500/30 hover:shadow-xl hover:shadow-blue-900/5 transition-all flex items-center justify-between overflow-hidden">
                  {/* Barra de color lateral */}
                  <div className="absolute top-0 left-0 w-1 h-full transition-all group-hover:w-1.5" style={{ backgroundColor: item.color }} />
                  
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-inner" style={{ backgroundColor: item.color }}>
                      {activeTab === 'medios' ? <CreditCard size={24} /> : <Tag size={24} />}
                    </div>
                    <div>
                      <h4 className="font-black text-gray-900 dark:text-neutral-100 tracking-tight">{item.nombre}</h4>
                      <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest mt-0.5 opacity-70">
                        {activeTab === 'medios' ? item.tipo : item.icono}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                    <button onClick={() => handleEdit(item)} className="p-2.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-xl transition-colors"><Edit3 size={18} /></button>
                    <button onClick={() => { if(window.confirm('¿Borrar?')) deleteMutation.mutate(item.id!); }} className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-colors"><Trash2 size={18} /></button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </>
      )}

      {/* SECCIÓN IMPORTADOR GMAIL */}
      {activeTab === 'gmail' && (
        <section className="bg-white dark:bg-neutral-950 p-6 rounded-3xl border border-gray-100 dark:border-neutral-900 shadow-sm mx-4 lg:mx-0 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2 text-gray-900 dark:text-neutral-100">
                <Mail className="text-blue-500" /> Sincronización Automática
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Lee correos de Personal/Flow todos los días a las 06:00 y 23:00 hs.
              </p>
            </div>
            <button
              onClick={() => mutationImportar.mutate()}
              disabled={mutationImportar.isPending}
              className={`px-6 py-3 rounded-xl font-bold text-white transition-all flex items-center gap-2 shadow-lg ${
                mutationImportar.isPending ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700 active:scale-95 shadow-blue-200 dark:shadow-none'
              }`}
            >
              <RefreshCw size={18} className={mutationImportar.isPending ? "animate-spin" : ""} />
              {mutationImportar.isPending ? 'Buscando...' : 'Importar Ahora'}
            </button>
          </div>

          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Historial Reciente</h3>
          <div className="space-y-3">
            {historial?.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-6">No hay importaciones registradas.</p>
            )}
            {Object.entries(logsAgrupados).map(([title, logs]: [string, any]) => (
              <LogAccordion key={title} title={title} logs={logs} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
