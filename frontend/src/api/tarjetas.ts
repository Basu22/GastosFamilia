import { apiClient } from './client';

export const getTarjetas = async () => {
  const response = await apiClient.get('/tarjetas/');
  return response.data;
};

export const createTarjeta = async (data: any) => {
  const response = await apiClient.post('/tarjetas/', data);
  return response.data;
};

export const updateTarjeta = async (id: number, data: any) => {
  const response = await apiClient.put(`/tarjetas/${id}`, data);
  return response.data;
};

export const deleteTarjeta = async (id: number) => {
  const response = await apiClient.delete(`/tarjetas/${id}`);
  return response.data;
};
