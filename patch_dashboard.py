import re

with open("frontend/src/pages/Dashboard.tsx", "r") as f:
    content = f.read()

# REEMPLAZAR GRUPOS EN VISTA MOBILE
mobile_old = r"\{/\* VISTA MÓVIL \(GRUPOS COLAPSABLES\) \*/\}.*?\{/\* VISTA DESKTOP \(TABLA AGRUPADA\) \*/\}"
mobile_new = """{/* VISTA MÓVIL (GRUPOS COLAPSABLES) */}
              <div className="flex flex-col gap-6 lg:hidden p-6 pb-12">
                <GrupoSimpleMobile
                  titulo="Ingresos" icon={PiggyBank} colorCls="text-aura-mint"
                  movimientos={movimientosAgrupados.ingresos}
                  expandido={seccionesAbiertas.has('ingresos')}
                  onToggle={() => toggleSeccion('ingresos')}
                  editingItem={editingItem} setEditingItem={setEditingItem}
                  creandoEnSeccion={creandoEnSeccion} setCreandoEnSeccion={setCreandoEnSeccion}
                  mes={mes} anio={anio}
                />
                
                {movimientosAgrupados.tarjetas.map((t: any) => (
                  <GrupoCompuestoMobile
                    key={t.nombre}
                    titulo={t.nombre} icon={CreditCard} colorCls="text-aura-lavender"
                    datos={t}
                    expandido={seccionesAbiertas.has(t.nombre)}
                    onToggle={() => toggleSeccion(t.nombre)}
                    editingItem={editingItem} setEditingItem={setEditingItem}
                    creandoEnSeccion={creandoEnSeccion} setCreandoEnSeccion={setCreandoEnSeccion}
                    mes={mes} anio={anio}
                  />
                ))}

                {movimientosAgrupados.efectivo.total > 0 && (
                  <GrupoCompuestoMobile
                    titulo="Efectivo / Transferencia" icon={Wallet} colorCls="text-aura-coral"
                    datos={movimientosAgrupados.efectivo}
                    expandido={seccionesAbiertas.has('efectivo')}
                    onToggle={() => toggleSeccion('efectivo')}
                    editingItem={editingItem} setEditingItem={setEditingItem}
                    creandoEnSeccion={creandoEnSeccion} setCreandoEnSeccion={setCreandoEnSeccion}
                    mes={mes} anio={anio}
                  />
                )}
              </div>

              {/* VISTA DESKTOP (TABLA AGRUPADA) */}"""

content = re.sub(mobile_old, mobile_new, content, flags=re.DOTALL)

# REEMPLAZAR GRUPOS EN VISTA DESKTOP
desktop_old = r"\{/\* VISTA DESKTOP \(TABLA AGRUPADA\) \*/\}.*?</tbody>\s*</table>\s*</div>\s*</div>"
desktop_new = """{/* VISTA DESKTOP (TABLA AGRUPADA) */}
              <div className="hidden lg:block overflow-x-auto px-6 pb-12">
                <table className="w-full text-left border-collapse">
                  <tbody className="divide-y divide-white/5">
                    <GrupoSimpleDesktop 
                      titulo="Ingresos" icon={PiggyBank} colorCls="text-aura-mint"
                      movimientos={movimientosAgrupados.ingresos}
                      expandido={seccionesAbiertas.has('ingresos')}
                      onToggle={() => toggleSeccion('ingresos')}
                      editingItem={editingItem} setEditingItem={setEditingItem}
                      creandoEnSeccion={creandoEnSeccion} setCreandoEnSeccion={setCreandoEnSeccion}
                      mes={mes} anio={anio}
                    />

                    {movimientosAgrupados.tarjetas.map((t: any) => (
                      <GrupoCompuestoDesktop
                        key={t.nombre}
                        titulo={t.nombre} icon={CreditCard} colorCls="text-aura-lavender"
                        datos={t}
                        expandido={seccionesAbiertas.has(t.nombre)}
                        onToggle={() => toggleSeccion(t.nombre)}
                        editingItem={editingItem} setEditingItem={setEditingItem}
                        creandoEnSeccion={creandoEnSeccion} setCreandoEnSeccion={setCreandoEnSeccion}
                        mes={mes} anio={anio}
                      />
                    ))}

                    {movimientosAgrupados.efectivo.total > 0 && (
                      <GrupoCompuestoDesktop
                        titulo="Efectivo / Transferencia" icon={Wallet} colorCls="text-aura-coral"
                        datos={movimientosAgrupados.efectivo}
                        expandido={seccionesAbiertas.has('efectivo')}
                        onToggle={() => toggleSeccion('efectivo')}
                        editingItem={editingItem} setEditingItem={setEditingItem}
                        creandoEnSeccion={creandoEnSeccion} setCreandoEnSeccion={setCreandoEnSeccion}
                        mes={mes} anio={anio}
                      />
                    )}
                  </tbody>
                </table>
              </div>
            </div>"""

content = re.sub(desktop_old, desktop_new, content, flags=re.DOTALL)

with open("frontend/src/pages/Dashboard.tsx", "w") as f:
    f.write(content)
