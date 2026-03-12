import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Archive, Download, Trash2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

interface ArchiveEntry {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  assignments: any[];
  created_at: string;
}

interface ScheduleArchivePanelProps {
  currentAssignments: { employee_id: string; date: string; shift_type_id: string }[];
  currentStartDate: string;
  currentEndDate: string;
  onLoadArchive: (assignments: { employee_id: string; date: string; shift_type_id: string }[]) => void;
}

export function ScheduleArchivePanel({ currentAssignments, currentStartDate, currentEndDate, onLoadArchive }: ScheduleArchivePanelProps) {
  const [archives, setArchives] = useState<ArchiveEntry[]>([]);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [archiveName, setArchiveName] = useState('');
  const [saving, setSaving] = useState(false);

  const loadArchives = async () => {
    const { data } = await supabase
      .from('schedule_archives')
      .select('*')
      .order('created_at', { ascending: false });
    setArchives((data as unknown as ArchiveEntry[]) || []);
  };

  useEffect(() => { loadArchives(); }, []);

  const handleSave = async () => {
    if (!archiveName.trim()) { toast.error('Bitte einen Namen eingeben'); return; }
    setSaving(true);
    const { error } = await supabase.from('schedule_archives').insert({
      name: archiveName.trim(),
      start_date: currentStartDate,
      end_date: currentEndDate,
      assignments: currentAssignments.map(a => ({
        employee_id: a.employee_id,
        date: a.date,
        shift_type_id: a.shift_type_id,
      })),
    } as any);
    if (error) {
      toast.error('Fehler beim Speichern: ' + error.message);
    } else {
      toast.success('Dienstplan archiviert');
      setSaveDialogOpen(false);
      setArchiveName('');
      loadArchives();
    }
    setSaving(false);
  };

  const handleLoad = async (archive: ArchiveEntry) => {
    // Delete current assignments in the archive's date range, then insert archived ones
    await supabase.from('schedule_assignments').delete()
      .gte('date', archive.start_date)
      .lte('date', archive.end_date);

    const assignments = archive.assignments as { employee_id: string; date: string; shift_type_id: string }[];
    if (assignments.length > 0) {
      for (let i = 0; i < assignments.length; i += 500) {
        const chunk = assignments.slice(i, i + 500);
        await supabase.from('schedule_assignments').insert(chunk);
      }
    }

    toast.success(`Archiv "${archive.name}" geladen`);
    onLoadArchive(assignments);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('schedule_archives').delete().eq('id', id);
    toast.success('Archiv gelöscht');
    loadArchives();
  };

  const formatDate = (d: string) => {
    try { return format(new Date(d), 'dd.MM.yyyy'); } catch { return d; }
  };

  return (
    <Card className="print:hidden">
      <CardHeader className="py-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Archive className="h-4 w-4" />
            Dienstplan-Archiv
          </CardTitle>
          <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1.5">
                <Save className="h-3.5 w-3.5" />
                Aktuellen Plan speichern
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader>
                <DialogTitle>Dienstplan archivieren</DialogTitle>
                <DialogDescription>
                  Speichere den aktuellen Plan ({formatDate(currentStartDate)} – {formatDate(currentEndDate)}) als Archiv.
                </DialogDescription>
              </DialogHeader>
              <Input
                placeholder="z.B. KW 12-13 März 2026"
                value={archiveName}
                onChange={e => setArchiveName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSave()}
              />
              <DialogFooter>
                <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>Abbrechen</Button>
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? 'Speichern...' : 'Archivieren'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      {archives.length > 0 && (
        <CardContent className="pt-0 pb-3">
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {archives.map(a => (
              <div key={a.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{a.name}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {formatDate(a.start_date)} – {formatDate(a.end_date)} · {(a.assignments as any[]).length} Einträge · {formatDate(a.created_at)}
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-2">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="outline" className="h-7 gap-1 text-xs">
                        <Download className="h-3 w-3" />
                        Laden
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Archiv laden?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Der aktuelle Dienstplan im Zeitraum {formatDate(a.start_date)} – {formatDate(a.end_date)} wird durch das Archiv "{a.name}" ersetzt.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleLoad(a)}>Laden</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Archiv löschen?</AlertDialogTitle>
                        <AlertDialogDescription>"{a.name}" wird unwiderruflich gelöscht.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(a.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Löschen</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
