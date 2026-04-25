import { apiClient } from './client';

export const getIngresos = async (mes?: number, anio?: number) => {
  const params: any = {};
  if (mes) params.mes = mes;
  if (anio) params.anio = anio;
  const response = await apiClient.get('/ingresos/', { params });
  return response.data;
};

export const createIngreso = async (data: any) => {
  const response = await apiClient.post('/ingresos/', data);
  return response.data;
};

export const updateIngreso = async (id: number, data: any) => {
  const response = await apiClient.put(`/ingresos/${id}`, data);
  return response.data;
};

export const deleteIngreso = async (id: number) => {
  const response = await apiClient.delete(`/ingresos/${id}`);
  return response.data;
};
