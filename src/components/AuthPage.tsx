import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { BRANDING } from '@/config/branding';

import { DashChatWidget } from '@/components/dash/DashChatWidget';
import { CalendarDays, Users, Clock, TrendingUp, ArrowRight, X, Lock, Mail, User, ArrowLeft, Loader2 } from 'lucide-react';
import dashAvatar from '@/assets/dash-avatar.png';
import loginBg from '@/assets/login-bg.png';
import { supabase } from '@/integrations/supabase/client';

const FEATURES = [
  {
    icon: CalendarDays,
    title: 'Dienstplan & Schichtplanung',
    desc: 'Plane Schichten per Drag & Drop, erkenne L-GAV Verstösse automatisch und drucke den Monatsplan.',
    img: 'https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=800&q=80',
    fallback: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800&q=80',
  },
  {
    icon: Users,
    title: 'Mitarbeiter & Logins',
    desc: 'Erfasse Mitarbeiter mit Pensum, Lohn und Verfügbarkeit. Erstelle Logins direkt in der App.',
    img: 'https://images.unsplash.com/photo-1559329007-40df8a9345d8?w=800&q=80',
    fallback: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&q=80',
  },
  {
    icon: Clock,
    title: 'Zeiterfassung & Validierung',
    desc: 'Mitarbeiter stempeln per Handy ein und aus. Du validierst den Monatsrapport mit einem Klick.',
    img: 'https://images.unsplash.com/photo-1556745757-8d76bdb6984b?w=800&q=80',
    fallback: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800&q=80',
  },
  {
    icon: TrendingUp,
    title: 'Budget & Wareneinsatz',
    desc: 'Vergleiche Personalkosten mit dem Tagesumsatz. Erkenne sofort wo die Marge unter Druck gerät.',
    img: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&q=80',
    fallback: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80',
  },
];

const DASH_QUESTIONS = [
  'Was kann ShiftDash?',
  'Wie funktioniert der Dienstplan?',
  'Für wen ist ShiftDash gedacht?',
  'Wie stempeln Mitarbeiter ein?',
];

function AuthModal({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState('');
  const { signIn, signUp } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (mode === 'login') {
      const { error } = await signIn(email, password);
      if (error) {
        if (error.message?.includes('Invalid login credentials')) {
          toast.error('E-Mail oder Passwort ist falsch.');
        } else if (error.message?.includes('Email not confirmed')) {
          toast.error('Bitte bestätige zuerst deine E-Mail-Adresse.');
        } else {
          toast.error('Anmeldung fehlgeschlagen. Bitte versuche es erneut.');
        }
      }
    } else if (mode === 'register') {
      const { error } = await signUp(email, password, fullName);
      if (error) {
        if (error.message?.includes('already registered') || error.message?.includes('already been registered')) {
          toast.error('Diese E-Mail-Adresse ist bereits registriert.');
        } else if (error.message?.includes('password') && error.message?.includes('characters')) {
          toast.error('Das Passwort muss mindestens 6 Zeichen lang sein.');
        } else if (error.message?.includes('weak') || error.message?.includes('leaked') || error.message?.includes('breached')) {
          toast.error('Dieses Passwort ist zu unsicher. Bitte wähle ein stärkeres Passwort.');
        } else {
          toast.error(`Registrierung fehlgeschlagen: ${error.message}`);
        }
      } else {
        toast.success('Registrierung erfolgreich! Bitte prüfe dein E-Mail-Postfach und bestätige deine Adresse.');
      }
    }
    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResetError('');
    setResetSent(false);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      setResetError('Passwort-Reset fehlgeschlagen. Bitte erneut versuchen.');
    } else {
      setResetSent(true);
    }
    setLoading(false);
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="relative w-full max-w-md rounded-2xl border bg-card p-6 shadow-xl sm:p-8"
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 20 }}
        transition={{ duration: 0.3 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-6 flex flex-col items-center gap-3">
          <img
            alt={BRANDING.appName}
            className="h-16 w-16 rounded-2xl object-contain"
            src="/lovable-uploads/cde71f63-3f75-4ef9-a554-8c54ff83e493.png"
          />
          <h2 className="font-heading text-2xl font-bold text-foreground">{BRANDING.appName}</h2>
          <p className="text-sm text-muted-foreground">{BRANDING.tagline}</p>
        </div>

        {mode === 'forgot' ? (
          /* Forgot Password View */
          <div>
            <button
              onClick={() => { setMode('login'); setResetSent(false); setResetError(''); }}
              className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Zurück zur Anmeldung
            </button>

            <h3 className="font-heading text-lg font-semibold text-foreground">Passwort zurücksetzen</h3>
            <p className="mt-1 mb-5 text-sm text-muted-foreground">
              Gib deine E-Mail-Adresse ein. Du erhältst einen Link zum Zurücksetzen.
            </p>

            {resetSent ? (
              <div className="rounded-lg bg-success/10 border border-success/20 p-4 text-sm text-success">
                E-Mail wurde gesendet! Prüfe dein Postfach.
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="reset-email" className="text-xs font-medium">E-Mail</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="reset-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="max@restaurant.ch" className="pl-9 h-11" required />
                  </div>
                </div>
                {resetError && (
                  <p className="text-sm text-destructive">{resetError}</p>
                )}
                <Button type="submit" className="w-full h-11 text-sm font-semibold" disabled={loading}>
                  {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Senden...</> : 'Link senden'}
                </Button>
              </form>
            )}
          </div>
        ) : (
          /* Login / Register View */
          <>
            <div className="mb-5 flex rounded-lg border bg-muted p-1">
              <button
                onClick={() => setMode('login')}
                className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${mode === 'login' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Anmelden
              </button>
              <button
                onClick={() => setMode('register')}
                className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${mode === 'register' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                Registrieren
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'register' && (
                <div className="space-y-1.5">
                  <Label htmlFor="fullName" className="text-xs font-medium">Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="fullName" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Max Muster" className="pl-9 h-11" required />
                  </div>
                </div>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-medium">E-Mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="max@restaurant.ch" className="pl-9 h-11" required />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-medium">Passwort</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="pl-9 h-11" required minLength={6} />
                </div>
              </div>
              {mode === 'login' && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setMode('forgot')}
                    className="text-xs text-accent hover:underline"
                  >
                    Passwort vergessen?
                  </button>
                </div>
              )}
              <Button type="submit" className="w-full h-11 text-sm font-semibold" disabled={loading}>
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Laden...</> : mode === 'login' ? 'Anmelden' : 'Registrieren'}
              </Button>
            </form>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

export function AuthPage() {
  const [showAuth, setShowAuth] = useState(false);

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      

      {/* Top Bar */}
      <header className="sticky top-0 z-40 border-b bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <img
              src="/lovable-uploads/cde71f63-3f75-4ef9-a554-8c54ff83e493.png"
              alt={BRANDING.appName}
              className="h-8 w-8 rounded-lg object-contain"
            />
            <span className="font-heading text-lg font-bold text-foreground">{BRANDING.appName}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="rounded-full border-accent text-accent hover:bg-accent hover:text-accent-foreground text-xs">
              Preise &amp; Abos
            </Button>
            <Button size="sm" className="rounded-full text-xs" onClick={() => setShowAuth(true)}>
              Anmelden
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="relative h-[50vh] min-h-[340px] sm:h-[56vh] md:h-[60vh]">
          <img
            src={loginBg}
            alt="Gastronomie-Team"
            className="absolute inset-0 h-full w-full object-cover"
            crossOrigin="anonymous"
            loading="eager"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1400&q=80';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/75 via-foreground/30 to-transparent" />

          <motion.div
            className="absolute bottom-0 left-0 z-10 p-6 sm:p-10 md:p-14 max-w-2xl"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15 }}
          >
            <img
              src="/lovable-uploads/cde71f63-3f75-4ef9-a554-8c54ff83e493.png"
              alt={BRANDING.appName}
              className="mb-4 h-16 w-16 rounded-2xl object-contain shadow-lg sm:h-20 sm:w-20"
            />
            <h1 className="font-heading text-3xl font-bold leading-tight text-primary-foreground sm:text-4xl md:text-5xl" style={{ lineHeight: 1.1 }}>
              {BRANDING.appName}
            </h1>
            <p className="mt-2 text-sm text-primary-foreground/80 sm:text-base md:text-lg">
              Die smarte Personalplanung für die Schweizer Gastronomie.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Feature Tiles */}
      <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 sm:py-14 md:py-16">
        <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 md:gap-6">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                className="group relative overflow-hidden rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md"
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
              >
                <div className="relative h-36 overflow-hidden">
                  <img
                    src={f.img}
                    alt={f.title}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    crossOrigin="anonymous"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = f.fallback;
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/30 to-transparent" />
                </div>
                <div className="p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-heading text-base font-semibold text-foreground">{f.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
                    </div>
                    <ArrowRight className="mt-1 h-4 w-4 flex-shrink-0 text-muted-foreground/40 transition-all duration-300 group-hover:translate-x-1 group-hover:text-primary" />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Dash Welcome Card */}
      <section className="mx-auto w-full max-w-7xl px-4 pb-10 sm:px-6 sm:pb-14">
        <motion.div
          className="rounded-xl border bg-card p-5 shadow-sm sm:p-6"
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
            <img
              src={dashAvatar}
              alt="Dash Assistent"
              className="h-16 w-16 flex-shrink-0 rounded-2xl object-contain sm:h-20 sm:w-20"
            />
            <div className="flex-1 min-w-0">
              <h3 className="font-heading text-lg font-bold text-foreground">Hallo! Ich bin Dash.</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Dein Assistent für ShiftDash – ich helfe dir beim Einstieg und beantworte alle Fragen.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {DASH_QUESTIONS.map(q => (
                  <button
                    key={q}
                    className="rounded-full border bg-background px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground active:scale-[0.97]"
                    onClick={() => {
                      // Open DashChatWidget with pre-filled question
                      // For now, trigger a simple alert – the floating widget handles the chat
                      toast.info(`Klicke auf den Dash-Button unten rechts und stelle die Frage: "${q}"`);
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-card/50 py-6">
        <p className="text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} {BRANDING.appName} – Entwickelt für die Schweizer Gastronomie
        </p>
      </footer>

      {/* Auth Modal */}
      <AnimatePresence>
        {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      </AnimatePresence>

      {/* Dash Chat Widget on landing */}
      <DashChatWidget />
    </div>
  );
}
