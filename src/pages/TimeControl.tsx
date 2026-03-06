import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { formatHoursMinutes, formatTime, calculateEffectiveHours } from '@/lib/lgav';
import { ClipboardCheck, Check, CheckCheck, Pencil, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';

interface TimeEntry {
  id: string;
  employee_id: string;
  date: string;
  clock_in: string | null;
  clock_out: string | null;
  adjusted_clock_in: string | null;
  adjusted_clock_out: string | null;
  break_minutes: number | null;
  effective_hours: number | null;
  absence_type: string | null;
  absence_hours: number | null;
  status: string | null;
  requires_overtime_approval: boolean | null;
  notes: string | null;
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
}

export default function TimeControl() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [editEntry, setEditEntry] = useState<TimeEntry | null>(null);
  const [editClockIn, setEditClockIn] = useState('');
  const [editClockOut, setEditClockOut] = useState('');
  const [editBreak, setEditBreak] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [loading, setLoading] = useState(false);

  // Load employees once
  useEffect(() => {
    supabase.from('employees').select('id, first_name, last_name').eq('is_active', true)
      .order('last_name')
      .then(({ data }) => setEmployees(data || []));
  }, []);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('time_entries')
      .select('*')
      .eq('date', selectedDate)
      .order('employee_id');
    setEntries((data as TimeEntry[]) || []);
    setLoading(false);
  }, [selectedDate]);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  const changeDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const openEdit = (entry: TimeEntry) => {
    setEditEntry(entry);
    // Extract HH:MM from ISO timestamps
    setEditClockIn(entry.clock_in ? new Date(entry.clock_in).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' }) : '');
    setEditClockOut(entry.clock_out ? new Date(entry.clock_out).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' }) : '');
    setEditBreak(String(entry.break_minutes || 0));
    setEditNotes(entry.notes || '');
  };

  const saveEdit = async () => {
    if (!editEntry) return;

    // Build updated timestamps from HH:MM input
    const dateStr = editEntry.date;
    let clockIn: string | null = editEntry.clock_in;
    let clockOut: string | null = editEntry.clock_out;

    if (editClockIn) {
      const [h, m] = editClockIn.split(':').map(Number);
      const d = new Date(`${dateStr}T00:00:00`);
      d.setHours(h, m, 0, 0);
      clockIn = d.toISOString();
    }
    if (editClockOut) {
      const [h, m] = editClockOut.split(':').map(Number);
      const d = new Date(`${dateStr}T00:00:00`);
      d.setHours(h, m, 0, 0);
      clockOut = d.toISOString();
    }

    const breaks = parseInt(editBreak) || 0;
    const effective = clockIn && clockOut ? calculateEffectiveHours(clockIn, clockOut, breaks) : 0;

    const { error } = await supabase
      .from('time_entries')
      .update({
        clock_in: clockIn,
        clock_out: clockOut,
        break_minutes: breaks,
        effective_hours: effective,
        notes: editNotes || null,
        adjusted_clock_in: null,
        adjusted_clock_out: null,
        requires_overtime_approval: false,
      })
      .eq('id', editEntry.id);

    if (error) {
      toast.error('Fehler beim Speichern');
      return;
    }

    toast.success('Eintrag korrigiert');
    setEditEntry(null);
    loadEntries();
  };

  const approveEntry = async (id: string) => {
    await supabase.from('time_entries').update({ status: 'approved' }).eq('id', id);
    setEntries(prev => prev.map(e => e.id === id ? { ...e, status: 'approved' } : e));
    toast.success('Freigegeben');
  };

  const approveAll = async () => {
    const pendingIds = entries.filter(e => e.status === 'pending').map(e => e.id);
    if (pendingIds.length === 0) return;

    await supabase.from('time_entries').update({ status: 'approved' }).in('id', pendingIds);
    setEntries(prev => prev.map(e => pendingIds.includes(e.id) ? { ...e, status: 'approved' } : e));
    toast.success(`${pendingIds.length} Einträge freigegeben`);
  };

  // Group entries by employee
  const grouped = employees.map(emp => ({
    employee: emp,
    entries: entries.filter(e => e.employee_id === emp.id),
  })).filter(g => g.entries.length > 0);

  const pendingCount = entries.filter(e => e.status === 'pending').length;
  const totalHours = entries.reduce((s, e) => s + (e.effective_hours || 0), 0);

  const dateObj = new Date(selectedDate + 'T12:00:00');
  const dateLabel = dateObj.toLocaleDateString('de-CH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  const absenceLabels: Record<string, string> = {
    vacation: 'Ferien', sick: 'Krankheit', accident: 'Unfall',
    holiday: 'Feiertag', military: 'Militär', other: 'Andere',
  };

  return (
    <div className="space-y-4 pb-20 md:pb-4">
      <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
        <ClipboardCheck className="h-6 w-6" />
        Tageskontrolle
      </h1>

      {/* Date navigation */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={() => changeDate(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 text-center">
          <Input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="mx-auto w-auto text-center font-medium"
          />
          <p className="text-xs text-muted-foreground mt-1">
            {dateLabel}
            {isToday && <Badge variant="secondary" className="ml-2 text-xs">Heute</Badge>}
          </p>
        </div>
        <Button variant="outline" size="icon" onClick={() => changeDate(1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Einträge</p>
            <p className="font-heading text-lg font-bold">{entries.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Total Stunden</p>
            <p className="font-heading text-lg font-bold">{formatHoursMinutes(totalHours)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-xs text-muted-foreground">Ausstehend</p>
            <p className={`font-heading text-lg font-bold ${pendingCount > 0 ? 'text-warning' : 'text-success'}`}>
              {pendingCount}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Approve all button */}
      {pendingCount > 0 && (
        <Button onClick={approveAll} className="w-full gap-2">
          <CheckCheck className="h-4 w-4" />
          Alle {pendingCount} Einträge freigeben
        </Button>
      )}

      {/* Entries grouped by employee */}
      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-8">Laden...</p>
      ) : grouped.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">Keine Einträge für diesen Tag</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {grouped.map(({ employee: emp, entries: empEntries }) => {
            const empTotal = empEntries.reduce((s, e) => s + (e.effective_hours || 0), 0);
            return (
              <Card key={emp.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold">
                      {emp.first_name} {emp.last_name}
                    </CardTitle>
                    <Badge variant="secondary">{formatHoursMinutes(empTotal)}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {empEntries.map(entry => (
                    <div
                      key={entry.id}
                      className={`flex items-center justify-between rounded-lg border p-3 ${
                        entry.requires_overtime_approval ? 'border-destructive/50 bg-destructive/5' : ''
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        {entry.absence_type ? (
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{absenceLabels[entry.absence_type] || entry.absence_type}</Badge>
                            <span className="text-sm">{entry.absence_hours}h</span>
                          </div>
                        ) : (
                          <div className="text-sm">
                            <span className="font-medium">{entry.clock_in ? formatTime(entry.clock_in) : '–'}</span>
                            {entry.adjusted_clock_in && (
                              <span className="text-xs text-primary ml-1">(eff. {formatTime(entry.adjusted_clock_in)})</span>
                            )}
                            <span className="text-muted-foreground"> — </span>
                            <span className="font-medium">{entry.clock_out ? formatTime(entry.clock_out) : '...'}</span>
                            {entry.break_minutes && entry.break_minutes > 0 && (
                              <span className="ml-2 text-muted-foreground text-xs">
                                ({entry.break_minutes}' Pause)
                              </span>
                            )}
                            {entry.requires_overtime_approval && (
                              <span className="ml-2 inline-flex items-center gap-1 text-xs text-destructive">
                                <AlertTriangle className="h-3 w-3" /> Überzeit
                              </span>
                            )}
                            {entry.notes && (
                              <p className="text-xs text-muted-foreground mt-1 truncate">{entry.notes}</p>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <span className="font-heading font-semibold text-sm mr-1">
                          {formatHoursMinutes(entry.effective_hours || 0)}
                        </span>
                        <Badge variant={
                          entry.status === 'approved' ? 'default' :
                          entry.status === 'rejected' ? 'destructive' : 'secondary'
                        } className="text-xs">
                          {entry.status === 'approved' ? '✓' : entry.status === 'rejected' ? '✗' : '○'}
                        </Badge>
                        {entry.status === 'pending' && (
                          <>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(entry)} title="Korrigieren">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-success" onClick={() => approveEntry(entry.id)} title="Freigeben">
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                        {entry.status === 'approved' && (
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(entry)} title="Korrigieren">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit dialog */}
      <Dialog open={!!editEntry} onOpenChange={(open) => !open && setEditEntry(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Stempelzeit korrigieren</DialogTitle>
          </DialogHeader>
          {editEntry && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {employees.find(e => e.id === editEntry.employee_id)?.first_name}{' '}
                {employees.find(e => e.id === editEntry.employee_id)?.last_name} — {' '}
                {new Date(editEntry.date + 'T12:00:00').toLocaleDateString('de-CH', { weekday: 'short', day: 'numeric', month: 'short' })}
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Einstempeln</Label>
                  <Input type="time" value={editClockIn} onChange={e => setEditClockIn(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Ausstempeln</Label>
                  <Input type="time" value={editClockOut} onChange={e => setEditClockOut(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Pause (Min.)</Label>
                <Input type="number" value={editBreak} onChange={e => setEditBreak(e.target.value)} min={0} />
              </div>
              <div className="space-y-2">
                <Label>Bemerkung</Label>
                <Input value={editNotes} onChange={e => setEditNotes(e.target.value)} placeholder="Korrekturgrund..." />
              </div>
              {editClockIn && editClockOut && (
                <p className="text-sm text-muted-foreground">
                  Effektiv: <span className="font-semibold text-foreground">
                    {formatHoursMinutes(calculateEffectiveHours(
                      new Date(`${editEntry.date}T${editClockIn}:00`),
                      new Date(`${editEntry.date}T${editClockOut}:00`),
                      parseInt(editBreak) || 0
                    ))}
                  </span>
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditEntry(null)}>Abbrechen</Button>
            <Button onClick={saveEdit}>Speichern</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
