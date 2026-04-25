import { apiClient } from './client';

export const getGastosMensuales = async (mes?: number, anio?: number) => {
  const params: any = {};
  if (mes) params.mes = mes;
  if (anio) params.anio = anio;
  const response = await apiClient.get('/gastos-mensuales/', { params });
  return response.data;
};

export const createGastoMensual = async (data: any) => {
  const response = await apiClient.post('/gastos-mensuales/', data);
  return response.data;
};

export const updateGastoMensual = async (id: number, data: any) => {
  const response = await apiClient.put(`/gastos-mensuales/${id}`, data);
  return response.data;
};

export const deleteGastoMensual = async (id: number) => {
  const response = await apiClient.delete(`/gastos-mensuales/${id}`);
  return response.data;
};
