import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [employeeId, setEmployeeId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadUserData = async (currentUser: User | null) => {
      if (!currentUser) {
        if (mounted) {
          setUser(null);
          setIsAdmin(false);
          setEmployeeId(null);
          setLoading(false);
        }
        return;
      }

      if (mounted) setUser(currentUser);

      try {
        const [rolesRes, empRes] = await Promise.all([
          supabase.from('user_roles').select('role').eq('user_id', currentUser.id),
          supabase.from('employees').select('id').eq('user_id', currentUser.id).maybeSingle(),
        ]);

        if (mounted) {
          setIsAdmin(rolesRes.data?.some(r => r.role === 'admin') ?? false);
          setEmployeeId(empRes.data?.id ?? null);
          setLoading(false);
        }
      } catch (err) {
        console.error('Auth data load error:', err);
        if (mounted) setLoading(false);
      }
    };

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      loadUserData(session?.user ?? null);
    }).catch(() => {
      if (mounted) setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        loadUserData(session?.user ?? null);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
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
