import axios from 'axios';

import { SimuladorInput, SimuladorMes } from '../types/simulador';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getDashboardInfo = async (mes?: number, anio?: number) => {
  const params: any = {};
  if (mes) params.mes = mes;
  if (anio) params.anio = anio;
  
  const response = await apiClient.get('/dashboard/', { params });
  return response.data;
};

export const getMesesDisponibles = async () => {
  const response = await apiClient.get('/dashboard/meses-disponibles');
  return response.data;
};

export const calcularSimulacion = async (data: SimuladorInput): Promise<SimuladorMes[]> => {
  const response = await apiClient.post('/simulador/calcular', data);
  return response.data;
};

// --- Importaciones Gmail ---
export const ejecutarImportacion = async () => {
  const response = await apiClient.post('/importaciones/ejecutar');
  return response.data;
};

export const getHistorialImportacion = async () => {
  const response = await apiClient.get('/importaciones/historial');
  return response.data;
};

export const getArcaMes = async (mes: number, anio: number) => {
  const response = await apiClient.get(`/importaciones/arca/${mes}/${anio}`);
  return response.data;
};
