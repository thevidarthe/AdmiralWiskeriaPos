import clsx, { type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export const formatCOP = (n: number) =>
  '$' + Math.round(n || 0).toLocaleString('es-CO');

export const formatDate = (d: string | Date) =>
  new Date(d).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

export const formatDateTime = (d: string | Date) =>
  new Date(d).toLocaleString('es-CO', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
