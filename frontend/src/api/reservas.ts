import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export interface Reserva {
  id: number;
  nombre: string;
  color: string;
  descripcion?: string;
  activa: boolean;
  monto_fijo_mensual: number;
  fecha_baja?: string;
  created_at: string;
}

export interface ReservaCreate {
  nombre: string;
  color?: string;
  descripcion?: string;
  monto_fijo_mensual?: number;
  fecha_baja?: string;
}

export interface ReservaUpdate {
  nombre?: string;
  color?: string;
  descripcion?: string;
  monto_fijo_mensual?: number;
  fecha_baja?: string;
}

export interface AsignacionReserva {
  id: number;
  reserva_id: number;
  mes: number;
  anio: number;
  monto: number;
  notas?: string;
  created_at: string;
}

export interface AsignacionCreate {
  reserva_id: number;
  mes: number;
  anio: number;
  monto: number;
  notas?: string;
}

export interface AjusteReserva {
  id: number;
  tipo: 'reasignacion' | 'liberacion';
  reserva_origen_id: number;
  reserva_destino_id?: number;
  monto: number;
  mes: number;
  anio: number;
  notas?: string;
  created_at: string;
}

export interface AjusteCreate {
  tipo: 'reasignacion' | 'liberacion';
  reserva_origen_id: number;
  reserva_destino_id?: number;
  monto: number;
  mes: number;
  anio: number;
  notas?: string;
}

export interface SaldoReserva {
  id: number;
  nombre: string;
  color: string;
  saldo_actual: number;
  asignacion_mes: number;
  consumo_mes: number;
}

export interface MigracionReserva {
  gasto_mensual_id: number;
  nombre: string;
  color: string;
}

export const getReservas = async (): Promise<Reserva[]> => {
  const { data } = await axios.get(`${API_URL}/reservas`);
  return data;
};

export const createReserva = async (res: ReservaCreate): Promise<Reserva> => {
  const { data } = await axios.post(`${API_URL}/reservas`, res);
  return data;
};

export const updateReserva = async (id: number, res: ReservaUpdate): Promise<Reserva> => {
  const { data } = await axios.put(`${API_URL}/reservas/${id}`, res);
  return data;
};

export const deactivateReserva = async (id: number): Promise<void> => {
  await axios.delete(`${API_URL}/reservas/${id}`);
};

export const getAsignaciones = async (mes: number, anio: number): Promise<AsignacionReserva[]> => {
  const { data } = await axios.get(`${API_URL}/reservas/asignaciones`, { params: { mes, anio } });
  return data;
};

export const createAsignacion = async (asig: AsignacionCreate): Promise<AsignacionReserva> => {
  const { data } = await axios.post(`${API_URL}/reservas/asignaciones`, asig);
  return data;
};

export const deleteAsignacion = async (id: number): Promise<void> => {
  await axios.delete(`${API_URL}/reservas/asignaciones/${id}`);
};

export const createAjuste = async (ajuste: AjusteCreate): Promise<AjusteReserva> => {
  const { data } = await axios.post(`${API_URL}/reservas/ajustes`, ajuste);
  return data;
};

export const getSaldos = async (mes: number, anio: number): Promise<SaldoReserva[]> => {
  const { data } = await axios.get(`${API_URL}/reservas/saldos`, { params: { mes, anio } });
  return data;
};

export const migrarReservas = async (migraciones: MigracionReserva[]): Promise<any> => {
  const { data } = await axios.post(`${API_URL}/reservas/migrar`, migraciones);
  return data;
};
