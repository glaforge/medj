/**
 * Date and Time utilities for MedJ
 * Ensures full timezone awareness and correct local time formatting across all browsers and locales.
 */

/**
 * Safely parses any date string (with or without 'Z', with or without time)
 * ensuring proper timezone awareness.
 */
export function parseDate(dateInput: string | Date | number | undefined | null): Date {
  if (!dateInput) return new Date();
  if (dateInput instanceof Date) return dateInput;
  if (typeof dateInput === 'number') return new Date(dateInput);

  let str = String(dateInput).trim();
  if (!str) return new Date();

  // If it's a date-only string (YYYY-MM-DD), parse as local date
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  // If it's an ISO datetime without timezone offset or Z (e.g. "2026-08-18T07:31:00" or "2026-08-18T07:31:00.123"),
  // treat it as UTC because backend timestamps are stored as UTC instants
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(str)) {
    str += 'Z';
  }

  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

/**
 * Formats a date & time for display in the user's local timezone (fr-FR by default).
 * e.g. "18 août, 09:31"
 */
export function formatDateTime(
  dateInput: string | Date | number | undefined | null,
  options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }
): string {
  if (!dateInput) return '';
  const d = parseDate(dateInput);
  return d.toLocaleDateString('fr-FR', options);
}

/**
 * Formats just the time in the user's local timezone (e.g. "09:31")
 */
export function formatTime(
  dateInput: string | Date | number | undefined | null,
  options: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' }
): string {
  if (!dateInput) return '';
  const d = parseDate(dateInput);
  return d.toLocaleTimeString('fr-FR', options);
}

/**
 * Formats just the date in the user's local timezone (e.g. "18 août 2026")
 */
export function formatDate(
  dateInput: string | Date | number | undefined | null,
  options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' }
): string {
  if (!dateInput) return '';
  const d = parseDate(dateInput);
  return d.toLocaleDateString('fr-FR', options);
}

/**
 * Returns today's date formatted as YYYY-MM-DD in the user's LOCAL timezone
 * (avoiding UTC day shifts near midnight).
 */
export function getLocalTodayString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formats points/scores to avoid floating point precision artifacts (e.g. 0.6000000000000001 -> "0.6").
 */
export function formatPoints(points: number | undefined | null): string {
  if (points === undefined || points === null || isNaN(points)) return '0';
  const rounded = Math.round(points * 10) / 10;
  return Number.isInteger(rounded) ? rounded.toString() : rounded.toFixed(1);
}

