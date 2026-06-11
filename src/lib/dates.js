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

// Format an HH:MM string as "8:00 AM". Returns null if no time given.
export function formatTime(t) {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, '0')} ${period}`;
}

// Maps an HH:MM time to a human-readable period label used as a section header.
export function timeToLabel(t) {
  if (!t) return 'Unscheduled';
  const [h] = t.split(':').map(Number);
  if (h >= 5 && h < 12) return 'Morning';
  if (h >= 12 && h < 14) return 'Midday';
  if (h >= 14 && h < 17) return 'Afternoon';
  if (h >= 17 && h < 21) return 'Evening';
  return 'Bedtime';
}

// Sort comparator: by scheduledTime (HH:MM lexicographic), nulls last, then sortOrder.
export function medTimeSort(a, b) {
  if (!a.scheduledTime && !b.scheduledTime) return a.sortOrder - b.sortOrder;
  if (!a.scheduledTime) return 1;
  if (!b.scheduledTime) return -1;
  if (a.scheduledTime !== b.scheduledTime) return a.scheduledTime.localeCompare(b.scheduledTime);
  return a.sortOrder - b.sortOrder;
}
