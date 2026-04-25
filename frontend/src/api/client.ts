import axios from 'axios';

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
