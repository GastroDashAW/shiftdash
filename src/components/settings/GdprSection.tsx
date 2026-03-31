import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Download, UserX, Loader2, ShieldCheck } from 'lucide-react';

export function GdprSection() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [exporting, setExporting] = useState(false);
  const [anonymizing, setAnonymizing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    supabase.from('employees').select('id, first_name, last_name, is_active')
      .order('last_name')
      .then(({ data }) => setEmployees(data || []));
  }, []);

  const handleExport = async () => {
    if (!selectedId) return;
    setExporting(true);
    try {
      const { data, error } = await supabase.functions.invoke('gdpr-employee', {
        body: { action: 'export', employee_id: selectedId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const emp = employees.find(e => e.id === selectedId);
      a.download = `DSGVO_Export_${emp?.last_name || 'mitarbeiter'}_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('DSGVO-Datenexport heruntergeladen');
    } catch (err: any) {
      console.error('[GDPR] export error', err);
      toast.error('Export fehlgeschlagen. Bitte erneut versuchen.');
    } finally {
      setExporting(false);
    }
  };

  const handleAnonymize = async () => {
    if (!selectedId) return;
    setAnonymizing(true);
    try {
      const { data, error } = await supabase.functions.invoke('gdpr-employee', {
        body: { action: 'anonymize', employee_id: selectedId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('Mitarbeiterdaten anonymisiert');
      setConfirmOpen(false);
      setSelectedId('');
      // Reload
      const { data: emps } = await supabase.from('employees').select('id, first_name, last_name, is_active').order('last_name');
      setEmployees(emps || []);
    } catch (err: any) {
      console.error('[GDPR] anonymize error', err);
      toast.error(err.message || 'Anonymisierung fehlgeschlagen.');
    } finally {
      setAnonymizing(false);
    }
  };

  const selectedEmp = employees.find(e => e.id === selectedId);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" />
          DSGVO / Datenschutz
        </CardTitle>
        <CardDescription>
          Recht auf Auskunft (Art. 15) und Recht auf Löschung (Art. 17 DSGVO).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Select value={selectedId} onValueChange={setSelectedId}>
          <SelectTrigger>
            <SelectValue placeholder="Mitarbeiter wählen" />
          </SelectTrigger>
          <SelectContent>
            {employees.map(e => (
              <SelectItem key={e.id} value={e.id}>
                {e.first_name} {e.last_name}
                {e.is_active === false ? ' (ausgetreten)' : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            className="gap-2 flex-1"
            disabled={!selectedId || exporting}
            onClick={handleExport}
          >
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Daten exportieren (Art. 15)
          </Button>

          <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
            <DialogTrigger asChild>
              <Button
                variant="destructive"
                className="gap-2 flex-1"
                disabled={!selectedId || selectedEmp?.is_active !== false}
                title={selectedEmp?.is_active !== false ? 'Nur ausgetretene Mitarbeiter können anonymisiert werden' : ''}
              >
                <UserX className="h-4 w-4" />
                Anonymisieren (Art. 17)
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Daten wirklich anonymisieren?</DialogTitle>
                <DialogDescription>
                  Alle personenbezogenen Daten von <strong>{selectedEmp?.first_name} {selectedEmp?.last_name}</strong> werden
                  unwiderruflich anonymisiert. Zeiterfassungsstunden bleiben für die Buchhaltung erhalten,
                  aber Name, Gehalt, Login und persönliche Notizen werden gelöscht.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={anonymizing}>
                  Abbrechen
                </Button>
                <Button variant="destructive" onClick={handleAnonymize} disabled={anonymizing} className="gap-2">
                  {anonymizing && <Loader2 className="h-4 w-4 animate-spin" />}
                  Endgültig anonymisieren
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {selectedId && selectedEmp?.is_active !== false && (
          <p className="text-xs text-muted-foreground">
            Hinweis: Anonymisierung ist nur für ausgetretene Mitarbeiter möglich. Bitte zuerst als ausgetreten markieren.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
