import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Trash2, Loader2, ShieldAlert } from 'lucide-react';
import { GdprSection } from '@/components/settings/GdprSection';

export default function Settings() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleReset = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('reset-data');
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: 'Daten zurückgesetzt', description: 'Alle Tabellen wurden geleert.' });
      setOpen(false);
      navigate('/admin');
    } catch (err: any) {
      console.error('[Settings] handleReset', err);
      toast({ title: 'Fehler', description: 'Daten-Reset fehlgeschlagen. Bitte erneut versuchen.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-4">
      <h1 className="font-heading text-2xl font-bold">Einstellungen</h1>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <ShieldAlert className="h-5 w-5" />
            Gefahrenzone
          </CardTitle>
          <CardDescription>
            Aktionen, die nicht rückgängig gemacht werden können.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">Alle Daten zurücksetzen</p>
              <p className="text-xs text-muted-foreground">
                Löscht Mitarbeiter, Schichtpläne, Zeiteinträge und alle weiteren Daten. Diensttypen (Schichten) bleiben erhalten.
              </p>
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive" size="sm" className="gap-2">
                  <Trash2 className="h-4 w-4" />
                  Daten löschen
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Alle Daten wirklich löschen?</DialogTitle>
                  <DialogDescription>
                    Diese Aktion löscht sämtliche Mitarbeiter, Diensttypen, Schichtpläne, Zeiteinträge, Budgets und weitere Daten unwiderruflich. Benutzerkonten bleiben erhalten.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                    Abbrechen
                  </Button>
                  <Button variant="destructive" onClick={handleReset} disabled={loading} className="gap-2">
                    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Endgültig löschen
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
