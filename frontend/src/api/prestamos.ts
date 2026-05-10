import { apiClient } from './client';

export const getPrestamos = async () => {
  const response = await apiClient.get('/prestamos/');
  return response.data;
};

export const createPrestamo = async (data: any) => {
  const response = await apiClient.post('/prestamos/', data);
  return response.data;
};

export const updatePrestamo = async (id: number, data: any) => {
  const response = await apiClient.put(`/prestamos/${id}`, data);
  return response.data;
};

export const deletePrestamo = async (id: number) => {
  const response = await apiClient.delete(`/prestamos/${id}`);
  return response.data;
};
