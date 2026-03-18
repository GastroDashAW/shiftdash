import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import shiftDashLogo from '@/assets/shiftdash-logo.png';
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
      <div className="flex flex-1 items-center justify-center gap-6 p-4 flex-col lg:flex-row">
      <div className="hidden lg:block">
        <DashWelcome />
      </div>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <img src={shiftDashLogo} alt={`${BRANDING.appName} Logo`} className="mx-auto h-20 w-20 object-contain" />
          <CardTitle className="font-heading text-2xl">
            {BRANDING.appName}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {BRANDING.tagline}
          </p>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
