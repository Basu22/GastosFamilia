import re

with open("frontend/src/pages/Dashboard.tsx", "r") as f:
    content = f.read()

# Borrar todo después del último } de Dashboard component.
# Buscamos "// ─── Vista Desktop" y cortamos ahí.
parts = content.split("// ─── Vista Desktop: Fila de Grupo para tabla ─────────────────────────────────────────")
new_content = parts[0]

componentes = """
// ─── COMPONENTES DE TABLA ─────────────────────────────────────────

function RenderItem({ mov, editingItem, setEditingItem, reactivarMutation, mes, anio }: any) {
  return (
    <div key={`${mov.tipo}-${mov.id}`} className="space-y-2">
      <div className={`group flex items-center justify-between p-4 rounded-2xl transition-all duration-300 ${editingItem?.id === mov.id && editingItem?.tipo === mov.tipo ? 'bg-aura-lavender/10 border border-aura-lavender/30' : 'bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10'} ${mov.activo === false ? 'opacity-40 line-through' : ''}`}>
        <div className="flex items-center gap-4">
          <div className="w-1 h-8 rounded-full" style={{ backgroundColor: mov.tarjeta_color || (mov.tipo === 'ingreso' ? '#A7F3D0' : (mov.es_fijo ? '#C7D2FE' : '#94a3b8')) }} />
          <div>
            <p className="text-[13px] lg:text-sm font-semibold text-white">
              {mov.descripcion}
              {mov.previsionado && (
                <span className="ml-3 text-[9px] bg-aura-gold/20 text-aura-gold border border-aura-gold/30 px-2 py-0.5 rounded-full uppercase font-bold tracking-[0.1em]">Previsionado</span>
              )}
            </p>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">{mov.origen}</span>
              {mov.tipo === 'tarjeta' && (
                <span className="text-[9px] text-aura-lavender font-bold uppercase tracking-widest opacity-80">Cuota {mov.cuota_actual}/{mov.cuotas_total}</span>
              )}
              {mov.activo === false && mov.fecha_baja && (
                <span className="text-[9px] font-bold text-red-400 uppercase tracking-widest bg-red-400/10 px-2 py-0.5 rounded-full border border-red-400/20">
                  Baja: {MESES_CORTO[parseInt(mov.fecha_baja.split('-')[1])]} {mov.fecha_baja.split('-')[0]} 🔴
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4 lg:gap-8">
          {mov.activo === false ? (
            <button
              onClick={() => {
                if (window.confirm(`¿Reactivar "${mov.descripcion}"?`)) {
                  reactivarMutation.mutate(mov.id);
                }
              }}
              disabled={reactivarMutation.isPending}
              className="text-[9px] px-3 py-1.5 font-bold rounded-lg border border-aura-mint/30 text-aura-mint hover:bg-aura-mint/10 transition-all uppercase whitespace-nowrap z-10 hover:!opacity-100 hover:!no-underline"
            >
              {reactivarMutation.isPending ? '...' : 'Reactivar'}
            </button>
          ) : (
            <p className={`text-sm lg:text-base font-bold tracking-tight ${mov.tipo === 'ingreso' ? 'text-aura-mint' : 'text-white'}`}>
              {formatARS(mov.monto)}
            </p>
          )}
          {mov.activo !== false && (
            <button 
              onClick={() => setEditingItem((editingItem?.id === mov.id && editingItem?.tipo === mov.tipo) ? null : { id: mov.id, tipo: mov.tipo })}
              className={`p-2 lg:p-3 rounded-xl transition-all ${editingItem?.id === mov.id && editingItem?.tipo === mov.tipo ? 'bg-aura-lavender text-aura-bg shadow-lg' : 'text-gray-500 hover:text-white hover:bg-white/10'}`}
            >
              <Edit3 size={16} />
            </button>
          )}
        </div>
      </div>
      
      {editingItem?.id === mov.id && editingItem?.tipo === mov.tipo && (
        <div className="glass-card p-6 border-aura-lavender/30 animate-in slide-in-from-top-4 duration-300">
          <InlineEditForm id={mov.id} tipo={mov.tipo} mesActual={mes} anioActual={anio} onClose={() => setEditingItem(null)} />
        </div>
      )}
    </div>
  );
}

function GrupoSimpleDesktop({ titulo, icon: Icon, colorCls, movimientos, expandido, onToggle, editingItem, setEditingItem, creandoEnSeccion, setCreandoEnSeccion, mes, anio }: any) {
  const total = movimientos.reduce((acc: number, m: any) => acc + m.monto, 0);
  const tipoSeccion = 'ingreso';
  const queryClient = useQueryClient();
  const reactivarMutation = useMutation({
    mutationFn: async (id: number) => reactivarGastoMensual(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['gastos-mensuales'] });
    }
  });

  return (
    <>
      <tr className="border-none">
        <td colSpan={4} className="px-6 py-4">
          <div className="flex items-center justify-between bg-aura-surface/30 backdrop-blur-md rounded-2xl p-4 border border-aura-border/20">
            <div className="flex items-center gap-4">
              <div className="flex items-center cursor-pointer group" onClick={onToggle}>
                <div className={`p-3 rounded-xl bg-white/5 border border-white/10 mr-4 transition-transform group-hover:scale-110`}>
                  <Icon size={18} className={colorCls} />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className={`text-[12px] font-bold uppercase tracking-[0.2em] ${colorCls}`}>{titulo}</span>
                    <ChevronDown size={14} className={`text-gray-500 transition-transform ${expandido ? '' : '-rotate-90'}`} />
                  </div>
                  <span className="text-[10px] font-medium text-gray-500 uppercase tracking-widest mt-0.5">{movimientos.length} movimientos</span>
                </div>
              </div>
              <button 
                onClick={() => setCreandoEnSeccion(creandoEnSeccion === tipoSeccion ? null : tipoSeccion)}
                className={`ml-4 p-2 rounded-xl transition-all duration-300 ${creandoEnSeccion === tipoSeccion ? 'bg-aura-coral text-aura-bg rotate-45' : 'bg-aura-lavender text-aura-bg hover:scale-110 shadow-lg shadow-aura-lavender/20'}`}
              >
                <Plus size={16} strokeWidth={3} />
              </button>
            </div>
            <div className="flex flex-col items-end">
              <span className={`text-xl font-bold tracking-tight ${colorCls}`}>+{formatARS(total)}</span>
            </div>
          </div>
        </td>
      </tr>
      {creandoEnSeccion === tipoSeccion && (
        <tr>
          <td colSpan={4} className="px-6 pb-6">
            <div className="glass-card p-8 border-aura-lavender/20 animate-in slide-in-from-top-4 duration-300">
              <InlineCreateForm tipo={tipoSeccion as any} mes={mes} anio={anio} onClose={() => setCreandoEnSeccion(null)} />
            </div>
          </td>
        </tr>
      )}
      {expandido && (
        <tr>
          <td colSpan={4} className="px-6">
            <div className="space-y-3 mb-6">
              {movimientos.map((mov: any) => <RenderItem key={mov.id} mov={mov} editingItem={editingItem} setEditingItem={setEditingItem} reactivarMutation={reactivarMutation} mes={mes} anio={anio} />)}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function GrupoCompuestoDesktop({ titulo, icon: Icon, colorCls, datos, expandido, onToggle, editingItem, setEditingItem, creandoEnSeccion, setCreandoEnSeccion, mes, anio }: any) {
  const queryClient = useQueryClient();
  const reactivarMutation = useMutation({
    mutationFn: async (id: number) => reactivarGastoMensual(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['gastos-mensuales'] });
    }
  });

  const secciones = [
    { key: 'cuotas', label: 'Cuotas de Tarjeta', items: datos.cuotas },
    { key: 'fijos', label: 'Gastos Fijos', items: datos.fijos },
    { key: 'variables', label: 'Gastos Variables', items: datos.variables },
    { key: 'prestamos', label: 'Préstamos', items: datos.prestamos }
  ].filter(s => s.items?.length > 0);

  const cantMovimientos = secciones.reduce((acc, s) => acc + s.items.length, 0);

  return (
    <>
      <tr className="border-none">
        <td colSpan={4} className="px-6 py-4">
          <div className="flex items-center justify-between bg-aura-surface/30 backdrop-blur-md rounded-2xl p-4 border border-aura-border/20">
            <div className="flex items-center gap-4">
              <div className="flex items-center cursor-pointer group" onClick={onToggle}>
                <div className={`p-3 rounded-xl bg-white/5 border border-white/10 mr-4 transition-transform group-hover:scale-110`}>
                  <Icon size={18} className={colorCls} />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className={`text-[12px] font-bold uppercase tracking-[0.2em] ${colorCls}`}>{titulo}</span>
                    <ChevronDown size={14} className={`text-gray-500 transition-transform ${expandido ? '' : '-rotate-90'}`} />
                  </div>
                  <span className="text-[10px] font-medium text-gray-500 uppercase tracking-widest mt-0.5">{cantMovimientos} movimientos</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className={`text-xl font-bold tracking-tight ${colorCls}`}>-{formatARS(datos.total)}</span>
            </div>
          </div>
        </td>
      </tr>
      {expandido && (
        <tr>
          <td colSpan={4} className="px-6 pb-6">
            <div className="space-y-6">
              {secciones.map(sec => (
                <div key={sec.key} className="bg-white/5 rounded-2xl p-4 border border-white/5">
                  <div className="flex items-center justify-between mb-4 px-2">
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{sec.label}</h4>
                    <span className="text-xs font-bold text-white">{formatARS(sec.items.reduce((acc: number, m: any) => acc + m.monto, 0))}</span>
                  </div>
                  <div className="space-y-2">
                    {sec.items.map((mov: any) => <RenderItem key={mov.id} mov={mov} editingItem={editingItem} setEditingItem={setEditingItem} reactivarMutation={reactivarMutation} mes={mes} anio={anio} />)}
                  </div>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function GrupoSimpleMobile(props: any) {
  // Solo un wrapper para mobile, reutiliza la misma logica simplificada.
  return (
     <div className={`glass-card overflow-hidden transition-all duration-500 ${props.expandido ? 'aura-glow-lavender border-aura-lavender/20' : 'border-aura-border/20'}`}>
        <div className="flex items-center justify-between px-6 py-5 cursor-pointer" onClick={props.onToggle}>
            <div className="flex flex-col">
              <span className={`text-[10px] font-bold uppercase tracking-[0.2em] ${props.colorCls}`}>{props.titulo}</span>
              <span className="text-sm font-black text-white mt-1">+{formatARS(props.movimientos.reduce((a:number,m:any)=>a+m.monto,0))}</span>
            </div>
            <ChevronDown size={14} className={`text-gray-500 transition-transform ${props.expandido ? 'rotate-180' : ''}`} />
        </div>
        {props.expandido && (
          <div className="px-4 pb-4 space-y-2">
            {props.movimientos.map((mov: any) => <RenderItem key={mov.id} mov={mov} editingItem={props.editingItem} setEditingItem={props.setEditingItem} reactivarMutation={{isPending:false, mutate:()=>{}}} mes={props.mes} anio={props.anio} />)}
          </div>
        )}
     </div>
  );
}

function GrupoCompuestoMobile(props: any) {
  const { datos } = props;
  const secciones = [
    { key: 'cuotas', label: 'Cuotas', items: datos.cuotas },
    { key: 'fijos', label: 'Fijos', items: datos.fijos },
    { key: 'variables', label: 'Variables', items: datos.variables },
    { key: 'prestamos', label: 'Préstamos', items: datos.prestamos }
  ].filter(s => s.items?.length > 0);

  return (
     <div className={`glass-card overflow-hidden transition-all duration-500 ${props.expandido ? 'aura-glow-lavender border-aura-lavender/20' : 'border-aura-border/20'}`}>
        <div className="flex items-center justify-between px-6 py-5 cursor-pointer" onClick={props.onToggle}>
            <div className="flex flex-col">
              <span className={`text-[10px] font-bold uppercase tracking-[0.2em] ${props.colorCls}`}>{props.titulo}</span>
              <span className="text-sm font-black text-white mt-1">-{formatARS(datos.total)}</span>
            </div>
            <ChevronDown size={14} className={`text-gray-500 transition-transform ${props.expandido ? 'rotate-180' : ''}`} />
        </div>
        {props.expandido && (
          <div className="px-4 pb-4 space-y-4">
            {secciones.map(sec => (
               <div key={sec.key} className="bg-white/5 rounded-xl p-3 border border-white/5">
                 <div className="flex items-center justify-between mb-3 px-1 border-b border-white/5 pb-2">
                    <h4 className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{sec.label}</h4>
                    <span className="text-xs font-bold text-white">{formatARS(sec.items.reduce((acc: number, m: any) => acc + m.monto, 0))}</span>
                 </div>
                 <div className="space-y-2">
                    {sec.items.map((mov: any) => <RenderItem key={mov.id} mov={mov} editingItem={props.editingItem} setEditingItem={props.setEditingItem} reactivarMutation={{isPending:false, mutate:()=>{}}} mes={props.mes} anio={props.anio} />)}
                 </div>
               </div>
            ))}
          </div>
        )}
     </div>
  );
}
"""

with open("frontend/src/pages/Dashboard.tsx", "w") as f:
    f.write(new_content + "\n" + componentes)

