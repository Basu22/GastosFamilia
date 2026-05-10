import { apiClient } from './client';

export const getWhatsappLogs = () =>
  apiClient.get('/whatsapp-logs/').then(r => r.data);

export const getWhatsappLog = (id: number) =>
  apiClient.get(`/whatsapp-logs/${id}`).then(r => r.data);

export const deleteWhatsappLog = (id: number) =>
  apiClient.delete(`/whatsapp-logs/${id}`).then(r => r.data);
