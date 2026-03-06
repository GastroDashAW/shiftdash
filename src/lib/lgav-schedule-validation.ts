import { LGAV } from '@/lib/lgav';

export interface LgavViolation {
  employeeId: string;
  employeeName: string;
  type: 'rest_time' | 'weekly_rest' | 'weekly_hours' | 'consecutive_days';
  message: string;
  days: number[];
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

const FREE_CODES = ['X', 'V', 'K']; // Frei, Ferien, Krank – not real work shifts

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
  // If end < start, shift goes past midnight
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

    // 1) Rest time check (11h between consecutive shifts)
    for (let d = 1; d < daysInMonth; d++) {
      const shiftA = dayShift.get(d);
      const shiftB = dayShift.get(d + 1);
      if (!shiftA || !shiftB) continue;
      if (FREE_CODES.includes(shiftA.short_code) || FREE_CODES.includes(shiftB.short_code)) continue;

      const endA = getShiftEnd(shiftA, d, month, year);
      const startB = getShiftStart(shiftB, d + 1, month, year);
      if (!endA || !startB) continue;

      const restHours = (startB.getTime() - endA.getTime()) / (1000 * 60 * 60);
      if (restHours < LGAV.MIN_REST_HOURS) {
        violations.push({
          employeeId: emp.id,
          employeeName: empName,
          type: 'rest_time',
          message: `Ruhezeit nur ${restHours.toFixed(1)}h zwischen Tag ${d} und ${d + 1} (min. ${LGAV.MIN_REST_HOURS}h)`,
          days: [d, d + 1],
        });
      }
    }

    // 2) Consecutive working days (max 6, then 1 free day required)
    let consecutive = 0;
    let startDay = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const shift = dayShift.get(d);
      const isWorkDay = shift && !FREE_CODES.includes(shift.short_code);
      if (isWorkDay) {
        if (consecutive === 0) startDay = d;
        consecutive++;
        if (consecutive > 6) {
          violations.push({
            employeeId: emp.id,
            employeeName: empName,
            type: 'consecutive_days',
            message: `${consecutive} aufeinanderfolgende Arbeitstage (Tag ${startDay}–${d}, max. 6 gemäss L-GAV)`,
            days: Array.from({ length: consecutive }, (_, i) => startDay + i),
          });
        }
      } else {
        consecutive = 0;
      }
    }

    // 3) Weekly rest day check (each calendar week needs at least 1 free day)
    // Get ISO weeks in this month
    const weeksChecked = new Set<number>();
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const dayOfWeek = date.getDay(); // 0=Sun
      // Find Monday of this week
      const monday = new Date(date);
      monday.setDate(date.getDate() - ((dayOfWeek + 6) % 7));
      const weekKey = monday.getTime();
      if (weeksChecked.has(weekKey)) continue;
      weeksChecked.add(weekKey);

      // Check 7 days of this week
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
          const shift = dayShift.get(dayNum);
          if (shift && !FREE_CODES.includes(shift.short_code)) {
            workDays++;
          }
        }
      }
      // Only flag if we have the full week in view (or at least 7 days of assignments)
      if (totalDaysInMonth >= 7 && workDays >= 7) {
        violations.push({
          employeeId: emp.id,
          employeeName: empName,
          type: 'weekly_rest',
          message: `Kein Ruhetag in KW (Tag ${weekDays[0]}–${weekDays[weekDays.length - 1]})`,
          days: weekDays,
        });
      }
    }

    // 4) Weekly hours check
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

      if (weekHours > weeklyHoursLimit && weekDays.length >= 5) {
        violations.push({
          employeeId: emp.id,
          employeeName: empName,
          type: 'weekly_hours',
          message: `${weekHours.toFixed(1)}h geplant in KW (Tag ${weekDays[0]}–${weekDays[weekDays.length - 1]}), max. ${weeklyHoursLimit}h`,
          days: weekDays,
        });
      }
    }
  }

  return violations;
}
