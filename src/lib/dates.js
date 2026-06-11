// Local-timezone date helpers. Date keys are 'YYYY-MM-DD'.

export function dateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function addDays(key, n) {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m - 1, d + n);
  return dateKey(date);
}

export function formatDateKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export function isToday(key) {
  return key === dateKey();
}

// A med is due on a given date if it's active and (for short-term meds) the
// date is on or before its end date.
export function medActiveOn(med, key) {
  if (!med.active) return false;
  if (med.endDate && key > med.endDate) return false;
  return true;
}
