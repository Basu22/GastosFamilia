/**
 * Formatea un número como pesos argentinos (ARS)
 * Ejemplo: 1236062 -> $ 1.236.062
 */
export const formatARS = (n: number | undefined | null): string => {
  if (n === undefined || n === null) return '$ 0';
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(n);
};

/**
 * Formatea un número de forma compacta para gráficos o tags
 * Ejemplo: 1236062 -> $1.2M, 443000 -> $443k
 */
export const formatARSCompact = (n: number | undefined | null): string => {
  if (n === undefined || n === null) return '$0';
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}k`;
  return `$${n}`;
};

export const MESES_CORTO = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
