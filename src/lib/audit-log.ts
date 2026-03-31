import { supabase } from '@/integrations/supabase/client';

interface AuditLogEntry {
  time_entry_id: string;
  employee_id: string;
  change_type: 'create' | 'update' | 'approve' | 'reject' | 'correct';
  old_values?: Record<string, any> | null;
  new_values?: Record<string, any> | null;
  reason?: string;
}

export async function logTimeEntryChange(entry: AuditLogEntry) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from('time_entry_audit_log' as any).insert({
    time_entry_id: entry.time_entry_id,
    employee_id: entry.employee_id,
    changed_by: user.id,
    change_type: entry.change_type,
    old_values: entry.old_values || null,
    new_values: entry.new_values || null,
    reason: entry.reason || null,
  });
}
