import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import {
  RefreshCw, AlertTriangle, Clock, MoreVertical, UserPlus,
  Coffee, Palmtree, Cross, Shield, HelpCircle, Siren,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

const REFETCH_INTERVAL = 300_000; // 5 min

const today = () => new Date().toISOString().split('T')[0];

const absenceLabels: Record<string, string> = {
  vacation: 'Ferien', sick: 'Krankheit', accident: 'Unfall',
  holiday: 'Feiertag', military: 'Militär', other: 'Andere',
};
const absenceColors: Record<string, string> = {
  vacation: 'hsl(210, 70%, 50%)', sick: 'hsl(30, 80%, 50%)', accident: 'hsl(0, 70%, 50%)',
  holiday: 'hsl(260, 50%, 55%)', military: 'hsl(0, 0%, 50%)', other: 'hsl(0, 0%, 60%)',
};
const absenceIcons: Record<string, typeof Palmtree> = {
  vacation: Palmtree, sick: Cross, accident: Siren,
  holiday: Coffee, military: Shield, other: HelpCircle,
};

type EmployeeStatus = 'clocked_in' | 'late' | 'upcoming' | 'absent' | 'done' | 'no_show';

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function formatClockTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' });
}

export function LiveOpsDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [lastRefresh, setLastRefresh] = useState(new Date());

  // Quick action state
  const [clockInDialog, setClockInDialog] = useState<{ empId: string; empName: string } | null>(null);
  const [absenceDialog, setAbsenceDialog] = useState<{ empId: string; empName: string } | null>(null);
  const [noteDialog, setNoteDialog] = useState<{ empId: string; empName: string } | null>(null);
  const [absenceType, setAbsenceType] = useState('vacation');
  const [absenceHours, setAbsenceHours] = useState('8');
  const [noteText, setNoteText] = useState('');

  // Fetch shift types
  const { data: shiftTypes = [] } = useQuery({
    queryKey: ['shift-types'],
    queryFn: async () => {
      const { data } = await supabase.from('shift_types').select('*').order('sort_order');
      return data || [];
    },
    refetchInterval: REFETCH_INTERVAL,
  });

  // Fetch today's schedule assignments with employee data
  const { data: assignments = [] } = useQuery({
    queryKey: ['schedule-assignments-today'],
    queryFn: async () => {
      const { data } = await supabase
        .from('schedule_assignments')
        .select('*, employees(id, first_name, last_name, position)')
        .eq('date', today());
      return data || [];
    },
    refetchInterval: REFETCH_INTERVAL,
  });

  // Fetch today's time entries
  const { data: timeEntries = [] } = useQuery({
    queryKey: ['time-entries-today'],
    queryFn: async () => {
      const { data } = await supabase
        .from('time_entries')
        .select('*')
        .eq('date', today());
      setLastRefresh(new Date());
      return data || [];
    },
    refetchInterval: REFETCH_INTERVAL,
  });

  // Fetch all active employees for reference
  const { data: allEmployees = [] } = useQuery({
    queryKey: ['employees-active'],
    queryFn: async () => {
      const { data } = await supabase.from('employees').select('*').eq('is_active', true);
      return data || [];
    },
    refetchInterval: REFETCH_INTERVAL,
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['schedule-assignments-today'] });
    queryClient.invalidateQueries({ queryKey: ['time-entries-today'] });
    toast.success('Daten aktualisiert');
  };

  // Build shift-grouped data
  const shiftGroupData = useMemo(() => {
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const shiftTypeMap = new Map(shiftTypes.map((st: any) => [st.id, st]));

    // Group assignments by shift type
    const groups = new Map<string, { shiftType: any; employees: any[] }>();

    for (const a of assignments) {
      const st = shiftTypeMap.get(a.shift_type_id);
      if (!st || !a.employees) continue;

      if (!groups.has(st.id)) {
        groups.set(st.id, { shiftType: st, employees: [] });
      }

      const emp = a.employees as any;
      const empTimeEntries = timeEntries.filter((te: any) => te.employee_id === emp.id);
      const clockedEntry = empTimeEntries.find((te: any) => te.clock_in && !te.absence_type);
      const absenceEntry = empTimeEntries.find((te: any) => te.absence_type);

      let status: EmployeeStatus = 'upcoming';
      let detail = '';

      if (absenceEntry) {
        status = 'absent';
        detail = absenceLabels[absenceEntry.absence_type] || absenceEntry.absence_type;
      } else if (clockedEntry) {
        status = 'clocked_in';
        detail = formatClockTime(clockedEntry.adjusted_clock_in || clockedEntry.clock_in);
      } else if (st.start_time) {
        const shiftStart = timeToMinutes(st.start_time);
        if (nowMinutes > shiftStart + 10) {
          status = 'late';
          detail = `${nowMinutes - shiftStart} Min. zu spät`;
        }
      }

      groups.get(st.id)!.employees.push({
        id: emp.id,
        name: `${emp.first_name} ${emp.last_name}`,
        position: emp.position || '',
        status,
        detail,
        clockIn: clockedEntry?.clock_in,
        isLate: status === 'late',
      });
    }

    return Array.from(groups.values());
  }, [assignments, timeEntries, shiftTypes]);

  // Absence entries (employees with absence today but NOT necessarily scheduled)
  const absenceEntries = useMemo(() => {
    return timeEntries
      .filter((te: any) => te.absence_type)
      .map((te: any) => {
        const emp = allEmployees.find((e: any) => e.id === te.employee_id);
        return {
          id: te.id,
          employeeId: te.employee_id,
          name: emp ? `${emp.first_name} ${emp.last_name}` : 'Unbekannt',
          type: te.absence_type as string,
          hours: te.absence_hours || 0,
        };
      });
  }, [timeEntries, allEmployees]);

  // KPI calculations
  const kpi = useMemo(() => {
    const allScheduledEmps = shiftGroupData.flatMap(g => g.employees);
    return {
      clockedIn: allScheduledEmps.filter(e => e.status === 'clocked_in').length,
      late: allScheduledEmps.filter(e => e.status === 'late').length,
      upcoming: allScheduledEmps.filter(e => e.status === 'upcoming').length,
      absent: absenceEntries.length,
      total: allScheduledEmps.length,
      notClockedIn: allScheduledEmps.filter(e => e.status === 'late' || e.status === 'upcoming').length,
    };
  }, [shiftGroupData, absenceEntries]);

  const showWarningBanner = kpi.total > 0 && kpi.notClockedIn / kpi.total > 0.3;

  // Quick actions
  const handleManualClockIn = async () => {
    if (!clockInDialog) return;
    const now = new Date();
    const { error } = await supabase.from('time_entries').insert([{
      employee_id: clockInDialog.empId,
      date: today(),
      clock_in: now.toISOString(),
      effective_hours: 0,
      notes: `Manuell eingestempelt durch Admin`,
    }]);
    if (error) { toast.error('Fehler beim Einstempeln'); return; }
    toast.success(`${clockInDialog.empName} manuell eingestempelt`);
    setClockInDialog(null);
    handleRefresh();
  };

  const handleLogAbsence = async () => {
    if (!absenceDialog) return;
    const { error } = await supabase.from('time_entries').insert([{
      employee_id: absenceDialog.empId,
      date: today(),
      absence_type: absenceType as any,
      absence_hours: parseFloat(absenceHours) || 0,
      effective_hours: 0,
    }]);
    if (error) { toast.error('Fehler beim Erfassen'); return; }
    toast.success('Absenz erfasst');
    setAbsenceDialog(null);
    setAbsenceType('vacation');
    setAbsenceHours('8');
    handleRefresh();
  };

  const handleAddNote = async () => {
    if (!noteDialog || !noteText.trim()) return;
    // Find existing entry or create one
    const existing = timeEntries.find((te: any) => te.employee_id === noteDialog.empId && !te.absence_type);
    if (existing) {
      await supabase.from('time_entries').update({
        notes: [existing.notes, noteText].filter(Boolean).join(' | '),
      }).eq('id', existing.id);
    } else {
      await supabase.from('time_entries').insert([{
        employee_id: noteDialog.empId,
        date: today(),
        effective_hours: 0,
        notes: noteText,
      }]);
    }
    toast.success('Notiz hinzugefügt');
    setNoteDialog(null);
    setNoteText('');
    handleRefresh();
  };

  const statusBadge = (status: EmployeeStatus, detail: string) => {
    switch (status) {
      case 'clocked_in':
        return <Badge className="bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]">🟢 {detail}</Badge>;
      case 'late':
        return <Badge variant="destructive">🔴 {detail}</Badge>;
      case 'upcoming':
        return <Badge className="bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))]">🟡 Kommt noch</Badge>;
      case 'absent':
        return <Badge variant="secondary">⚫ {detail}</Badge>;
    }
  };

  const todayFormatted = new Date().toLocaleDateString('de-CH', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <div className="space-y-4 pb-20 md:pb-4">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold">Live-Übersicht</h1>
          <p className="text-sm text-muted-foreground capitalize">{todayFormatted}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            Aktualisiert: {lastRefresh.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })}
          </span>
          <Button variant="ghost" size="icon" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Warning banner */}
      {showWarningBanner && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-destructive bg-destructive/10">
            <CardContent className="flex items-center gap-3 py-3">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <span className="text-sm font-medium">
                Achtung: {kpi.notClockedIn} Mitarbeiter noch nicht eingestempelt
              </span>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* KPI row */}
      <motion.div
        className="grid grid-cols-2 gap-3 sm:grid-cols-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card><CardContent className="flex items-center gap-3 py-4">
          <span className="text-2xl">🟢</span>
          <div><p className="text-2xl font-bold">{kpi.clockedIn}</p><p className="text-xs text-muted-foreground">Eingestempelt</p></div>
        </CardContent></Card>

        <Card><CardContent className="flex items-center gap-3 py-4">
          <span className="text-2xl">🔴</span>
          <div><p className="text-2xl font-bold">{kpi.late}</p><p className="text-xs text-muted-foreground">Fehlt / Zu spät</p></div>
        </CardContent></Card>

        <Card><CardContent className="flex items-center gap-3 py-4">
          <span className="text-2xl">🟡</span>
          <div><p className="text-2xl font-bold">{kpi.upcoming}</p><p className="text-xs text-muted-foreground">Kommt noch</p></div>
        </CardContent></Card>

        <Card><CardContent className="flex items-center gap-3 py-4">
          <span className="text-2xl">⚫</span>
          <div><p className="text-2xl font-bold">{kpi.absent}</p><p className="text-xs text-muted-foreground">Absenz</p></div>
        </CardContent></Card>
      </motion.div>

      {/* Shift groups */}
      {shiftGroupData.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Clock className="mx-auto mb-2 h-8 w-8" />
            <p className="text-sm">Heute keine Schichten geplant</p>
          </CardContent>
        </Card>
      ) : (
        shiftGroupData.map((group, gi) => (
          <motion.div
            key={group.shiftType.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + gi * 0.05 }}
          >
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div
                    className="h-4 w-4 rounded-full"
                    style={{ backgroundColor: group.shiftType.color }}
                  />
                  <CardTitle className="text-base">
                    {group.shiftType.name}
                    {group.shiftType.start_time && group.shiftType.end_time && (
                      <span className="ml-2 font-normal text-muted-foreground">
                        · {group.shiftType.start_time.substring(0, 5)}–{group.shiftType.end_time.substring(0, 5)}
                      </span>
                    )}
                  </CardTitle>
                  <Badge variant="secondary" className="ml-auto">{group.employees.length}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {group.employees.map((emp) => (
                  <div
                    key={emp.id}
                    className={`flex items-center justify-between rounded-lg border p-3 transition-colors ${
                      emp.isLate ? 'border-destructive bg-destructive/5' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {emp.isLate && <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />}
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{emp.name}</p>
                        {emp.position && (
                          <p className="text-xs text-muted-foreground truncate">{emp.position}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {statusBadge(emp.status, emp.detail)}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setClockInDialog({ empId: emp.id, empName: emp.name })}>
                            Manuell einstempeln
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setAbsenceDialog({ empId: emp.id, empName: emp.name })}>
                            Absenz erfassen
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setNoteDialog({ empId: emp.id, empName: emp.name })}>
                            Notiz hinzufügen
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        ))
      )}

      {/* Absence section */}
      {absenceEntries.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Abwesenheiten heute</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {absenceEntries.map((entry) => {
                const Icon = absenceIcons[entry.type] || HelpCircle;
                const color = absenceColors[entry.type] || 'hsl(0,0%,60%)';
                return (
                  <div key={entry.id} className="flex items-center gap-3 rounded-lg border p-3">
                    <Icon className="h-4 w-4 shrink-0" style={{ color }} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{entry.name}</p>
                    </div>
                    <Badge variant="outline" style={{ borderColor: color, color }}>
                      {absenceLabels[entry.type] || entry.type}
                    </Badge>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Manual Clock-In Dialog */}
      <Dialog open={!!clockInDialog} onOpenChange={() => setClockInDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manuell einstempeln</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {clockInDialog?.empName} jetzt einstempeln?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClockInDialog(null)}>Abbrechen</Button>
            <Button onClick={handleManualClockIn}>Einstempeln</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Absence Dialog */}
      <Dialog open={!!absenceDialog} onOpenChange={() => setAbsenceDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Absenz erfassen – {absenceDialog?.empName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Typ</Label>
              <Select value={absenceType} onValueChange={setAbsenceType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(absenceLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Stunden</Label>
              <Input type="number" value={absenceHours} onChange={e => setAbsenceHours(e.target.value)} min={0} step={0.5} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAbsenceDialog(null)}>Abbrechen</Button>
            <Button onClick={handleLogAbsence}>Speichern</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Note Dialog */}
      <Dialog open={!!noteDialog} onOpenChange={() => setNoteDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Notiz – {noteDialog?.empName}</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Interne Notiz eingeben..."
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteDialog(null)}>Abbrechen</Button>
            <Button onClick={handleAddNote} disabled={!noteText.trim()}>Speichern</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
