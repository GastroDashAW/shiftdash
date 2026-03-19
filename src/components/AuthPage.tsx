import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import loginBg from '@/assets/login-bg.png';
import { BRANDING } from '@/config/branding';
import { StagingBanner } from '@/components/StagingBanner';
import { DashWelcome } from '@/components/dash/DashWelcome';
import { Lock, Mail } from 'lucide-react';

export function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    if (error) toast.error('Login fehlgeschlagen: ' + error.message);
    setLoading(false);
  };

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <StagingBanner />
      <div className="flex flex-1 flex-col lg:flex-row">
        {/* Left – hero image (desktop only) */}
        <motion.div
          className="relative hidden lg:flex lg:w-[55%] items-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          <img
            src={loginBg}
            alt="Restaurant-Team bei der Zeiterfassung"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/30 to-transparent" />
          <div className="relative z-10 p-10 pb-14 max-w-lg">
            <motion.h2
              className="font-heading text-4xl font-bold text-white leading-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              Personalplanung,{' '}
              <span className="text-primary-foreground/90">die mitdenkt.</span>
            </motion.h2>
            <motion.p
              className="mt-3 text-sm text-white/70"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.6 }}
            >
              Zeiterfassung, Dienstplanung & L-GAV-Konformität für die Schweizer Gastronomie.
            </motion.p>
          </div>
        </motion.div>

        {/* Right – login panel */}
        <div className="flex flex-1 flex-col lg:w-[45%]">
          {/* Mobile hero strip */}
          <div className="relative h-44 overflow-hidden lg:hidden">
            <img
              src={loginBg}
              alt="Restaurant"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-background" />
            <motion.div
              className="relative z-10 flex h-full flex-col items-center justify-end pb-6"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <img
                alt={BRANDING.appName}
                className="h-16 w-16 rounded-2xl object-contain shadow-lg"
                src="/lovable-uploads/cde71f63-3f75-4ef9-a554-8c54ff83e493.png"
              />
            </motion.div>
          </div>

          {/* Content area */}
          <div className="flex flex-1 flex-col items-center justify-center px-6 py-8 sm:px-10 lg:px-16">
            {/* Desktop logo + branding */}
            <motion.div
              className="mb-8 hidden flex-col items-center gap-3 lg:flex"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <img
                alt={BRANDING.appName}
                className="h-20 w-20 rounded-2xl object-contain"
                src="/lovable-uploads/cde71f63-3f75-4ef9-a554-8c54ff83e493.png"
              />
              <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
                {BRANDING.appName}
              </h1>
              <p className="text-sm text-muted-foreground">{BRANDING.tagline}</p>
            </motion.div>

            {/* Mobile branding */}
            <motion.div
              className="mb-6 flex flex-col items-center gap-1 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15, duration: 0.4 }}
            >
              <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
                {BRANDING.appName}
              </h1>
              <p className="text-xs text-muted-foreground">{BRANDING.tagline}</p>
            </motion.div>

            {/* Login form card */}
            <motion.div
              className="w-full max-w-sm"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <div className="rounded-xl border bg-card p-5 shadow-sm sm:p-6">
                <h2 className="mb-4 text-center font-heading text-lg font-semibold text-foreground">
                  Willkommen zurück
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs font-medium">
                      E-Mail
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="max@restaurant.ch"
                        className="pl-9 h-11"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="password" className="text-xs font-medium">
                      Passwort
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="pl-9 h-11"
                        required
                        minLength={6}
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-11 text-sm font-semibold"
                    disabled={loading}
                  >
                    {loading ? 'Laden...' : 'Anmelden'}
                  </Button>
                </form>
              </div>
            </motion.div>

            {/* Dash assistant */}
            <motion.div
              className="mt-6 w-full max-w-sm"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              <DashWelcome />
            </motion.div>

            {/* Footer */}
            <p className="mt-8 text-center text-[11px] text-muted-foreground/50">
              Personalmanagement & Zeiterfassung für die Schweizer Gastronomie
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
