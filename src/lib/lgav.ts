// L-GAV (Landes-Gesamtarbeitsvertrag) calculations for Swiss gastronomy

export const LGAV = {
  MIN_REST_HOURS: 11, // Minimum rest between shifts
  DEFAULT_WEEKLY_HOURS: 42,
  DEFAULT_VACATION_SURCHARGE: 8.33, // % for < 50 years old
  VACATION_SURCHARGE_OVER_50: 10.67, // % for >= 50 years old
  HOLIDAY_SURCHARGE: 2.27, // % for holidays
};

/**
 * Calculate effective hours from clock in/out and breaks
 */
export function calculateEffectiveHours(
  clockIn: Date | string,
  clockOut: Date | string,
  breakMinutes: number
): number {
  const start = new Date(clockIn);
  const end = new Date(clockOut);
  const diffMs = end.getTime() - start.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  const effectiveHours = diffHours - breakMinutes / 60;
  return Math.max(0, Math.round(effectiveHours * 100) / 100);
}

/**
 * Check if rest time between two shifts is less than 11 hours
 */
export function checkRestTimeViolation(
  previousClockOut: Date | string,
  currentClockIn: Date | string
): { isViolation: boolean; restHours: number } {
  const prevEnd = new Date(previousClockOut);
  const currStart = new Date(currentClockIn);
  const diffMs = currStart.getTime() - prevEnd.getTime();
  const restHours = diffMs / (1000 * 60 * 60);
  return {
    isViolation: restHours < LGAV.MIN_REST_HOURS,
    restHours: Math.round(restHours * 100) / 100,
  };
}

/**
 * Calculate monthly target hours for fixed employees
 */
export function calculateMonthlyTargetHours(
  weeklyHours: number,
  year: number,
  month: number
): number {
  // Count working days in the month (Mon-Sat for gastro)
  const daysInMonth = new Date(year, month, 0).getDate();
  let workingDays = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const day = new Date(year, month - 1, d).getDay();
    if (day !== 0) workingDays++; // All days except Sunday
  }
  // Average: weeklyHours / 6 days * working days
  const dailyHours = weeklyHours / 6;
  return Math.round(dailyHours * workingDays * 100) / 100;
}

/**
 * Calculate L-GAV surcharges for hourly employees
 */
export function calculateHourlySurcharges(
  grossHours: number,
  vacationPercent: number = LGAV.DEFAULT_VACATION_SURCHARGE,
  holidayPercent: number = LGAV.HOLIDAY_SURCHARGE
): {
  grossHours: number;
  vacationSurcharge: number;
  holidaySurcharge: number;
  totalSurcharge: number;
  totalCompensation: number;
} {
  const vacationSurcharge = grossHours * (vacationPercent / 100);
  const holidaySurcharge = grossHours * (holidayPercent / 100);
  const totalSurcharge = vacationSurcharge + holidaySurcharge;
  return {
    grossHours,
    vacationSurcharge: Math.round(vacationSurcharge * 100) / 100,
    holidaySurcharge: Math.round(holidaySurcharge * 100) / 100,
    totalSurcharge: Math.round(totalSurcharge * 100) / 100,
    totalCompensation: Math.round((grossHours + totalSurcharge) * 100) / 100,
  };
}

/**
 * Format hours as HH:MM
 */
export function formatHoursMinutes(decimalHours: number): string {
  const hours = Math.floor(Math.abs(decimalHours));
  const minutes = Math.round((Math.abs(decimalHours) - hours) * 60);
  const sign = decimalHours < 0 ? '-' : '';
  return `${sign}${hours}:${minutes.toString().padStart(2, '0')}`;
}

/**
 * Format time from Date
 */
export function formatTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' });
}
