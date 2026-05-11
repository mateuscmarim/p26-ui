/**
 * Pure formatting helpers for the credentials panel. No DOM, no side effects.
 */

const STATUS_LABELS = {
  ACTIVE: 'Active',
  EXPIRING_SOON: 'Expiring soon',
  EXPIRED: 'Expired',
  MISSING: 'Missing',
};

const CONFIDENCE_LABELS = {
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

// Tokens that should stay all-caps in human-readable type names.
const ACRONYMS = new Set(['DEA', 'BLS', 'CPR', 'NPI', 'OSHA', 'HIPAA', 'PA', 'MD', 'DDS']);

export function daysUntil(dateStr, today) {
  if (!dateStr) return null;
  const target = new Date(dateStr + 'T00:00:00');
  const reference = today
    ? new Date(today + 'T00:00:00')
    : new Date();
  reference.setHours(0, 0, 0, 0);
  return Math.round((target - reference) / 86400000);
}

export function formatExpiry(dateStr, today) {
  if (!dateStr) return '—';
  const days = daysUntil(dateStr, today);
  if (days === 0) return 'Expires today';
  if (days > 0) return `Expires in ${days} day${days === 1 ? '' : 's'}`;
  return `Expired ${-days} day${days === -1 ? '' : 's'} ago`;
}

export function formatStatus(status) {
  return STATUS_LABELS[status] || status || '';
}

export function formatConfidence(level) {
  if (level == null) return 'Unknown';
  return CONFIDENCE_LABELS[level] || 'Unknown';
}

export function formatCredentialType(snake) {
  if (snake == null) return '';
  return snake.split('_').map(part => {
    const upper = part.toUpperCase();
    if (ACRONYMS.has(upper)) return upper;
    return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
  }).join(' ');
}
