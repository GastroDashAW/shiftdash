import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Employee, ShiftType, Assignment, ScheduleEvent } from '@/types';
import { getPositionOrder } from '@/constants';

interface UseScheduleDataParams {
  year: number;
  month: number; // 0-indexed
  isAdmin: boolean;
}

export function useScheduleData({ year, month, isAdmin }: UseScheduleDataParams) {
  const [shiftTypes, setShiftTypes] = useState<ShiftType[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [events, setEvents] = useState<ScheduleEvent[]>([]);

  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const loadData = useCallback(async () => {
    const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

    // Admins get full employee data (including hourly_rate for cost calc)
    // Employees only get directory info (no salary data)
    const employeeQuery = isAdmin
      ? supabase.from('employees').select('id, first_name, last_name, weekly_hours, hourly_rate, cost_center, position').eq('is_active', true)
      : supabase.from('employees_directory' as any).select('id, first_name, last_name, cost_center, position').eq('is_active', true);

    const [shiftsRes, empRes, assignRes, eventsRes, bizRes] = await Promise.all([
      supabase.from('shift_types').select('*').order('sort_order'),
      employeeQuery,
      supabase.from('schedule_assignments').select('*').gte('date', startDate).lte('date', endDate),
      supabase.from('schedule_events').select('*').gte('date', startDate).lte('date', endDate),
      supabase.from('business_settings').select('closed_days, auto_sync_schedule').limit(1).maybeSingle(),
    ]);

    const sorted = ((empRes.data || []) as Employee[]).sort((a, b) => {
      const ccCompare = (a.cost_center || '').localeCompare(b.cost_center || '');
      if (ccCompare !== 0) return ccCompare;
      return getPositionOrder(a.position || '') - getPositionOrder(b.position || '');
    });

    const shifts = (shiftsRes.data || []) as ShiftType[];
    const emps = sorted;
    let currentAssignments = (assignRes.data || []) as Assignment[];

    setShiftTypes(shifts);
    setEmployees(emps);
    setEvents((eventsRes.data || []) as ScheduleEvent[]);

    // Auto-sync: assign "Frei" on closed days if enabled
    if (isAdmin && bizRes.data?.auto_sync_schedule && Array.isArray(bizRes.data.closed_days)) {
      const closedDays: number[] = bizRes.data.closed_days as number[];
      const freiShift = shifts.find(s =>
        s.short_code.toLowerCase() === 'f' ||
        s.name.toLowerCase() === 'frei' ||
        s.short_code.toLowerCase() === 'frei'
      );

      if (freiShift && closedDays.length > 0) {
        const toInsert: { employee_id: string; date: string; shift_type_id: string }[] = [];
        const existingKeys = new Set(currentAssignments.map(a => `${a.employee_id}-${a.date}`));

        for (let d = 1; d <= daysInMonth; d++) {
          const date = new Date(year, month, d);
          if (closedDays.includes(date.getDay())) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            for (const emp of emps) {
              if (!existingKeys.has(`${emp.id}-${dateStr}`)) {
                toInsert.push({ employee_id: emp.id, date: dateStr, shift_type_id: freiShift.id });
              }
            }
          }
        }

        if (toInsert.length > 0) {
          const { data: inserted } = await supabase.from('schedule_assignments').insert(toInsert).select();
          if (inserted) {
            currentAssignments = [...currentAssignments, ...(inserted as Assignment[])];
          }
        }
      }
    }

    setAssignments(currentAssignments);
  }, [year, month, daysInMonth, isAdmin]);

  const getAssignment = (employeeId: string, day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return assignments.find(a => a.employee_id === employeeId && a.date === dateStr);
  };

  const getShiftById = (id: string) => shiftTypes.find(s => s.id === id);

  const getEvent = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.find(e => e.date === dateStr);
  };

  return {
    shiftTypes,
    employees,
    assignments,
    events,
    daysInMonth,
    loadData,
    getAssignment,
    getShiftById,
    getEvent,
  };
}
