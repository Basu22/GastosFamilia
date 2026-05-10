import { apiClient } from './client';

export const getMediosPago = () => 
  apiClient.get('/configuracion/medios-pago').then(res => res.data);

export const getCategorias = () => 
  apiClient.get('/configuracion/categorias').then(res => res.data);

export const createMedioPago = (data: any) =>
  apiClient.post('/configuracion/medios-pago', data).then(res => res.data);

export const updateMedioPago = (id: number, data: any) =>
  apiClient.put(`/configuracion/medios-pago/${id}`, data).then(res => res.data);

export const deleteMedioPago = (id: number) =>
  apiClient.delete(`/configuracion/medios-pago/${id}`).then(res => res.data);

export const createCategoria = (data: any) =>
  apiClient.post('/configuracion/categorias', data).then(res => res.data);

export const updateCategoria = (id: number, data: any) =>
  apiClient.put(`/configuracion/categorias/${id}`, data).then(res => res.data);

export const deleteCategoria = (id: number) =>
  apiClient.delete(`/configuracion/categorias/${id}`).then(res => res.data);
