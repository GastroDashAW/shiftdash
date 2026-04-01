import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Mail, Building2, Send, Copy, CheckCircle2 } from 'lucide-react';

export default function AdminInvite() {
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastInviteLink, setLastInviteLink] = useState('');

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLastInviteLink('');

    try {
      const { data, error } = await supabase.functions.invoke('send-license-invite', {
        body: { email, company_name: companyName },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(`Einladung an ${email} wurde gesendet!`);
      setLastInviteLink(data.invite_link || '');
      setEmail('');
      setCompanyName('');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Einladung konnte nicht gesendet werden.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(lastInviteLink);
    toast.success('Link kopiert!');
  };

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-foreground">Lizenz-Einladung</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sende eine Einladung an einen neuen Lizenznehmer. Der Empfänger erhält eine E-Mail mit einem Registrierungslink.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Neue Einladung</CardTitle>
          <CardDescription>Gib die Daten des neuen Lizenznehmers ein.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSendInvite} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="invite-email" className="text-xs font-medium">E-Mail-Adresse</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="invite-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="inhaber@restaurant.ch"
                  className="pl-9 h-11"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="invite-company" className="text-xs font-medium">Firmenname</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="invite-company"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Restaurant Muster AG"
                  className="pl-9 h-11"
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Wird gesendet…</>
              ) : (
                <><Send className="h-4 w-4" /> Einladung senden</>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {lastInviteLink && (
        <Card className="border-success/30 bg-success/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-success" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">Einladung erfolgreich gesendet!</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Der Empfänger erhält eine E-Mail. Alternativ kannst du den Link manuell teilen:
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <code className="flex-1 truncate rounded bg-muted px-2 py-1 text-xs">
                    {lastInviteLink}
                  </code>
                  <Button variant="outline" size="sm" onClick={copyLink}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
