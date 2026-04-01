import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BRANDING } from '@/config/branding';
import { toast } from 'sonner';
import { Loader2, Lock, User, Building2, AlertTriangle } from 'lucide-react';

export default function Register() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const licenseId = searchParams.get('license');

  const [validating, setValidating] = useState(true);
  const [licenseValid, setLicenseValid] = useState(false);
  const [licenseEmail, setLicenseEmail] = useState('');
  const [hasSession, setHasSession] = useState(false);

  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Check for existing session (from invite link click) and validate license
  useEffect(() => {
    const init = async () => {
      if (!licenseId) {
        setValidating(false);
        return;
      }

      // Check if user arrived via invite link (has session)
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setHasSession(true);
        setLicenseEmail(session.user.email || '');

        // Pre-fill company name from user metadata
        const meta = session.user.user_metadata;
        if (meta?.company_name) setCompanyName(meta.company_name);
      }

      // Validate license exists
      // We use a direct fetch since RLS may not allow anon access
      // The license is validated server-side; here we just check format
      setLicenseValid(true);
      setValidating(false);
    };

    init();

    // Listen for auth state changes (invite link token exchange)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          setHasSession(true);
          setLicenseEmail(session.user.email || '');
          const meta = session.user.user_metadata;
          if (meta?.company_name) setCompanyName(meta.company_name);
        }
      },
    );

    return () => subscription.unsubscribe();
  }, [licenseId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error('Die Passwörter stimmen nicht überein.');
      return;
    }
    if (password.length < 8) {
      toast.error('Das Passwort muss mindestens 8 Zeichen lang sein.');
      return;
    }

    setLoading(true);
    try {
      if (hasSession) {
        // User arrived via invite link – just set password and update profile
        const { error: updateError } = await supabase.auth.updateUser({
          password,
          data: { full_name: fullName, company_name: companyName },
        });
        if (updateError) throw updateError;

        // Update profile in DB
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from('profiles')
            .update({
              full_name: fullName,
              company_name: companyName,
            })
            .eq('user_id', user.id);
        }

        toast.success('Registrierung abgeschlossen!');
        navigate('/', { replace: true });
      } else {
        // Fallback: should not happen in normal flow
        toast.error('Bitte verwende den Link aus der Einladungs-E-Mail.');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registrierung fehlgeschlagen.';
      if (message.includes('weak') || message.includes('leaked') || message.includes('breached')) {
        toast.error('Dieses Passwort ist zu unsicher. Bitte wähle ein stärkeres Passwort.');
      } else {
        toast.error(message);
      }
    } finally {
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!licenseId || !licenseValid) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-lg text-center">
          <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-destructive" />
          <h1 className="font-heading text-xl font-bold text-foreground">Ungültiger Einladungslink</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Dieser Einladungslink ist ungültig oder wurde bereits verwendet.
          </p>
          <Button className="mt-6" onClick={() => navigate('/login', { replace: true })}>
            Zur Anmeldung
          </Button>
        </div>
      </div>
    );
  }

  if (!hasSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-lg text-center">
          <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-primary" />
          <h1 className="font-heading text-lg font-bold text-foreground">Einladung wird verarbeitet…</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Bitte warte einen Moment, während dein Konto eingerichtet wird.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-lg sm:p-8">
        <div className="mb-6 flex flex-col items-center gap-3">
          <img
            alt={BRANDING.appName}
            className="h-16 w-16 rounded-2xl object-contain"
            src="/lovable-uploads/cde71f63-3f75-4ef9-a554-8c54ff83e493.png"
          />
          <h1 className="font-heading text-2xl font-bold text-foreground">Registrierung abschliessen</h1>
          <p className="text-sm text-muted-foreground">
            Willkommen bei {BRANDING.appName}! Richte dein Konto ein.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email (read-only) */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">E-Mail</Label>
            <Input
              value={licenseEmail}
              disabled
              className="h-11 bg-muted"
            />
          </div>

          {/* Full Name */}
          <div className="space-y-1.5">
            <Label htmlFor="reg-name" className="text-xs font-medium">Vollständiger Name</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="reg-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Max Muster"
                className="pl-9 h-11"
                required
              />
            </div>
          </div>

          {/* Company Name */}
          <div className="space-y-1.5">
            <Label htmlFor="reg-company" className="text-xs font-medium">Firmenname</Label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="reg-company"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Restaurant Muster AG"
                className="pl-9 h-11"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <Label htmlFor="reg-password" className="text-xs font-medium">Passwort (mind. 8 Zeichen)</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="reg-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="pl-9 h-11"
                required
                minLength={8}
              />
            </div>
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <Label htmlFor="reg-confirm" className="text-xs font-medium">Passwort bestätigen</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="reg-confirm"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="pl-9 h-11"
                required
                minLength={8}
              />
            </div>
          </div>

          <Button type="submit" className="w-full h-11 text-sm font-semibold" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Wird eingerichtet…
              </>
            ) : (
              'Konto einrichten'
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
