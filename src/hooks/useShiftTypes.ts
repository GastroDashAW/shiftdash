import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ShiftType } from '@/types';

export function useShiftTypes() {
  return useQuery({
    queryKey: ['shift-types'],
    queryFn: async (): Promise<ShiftType[]> => {
      const { data, error } = await supabase
        .from('shift_types')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return (data || []) as ShiftType[];
    },
  });
}
