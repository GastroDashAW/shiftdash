import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { CalendarCheck, Check, X, AlertTriangle } from 'lucide-react';
import { formatHoursMinutes, formatTime, calculateMonthlyTargetHours, calculateHourlySurcharges } from '@/lib/lgav';

const monthNames = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

export default function Validation() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<any[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [entries, setEntries] = useState<any[]>([]);
  const [employee, setEmployee] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);

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

    // Load entries for month
    const startDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
    const endDate = new Date(selectedYear, selectedMonth, 0).toISOString().split('T')[0];

    supabase
      .from('time_entries')
      .select('*')
      .eq('employee_id', selectedEmployee)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date')
      .then(({ data }) => setEntries(data || []));

    // Load summary
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

    const { error } = await supabase
      .from('time_entries')
      .update({ status: 'approved' })
      .in('id', pendingIds);

    if (error) { toast.error('Fehler'); return; }

    // Upsert monthly summary
    const previousBalance = employee?.overtime_balance_hours || 0;
    const newBalance = previousBalance + overtime;

    await supabase.from('monthly_summaries').upsert({
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

    // Update employee overtime balance
    if (employee?.employee_type === 'fixed') {
      await supabase.from('employees').update({ overtime_balance_hours: newBalance }).eq('id', selectedEmployee);
    }

    toast.success('Monat visiert ✓');
    // Reload
    setEntries(prev => prev.map(e => pendingIds.includes(e.id) ? { ...e, status: 'approved' } : e));
  };

  const handleRejectEntry = async (entryId: string) => {
    await supabase.from('time_entries').update({ status: 'rejected' }).eq('id', entryId);
    setEntries(prev => prev.map(e => e.id === entryId ? { ...e, status: 'rejected' } : e));
    toast.info('Eintrag abgelehnt');
  };

  const absenceLabels: Record<string, string> = {
    vacation: 'Ferien', sick: 'Krankheit', accident: 'Unfall',
    holiday: 'Feiertag', military: 'Militär', other: 'Andere',
  };

  return (
    <div className="space-y-4 pb-20 md:pb-4">
      <h1 className="font-heading text-2xl font-bold flex items-center gap-2">
        <CalendarCheck className="h-6 w-6" />
        Monatsvalidierung
      </h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
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
            {[2025, 2026, 2027].map(y => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary cards */}
      {employee && (
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
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
        <Button onClick={handleApproveAll} className="w-full gap-2">
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
      <Card>
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
                      <p className="text-sm">
                        {entry.clock_in ? formatTime(entry.clock_in) : '–'} — {entry.clock_out ? formatTime(entry.clock_out) : '...'}
                        {entry.break_minutes > 0 && <span className="text-muted-foreground"> ({entry.break_minutes}' Pause)</span>}
                      </p>
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
                      <Button size="icon" variant="ghost" onClick={() => handleRejectEntry(entry.id)}>
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
  );
}
