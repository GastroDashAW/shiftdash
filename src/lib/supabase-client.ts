import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { backendPublishableKey, backendUrl } from '@/lib/backend-config';

export const supabase = createClient<Database>(backendUrl, backendPublishableKey, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
});
