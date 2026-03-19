import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { MonthlySummary } from '@/types';

export function useMonthlySummary({ employeeId, month, year }: { employeeId: string; month: number; year: number }) {
  return useQuery({
    queryKey: ['monthly-summary', employeeId, year, month],
    queryFn: async (): Promise<MonthlySummary | null> => {
      const { data, error } = await supabase
        .from('monthly_summaries')
        .select('*')
        .eq('employee_id', employeeId)
        .eq('year', year)
        .eq('month', month)
        .maybeSingle();
      if (error) throw error;
      return data as MonthlySummary | null;
    },
    enabled: !!employeeId,
  });
}
