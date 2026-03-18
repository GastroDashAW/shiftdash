import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import shiftDashLogo from '@/assets/shiftdash-logo.png';
import loginBg from '@/assets/login-bg.png';
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
          className="relative hidden lg:flex lg:w-1/2 flex-col items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}>
          
          <img
            src={loginBg}
            alt="Restaurant"
            className="absolute inset-0 h-full w-full object-cover" />
          
          <div className="absolute inset-0 bg-black/50" />
          {/* Centered branding */}
          <motion.div
            className="relative z-10 flex flex-col items-center text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}>
            
            
            <h1 className="font-heading text-5xl font-bold tracking-tight text-white drop-shadow-lg">
              {BRANDING.appName}
            </h1>
            <p className="mt-3 max-w-xs text-lg text-white/80">
              {BRANDING.tagline}
            </p>
            <p className="mt-1.5 text-sm text-white/50">
              Personalmanagement & Zeiterfassung für die Schweizer Gastronomie
            </p>
          </motion.div>
        </motion.div>

        {/* Right side */}
        <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-10 lg:w-1/2 lg:px-12">
          {/* Large logo – desktop */}
          <motion.div
            className="hidden lg:flex flex-col items-center gap-3"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}>
            
            <img alt={BRANDING.appName} className="h-28 w-28 object-fill" src="/lovable-uploads/cde71f63-3f75-4ef9-a554-8c54ff83e493.png" />
            
            <p className="text-sm text-muted-foreground">{BRANDING.tagline}</p>
          </motion.div>

          {/* Mobile-only logo */}
          <motion.div
            className="flex flex-col items-center gap-2 lg:hidden"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}>
            
            <img src={shiftDashLogo} alt={BRANDING.appName} className="h-20 w-20 object-contain" />
            <h1 className="font-heading text-2xl font-bold">{BRANDING.appName}</h1>
            <p className="text-xs text-muted-foreground">{BRANDING.tagline}</p>
          </motion.div>

          {/* Login form */}
          <motion.div
            className="w-full max-w-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-Mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="max@restaurant.ch"
                  required />
                
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
                  minLength={6} />
                
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Laden...' : 'Anmelden'}
              </Button>
            </form>
          </motion.div>

          {/* Dash – compact */}
          <motion.div
            className="w-full max-w-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}>
            
            <DashWelcome />
          </motion.div>
        </div>
      </div>
    </div>);

}