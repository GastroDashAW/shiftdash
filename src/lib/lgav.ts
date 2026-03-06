// L-GAV (Landes-Gesamtarbeitsvertrag) & ArG (Arbeitsgesetz) constants for Swiss gastronomy

export const LGAV = {
  // === Ruhezeiten (ArG Art. 15a / L-GAV Art. 15) ===
  MIN_REST_HOURS: 11,              // Minimum tägliche Ruhezeit (Standard)
  MIN_REST_HOURS_REDUCED: 9,       // Reduzierte Ruhezeit (1x pro Woche erlaubt, L-GAV Art. 15 Abs. 2)
  MAX_REDUCED_REST_PER_WEEK: 1,    // Max. Anzahl reduzierte Ruhezeiten pro Woche

  // === Arbeitszeit (L-GAV Art. 15 / ArG Art. 9) ===
  DEFAULT_WEEKLY_HOURS: 42,        // Wöchentliche Arbeitszeit (L-GAV Art. 15)
  MAX_WEEKLY_HOURS: 45,            // Höchstarbeitszeit (ArG Art. 9 Abs. 1a für Industrie/Gastgewerbe)
  MAX_DAILY_HOURS: 14,             // Maximale tägliche Arbeitszeit inkl. Pausen (ArG Art. 10)
  MAX_DAILY_WORK_HOURS: 12.5,      // Maximale tägliche Nettoarbeitszeit

  // === Ruhetage (L-GAV Art. 16 / ArG Art. 21) ===
  MAX_CONSECUTIVE_WORK_DAYS: 6,    // Max. aufeinanderfolgende Arbeitstage
  MIN_REST_DAYS_PER_WEEK: 1.5,     // 1.5 Ruhetage pro Woche im Durchschnitt (L-GAV Art. 16)
  MIN_REST_DAYS_PER_4_WEEKS: 6,    // Mind. 6 Ruhetage pro 4 Wochen (L-GAV Art. 16)
  MIN_FULL_REST_DAYS_PER_MONTH: 2, // Mind. 2 ganze Ruhetage pro Monat (ArG Art. 21)
  WEEKLY_REST_HOURS: 35,           // Wöchentliche Ruhezeit mind. 35h am Stück (ArG Art. 21 Abs. 2)

  // === Pausen (ArG Art. 15) ===
  BREAK_MINUTES_5H: 15,            // 15 Min. Pause bei > 5.5h Arbeit
  BREAK_MINUTES_7H: 30,            // 30 Min. Pause bei > 7h Arbeit
  BREAK_MINUTES_9H: 60,            // 60 Min. Pause bei > 9h Arbeit

  // === Zuschläge (L-GAV Art. 17) ===
  DEFAULT_VACATION_SURCHARGE: 8.33,   // % für < 50 Jahre (4 Wochen = 8.33%)
  VACATION_SURCHARGE_OVER_50: 10.64,  // % für >= 50 Jahre (5 Wochen = 10.64%)
  VACATION_SURCHARGE_UNDER_20: 10.64, // % für < 20 Jahre (5 Wochen = 10.64%)
  HOLIDAY_SURCHARGE: 2.27,            // % für Feiertage (L-GAV Art. 18)

  // === Nachtarbeit (ArG Art. 17) ===
  NIGHT_START: 23,  // Nachtarbeit ab 23:00
  NIGHT_END: 6,     // Nachtarbeit bis 06:00
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
 * Calculate minimum required break based on working hours (ArG Art. 15)
 */
export function getRequiredBreakMinutes(workHours: number): number {
  if (workHours > 9) return LGAV.BREAK_MINUTES_9H;
  if (workHours > 7) return LGAV.BREAK_MINUTES_7H;
  if (workHours > 5.5) return LGAV.BREAK_MINUTES_5H;
  return 0;
}

/**
 * Check if rest time between two shifts is less than minimum
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
  const daysInMonth = new Date(year, month, 0).getDate();
  let workingDays = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const day = new Date(year, month - 1, d).getDay();
    if (day !== 0) workingDays++; // All days except Sunday
  }
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
