import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMemo } from 'react';
import type { Assignment, DailyRevenue, MonthlyBudget, Employee, ShiftType, BusinessSettings } from '@/types';
import { getEndOfMonthString } from '@/lib/date';
import { WEEKDAY_LABELS, DEFAULT_DAY_WEIGHTS } from '@/constants';

interface UseBudgetParams {
  month: number;
  year: number;
}

interface DailyCostsMap {
  [day: number]: number;
}

export function useBudget({ month, year }: UseBudgetParams) {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = getEndOfMonthString(year, month);

  const budgetQuery = useQuery({
    queryKey: ['monthly-budget', year, month],
    queryFn: async (): Promise<MonthlyBudget | null> => {
      const { data, error } = await supabase
        .from('monthly_budgets')
        .select('*')
        .eq('year', year)
        .eq('month', month)
        .maybeSingle();
      if (error) throw error;
      return data as MonthlyBudget | null;
    },
  });

  const employeesQuery = useQuery({
    queryKey: ['budget-employees'],
    queryFn: async (): Promise<Employee[]> => {
      const { data, error } = await supabase.from('employees').select('*').eq('is_active', true);
      if (error) throw error;
      return (data || []) as Employee[];
    },
  });

  const shiftTypesQuery = useQuery({
    queryKey: ['budget-shift-types'],
    queryFn: async (): Promise<ShiftType[]> => {
      const { data, error } = await supabase.from('shift_types').select('*');
      if (error) throw error;
      return (data || []) as ShiftType[];
    },
  });

  const settingsQuery = useQuery({
    queryKey: ['budget-business-settings'],
    queryFn: async (): Promise<BusinessSettings | null> => {
      const { data, error } = await supabase.from('business_settings').select('*').limit(1).maybeSingle();
      if (error) throw error;
      return data as BusinessSettings | null;
    },
  });

  const assignmentsQuery = useQuery({
    queryKey: ['budget-assignments', year, month],
    queryFn: async (): Promise<Assignment[]> => {
      const { data, error } = await supabase
        .from('schedule_assignments')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate);
      if (error) throw error;
      return (data || []) as Assignment[];
    },
  });

  const revenuesQuery = useQuery({
    queryKey: ['budget-revenues', year, month],
    queryFn: async (): Promise<DailyRevenue[]> => {
      const { data, error } = await supabase
        .from('daily_revenues')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate);
      if (error) throw error;
      return (data || []) as DailyRevenue[];
    },
  });

  const daysInMonth = new Date(year, month, 0).getDate();
  const socialChargesPercent = settingsQuery.data?.social_charges_percent || 15;

  const dailyCosts = useMemo<DailyCostsMap>(() => {
    const result: DailyCostsMap = {};
    const shifts = shiftTypesQuery.data || [];
    const emps = employeesQuery.data || [];
    const assigns = assignmentsQuery.data || [];
    const shiftMap = Object.fromEntries(shifts.map(s => [s.id, s]));
    const empMap = Object.fromEntries(emps.map(e => [e.id, e]));

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayAssignments = assigns.filter(a => a.date === dateStr);
      let cost = 0;
      for (const a of dayAssignments) {
        const shift = shiftMap[a.shift_type_id];
        const emp = empMap[a.employee_id];
        if (!shift || !emp || !emp.hourly_rate) continue;
        if (shift.start_time && shift.end_time) {
          const [sh, sm] = shift.start_time.split(':').map(Number);
          const [eh, em] = shift.end_time.split(':').map(Number);
          const hours = (eh + em / 60) - (sh + sm / 60);
          cost += hours * emp.hourly_rate * (1 + socialChargesPercent / 100);
        }
      }
      result[d] = cost;
    }
    return result;
  }, [assignmentsQuery.data, shiftTypesQuery.data, employeesQuery.data, daysInMonth, year, month, socialChargesPercent]);

  return {
    budget: budgetQuery.data,
    employees: employeesQuery.data || [],
    shiftTypes: shiftTypesQuery.data || [],
    settings: settingsQuery.data,
    assignments: assignmentsQuery.data || [],
    revenues: revenuesQuery.data || [],
    dailyCosts,
    daysInMonth,
    socialChargesPercent,
    isLoading: budgetQuery.isLoading || employeesQuery.isLoading || shiftTypesQuery.isLoading
      || assignmentsQuery.isLoading || revenuesQuery.isLoading || settingsQuery.isLoading,
    refetchBudget: budgetQuery.refetch,
    refetchRevenues: revenuesQuery.refetch,
  };
}
