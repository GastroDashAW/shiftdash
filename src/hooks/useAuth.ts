import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [employeeId, setEmployeeId] = useState<string | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);

        if (currentUser) {
          // Check admin role
          const { data: roles } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', currentUser.id);
          setIsAdmin(roles?.some(r => r.role === 'admin') ?? false);

          // Get employee record
          const { data: emp } = await supabase
            .from('employees')
            .select('id')
            .eq('user_id', currentUser.id)
            .maybeSingle();
          setEmployeeId(emp?.id ?? null);
        } else {
          setIsAdmin(false);
          setEmployeeId(null);
        }
        setLoading(false);
      }
    );

    // Ensure initial session is checked
    supabase.auth.getSession().then(({ data: { session } }) => {
      // If onAuthStateChange hasn't fired yet, handle it here
      if (loading) {
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        if (currentUser) {
          Promise.all([
            supabase.from('user_roles').select('role').eq('user_id', currentUser.id),
            supabase.from('employees').select('id').eq('user_id', currentUser.id).maybeSingle(),
          ]).then(([rolesRes, empRes]) => {
            setIsAdmin(rolesRes.data?.some(r => r.role === 'admin') ?? false);
            setEmployeeId(empRes.data?.id ?? null);
            setLoading(false);
          });
        } else {
          setIsAdmin(false);
          setEmployeeId(null);
          setLoading(false);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName }, emailRedirectTo: window.location.origin },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return { user, isAdmin, loading, employeeId, signIn, signUp, signOut };
}
