const DATE_FORMATTER = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric'
});

const WEEKDAY_FORMATTER = new Intl.DateTimeFormat(undefined, { weekday: 'long' });
const WEEKDAY_SHORT_FORMATTER = new Intl.DateTimeFormat(undefined, { weekday: 'short' });
const MONTH_FORMATTER = new Intl.DateTimeFormat(undefined, { month: 'long' });

export function dateKeyFromLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function todayKey() {
  return dateKeyFromLocalDate(new Date());
}

export function formatDisplayDate(dateKey) {
  const d = new Date(`${dateKey}T12:00:00`);
  return DATE_FORMATTER.format(d);
}

function ordinalSuffix(day) {
  const mod100 = day % 100;
  if (mod100 >= 11 && mod100 <= 13) {
    return 'th';
  }

  const mod10 = day % 10;
  if (mod10 === 1) {
    return 'st';
  }
  if (mod10 === 2) {
    return 'nd';
  }
  if (mod10 === 3) {
    return 'rd';
  }
  return 'th';
}

export function formatLongDateWithOrdinal(dateKey) {
  const d = new Date(`${dateKey}T12:00:00`);
  const weekday = WEEKDAY_FORMATTER.format(d);
  const month = MONTH_FORMATTER.format(d);
  const day = d.getDate();
  const year = d.getFullYear();
  return `${weekday}, ${month} ${day}${ordinalSuffix(day)}, ${year}`;
}

export function formatShortDate(dateKey) {
  const d = new Date(`${dateKey}T12:00:00`);
  const weekday = WEEKDAY_SHORT_FORMATTER.format(d);
  const month = MONTH_FORMATTER.format(d);
  const day = d.getDate();
  return `${weekday}, ${month} ${day}`;
}

export function shiftDateKey(dateKey, deltaDays) {
  const normalized = normalizeDateKey(dateKey) || todayKey();
  const d = new Date(`${normalized}T12:00:00`);
  d.setDate(d.getDate() + deltaDays);
  return dateKeyFromLocalDate(d);
}

export function normalizeDateKey(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : null;
}

export function previousDate(dateKey) {
  const d = new Date(`${dateKey}T12:00:00`);
  d.setDate(d.getDate() - 1);
  return dateKeyFromLocalDate(d);
}
