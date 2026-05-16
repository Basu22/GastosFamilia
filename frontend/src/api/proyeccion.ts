import { apiClient } from './client';

export interface DetalleItem {
  id: number;
  descripcion: string;
  monto_base: number;
  monto_proyectado: number;
  tiene_override: boolean;
  es_fijo?: boolean;
  tarjeta_id?: number | null;
  tarjeta_nombre?: string | null;
  tarjeta_color?: string | null;
}

export interface MovimientoCuota {
  descripcion: string;
  monto_cuota: number;
  cuota_actual: number;
  cuotas_total: number;
}

export interface CuotasPorTarjeta {
  tarjeta_id: number | null;
  nombre: string;
  color: string;
  movimientos: MovimientoCuota[];
  subtotal: number;
}

export interface MesProyectado {
  mes: number;
  anio: number;
  es_pasado: boolean;
  total_ingresos: number;
  total_gastos_mensuales: number;
  total_cuotas: number;
  total_egresos: number;
  ahorro_proyectado: number;
  detalle_ingresos: DetalleItem[];
  detalle_gastos: DetalleItem[];
  detalle_cuotas_por_tarjeta: CuotasPorTarjeta[];
  detalle_prestamos: any[];
}

export interface OverrideCreate {
  tipo: 'ingreso' | 'gasto_mensual';
  referencia_id: number;
  mes: number;
  anio: number;
  monto: number;
  notas?: string;
}

export interface OverrideResponse {
  id: number;
  tipo: string;
  referencia_id: number;
  mes: number;
  anio: number;
  monto: number;
  notas?: string;
}

/** Obtiene la proyección de los próximos 12 meses */
export const getProyeccion = async (): Promise<MesProyectado[]> => {
  const { data } = await apiClient.get('/proyeccion/');
  return data;
};

/** Guarda o actualiza un override de monto para un ítem en un mes */
export const upsertOverride = async (override: OverrideCreate): Promise<OverrideResponse> => {
  const { data } = await apiClient.post('/proyeccion/override', override);
  return data;
};

/** Elimina un override, el ítem vuelve a usar su valor base */
export const deleteOverride = async (id: number): Promise<void> => {
  await apiClient.delete(`/proyeccion/override/${id}`);
};

/** Lista todos los overrides activos */
export const getOverrides = async (): Promise<OverrideResponse[]> => {
  const { data } = await apiClient.get('/proyeccion/overrides');
  return data;
};
