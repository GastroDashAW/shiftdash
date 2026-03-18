import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import shiftDashLogo from '@/assets/shiftdash-logo.png';
import loginBg from '@/assets/login-bg.jpg';
import { BRANDING } from '@/config/branding';
import { StagingBanner } from '@/components/StagingBanner';
import { DashWelcome } from '@/components/dash/DashWelcome';

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
    <div className="flex min-h-screen flex-col bg-background">
      <StagingBanner />
      <div className="flex flex-1 flex-col lg:flex-row">
        {/* Left side – hero image */}
        <motion.div
          className="relative hidden lg:flex lg:w-1/2 items-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          <img
            src={loginBg}
            alt="Restaurant Küche"
            className="absolute inset-0 h-full w-full object-cover"
          />
          {/* Dark overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-black/20" />
          {/* Text overlay */}
          <motion.div
            className="relative z-10 p-10 pb-14"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <img src={shiftDashLogo} alt={BRANDING.appName} className="h-10 w-10 object-contain" />
              <span className="font-heading text-2xl font-bold text-white">{BRANDING.appName}</span>
            </div>
            <p className="max-w-md text-lg font-light text-white/90">
              {BRANDING.tagline}
            </p>
            <p className="mt-2 text-sm text-white/60">
              Personalmanagement & Zeiterfassung für die Schweizer Gastronomie
            </p>
          </motion.div>
        </motion.div>

        {/* Right side – login + Dash */}
        <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-10 lg:w-1/2 lg:px-12">
          {/* Mobile-only logo */}
          <motion.div
            className="flex items-center gap-3 lg:hidden"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <img src={shiftDashLogo} alt={BRANDING.appName} className="h-14 w-14 object-contain" />
            <div>
              <h1 className="font-heading text-xl font-bold">{BRANDING.appName}</h1>
              <p className="text-xs text-muted-foreground">{BRANDING.tagline}</p>
            </div>
          </motion.div>

          {/* Login form */}
          <motion.div
            className="w-full max-w-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <div className="mb-6 hidden lg:block">
              <h2 className="font-heading text-2xl font-bold">Willkommen zurück</h2>
              <p className="mt-1 text-sm text-muted-foreground">Melde dich an, um fortzufahren</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-Mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="max@restaurant.ch"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Passwort</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Laden...' : 'Anmelden'}
              </Button>
            </form>
          </motion.div>

          {/* Dash welcome */}
          <motion.div
            className="w-full max-w-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <DashWelcome />
          </motion.div>
        </div>
      </div>
    </div>
  );
}
