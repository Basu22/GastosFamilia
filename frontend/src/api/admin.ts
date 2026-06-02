import { apiClient } from './client';

// --- Types ---
interface BackupInfo {
  filename: string;
  size_bytes: number;
  fecha: string;
}

export interface DbInfoResponse {
  size_bytes: number;
  ultima_modificacion: string;
  environment: string;
  rpi_api_url: string;
  backups: BackupInfo[];
}

export interface SyncResultResponse {
  ok: boolean;
  mensaje: string;
  backup_creado?: string;
  size_bytes?: number;
}

// Leer el token de la variable de entorno o del localStorage
const getAdminToken = (): string => {
  return localStorage.getItem('admin_sync_token') || '';
};

export const setAdminToken = (token: string): void => {
  localStorage.setItem('admin_sync_token', token);
};

const adminHeaders = () => ({
  'X-Admin-Token': getAdminToken(),
});

// --- API Functions ---
export const getDbInfo = async (): Promise<DbInfoResponse> => {
  const response = await apiClient.get('/admin/db-info', { headers: adminHeaders() });
  return response.data;
};

export const syncDb = async (): Promise<SyncResultResponse> => {
  const response = await apiClient.post('/admin/sync-db', {}, { 
    headers: adminHeaders(),
    timeout: 60000, // 60s timeout para descarga
  });
  return response.data;
};

export const restoreBackup = async (filename: string): Promise<SyncResultResponse> => {
  const response = await apiClient.post('/admin/restore-backup', { filename }, { 
    headers: adminHeaders() 
  });
  return response.data;
};
