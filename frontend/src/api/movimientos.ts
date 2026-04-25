import { apiClient } from './client';

export interface MovimientoCreate {
  tarjeta_id?: number | null;
  descripcion: string;
  categoria?: string;
  monto_total: number;
  cuotas: number;
  fecha_primera_cuota: string; // YYYY-MM-DD
  notas?: string;
}

export const previewMovimiento = async (monto_total: number, cuotas: number, fecha_inicio: string) => {
  const response = await apiClient.get('/movimientos/preview', {
    params: { monto_total, cuotas, fecha_inicio }
  });
  return response.data;
};

export const createMovimiento = async (data: MovimientoCreate) => {
  const response = await apiClient.post('/movimientos/', data);
  return response.data;
};

export const deleteMovimiento = async (id: number) => {
  const response = await apiClient.delete(`/movimientos/${id}`);
  return response.data;
};
