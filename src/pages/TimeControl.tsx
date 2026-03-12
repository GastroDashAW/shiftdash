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
import { ClipboardCheck, Check, CheckCheck, Pencil, ChevronLeft, ChevronRight, AlertTriangle, CalendarClock } from 'lucide-react';

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

interface ShiftInfo {
  name: string;
  short_code: string;
  start_time: string | null;
  end_time: string | null;
  color: string;
  break_minutes: number;
}

export default function TimeControl() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [shifts, setShifts] = useState<Record<string, ShiftInfo>>({});
  const [editEntry, setEditEntry] = useState<TimeEntry | null>(null);
  const [editAdjClockIn, setEditAdjClockIn] = useState('');
  const [editAdjClockOut, setEditAdjClockOut] = useState('');
  const [editBreak, setEditBreak] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.from('employees').select('id, first_name, last_name').eq('is_active', true)
      .order('last_name')
      .then(({ data }) => setEmployees(data || []));
  }, []);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    const [entriesRes, assignmentsRes] = await Promise.all([
      supabase
        .from('time_entries')
        .select('*')
        .eq('date', selectedDate)
        .order('employee_id'),
      supabase
        .from('schedule_assignments')
        .select('employee_id, shift_types(name, short_code, start_time, end_time, color, break_minutes)')
        .eq('date', selectedDate),
    ]);

    setEntries((entriesRes.data as TimeEntry[]) || []);

    // Build shift lookup by employee_id
    const shiftMap: Record<string, ShiftInfo> = {};
    (assignmentsRes.data || []).forEach((a: any) => {
      if (a.shift_types) {
        shiftMap[a.employee_id] = {
          name: a.shift_types.name,
          short_code: a.shift_types.short_code,
          start_time: a.shift_types.start_time ? a.shift_types.start_time.substring(0, 5) : null,
          end_time: a.shift_types.end_time ? a.shift_types.end_time.substring(0, 5) : null,
          color: a.shift_types.color,
          break_minutes: a.shift_types.break_minutes || 0,
        };
      }
    });
    setShifts(shiftMap);
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
    const shift = shifts[entry.employee_id];

    // Show adjusted times if set, otherwise suggest shift times
    if (entry.adjusted_clock_in) {
      setEditAdjClockIn(new Date(entry.adjusted_clock_in).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' }));
    } else if (shift?.start_time) {
      setEditAdjClockIn(shift.start_time);
    } else if (entry.clock_in) {
      setEditAdjClockIn(new Date(entry.clock_in).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' }));
    } else {
      setEditAdjClockIn('');
    }

    if (entry.adjusted_clock_out) {
      setEditAdjClockOut(new Date(entry.adjusted_clock_out).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' }));
    } else if (shift?.end_time) {
      setEditAdjClockOut(shift.end_time);
    } else if (entry.clock_out) {
      setEditAdjClockOut(new Date(entry.clock_out).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' }));
    } else {
      setEditAdjClockOut('');
    }

    // Auto-suggest break from shift type if entry has no break set
    const shiftBreak = shift?.break_minutes || 0;
    setEditBreak(String(entry.break_minutes ?? shiftBreak));
    setEditNotes(entry.notes || '');
  };

  const applyShiftTimes = () => {
    if (!editEntry) return;
    const shift = shifts[editEntry.employee_id];
    if (shift?.start_time) setEditAdjClockIn(shift.start_time);
    if (shift?.end_time) setEditAdjClockOut(shift.end_time);
  };

  const saveEdit = async () => {
    if (!editEntry) return;

    const dateStr = editEntry.date;
    let adjClockIn: string | null = null;
    let adjClockOut: string | null = null;

    if (editAdjClockIn) {
      const [h, m] = editAdjClockIn.split(':').map(Number);
      const d = new Date(`${dateStr}T00:00:00`);
      d.setHours(h, m, 0, 0);
      adjClockIn = d.toISOString();
    }
    if (editAdjClockOut) {
      const [h, m] = editAdjClockOut.split(':').map(Number);
      const d = new Date(`${dateStr}T00:00:00`);
      d.setHours(h, m, 0, 0);
      adjClockOut = d.toISOString();
    }

    const breaks = parseInt(editBreak) || 0;
    // Effective hours based on adjusted times (override)
    const effectiveStart = adjClockIn || editEntry.clock_in;
    const effectiveEnd = adjClockOut || editEntry.clock_out;
    const effective = effectiveStart && effectiveEnd ? calculateEffectiveHours(effectiveStart, effectiveEnd, breaks) : 0;

    const { error } = await supabase
      .from('time_entries')
      .update({
        adjusted_clock_in: adjClockIn,
        adjusted_clock_out: adjClockOut,
        break_minutes: breaks,
        effective_hours: effective,
        notes: editNotes || null,
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

  const grouped = employees.map(emp => ({
    employee: emp,
    entries: entries.filter(e => e.employee_id === emp.id),
    shift: shifts[emp.id] || null,
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

  // Helper: display time for an entry (original + adjusted)
  const renderEntryTimes = (entry: TimeEntry) => {
    const origIn = entry.clock_in ? formatTime(entry.clock_in) : '–';
    const origOut = entry.clock_out ? formatTime(entry.clock_out) : '...';
    const hasAdjIn = !!entry.adjusted_clock_in;
    const hasAdjOut = !!entry.adjusted_clock_out;
    const adjIn = hasAdjIn ? formatTime(entry.adjusted_clock_in!) : null;
    const adjOut = hasAdjOut ? formatTime(entry.adjusted_clock_out!) : null;

    return (
      <div className="text-sm space-y-0.5">
        <div>
          <span className={`font-medium ${hasAdjIn ? 'line-through text-muted-foreground text-xs' : ''}`}>{origIn}</span>
          {hasAdjIn && <span className="font-medium text-primary ml-1">{adjIn}</span>}
          <span className="text-muted-foreground"> — </span>
          <span className={`font-medium ${hasAdjOut ? 'line-through text-muted-foreground text-xs' : ''}`}>{origOut}</span>
          {hasAdjOut && <span className="font-medium text-primary ml-1">{adjOut}</span>}
          {entry.break_minutes && entry.break_minutes > 0 && (
            <span className="ml-2 text-muted-foreground text-xs">({entry.break_minutes}' Pause)</span>
          )}
        </div>
        {entry.requires_overtime_approval && (
          <span className="inline-flex items-center gap-1 text-xs text-destructive">
            <AlertTriangle className="h-3 w-3" /> Überzeit
          </span>
        )}
        {entry.notes && (
          <p className="text-xs text-muted-foreground truncate">{entry.notes}</p>
        )}
      </div>
    );
  };

  // Edit dialog: compute preview effective hours
  const editPreviewEffective = () => {
    if (!editEntry || !editAdjClockIn || !editAdjClockOut) return null;
    try {
      return calculateEffectiveHours(
        new Date(`${editEntry.date}T${editAdjClockIn}:00`),
        new Date(`${editEntry.date}T${editAdjClockOut}:00`),
        parseInt(editBreak) || 0
      );
    } catch { return null; }
  };

  const editShift = editEntry ? shifts[editEntry.employee_id] : null;

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

      {pendingCount > 0 && (
        <Button onClick={approveAll} className="w-full gap-2">
          <CheckCheck className="h-4 w-4" />
          Alle {pendingCount} Einträge freigeben
        </Button>
      )}

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
          {grouped.map(({ employee: emp, entries: empEntries, shift }) => {
            const empTotal = empEntries.reduce((s, e) => s + (e.effective_hours || 0), 0);
            return (
              <Card key={emp.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-sm font-semibold">
                        {emp.first_name} {emp.last_name}
                      </CardTitle>
                      {shift && (
                        <Badge style={{ backgroundColor: shift.color, color: '#fff' }} className="text-xs">
                          {shift.short_code} {shift.start_time}–{shift.end_time}
                        </Badge>
                      )}
                    </div>
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
                        ) : renderEntryTimes(entry)}
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
                        {(entry.status === 'pending' || entry.status === 'approved') && (
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(entry)} title="Korrigieren">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {entry.status === 'pending' && (
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-success" onClick={() => approveEntry(entry.id)} title="Freigeben">
                            <Check className="h-3.5 w-3.5" />
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

              {/* Original stamp times - read only */}
              <div className="rounded-lg border bg-muted/50 p-3 space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Effektive Stempelzeit (Original)</p>
                <p className="text-sm font-medium">
                  {editEntry.clock_in ? formatTime(editEntry.clock_in) : '–'} — {editEntry.clock_out ? formatTime(editEntry.clock_out) : '...'}
                </p>
              </div>

              {/* Shift suggestion */}
              {editShift && (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CalendarClock className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-xs font-medium text-primary">Dienst: {editShift.name}</p>
                      <p className="text-sm font-semibold">{editShift.start_time} – {editShift.end_time}</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={applyShiftTimes}>
                    Übernehmen
                  </Button>
                </div>
              )}

              {/* Adjusted times - editable */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Anrechenbare Startzeit</Label>
                  <Input type="time" value={editAdjClockIn} onChange={e => setEditAdjClockIn(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Anrechenbare Endzeit</Label>
                  <Input type="time" value={editAdjClockOut} onChange={e => setEditAdjClockOut(e.target.value)} />
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
              {(() => {
                const eff = editPreviewEffective();
                return eff !== null ? (
                  <p className="text-sm text-muted-foreground">
                    Anrechenbar: <span className="font-semibold text-foreground">{formatHoursMinutes(eff)}</span>
                  </p>
                ) : null;
              })()}
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
