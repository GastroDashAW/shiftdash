import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { CalendarCheck, Check, X, Printer, Mail, Loader2, Send } from 'lucide-react';
import { formatHoursMinutes, formatTime, calculateMonthlyTargetHours, calculateHourlySurcharges } from '@/lib/lgav';
import { getEndOfMonthString, getYearOptions } from '@/lib/date';

const monthNames = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const years = getYearOptions();

export default function Validation() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [entries, setEntries] = useState<any[]>([]);
  const [employee, setEmployee] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.from('employees').select('*').eq('is_active', true)
      .then(({ data }) => {
        setEmployees(data || []);
        if (data?.[0]) setSelectedEmployee(data[0].id);
      });
  }, []);

  useEffect(() => {
    if (!selectedEmployee) return;

    const emp = employees.find(e => e.id === selectedEmployee);
    setEmployee(emp);

    const startDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
    const endDate = getEndOfMonthString(selectedYear, selectedMonth);

    supabase
      .from('time_entries')
      .select('*')
      .eq('employee_id', selectedEmployee)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date')
      .then(({ data }) => setEntries(data || []));

    supabase
      .from('monthly_summaries')
      .select('*')
      .eq('employee_id', selectedEmployee)
      .eq('year', selectedYear)
      .eq('month', selectedMonth)
      .maybeSingle()
      .then(({ data }) => setSummary(data));

  }, [selectedEmployee, selectedMonth, selectedYear, employees]);

  const totalWorked = entries.reduce((s, e) => s + (e.effective_hours || 0), 0);
  const totalAbsence = entries.reduce((s, e) => s + (e.absence_hours || 0), 0);
  const targetHours = employee?.employee_type === 'fixed'
    ? calculateMonthlyTargetHours(employee.weekly_hours || 42, selectedYear, selectedMonth)
    : 0;
  const overtime = employee?.employee_type === 'fixed' ? totalWorked - targetHours : 0;
  const surcharges = employee?.employee_type === 'hourly'
    ? calculateHourlySurcharges(totalWorked, employee.vacation_surcharge_percent, employee.holiday_surcharge_percent)
    : null;

  const pendingCount = entries.filter(e => e.status === 'pending').length;

  const handleApproveAll = async () => {
    const pendingIds = entries.filter(e => e.status === 'pending').map(e => e.id);
    if (pendingIds.length === 0) return;

    const previousEntries = [...entries];

    try {
      const { error } = await supabase
        .from('time_entries')
        .update({ status: 'approved' })
        .in('id', pendingIds);

      if (error) throw error;

      const previousBalance = employee?.overtime_balance_hours || 0;
      const newBalance = previousBalance + overtime;

      const { error: upsertError } = await supabase.from('monthly_summaries').upsert({
        employee_id: selectedEmployee,
        year: selectedYear,
        month: selectedMonth,
        total_worked_hours: totalWorked,
        target_hours: targetHours,
        overtime_hours: overtime,
        overtime_balance: newBalance,
        vacation_days_used: entries.filter(e => e.absence_type === 'vacation').reduce((s, e) => s + (e.absence_hours || 0) / 8, 0),
        sick_days: entries.filter(e => e.absence_type === 'sick').reduce((s, e) => s + (e.absence_hours || 0) / 8, 0),
        accident_days: entries.filter(e => e.absence_type === 'accident').reduce((s, e) => s + (e.absence_hours || 0) / 8, 0),
        is_approved: true,
        approved_at: new Date().toISOString(),
        approved_by: user?.id,
      }, { onConflict: 'employee_id,year,month' });

      if (upsertError) throw upsertError;

      if (employee?.employee_type === 'fixed') {
        const { error: empError } = await supabase.from('employees').update({ overtime_balance_hours: newBalance }).eq('id', selectedEmployee);
        if (empError) throw empError;
      }

      toast.success('Monat visiert ✓');
      setEntries(prev => prev.map(e => pendingIds.includes(e.id) ? { ...e, status: 'approved' } : e));
    } catch (err: any) {
      console.error('[Validation] handleApproveAll', err);
      toast.error('Fehler beim Visieren. Bitte erneut versuchen.');
      // Revert optimistic update
      setEntries(previousEntries);
    }
  };

  const handleRejectEntry = async (entryId: string) => {
    const previousEntries = [...entries];
    try {
      // Optimistic update
      setEntries(prev => prev.map(e => e.id === entryId ? { ...e, status: 'rejected' } : e));

      const { error } = await supabase.from('time_entries').update({ status: 'rejected' }).eq('id', entryId);
      if (error) throw error;

      toast.info('Eintrag abgelehnt');
    } catch (err: any) {
      console.error('[Validation] handleRejectEntry', err);
      toast.error('Fehler beim Ablehnen. Bitte erneut versuchen.');
      setEntries(previousEntries);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const buildEmailContent = () => {
    const lines = [
      `Monatsabrechnung ${monthNames[selectedMonth - 1]} ${selectedYear}`,
      `Mitarbeiter: ${employee.first_name} ${employee.last_name}`,
      '',
      `Gearbeitet: ${formatHoursMinutes(totalWorked)}`,
    ];

    if (employee.employee_type === 'fixed') {
      lines.push(`Soll: ${formatHoursMinutes(targetHours)}`);
      lines.push(`Überstunden: ${overtime > 0 ? '+' : ''}${formatHoursMinutes(overtime)}`);
      lines.push(`Saldo: ${formatHoursMinutes((employee.overtime_balance_hours || 0) + overtime)}`);
    }

    if (totalAbsence > 0) {
      lines.push(`Abwesenheit: ${formatHoursMinutes(totalAbsence)}`);
    }

    lines.push('');
    lines.push('Einträge:');
    entries.forEach(entry => {
      const date = new Date(entry.date).toLocaleDateString('de-CH', { weekday: 'short', day: 'numeric', month: 'short' });
      if (entry.absence_type) {
        lines.push(`  ${date}: ${absenceLabels[entry.absence_type]} (${entry.absence_hours}h)`);
      } else {
        const ci = entry.adjusted_clock_in || entry.clock_in;
        const co = entry.adjusted_clock_out || entry.clock_out;
        lines.push(`  ${date}: ${ci ? formatTime(ci) : '–'} – ${co ? formatTime(co) : '...'} = ${formatHoursMinutes(entry.effective_hours || 0)}`);
      }
    });

    if (summary?.is_approved) {
      lines.push('');
      lines.push(`Visiert am ${new Date(summary.approved_at).toLocaleDateString('de-CH')}`);
    }

    return lines.join('\n');
  };

  const openMailto = (email: string, emailContent: string) => {
    const subject = encodeURIComponent(
      `Monatsabrechnung ${monthNames[selectedMonth - 1]} ${selectedYear} – ${employee.first_name} ${employee.last_name}`
    );
    const body = encodeURIComponent(emailContent);
    window.open(`mailto:${email}?subject=${subject}&body=${body}`, '_self');
  };

  const handleEmail = async () => {
    if (!employee) return;

    // Get employee's login email from profiles
    let email: string | null = null;
    if (employee.user_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('user_id', employee.user_id)
        .maybeSingle();
      email = profile?.email || null;
    }

    if (!email) {
      toast.error('Kein E-Mail für diesen Mitarbeiter hinterlegt');
      return;
    }

    const emailContent = buildEmailContent();

    // Try server-side email first
    setSendingEmail(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-monthly-report', {
        body: {
          employeeId: selectedEmployee,
          month: selectedMonth,
          year: selectedYear,
          emailContent,
          recipientEmail: email,
          subject: `Monatsabrechnung ${monthNames[selectedMonth - 1]} ${selectedYear} – ${employee.first_name} ${employee.last_name}`,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(`E-Mail an ${email} gesendet`);
    } catch (err: any) {
      console.error('[Validation] handleEmail edge function failed', err);
      // Fallback to mailto
      toast.info('E-Mail-Client wird geöffnet als Fallback');
      openMailto(email, emailContent);
    } finally {
      setSendingEmail(false);
    }
  };

  const handleMailto = async () => {
    if (!employee) return;

    let email: string | null = null;
    if (employee.user_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('user_id', employee.user_id)
        .maybeSingle();
      email = profile?.email || null;
    }

    if (!email) {
      toast.error('Kein E-Mail für diesen Mitarbeiter hinterlegt');
      return;
    }

    openMailto(email, buildEmailContent());
    toast.success(`E-Mail an ${email} wird vorbereitet`);
  };

  const absenceLabels: Record<string, string> = {
    vacation: 'Ferien', sick: 'Krankheit', accident: 'Unfall',
    holiday: 'Feiertag', military: 'Militär', other: 'Andere',
  };

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          header, nav, .no-print { display: none !important; }
          main { padding: 0 !important; }
          .print-area { break-inside: avoid; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      <div className="space-y-4 pb-20 md:pb-4" ref={printRef}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
            <CalendarCheck className="h-6 w-6" />
            Monatsvalidierung
          </h1>
          <div className="flex gap-2 no-print">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={handlePrint}>
              <Printer className="h-4 w-4" />
              Drucken
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={handleEmail} disabled={sendingEmail}>
              {sendingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              E-Mail senden
            </Button>
            <Button variant="ghost" size="sm" className="gap-1.5" onClick={handleMailto}>
              <Mail className="h-4 w-4" />
              mailto
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 no-print">
          <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
            <SelectTrigger className="w-48"><SelectValue placeholder="Mitarbeiter" /></SelectTrigger>
            <SelectContent>
              {employees.map(e => (
                <SelectItem key={e.id} value={e.id}>{e.first_name} {e.last_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(selectedMonth)} onValueChange={v => setSelectedMonth(parseInt(v))}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              {monthNames.map((m, i) => (
                <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(selectedYear)} onValueChange={v => setSelectedYear(parseInt(v))}>
            <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
            <SelectContent>
              {years.map(y => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Print header (only visible in print) */}
        {employee && (
          <div className="hidden print:block mb-4">
            <h2 className="text-lg font-bold">
              Monatsabrechnung {monthNames[selectedMonth - 1]} {selectedYear}
            </h2>
            <p className="text-sm">Mitarbeiter: {employee.first_name} {employee.last_name}</p>
          </div>
        )}

        {/* Summary cards */}
        {employee && (
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 print-area">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-xs text-muted-foreground">Gearbeitet</p>
                <p className="font-heading text-xl font-bold">{formatHoursMinutes(totalWorked)}</p>
              </CardContent>
            </Card>
            {employee.employee_type === 'fixed' ? (
              <>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-muted-foreground">Soll</p>
                    <p className="font-heading text-xl font-bold">{formatHoursMinutes(targetHours)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-muted-foreground">Überstunden</p>
                    <p className={`font-heading text-xl font-bold ${overtime > 0 ? 'text-success' : overtime < 0 ? 'text-destructive' : ''}`}>
                      {overtime > 0 ? '+' : ''}{formatHoursMinutes(overtime)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-muted-foreground">Saldo</p>
                    <p className="font-heading text-xl font-bold">
                      {formatHoursMinutes((employee.overtime_balance_hours || 0) + overtime)}
                    </p>
                  </CardContent>
                </Card>
              </>
            ) : surcharges ? (
              <>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-muted-foreground">Ferienzuschlag</p>
                    <p className="font-heading text-xl font-bold">{formatHoursMinutes(surcharges.vacationSurcharge)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-muted-foreground">Feiertagszuschlag</p>
                    <p className="font-heading text-xl font-bold">{formatHoursMinutes(surcharges.holidaySurcharge)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-xs text-muted-foreground">Total inkl. Zuschläge</p>
                    <p className="font-heading text-xl font-bold">{formatHoursMinutes(surcharges.totalCompensation)}</p>
                  </CardContent>
                </Card>
              </>
            ) : null}
          </div>
        )}

        {/* Approve button */}
        {pendingCount > 0 && (
          <Button onClick={handleApproveAll} className="w-full gap-2 no-print">
            <Check className="h-4 w-4" />
            Monat visieren ({pendingCount} ausstehend)
          </Button>
        )}

        {summary?.is_approved && (
          <Badge className="w-full justify-center py-2" variant="default">
            ✓ Visiert am {new Date(summary.approved_at).toLocaleDateString('de-CH')}
          </Badge>
        )}

        {/* Entries list */}
        <Card className="print-area">
          <CardHeader>
            <CardTitle className="text-base">Einträge {monthNames[selectedMonth - 1]} {selectedYear}</CardTitle>
          </CardHeader>
          <CardContent>
            {entries.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Keine Einträge</p>
            ) : (
              <div className="space-y-2">
                {entries.map(entry => (
                  <div key={entry.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">
                        {new Date(entry.date).toLocaleDateString('de-CH', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </p>
                      {entry.absence_type ? (
                        <Badge variant="outline">{absenceLabels[entry.absence_type]} ({entry.absence_hours}h)</Badge>
                      ) : (
                        <div className="text-sm">
                          <span className={`font-medium ${entry.adjusted_clock_in ? 'line-through text-muted-foreground text-xs' : ''}`}>
                            {entry.clock_in ? formatTime(entry.clock_in) : '–'}
                          </span>
                          {entry.adjusted_clock_in && (
                            <span className="font-medium text-primary ml-1">{formatTime(entry.adjusted_clock_in)}</span>
                          )}
                          {' — '}
                          <span className={`font-medium ${entry.adjusted_clock_out ? 'line-through text-muted-foreground text-xs' : ''}`}>
                            {entry.clock_out ? formatTime(entry.clock_out) : '...'}
                          </span>
                          {entry.adjusted_clock_out && (
                            <span className="font-medium text-primary ml-1">{formatTime(entry.adjusted_clock_out)}</span>
                          )}
                          {entry.break_minutes > 0 && <span className="text-muted-foreground"> ({entry.break_minutes}' Pause)</span>}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-heading font-semibold text-sm">
                        {formatHoursMinutes(entry.effective_hours || 0)}
                      </span>
                      <Badge variant={
                        entry.status === 'approved' ? 'default' :
                        entry.status === 'rejected' ? 'destructive' : 'secondary'
                      }>
                        {entry.status === 'approved' ? '✓' : entry.status === 'rejected' ? '✗' : '○'}
                      </Badge>
                      {entry.status === 'pending' && (
                        <Button size="icon" variant="ghost" className="no-print" onClick={() => handleRejectEntry(entry.id)}>
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
