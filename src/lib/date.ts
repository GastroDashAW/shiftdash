/**
 * Returns today's date as YYYY-MM-DD string in Swiss local time (Europe/Zurich).
 * Prevents off-by-one errors when the server timezone differs from the user's.
 */
export function getSwissDateString(date?: Date): string {
  return (date ?? new Date()).toLocaleDateString('sv-SE', {
    timeZone: 'Europe/Zurich',
  });
}

/**
 * Returns the last day of a given month as YYYY-MM-DD in Swiss time.
 */
export function getEndOfMonthString(year: number, month: number): string {
  const lastDay = new Date(year, month, 0).getDate();
  return `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
}

/**
 * Returns dynamic year options: [currentYear-1 .. currentYear+3]
 */
export function getYearOptions(): number[] {
  const currentYear = new Date().getFullYear();
  return Array.from({ length: 5 }, (_, i) => currentYear - 1 + i);
}
