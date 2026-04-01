import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BRANDING } from '@/config/branding';
import { toast } from 'sonner';
import { Loader2, Lock, User, Building2, AlertTriangle } from 'lucide-react';

type LicenseStatus = 'invalid' | 'used' | 'pending';

export default function Register() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const licenseId = searchParams.get('license');

  const [validating, setValidating] = useState(true);
  const [licenseStatus, setLicenseStatus] = useState<LicenseStatus>('invalid');
  const [licenseEmail, setLicenseEmail] = useState('');
  const [hasSession, setHasSession] = useState(false);
  const [sessionMismatch, setSessionMismatch] = useState(false);

  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let expectedEmail = '';

    const applySessionState = (session: Awaited<ReturnType<typeof supabase.auth.getSession>>['data']['session']) => {
      const sessionEmail = session?.user.email?.toLowerCase() || '';
      const matchesInvite = !!expectedEmail && sessionEmail === expectedEmail.toLowerCase();

      setHasSession(matchesInvite);
      setSessionMismatch(!!session && !matchesInvite);

      if (matchesInvite && session) {
        setLicenseEmail(session.user.email || expectedEmail);
        const meta = session.user.user_metadata;
        if (meta?.company_name) setCompanyName(meta.company_name);
        if (meta?.full_name) setFullName(meta.full_name);
      }
    };

    const init = async () => {
      if (!licenseId) {
        setLicenseStatus('invalid');
        setValidating(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('validate-license-registration', {
        body: { license_id: licenseId },
      });

      if (error || !data?.status) {
        setLicenseStatus('invalid');
        setValidating(false);
        return;
      }

      if (data.status === 'used') {
        setLicenseStatus('used');
        setValidating(false);
        return;
      }

      if (data.status !== 'pending' || !data.email) {
        setLicenseStatus('invalid');
        setValidating(false);
        return;
      }

      expectedEmail = data.email;
      setLicenseStatus('pending');
      setLicenseEmail(data.email);

      const { data: sessionData } = await supabase.auth.getSession();
      applySessionState(sessionData.session);
      setValidating(false);
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
          applySessionState(session);
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
        const { error: updateError } = await supabase.auth.updateUser({
          password,
          data: { full_name: fullName, company_name: companyName },
        });
        if (updateError) throw updateError;

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
        toast.error('Bitte öffne den Einladungslink aus der E-Mail.');
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

  if (!licenseId || licenseStatus === 'invalid') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md rounded-2xl border bg-card p-8 text-center shadow-lg">
          <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-destructive" />
          <h1 className="font-heading text-xl font-bold text-foreground">Ungültiger Einladungslink</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Dieser Einladungslink ist ungültig oder wurde bereits entfernt.
          </p>
          <Button className="mt-6" onClick={() => navigate('/login', { replace: true })}>
            Zur Anmeldung
          </Button>
        </div>
      </div>
    );
  }

  if (licenseStatus === 'used') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-md rounded-2xl border bg-card p-8 text-center shadow-lg">
          <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-destructive" />
          <h1 className="font-heading text-xl font-bold text-foreground">Einladung bereits verwendet</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Diese Einladung wurde bereits abgeschlossen. Bitte melde dich mit deinem Konto an.
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
        <div className="w-full max-w-md rounded-2xl border bg-card p-8 text-center shadow-lg">
          <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-primary" />
          <h1 className="font-heading text-lg font-bold text-foreground">Einladung per E-Mail öffnen</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {sessionMismatch
              ? 'Du bist aktuell mit einem anderen Konto angemeldet. Bitte melde dich ab oder öffne den Einladungslink in einem privaten Fenster.'
              : 'Bitte öffne den vollständigen Einladungslink aus der E-Mail. Erst dadurch wird deine Einladung sicher bestätigt.'}
          </p>
          <Button className="mt-6" onClick={() => navigate('/login', { replace: true })}>
            Zur Anmeldung
          </Button>
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
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">E-Mail</Label>
            <Input
              value={licenseEmail}
              disabled
              className="h-11 bg-muted"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reg-name" className="text-xs font-medium">Vollständiger Name</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="reg-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Max Muster"
                className="h-11 pl-9"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reg-company" className="text-xs font-medium">Firmenname</Label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="reg-company"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Restaurant Muster AG"
                className="h-11 pl-9"
                required
              />
            </div>
          </div>

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
                className="h-11 pl-9"
                required
                minLength={8}
              />
            </div>
          </div>

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
                className="h-11 pl-9"
                required
                minLength={8}
              />
            </div>
          </div>

          <Button type="submit" className="h-11 w-full text-sm font-semibold" disabled={loading}>
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
