import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { CalendarDays, Send, Check, X, Clock, Plus } from 'lucide-react';
import { addDays, differenceInCalendarDays, format, eachDayOfInterval, isBefore, startOfDay } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import type { DateRange } from 'react-day-picker';

type RequestType = 'vacation' | 'day_off' | 'company_holiday';

interface LeaveRequest {
  id: string;
  employee_id: string;
  request_type: RequestType;
  start_date: string;
  end_date: string;
  days_count: number;
  status: string;
  admin_note: string | null;
  reviewed_at: string | null;
  created_at: string;
  employees?: { first_name: string; last_name: string };
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  cost_center: string;
}

const STATUS_MAP: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Ausstehend', variant: 'outline' },
  approved: { label: 'Genehmigt', variant: 'default' },
  rejected: { label: 'Abgelehnt', variant: 'destructive' },
};

export default function LeaveRequests() {
  const { isAdmin, employeeId } = useAuth();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [requestType, setRequestType] = useState<RequestType>('vacation');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [adminNote, setAdminNote] = useState('');
  const [actionId, setActionId] = useState<string | null>(null);

  // Admin manual entry state
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [manualDialogOpen, setManualDialogOpen] = useState(false);
  const [manualEmployeeId, setManualEmployeeId] = useState('');
  const [manualType, setManualType] = useState<RequestType>('vacation');
  const [manualRange, setManualRange] = useState<DateRange | undefined>();
  const [manualNote, setManualNote] = useState('');
  const [manualSubmitting, setManualSubmitting] = useState(false);

  const minDaysAhead = requestType === 'vacation' ? 30 : 14;
  const minDate = addDays(startOfDay(new Date()), minDaysAhead);

  const loadRequests = async () => {
    let query = supabase
      .from('leave_requests')
      .select('*, employees(first_name, last_name)')
      .order('created_at', { ascending: false });

    if (!isAdmin && employeeId) {
      query = query.eq('employee_id', employeeId);
    }

    const { data } = await query;
    setRequests((data as any[]) || []);
  };

  const loadEmployees = async () => {
    const { data } = await supabase
      .from('employees')
      .select('id, first_name, last_name, cost_center')
      .eq('is_active', true)
      .order('last_name');
    setAllEmployees(data || []);
  };

  useEffect(() => {
    loadRequests();
    if (isAdmin) loadEmployees();
  }, [isAdmin, employeeId]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('leave_requests_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leave_requests' }, () => {
        loadRequests();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isAdmin, employeeId]);

  const daysCount = dateRange?.from && dateRange?.to
    ? differenceInCalendarDays(dateRange.to, dateRange.from) + 1
    : 0;

  const manualDaysCount = manualRange?.from && manualRange?.to
    ? differenceInCalendarDays(manualRange.to, manualRange.from) + 1
    : 0;

  const handleSubmit = async () => {
    if (!employeeId) { toast.error('Kein Mitarbeiterprofil verknüpft'); return; }
    if (!dateRange?.from || !dateRange?.to) { toast.error('Bitte Zeitraum wählen'); return; }

    if (isBefore(dateRange.from, minDate)) {
      toast.error(`${requestType === 'vacation' ? 'Ferien' : 'Frei-Tage'} müssen mindestens ${minDaysAhead} Tage im Voraus beantragt werden`);
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from('leave_requests').insert({
      employee_id: employeeId,
      request_type: requestType,
      start_date: format(dateRange.from, 'yyyy-MM-dd'),
      end_date: format(dateRange.to, 'yyyy-MM-dd'),
      days_count: daysCount,
    });

    if (error) {
      toast.error('Fehler beim Senden: ' + error.message);
    } else {
      toast.success('Antrag gesendet');
      setDateRange(undefined);
    }
    setSubmitting(false);
  };

  const handleManualSubmit = async () => {
    if (manualType !== 'company_holiday' && !manualEmployeeId) { toast.error('Bitte Mitarbeiter wählen'); return; }
    if (!manualRange?.from || !manualRange?.to) { toast.error('Bitte Zeitraum wählen'); return; }

    setManualSubmitting(true);
    const userId = (await supabase.auth.getUser()).data.user?.id;

    // For company holidays: apply to ALL active employees
    const targetEmployeeIds = manualType === 'company_holiday'
      ? allEmployees.map(e => e.id)
      : [manualEmployeeId];

    // Insert leave requests for all targets
    for (const empId of targetEmployeeIds) {
      await supabase.from('leave_requests').insert({
        employee_id: empId,
        request_type: manualType,
        start_date: format(manualRange.from!, 'yyyy-MM-dd'),
        end_date: format(manualRange.to!, 'yyyy-MM-dd'),
        days_count: manualDaysCount,
        status: 'approved',
        admin_note: manualNote.trim() || (manualType === 'company_holiday' ? 'Betriebsferien' : null),
        reviewed_by: userId,
        reviewed_at: new Date().toISOString(),
      });
    }

    // Create schedule assignments
    const shiftTypeCode = manualType === 'vacation' ? 'V' : 'X';
    const { data: shiftType } = await supabase
      .from('shift_types')
      .select('id')
      .eq('short_code', shiftTypeCode)
      .single();

    if (shiftType) {
      const days = eachDayOfInterval({ start: manualRange.from, end: manualRange.to });
      for (const empId of targetEmployeeIds) {
        const assignments = days.map(day => ({
          employee_id: empId,
          date: format(day, 'yyyy-MM-dd'),
          shift_type_id: shiftType.id,
        }));

        for (const a of assignments) {
          await supabase.from('schedule_assignments').delete()
            .eq('employee_id', a.employee_id)
            .eq('date', a.date);
        }

        await supabase.from('schedule_assignments').insert(assignments);
      }
    }

    const countLabel = manualType === 'company_holiday' ? ` für ${targetEmployeeIds.length} Mitarbeiter` : '';
    toast.success(`Abwesenheit eingetragen${countLabel} und im Dienstplan übernommen`);
    setManualDialogOpen(false);
    setManualEmployeeId('');
    setManualRange(undefined);
    setManualNote('');
    setManualSubmitting(false);
  };

  const handleDecision = async (requestId: string, decision: 'approved' | 'rejected') => {
    const note = adminNote.trim();
    const { error } = await supabase
      .from('leave_requests')
      .update({
        status: decision,
        admin_note: note || null,
        reviewed_by: (await supabase.auth.getUser()).data.user?.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    if (error) {
      toast.error('Fehler: ' + error.message);
      return;
    }

    // If approved, create schedule assignments
    if (decision === 'approved') {
      const req = requests.find(r => r.id === requestId);
      if (req) {
        const shiftTypeCode = req.request_type === 'vacation' ? 'V' : 'X';
        const { data: shiftType } = await supabase
          .from('shift_types')
          .select('id')
          .eq('short_code', shiftTypeCode)
          .single();

        if (shiftType) {
          const days = eachDayOfInterval({
            start: new Date(req.start_date),
            end: new Date(req.end_date),
          });

          const assignments = days.map(day => ({
            employee_id: req.employee_id,
            date: format(day, 'yyyy-MM-dd'),
            shift_type_id: shiftType.id,
          }));

          for (const a of assignments) {
            await supabase
              .from('schedule_assignments')
              .delete()
              .eq('employee_id', a.employee_id)
              .eq('date', a.date);
          }

          const { error: insertError } = await supabase
            .from('schedule_assignments')
            .insert(assignments);

          if (insertError) {
            toast.error('Dienstplan-Eintrag fehlgeschlagen: ' + insertError.message);
          } else {
            toast.success('Im Dienstplan eingetragen');
          }
        }
      }
    }

    toast.success(decision === 'approved' ? 'Genehmigt' : 'Abgelehnt');
    setAdminNote('');
    setActionId(null);
  };

  const myRequests = requests.filter(r => r.employee_id === employeeId);
  const pendingForAdmin = requests.filter(r => r.status === 'pending');

  return (
    <div className="space-y-6 pb-20 md:pb-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-xl md:text-2xl font-bold flex items-center gap-2">
          <CalendarDays className="h-5 w-5 md:h-6 md:w-6" />
          Abwesenheitsanträge
        </h1>

        {/* Admin: manual entry button */}
        {isAdmin && (
          <Dialog open={manualDialogOpen} onOpenChange={setManualDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Manuell eintragen
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Abwesenheit manuell eintragen</DialogTitle>
                <DialogDescription>
                  Trage eine Abwesenheit direkt für einen Mitarbeiter ein. Der Eintrag wird sofort genehmigt und im Dienstplan übernommen.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Mitarbeiter *</label>
                    <Select value={manualEmployeeId} onValueChange={setManualEmployeeId}>
                      <SelectTrigger><SelectValue placeholder="Wählen" /></SelectTrigger>
                      <SelectContent>
                        {allEmployees.map(emp => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.last_name}, {emp.first_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Typ *</label>
                    <Select value={manualType} onValueChange={(v) => setManualType(v as RequestType)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vacation">Ferien</SelectItem>
                        <SelectItem value="day_off">Frei</SelectItem>
                        <SelectItem value="company_holiday">Betriebsferien</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Zeitraum *</label>
                  <Calendar
                    mode="range"
                    selected={manualRange}
                    onSelect={setManualRange}
                    locale={de}
                    numberOfMonths={2}
                    className={cn("p-3 pointer-events-auto rounded-md border mt-1.5")}
                  />
                  {manualDaysCount > 0 && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {manualDaysCount} {manualDaysCount === 1 ? 'Tag' : 'Tage'}: {manualRange?.from && format(manualRange.from, 'dd.MM.yyyy')} – {manualRange?.to && format(manualRange.to, 'dd.MM.yyyy')}
                    </p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Bemerkung</label>
                  <Textarea
                    placeholder="Optional"
                    value={manualNote}
                    onChange={e => setManualNote(e.target.value)}
                    rows={2}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setManualDialogOpen(false)}>Abbrechen</Button>
                <Button onClick={handleManualSubmit} disabled={manualSubmitting || !manualEmployeeId || manualDaysCount === 0}>
                  {manualSubmitting ? 'Wird eingetragen...' : 'Eintragen & Genehmigen'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Employee request form */}
      {employeeId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Neuer Antrag</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Select value={requestType} onValueChange={(v) => { setRequestType(v as RequestType); setDateRange(undefined); }}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vacation">Ferien</SelectItem>
                  <SelectItem value="day_off">Frei</SelectItem>
                </SelectContent>
              </Select>
              <Badge variant="outline" className="self-center">
                mind. {minDaysAhead} Tage Vorlauf
              </Badge>
            </div>

            <div className="flex flex-col md:flex-row gap-4">
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={setDateRange}
                disabled={(date) => isBefore(date, minDate)}
                locale={de}
                numberOfMonths={2}
                className={cn("p-3 pointer-events-auto rounded-md border")}
              />
              <div className="flex flex-col gap-3 justify-center">
                {daysCount > 0 && (
                  <div className="text-center space-y-1">
                    <p className="text-3xl font-bold text-primary">{daysCount}</p>
                    <p className="text-sm text-muted-foreground">
                      {daysCount === 1 ? 'Tag' : 'Tage'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {dateRange?.from && format(dateRange.from, 'dd.MM.yyyy')} – {dateRange?.to && format(dateRange.to, 'dd.MM.yyyy')}
                    </p>
                  </div>
                )}
                <Button
                  onClick={handleSubmit}
                  disabled={submitting || daysCount === 0}
                  className="gap-2"
                >
                  <Send className="h-4 w-4" />
                  Antrag senden
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Admin: pending requests */}
      {isAdmin && pendingForAdmin.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Offene Anträge ({pendingForAdmin.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingForAdmin.map(req => (
              <div key={req.id} className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <span className="font-semibold text-sm">
                      {req.employees?.first_name} {req.employees?.last_name}
                    </span>
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {req.request_type === 'vacation' ? 'Ferien' : 'Frei'}
                    </Badge>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(req.start_date), 'dd.MM.yyyy')} – {format(new Date(req.end_date), 'dd.MM.yyyy')} ({req.days_count} {req.days_count === 1 ? 'Tag' : 'Tage'})
                  </span>
                </div>

                {actionId === req.id ? (
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Bemerkung (optional)"
                      value={adminNote}
                      onChange={e => setAdminNote(e.target.value)}
                      className="text-sm"
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" className="gap-1" onClick={() => handleDecision(req.id, 'approved')}>
                        <Check className="h-3 w-3" /> Genehmigen
                      </Button>
                      <Button size="sm" variant="destructive" className="gap-1" onClick={() => handleDecision(req.id, 'rejected')}>
                        <X className="h-3 w-3" /> Ablehnen
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { setActionId(null); setAdminNote(''); }}>
                        Abbrechen
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => setActionId(req.id)}>
                    Bearbeiten
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* My requests history */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {isAdmin ? 'Alle Anträge' : 'Meine Anträge'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(isAdmin ? requests : myRequests).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Keine Anträge vorhanden</p>
          ) : (
            <div className="space-y-2">
              {(isAdmin ? requests : myRequests).map(req => {
                const s = STATUS_MAP[req.status] || STATUS_MAP.pending;
                return (
                  <div key={req.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                    <div className="space-y-0.5">
                      {isAdmin && (
                        <p className="font-semibold">
                          {req.employees?.first_name} {req.employees?.last_name}
                        </p>
                      )}
                      <p>
                        <Badge variant="secondary" className="text-xs mr-2">
                          {req.request_type === 'vacation' ? 'Ferien' : 'Frei'}
                        </Badge>
                        {format(new Date(req.start_date), 'dd.MM.yyyy')} – {format(new Date(req.end_date), 'dd.MM.yyyy')}
                        <span className="text-muted-foreground ml-2">({req.days_count} {req.days_count === 1 ? 'Tag' : 'Tage'})</span>
                      </p>
                      {req.admin_note && (
                        <p className="text-xs text-muted-foreground mt-1">Bemerkung: {req.admin_note}</p>
                      )}
                    </div>
                    <Badge variant={s.variant}>{s.label}</Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
