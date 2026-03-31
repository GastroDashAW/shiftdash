import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { calculateEffectiveHours, checkRestTimeViolation, formatTime, formatHoursMinutes } from '@/lib/lgav';
import { logTimeEntryChange } from '@/lib/audit-log';
import { useScheduledShift, getAdjustedClockIn, checkOvertimeClockOut } from '@/hooks/useScheduledShift';
import { Clock, Play, Square, Coffee, AlertTriangle, UserPlus, ShieldCheck, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShiftReminderBanner } from '@/components/ShiftReminderBanner';
import { PushPermissionPrompt } from '@/components/PushPermissionPrompt';

type AbsenceType = 'vacation' | 'sick' | 'accident' | 'holiday' | 'military' | 'other';

export default function Dashboard() {
  const { user, employeeId, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [activeEntry, setActiveEntry] = useState<any>(null);
  const [todayEntries, setTodayEntries] = useState<any[]>([]);
  const [breakMinutes, setBreakMinutes] = useState('');
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [restWarning, setRestWarning] = useState<string | null>(null);
  const [absenceMode, setAbsenceMode] = useState(false);
  const [absenceType, setAbsenceType] = useState<AbsenceType>('vacation');
  const [absenceHours, setAbsenceHours] = useState('8');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [pendingVerifications, setPendingVerifications] = useState<any[]>([]);

  const currentEmployeeId = selectedEmployeeId || employeeId;
  const { shift: scheduledShift } = useScheduledShift(currentEmployeeId);

  // Update clock every second
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Load employees for admin
  useEffect(() => {
    if (isAdmin) {
      supabase.from('employees').select('*').eq('is_active', true)
        .then(({ data }) => {
          setEmployees(data || []);
          if (!selectedEmployeeId && data?.[0]) {
            setSelectedEmployeeId(data[0].id);
          }
        });
      // Load pending verifications for admin
      supabase
        .from('overtime_verifications')
        .select('*, employees(first_name, last_name), time_entries(date, clock_in, clock_out)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .then(({ data }) => setPendingVerifications(data || []));
    }
  }, [isAdmin]);

  // Load today's entries
  useEffect(() => {
    if (!currentEmployeeId) return;

    const today = new Date().toISOString().split('T')[0];
    
    const loadEntries = async () => {
      const { data } = await supabase
        .from('time_entries')
        .select('*')
        .eq('employee_id', currentEmployeeId)
        .eq('date', today)
        .order('created_at', { ascending: true });

      setTodayEntries(data || []);
      
      const active = data?.find(e => e.clock_in && !e.clock_out && !e.absence_type);
      setActiveEntry(active || null);
      setIsClockedIn(!!active);

      // Check rest time
      if (data && data.length > 0) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        
        const { data: prevEntries } = await supabase
          .from('time_entries')
          .select('clock_out')
          .eq('employee_id', currentEmployeeId)
          .eq('date', yesterdayStr)
          .not('clock_out', 'is', null)
          .order('clock_out', { ascending: false })
          .limit(1);

        if (prevEntries?.[0]?.clock_out && data[0]?.clock_in) {
          const check = checkRestTimeViolation(prevEntries[0].clock_out, data[0].clock_in);
          if (check.isViolation) {
            setRestWarning(`Ruhezeit nur ${check.restHours.toFixed(1)}h (min. 11h gemäss L-GAV)`);
          }
        }
      }
    };

    loadEntries();
  }, [currentEmployeeId]);

  const handleClockIn = async () => {
    if (!currentEmployeeId) {
      toast.error('Kein Mitarbeiterprofil zugeordnet');
      return;
    }

    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // Check shift-based adjustment
    const { adjustedTime, wasEarly } = getAdjustedClockIn(now, scheduledShift?.startTime || null);

    const { data, error } = await supabase
      .from('time_entries')
      .insert({
        employee_id: currentEmployeeId,
        date: today,
        clock_in: now.toISOString(),
        adjusted_clock_in: wasEarly ? adjustedTime.toISOString() : null,
        effective_hours: 0,
      })
      .select()
      .single();

    if (error) {
      toast.error('Fehler beim Einstempeln');
      return;
    }

    setActiveEntry(data);
    setIsClockedIn(true);
    setTodayEntries(prev => [...prev, data]);

    if (wasEarly && scheduledShift) {
      toast.info(
        `Eingestempelt um ${formatTime(now)} — Dienstbeginn erst um ${scheduledShift.startTime}. Effektive Zeit wird ab Dienstbeginn berechnet.`,
        { duration: 6000 }
      );
    } else {
      toast.success(`Eingestempelt um ${formatTime(now)}`);
    }
  };

  const handleClockOut = async () => {
    if (!activeEntry) return;

    const now = new Date();
    const breaks = parseInt(breakMinutes) || 0;

    // Use adjusted clock-in if available for effective hours calculation
    const effectiveStart = activeEntry.adjusted_clock_in || activeEntry.clock_in;
    const effective = calculateEffectiveHours(effectiveStart, now, breaks);

    // Check overtime against scheduled shift end
    const overtime = checkOvertimeClockOut(now, scheduledShift?.endTime || null);
    const requiresApproval = overtime.isOvertime && overtime.overtimeMinutes > 5; // 5 min tolerance

    const { error } = await supabase
      .from('time_entries')
      .update({
        clock_out: now.toISOString(),
        adjusted_clock_out: requiresApproval ? null : undefined,
        break_minutes: breaks,
        effective_hours: effective,
        requires_overtime_approval: requiresApproval,
      })
      .eq('id', activeEntry.id);

    if (error) {
      toast.error('Fehler beim Ausstempeln');
      return;
    }

    // Create overtime verification request if needed
    if (requiresApproval && scheduledShift?.endTime) {
      await supabase.from('overtime_verifications').insert({
        time_entry_id: activeEntry.id,
        employee_id: currentEmployeeId!,
        scheduled_end_time: scheduledShift.endTime,
        actual_clock_out: now.toISOString(),
        overtime_minutes: overtime.overtimeMinutes,
      });
    }

    setIsClockedIn(false);
    setActiveEntry(null);
    setBreakMinutes('');
    setTodayEntries(prev =>
      prev.map(e => e.id === activeEntry.id
        ? { ...e, clock_out: now.toISOString(), break_minutes: breaks, effective_hours: effective, requires_overtime_approval: requiresApproval }
        : e
      )
    );

    if (requiresApproval) {
      toast.warning(
        `Ausgestempelt um ${formatTime(now)} — ${overtime.overtimeMinutes} Min. Überzeit nach Dienstende (${scheduledShift?.endTime}). Verifizierung an Admin gesendet.`,
        { duration: 8000 }
      );
    } else {
      toast.success(`Ausgestempelt um ${formatTime(now)} — ${formatHoursMinutes(effective)} gearbeitet`);
    }
  };

  const handleAbsence = async () => {
    if (!currentEmployeeId) return;

    const today = new Date().toISOString().split('T')[0];
    const hours = parseFloat(absenceHours) || 0;

    const { error } = await supabase
      .from('time_entries')
      .insert({
        employee_id: currentEmployeeId,
        date: today,
        absence_type: absenceType,
        absence_hours: hours,
        effective_hours: 0,
      });

    if (error) {
      toast.error('Fehler beim Erfassen der Absenz');
      return;
    }

    setAbsenceMode(false);
    toast.success('Absenz erfasst');
    const { data } = await supabase
      .from('time_entries')
      .select('*')
      .eq('employee_id', currentEmployeeId)
      .eq('date', today)
      .order('created_at', { ascending: true });
    setTodayEntries(data || []);
  };

  const handleVerification = async (id: string, status: 'approved' | 'rejected') => {
    await supabase
      .from('overtime_verifications')
      .update({ status, reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
      .eq('id', id);

    setPendingVerifications(prev => prev.filter(v => v.id !== id));
    toast.success(status === 'approved' ? 'Überzeit genehmigt' : 'Überzeit abgelehnt');
  };

  const totalToday = todayEntries.reduce((sum, e) => sum + (e.effective_hours || 0), 0);

  const absenceLabels: Record<string, string> = {
    vacation: 'Ferien',
    sick: 'Krankheit',
    accident: 'Unfall',
    holiday: 'Feiertag',
    military: 'Militär',
    other: 'Andere',
  };

  return (
    <div className="space-y-4 pb-20 md:pb-4">
      <ShiftReminderBanner />
      {!isAdmin && <PushPermissionPrompt />}
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold">Dashboard</h1>
        {isAdmin && employees.length > 0 && (
          <Select value={selectedEmployeeId || ''} onValueChange={setSelectedEmployeeId}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Mitarbeiter wählen" />
            </SelectTrigger>
            <SelectContent>
              {employees.map(emp => (
                <SelectItem key={emp.id} value={emp.id}>
                  {emp.first_name} {emp.last_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* No employee warning */}
      {!currentEmployeeId && (
        <Card className="border-warning bg-warning/10">
          <CardContent className="flex flex-col items-center gap-3 py-6">
            <UserPlus className="h-8 w-8 text-warning" />
            <p className="text-sm font-medium text-center">
              Kein Mitarbeiterprofil vorhanden. Bitte zuerst einen Mitarbeiter erfassen.
            </p>
            {isAdmin && (
              <Button onClick={() => navigate('/employees')} className="gap-2">
                <UserPlus className="h-4 w-4" />
                Mitarbeiter erfassen
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Admin: Pending overtime verifications */}
      {isAdmin && pendingVerifications.length > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-destructive" />
              Überzeit-Verifizierungen ({pendingVerifications.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingVerifications.map(v => {
              const emp = v.employees as any;
              const entry = v.time_entries as any;
              return (
                <div key={v.id} className="flex items-center justify-between rounded-lg border p-3 bg-background">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      {emp?.first_name} {emp?.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {entry?.date} — Dienstende: {v.scheduled_end_time?.substring(0, 5)} · 
                      Ausgestempelt: {formatTime(v.actual_clock_out)} · 
                      <span className="font-medium text-destructive"> +{v.overtime_minutes} Min.</span>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleVerification(v.id, 'rejected')}>
                      Ablehnen
                    </Button>
                    <Button size="sm" onClick={() => handleVerification(v.id, 'approved')}>
                      Genehmigen
                    </Button>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <AnimatePresence>
        {restWarning && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <Card className="border-warning bg-warning/10">
              <CardContent className="flex items-center gap-3 py-3">
                <AlertTriangle className="h-5 w-5 text-warning" />
                <span className="text-sm font-medium">{restWarning}</span>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Clock display */}
      <Card>
        <CardContent className="flex flex-col items-center py-8">
          <div className="font-heading text-5xl font-bold tabular-nums tracking-tight">
            {currentTime.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {currentTime.toLocaleDateString('de-CH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </CardContent>
      </Card>

      {/* Scheduled shift info */}
      {scheduledShift && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex items-center gap-3 py-3">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <p className="text-sm font-medium">
                Geplanter Dienst: <span className="font-bold">{scheduledShift.shiftName}</span>
                {scheduledShift.startTime && scheduledShift.endTime && (
                  <span className="text-muted-foreground ml-2">
                    {scheduledShift.startTime} – {scheduledShift.endTime}
                  </span>
                )}
              </p>
              {scheduledShift.startTime && (
                <p className="text-xs text-muted-foreground">
                  Stempelzeit wird ab Dienstbeginn berechnet · Überzeit nach Dienstende erfordert Admin-Freigabe
                </p>
              )}
            </div>
            <Badge style={{ backgroundColor: scheduledShift.color, color: '#fff' }}>
              {scheduledShift.shortCode}
            </Badge>
          </CardContent>
        </Card>
      )}

      {/* Clock In/Out */}
      <div className="grid gap-3">
        {!isClockedIn ? (
          <Button
            size="lg"
            className="h-16 text-lg gap-3"
            onClick={handleClockIn}
            disabled={!currentEmployeeId}
          >
            <Play className="h-6 w-6" />
            Einstempeln
          </Button>
        ) : (
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="flex-1 space-y-2">
                <Label className="text-xs text-muted-foreground">Pause (Min.)</Label>
                <Input
                  type="number"
                  value={breakMinutes}
                  onChange={e => setBreakMinutes(e.target.value)}
                  placeholder="0"
                  min={0}
                />
              </div>
            </div>
            <Button
              size="lg"
              variant="destructive"
              className="h-16 w-full text-lg gap-3"
              onClick={handleClockOut}
            >
              <Square className="h-6 w-6" />
              Ausstempeln
            </Button>
            {activeEntry && (
              <p className="text-center text-sm text-muted-foreground animate-pulse-slow">
                <Clock className="mr-1 inline h-4 w-4" />
                Eingestempelt seit {formatTime(activeEntry.clock_in)}
                {activeEntry.adjusted_clock_in && (
                  <span className="block text-xs text-primary">
                    Effektiv ab {formatTime(activeEntry.adjusted_clock_in)} (Dienstbeginn)
                  </span>
                )}
              </p>
            )}
          </div>
        )}

        <Button
          variant="outline"
          onClick={() => setAbsenceMode(!absenceMode)}
          className="gap-2"
        >
          <Coffee className="h-4 w-4" />
          Absenz erfassen
        </Button>
      </div>

      {/* Absence form */}
      <AnimatePresence>
        {absenceMode && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Absenz erfassen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label>Typ</Label>
                  <Select value={absenceType} onValueChange={(v) => setAbsenceType(v as AbsenceType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(absenceLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Stunden</Label>
                  <Input
                    type="number"
                    value={absenceHours}
                    onChange={e => setAbsenceHours(e.target.value)}
                    min={0}
                    step={0.5}
                  />
                </div>
                <Button onClick={handleAbsence} className="w-full">
                  Absenz speichern
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Today's entries */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Heutige Einträge</CardTitle>
            <Badge variant="secondary">
              Total: {formatHoursMinutes(totalToday)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {todayEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Noch keine Einträge heute
            </p>
          ) : (
            <div className="space-y-2">
              {todayEntries.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
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
                        {entry.break_minutes > 0 && (
                          <span className="ml-2 text-muted-foreground">
                            ({entry.break_minutes} Min. Pause)
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="text-right flex items-center gap-2">
                    <span className="font-heading font-semibold">
                      {formatHoursMinutes(entry.effective_hours || 0)}
                    </span>
                    {entry.requires_overtime_approval && (
                      <Badge variant="destructive" className="text-xs">ÜZ</Badge>
                    )}
                    <Badge variant={entry.status === 'approved' ? 'default' : 'secondary'} className="text-xs">
                      {entry.status === 'approved' ? '✓' : entry.status === 'rejected' ? '✗' : '○'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
