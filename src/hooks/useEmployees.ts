import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Employee } from '@/types';
import { getPositionOrder } from '@/constants';

export function useEmployees() {
  return useQuery({
    queryKey: ['employees-active'],
    queryFn: async (): Promise<Employee[]> => {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('is_active', true);
      if (error) throw error;
      const employees = (data || []) as Employee[];
      return employees.sort((a, b) => {
        const ccCompare = (a.cost_center || '').localeCompare(b.cost_center || '');
        if (ccCompare !== 0) return ccCompare;
        return getPositionOrder(a.position || '') - getPositionOrder(b.position || '');
      });
    },
  });
}
