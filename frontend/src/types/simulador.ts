export interface SimuladorInput {
  monto_total: number;
  cuotas: number;
  fecha_primera_cuota: string; // "YYYY-MM"
  descripcion?: string;
}

export interface DetalleItem {
  id: number;
  descripcion: string;
  monto_proyectado: number;
}

export interface DetalleCuota {
  descripcion: string;
  monto_cuota: number;
  cuota_actual: number;
  cuotas_total: number;
}

export interface SimuladorMes {
  mes: number;
  anio: number;
  total_ingresos: number;
  total_gastos_fijos: number;
  total_gastos_variables: number;
  total_cuotas: number;
  ahorro_real: number;
  cuota_simulada: number;
  ahorro_simulado: number;
  detalle_ingresos: DetalleItem[];
  detalle_gastos_fijos: DetalleItem[];
  detalle_gastos_variables: DetalleItem[];
  detalle_cuotas: DetalleCuota[];
}
