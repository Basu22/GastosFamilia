import { apiClient } from './client';

export const getComprasDeseadas = (estado?: string) =>
  apiClient.get('/compras-deseadas/', { params: estado ? { estado } : {} }).then(r => r.data);

export const createCompraDeseada = (data: any) =>
  apiClient.post('/compras-deseadas/', data).then(r => r.data);

export const updateCompraDeseada = (id: number, data: any) =>
  apiClient.put(`/compras-deseadas/${id}`, data).then(r => r.data);

export const marcarComprada = (id: number) =>
  apiClient.patch(`/compras-deseadas/${id}/comprar`).then(r => r.data);

export const deleteCompraDeseada = (id: number) =>
  apiClient.delete(`/compras-deseadas/${id}`).then(r => r.data);
