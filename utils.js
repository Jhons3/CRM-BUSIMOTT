// Shared utilities for CRM dashboards
export const ago = d => {
  const s = (Date.now() - new Date(d)) / 1000;
  if (s < 60) return 'ahora';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
};

export const fmtTime = s => {
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

export const dateStr = daysAhead => {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().split('T')[0];
};

export const fmtMXN = n => '$' + Number(n).toLocaleString('es-MX');

