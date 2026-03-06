import { LGAV } from '@/lib/lgav';

export interface LgavViolation {
  employeeId: string;
  employeeName: string;
  type: 'rest_time' | 'weekly_rest' | 'weekly_hours' | 'consecutive_days' | 'daily_hours' | 'rest_days_month' | 'max_weekly_hours' | 'reduced_rest';
  severity: 'error' | 'warning';
  message: string;
  days: number[];
  law: string; // Legal reference
}

interface ShiftType {
  id: string;
  name: string;
  short_code: string;
  start_time: string | null;
  end_time: string | null;
}

interface Assignment {
  employee_id: string;
  date: string;
  shift_type_id: string;
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  weekly_hours: number | null;
  cost_center?: string;
  position?: string;
}

// Frei, Ferien, Krank, Unfall – not real work shifts
const FREE_CODES = ['X', 'V', 'K', 'U'];

function parseTime(timeStr: string): { hours: number; minutes: number } {
  const [h, m] = timeStr.split(':').map(Number);
  return { hours: h, minutes: m };
}

function shiftDurationHours(shift: ShiftType): number {
  if (!shift.start_time || !shift.end_time) return 0;
  const start = parseTime(shift.start_time);
  const end = parseTime(shift.end_time);
  let duration = (end.hours * 60 + end.minutes) - (start.hours * 60 + start.minutes);
  if (duration <= 0) duration += 24 * 60; // overnight shift
  return duration / 60;
}

function getShiftEnd(shift: ShiftType, day: number, month: number, year: number): Date | null {
  if (!shift.end_time) return null;
  const end = parseTime(shift.end_time);
  const start = shift.start_time ? parseTime(shift.start_time) : null;
  const d = new Date(year, month, day, end.hours, end.minutes);
  if (start && (end.hours * 60 + end.minutes) <= (start.hours * 60 + start.minutes)) {
    d.setDate(d.getDate() + 1);
  }
  return d;
}

function getShiftStart(shift: ShiftType, day: number, month: number, year: number): Date | null {
  if (!shift.start_time) return null;
  const start = parseTime(shift.start_time);
  return new Date(year, month, day, start.hours, start.minutes);
}

export function validateSchedule(
  assignments: Assignment[],
  employees: Employee[],
  shiftTypes: ShiftType[],
  year: number,
  month: number
): LgavViolation[] {
  const violations: LgavViolation[] = [];
  const shiftMap = new Map(shiftTypes.map(s => [s.id, s]));
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (const emp of employees) {
    const empName = `${emp.first_name} ${emp.last_name}`;
    const empAssignments = assignments
      .filter(a => a.employee_id === emp.id)
      .sort((a, b) => a.date.localeCompare(b.date));

    // Build day -> shift map
    const dayShift = new Map<number, ShiftType>();
    for (const a of empAssignments) {
      const day = parseInt(a.date.split('-')[2]);
      const shift = shiftMap.get(a.shift_type_id);
      if (shift) dayShift.set(day, shift);
    }

    const isWorkDay = (d: number) => {
      const shift = dayShift.get(d);
      return shift && !FREE_CODES.includes(shift.short_code);
    };

    // ─── 1) Ruhezeit zwischen Schichten (ArG Art. 15a / L-GAV Art. 15) ───
    let reducedRestCount = 0;
    let currentWeekStart = 1;

    for (let d = 1; d < daysInMonth; d++) {
      const shiftA = dayShift.get(d);
      const shiftB = dayShift.get(d + 1);
      if (!shiftA || !shiftB) continue;
      if (FREE_CODES.includes(shiftA.short_code) || FREE_CODES.includes(shiftB.short_code)) continue;

      // Track week boundaries for reduced rest counting
      const dateD = new Date(year, month, d);
      const dayOfWeek = dateD.getDay();
      if (dayOfWeek === 1) { // Monday = new week
        reducedRestCount = 0;
        currentWeekStart = d;
      }

      const endA = getShiftEnd(shiftA, d, month, year);
      const startB = getShiftStart(shiftB, d + 1, month, year);
      if (!endA || !startB) continue;

      const restHours = (startB.getTime() - endA.getTime()) / (1000 * 60 * 60);

      if (restHours < LGAV.MIN_REST_HOURS_REDUCED) {
        // Under 9h: always a violation
        violations.push({
          employeeId: emp.id, employeeName: empName, type: 'rest_time', severity: 'error',
          message: `Ruhezeit nur ${restHours.toFixed(1)}h zwischen Tag ${d} und ${d + 1} (min. ${LGAV.MIN_REST_HOURS_REDUCED}h, ArG Art. 15a)`,
          days: [d, d + 1], law: 'ArG Art. 15a',
        });
      } else if (restHours < LGAV.MIN_REST_HOURS) {
        // Between 9-11h: allowed once per week (L-GAV Art. 15 Abs. 2)
        reducedRestCount++;
        if (reducedRestCount > LGAV.MAX_REDUCED_REST_PER_WEEK) {
          violations.push({
            employeeId: emp.id, employeeName: empName, type: 'reduced_rest', severity: 'error',
            message: `Reduzierte Ruhezeit (${restHours.toFixed(1)}h) bereits ${reducedRestCount}x in dieser Woche verwendet (max. ${LGAV.MAX_REDUCED_REST_PER_WEEK}x, L-GAV Art. 15)`,
            days: [d, d + 1], law: 'L-GAV Art. 15 Abs. 2',
          });
        } else {
          violations.push({
            employeeId: emp.id, employeeName: empName, type: 'rest_time', severity: 'warning',
            message: `Reduzierte Ruhezeit ${restHours.toFixed(1)}h zwischen Tag ${d} und ${d + 1} (Standard: ${LGAV.MIN_REST_HOURS}h, erlaubt 1x/Woche)`,
            days: [d, d + 1], law: 'L-GAV Art. 15 Abs. 2',
          });
        }
      }
    }

    // ─── 2) Tägliche Arbeitszeit (ArG Art. 10) ───
    for (let d = 1; d <= daysInMonth; d++) {
      const shift = dayShift.get(d);
      if (!shift || FREE_CODES.includes(shift.short_code)) continue;
      const hours = shiftDurationHours(shift);
      if (hours > LGAV.MAX_DAILY_HOURS) {
        violations.push({
          employeeId: emp.id, employeeName: empName, type: 'daily_hours', severity: 'error',
          message: `${hours.toFixed(1)}h am Tag ${d} geplant (max. ${LGAV.MAX_DAILY_HOURS}h inkl. Pausen, ArG Art. 10)`,
          days: [d], law: 'ArG Art. 10',
        });
      }
    }

    // ─── 3) Max. aufeinanderfolgende Arbeitstage (L-GAV Art. 16) ───
    let consecutive = 0;
    let startDay = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      if (isWorkDay(d)) {
        if (consecutive === 0) startDay = d;
        consecutive++;
        if (consecutive > LGAV.MAX_CONSECUTIVE_WORK_DAYS) {
          violations.push({
            employeeId: emp.id, employeeName: empName, type: 'consecutive_days', severity: 'error',
            message: `${consecutive} aufeinanderfolgende Arbeitstage (Tag ${startDay}–${d}, max. ${LGAV.MAX_CONSECUTIVE_WORK_DAYS} gemäss L-GAV Art. 16)`,
            days: Array.from({ length: consecutive }, (_, i) => startDay + i),
            law: 'L-GAV Art. 16',
          });
        }
      } else {
        consecutive = 0;
      }
    }

    // ─── 4) Wöchentlicher Ruhetag (ArG Art. 21) ───
    const weeksChecked = new Set<number>();
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const dayOfWeek = date.getDay();
      const monday = new Date(date);
      monday.setDate(date.getDate() - ((dayOfWeek + 6) % 7));
      const weekKey = monday.getTime();
      if (weeksChecked.has(weekKey)) continue;
      weeksChecked.add(weekKey);

      let workDays = 0;
      let totalDaysInMonth = 0;
      const weekDays: number[] = [];
      for (let i = 0; i < 7; i++) {
        const wd = new Date(monday);
        wd.setDate(monday.getDate() + i);
        if (wd.getFullYear() === year && wd.getMonth() === month) {
          const dayNum = wd.getDate();
          totalDaysInMonth++;
          weekDays.push(dayNum);
          if (isWorkDay(dayNum)) workDays++;
        }
      }

      if (totalDaysInMonth >= 7 && workDays >= 7) {
        violations.push({
          employeeId: emp.id, employeeName: empName, type: 'weekly_rest', severity: 'error',
          message: `Kein Ruhetag in KW (Tag ${weekDays[0]}–${weekDays[weekDays.length - 1]}), ArG Art. 21 verlangt mind. 1 Ruhetag/Woche`,
          days: weekDays, law: 'ArG Art. 21',
        });
      }
    }

    // ─── 5) Monatliche Ruhetage (L-GAV Art. 16) ───
    let totalRestDays = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      if (!isWorkDay(d)) totalRestDays++;
    }
    // Only check if most days are planned
    const plannedDays = dayShift.size;
    const minRestDaysForMonth = Math.ceil(daysInMonth / 7 * LGAV.MIN_REST_DAYS_PER_WEEK);
    if (plannedDays >= daysInMonth * 0.8 && totalRestDays < minRestDaysForMonth) {
      violations.push({
        employeeId: emp.id, employeeName: empName, type: 'rest_days_month', severity: 'warning',
        message: `Nur ${totalRestDays} Ruhetage im Monat geplant (mind. ${minRestDaysForMonth} empfohlen, Ø ${LGAV.MIN_REST_DAYS_PER_WEEK}/Woche, L-GAV Art. 16)`,
        days: [], law: 'L-GAV Art. 16',
      });
    }

    // ─── 6) Wöchentliche Arbeitszeit (L-GAV Art. 15 / ArG Art. 9) ───
    const weeklyHoursLimit = emp.weekly_hours || LGAV.DEFAULT_WEEKLY_HOURS;
    const weeksHoursChecked = new Set<number>();
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const dayOfWeek = date.getDay();
      const monday = new Date(date);
      monday.setDate(date.getDate() - ((dayOfWeek + 6) % 7));
      const weekKey = monday.getTime();
      if (weeksHoursChecked.has(weekKey)) continue;
      weeksHoursChecked.add(weekKey);

      let weekHours = 0;
      const weekDays: number[] = [];
      for (let i = 0; i < 7; i++) {
        const wd = new Date(monday);
        wd.setDate(monday.getDate() + i);
        if (wd.getFullYear() === year && wd.getMonth() === month) {
          const dayNum = wd.getDate();
          weekDays.push(dayNum);
          const shift = dayShift.get(dayNum);
          if (shift && !FREE_CODES.includes(shift.short_code)) {
            weekHours += shiftDurationHours(shift);
          }
        }
      }

      if (weekDays.length < 5) continue; // Not enough days to judge

      // L-GAV Sollstunden exceeded
      if (weekHours > weeklyHoursLimit) {
        violations.push({
          employeeId: emp.id, employeeName: empName, type: 'weekly_hours', severity: 'warning',
          message: `${weekHours.toFixed(1)}h geplant in KW (Tag ${weekDays[0]}–${weekDays[weekDays.length - 1]}), Soll: ${weeklyHoursLimit}h (L-GAV Art. 15)`,
          days: weekDays, law: 'L-GAV Art. 15',
        });
      }

      // ArG Höchstarbeitszeit exceeded (hard limit)
      if (weekHours > LGAV.MAX_WEEKLY_HOURS) {
        violations.push({
          employeeId: emp.id, employeeName: empName, type: 'max_weekly_hours', severity: 'error',
          message: `${weekHours.toFixed(1)}h geplant in KW (Tag ${weekDays[0]}–${weekDays[weekDays.length - 1]}), max. ${LGAV.MAX_WEEKLY_HOURS}h (ArG Art. 9)`,
          days: weekDays, law: 'ArG Art. 9',
        });
      }
    }
  }

  // Sort: errors first, then warnings
  violations.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === 'error' ? -1 : 1;
    return a.employeeName.localeCompare(b.employeeName);
  });

  return violations;
}
