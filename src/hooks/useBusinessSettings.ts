import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { BusinessSettings } from '@/types';

export function useBusinessSettings() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['business-settings'],
    queryFn: async (): Promise<BusinessSettings | null> => {
      const { data, error } = await supabase
        .from('business_settings')
        .select('*')
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as BusinessSettings | null;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Partial<BusinessSettings>) => {
      if (!query.data?.id) throw new Error('No settings to update');
      const { error } = await supabase
        .from('business_settings')
        .update(updates)
        .eq('id', query.data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-settings'] });
    },
  });

  return {
    settings: query.data,
    isLoading: query.isLoading,
    error: query.error,
    update: updateMutation.mutateAsync,
    refetch: query.refetch,
  };
}
