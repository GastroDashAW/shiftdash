import { useState, useEffect, useMemo, DragEvent } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle, Filter, Undo2 } from 'lucide-react';
import { validateSchedule, LgavViolation } from '@/lib/lgav-schedule-validation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useScheduleData } from '@/hooks/useScheduleData';
import { useScheduleDragDrop } from '@/hooks/useScheduleDragDrop';
import { ScheduleHeader } from '@/components/schedule/ScheduleHeader';
import { ScheduleShiftPalette } from '@/components/schedule/ScheduleShiftPalette';
import { ScheduleTable } from '@/components/schedule/ScheduleTable';
import { ScheduleGenerateDialog } from '@/components/schedule/ScheduleGenerateDialog';
import { ScheduleArchivePanel } from '@/components/schedule/ScheduleArchivePanel';
import type { Employee } from '@/types';

export default function Schedule() {
  const { isAdmin, employeeId } = useAuth();
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [showViolations, setShowViolations] = useState(true);
  const [showLegend, setShowLegend] = useState(true);

  // Admin: set of visible cost centers; Employee: view mode
  const [hiddenCostCenters, setHiddenCostCenters] = useState<Set<string>>(new Set());
  const [employeeViewMode, setEmployeeViewMode] = useState<'all' | 'my_cc' | 'my_shifts'>('all');
  const [customEmployeeOrder, setCustomEmployeeOrder] = useState<string[] | null>(null);

  const {
    shiftTypes, employees, assignments, daysInMonth,
    loadData, getAssignment, getShiftById, getEvent,
  } = useScheduleData({ year, month, isAdmin });

  const {
    handlePaletteDragStart, handleCellDragStart, handleDragOver, handleDrop, removeAssignment,
  } = useScheduleDragDrop({ year, month, isAdmin, getAssignment, loadData });

  useEffect(() => { loadData(); }, [loadData]);

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // L-GAV validation (only computed for admin)
  const violations = useMemo(() => {
    if (!isAdmin || employees.length === 0 || shiftTypes.length === 0) return [];
    return validateSchedule(assignments, employees, shiftTypes, year, month);
  }, [assignments, employees, shiftTypes, year, month, isAdmin]);

  const violationCells = useMemo(() => {
    const cells = new Set<string>();
    for (const v of violations) {
      for (const d of v.days) cells.add(`${v.employeeId}-${d}`);
    }
    return cells;
  }, [violations]);

  // Navigation
  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  // Cost calculations
  const dailyCosts = useMemo(() => {
    if (!isAdmin) return {};
    const costs: Record<number, number> = {};
    const employeeMap = new Map(employees.map(e => [e.id, e]));
    for (const day of days) {
      let totalCost = 0;
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayAssignments = assignments.filter(a => a.date === dateStr);
      for (const a of dayAssignments) {
        const emp = employeeMap.get(a.employee_id);
        const shift = shiftTypes.find(s => s.id === a.shift_type_id);
        if (!emp?.hourly_rate || !shift?.start_time || !shift?.end_time) continue;
        const [sh, sm] = shift.start_time.split(':').map(Number);
        const [eh, em] = shift.end_time.split(':').map(Number);
        let hours = (eh + em / 60) - (sh + sm / 60);
        if (hours < 0) hours += 24;
        totalCost += hours * emp.hourly_rate;
      }
      costs[day] = Math.round(totalCost * 100) / 100;
    }
    return costs;
  }, [isAdmin, assignments, employees, shiftTypes, days, year, month]);

  const totalMonthlyCost = useMemo(() => {
    return Object.values(dailyCosts).reduce((sum, c) => sum + c, 0);
  }, [dailyCosts]);

  // Cost center grouping & filtering
  const allCostCenters = useMemo(() => {
    const seen = new Set<string>();
    for (const emp of employees) seen.add(emp.cost_center || '');
    return Array.from(seen);
  }, [employees]);

  const myEmployee = useMemo(() => {
    if (!employeeId) return null;
    return employees.find(e => e.id === employeeId) || null;
  }, [employees, employeeId]);

  const costCenterGroups = useMemo(() => {
    const groups: { costCenter: string; employees: Employee[] }[] = [];
    let current = '';
    let currentGroup: Employee[] = [];

    let filteredEmployees = [...employees];
    if (isAdmin) {
      filteredEmployees = filteredEmployees.filter(emp => !hiddenCostCenters.has(emp.cost_center || ''));
      if (customEmployeeOrder) {
        const orderMap = new Map(customEmployeeOrder.map((id, i) => [id, i]));
        filteredEmployees.sort((a, b) => {
          const aIdx = orderMap.get(a.id) ?? 9999;
          const bIdx = orderMap.get(b.id) ?? 9999;
          return aIdx - bIdx;
        });
        return [{ costCenter: '', employees: filteredEmployees }];
      }
    } else {
      if (employeeViewMode === 'my_cc' && myEmployee) {
        filteredEmployees = filteredEmployees.filter(emp => emp.cost_center === myEmployee.cost_center);
      } else if (employeeViewMode === 'my_shifts' && employeeId) {
        filteredEmployees = filteredEmployees.filter(emp => emp.id === employeeId);
      }
    }

    for (const emp of filteredEmployees) {
      const cc = emp.cost_center || '';
      if (cc !== current) {
        if (currentGroup.length > 0) groups.push({ costCenter: current, employees: currentGroup });
        current = cc;
        currentGroup = [];
      }
      currentGroup.push(emp);
    }
    if (currentGroup.length > 0) groups.push({ costCenter: current, employees: currentGroup });
    return groups;
  }, [employees, isAdmin, hiddenCostCenters, employeeViewMode, myEmployee, employeeId, customEmployeeOrder]);

  const handleRowReorder = (sourceId: string, targetId: string) => {
    const currentOrder = customEmployeeOrder || costCenterGroups.flatMap(g => g.employees.map(emp => emp.id));
    const newOrder = currentOrder.filter(id => id !== sourceId);
    const targetIdx = newOrder.indexOf(targetId);
    newOrder.splice(targetIdx, 0, sourceId);
    setCustomEmployeeOrder(newOrder);
  };

  const toggleCostCenter = (cc: string) => {
    setHiddenCostCenters(prev => {
      const next = new Set(prev);
      if (next.has(cc)) next.delete(cc); else next.add(cc);
      return next;
    });
  };

  // Auto-generate state
  const [autoGenerating, setAutoGenerating] = useState(false);
  const [undoSnapshot, setUndoSnapshot] = useState<{ assignments: { employee_id: string; date: string; shift_type_id: string }[]; startDate: string; endDate: string } | null>(null);

  const handleUndoGenerate = async () => {
    if (!undoSnapshot) return;
    try {
      await supabase.from('schedule_assignments').delete()
        .gte('date', undoSnapshot.startDate)
        .lte('date', undoSnapshot.endDate);
      if (undoSnapshot.assignments.length > 0) {
        for (let i = 0; i < undoSnapshot.assignments.length; i += 500) {
          const chunk = undoSnapshot.assignments.slice(i, i + 500);
          await supabase.from('schedule_assignments').insert(chunk);
        }
      }
      toast.success('Dienstplan zurückgestellt');
      setUndoSnapshot(null);
      loadData();
    } catch (err: any) {
      toast.error('Fehler beim Zurückstellen: ' + err.message);
    }
  };

  const handleAutoGenerate = async (genStartDate: Date, genEndDate: Date) => {
    if (!isAdmin) return;
    setAutoGenerating(true);

    try {
      const { data: configData } = await supabase.from('shift_plan_config').select('*');
      if (!configData || configData.length === 0) {
        toast.error('Kein Shift Plan konfiguriert. Bitte zuerst unter Dienste den Shift Plan festlegen.');
        setAutoGenerating(false);
        return;
      }

      const { data: bizData } = await supabase.from('business_settings').select('closed_days').limit(1).maybeSingle();
      const closedDays: number[] = Array.isArray(bizData?.closed_days) ? (bizData.closed_days as number[]) : [];

      const startDateStr = `${genStartDate.getFullYear()}-${String(genStartDate.getMonth() + 1).padStart(2, '0')}-${String(genStartDate.getDate()).padStart(2, '0')}`;
      const endDateStr = `${genEndDate.getFullYear()}-${String(genEndDate.getMonth() + 1).padStart(2, '0')}-${String(genEndDate.getDate()).padStart(2, '0')}`;

      const { data: leaveData } = await supabase
        .from('leave_requests')
        .select('employee_id, start_date, end_date, request_type')
        .eq('status', 'approved')
        .lte('start_date', endDateStr)
        .gte('end_date', startDateStr);

      const onLeave = new Set<string>();
      for (const lr of leaveData || []) {
        const lStart = new Date(lr.start_date);
        const lEnd = new Date(lr.end_date);
        for (let d = new Date(lStart); d <= lEnd; d.setDate(d.getDate() + 1)) {
          if (d >= genStartDate && d <= genEndDate) {
            onLeave.add(`${lr.employee_id}-${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
          }
        }
      }

      const configMap: Record<string, Record<number, number>> = {};
      for (const row of configData) {
        if (!configMap[row.shift_type_id]) configMap[row.shift_type_id] = {};
        configMap[row.shift_type_id][row.day_of_week] = row.required_count;
      }

      const freiShift = shiftTypes.find(s => s.short_code.toLowerCase() === 'f' || s.name.toLowerCase() === 'frei');
      const ferienShift = shiftTypes.find(s => s.short_code === 'V' || s.name.toLowerCase() === 'ferien');

      const { data: empDetails } = await supabase
        .from('employees')
        .select('id, available_days, pensum_percent, cost_center, allowed_shift_types, employee_type')
        .eq('is_active', true);
      const empAvailability = new Map<string, string[]>();
      const empCostCenter = new Map<string, string>();
      const empAllowedShifts = new Map<string, string[]>();
      const empType = new Map<string, string>();
      const dayLabels = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
      for (const emp of empDetails || []) {
        empAvailability.set(emp.id, Array.isArray(emp.available_days) ? (emp.available_days as string[]) : ['Mo', 'Di', 'Mi', 'Do', 'Fr']);
        empCostCenter.set(emp.id, emp.cost_center || '');
        empAllowedShifts.set(emp.id, Array.isArray(emp.allowed_shift_types) ? (emp.allowed_shift_types as string[]) : []);
        empType.set(emp.id, emp.employee_type || 'fixed');
      }

      const shiftCostCenter = new Map<string, string>();
      for (const st of shiftTypes) shiftCostCenter.set(st.id, st.cost_center || '');

      const { data: existingAssignments } = await supabase
        .from('schedule_assignments')
        .select('employee_id, date, shift_type_id')
        .gte('date', startDateStr)
        .lte('date', endDateStr);
      setUndoSnapshot({
        assignments: (existingAssignments || []).map(a => ({ employee_id: a.employee_id, date: a.date, shift_type_id: a.shift_type_id })),
        startDate: startDateStr,
        endDate: endDateStr,
      });

      await supabase.from('schedule_assignments').delete().gte('date', startDateStr).lte('date', endDateStr);

      const newAssignments: { employee_id: string; date: string; shift_type_id: string }[] = [];
      const employeeShiftCount: Record<string, number> = {};
      for (const emp of employees) employeeShiftCount[emp.id] = 0;

      const workShiftIds = Object.keys(configMap);

      for (let d = new Date(genStartDate); d <= genEndDate; d.setDate(d.getDate() + 1)) {
        const dow = d.getDay();
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const dayLabel = dayLabels[dow];
        const leaveKeyPrefix = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

        const assignedToday = new Set<string>();

        if (closedDays.includes(dow)) {
          if (freiShift) {
            for (const emp of employees) {
              if (!assignedToday.has(emp.id)) {
                newAssignments.push({ employee_id: emp.id, date: dateStr, shift_type_id: freiShift.id });
              }
            }
          }
          continue;
        }

        for (const emp of employees) {
          if (assignedToday.has(emp.id)) continue;
          const leaveKey = `${emp.id}-${leaveKeyPrefix}`;
          if (onLeave.has(leaveKey) && ferienShift) {
            newAssignments.push({ employee_id: emp.id, date: dateStr, shift_type_id: ferienShift.id });
            assignedToday.add(emp.id);
          }
        }

        for (const shiftId of workShiftIds) {
          const required = configMap[shiftId]?.[dow] ?? 0;
          if (required <= 0) continue;

          const shiftCC = shiftCostCenter.get(shiftId) || '';
          const eligible = employees.filter(emp => {
            if (assignedToday.has(emp.id)) return false;
            const avail = empAvailability.get(emp.id) || [];
            if (!avail.includes(dayLabel)) return false;
            if (shiftCC && shiftCC !== '') {
              const empCC = empCostCenter.get(emp.id) || '';
              if (empCC !== shiftCC) return false;
            }
            const allowedShifts = empAllowedShifts.get(emp.id) || [];
            if (allowedShifts.length > 0 && !allowedShifts.includes(shiftId)) return false;
            return true;
          });

          eligible.sort((a, b) => {
            const aFixed = empType.get(a.id) === 'fixed' ? 0 : 1;
            const bFixed = empType.get(b.id) === 'fixed' ? 0 : 1;
            if (aFixed !== bFixed) return aFixed - bFixed;
            return (employeeShiftCount[a.id] || 0) - (employeeShiftCount[b.id] || 0);
          });

          const toAssign = Math.min(required, eligible.length);
          for (let i = 0; i < toAssign; i++) {
            newAssignments.push({ employee_id: eligible[i].id, date: dateStr, shift_type_id: shiftId });
            assignedToday.add(eligible[i].id);
            employeeShiftCount[eligible[i].id] = (employeeShiftCount[eligible[i].id] || 0) + 1;
          }
        }

        if (freiShift) {
          for (const emp of employees) {
            if (!assignedToday.has(emp.id)) {
              newAssignments.push({ employee_id: emp.id, date: dateStr, shift_type_id: freiShift.id });
            }
          }
        }
      }

      if (newAssignments.length > 0) {
        for (let i = 0; i < newAssignments.length; i += 500) {
          const chunk = newAssignments.slice(i, i + 500);
          const { error } = await supabase.from('schedule_assignments').insert(chunk);
          if (error) {
            toast.error('Fehler: ' + error.message);
            setAutoGenerating(false);
            return;
          }
        }
      }

      const days_count = Math.ceil((genEndDate.getTime() - genStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      toast.success(`Dienstplan für ${days_count} Tage erstellt (${newAssignments.length} Einträge)`);
      loadData();
    } catch (err: any) {
      toast.error('Fehler bei der automatischen Erstellung: ' + err.message);
    }

    setAutoGenerating(false);
  };

  const violationTypeLabels: Record<string, string> = {
    rest_time: 'Ruhezeit', weekly_rest: 'Ruhetag', weekly_hours: 'Wochenstunden',
    consecutive_days: 'Arbeitstage', daily_hours: 'Tagesarbeitszeit',
    rest_days_month: 'Ruhetage/Monat', max_weekly_hours: 'Höchstarbeitszeit',
    reduced_rest: 'Red. Ruhezeit',
  };

  return (
    <div className="space-y-4 pb-20 md:pb-4 print:pb-0 print:space-y-2">
      <ScheduleHeader
        year={year}
        month={month}
        onPrevMonth={prevMonth}
        onNextMonth={nextMonth}
        onPrint={() => window.print()}
      />

      {/* L-GAV Compliance Panel – admin only */}
      {isAdmin && (
        <Card className={`print:hidden ${violations.length > 0 ? (violations.some(v => v.severity === 'error') ? 'border-destructive/50' : 'border-warning/50') : 'border-success/50'}`}>
          <CardHeader className="py-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-sm">
                {violations.length > 0 ? (
                  <>
                    <AlertTriangle className={`h-4 w-4 ${violations.some(v => v.severity === 'error') ? 'text-destructive' : 'text-warning'}`} />
                    <span className={violations.some(v => v.severity === 'error') ? 'text-destructive' : 'text-warning'}>
                      {violations.filter(v => v.severity === 'error').length} Fehler, {violations.filter(v => v.severity === 'warning').length} Warnungen (ArG / L-GAV)
                    </span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 text-success" />
                    <span className="text-success">ArG / L-GAV konform ✓</span>
                  </>
                )}
              </CardTitle>
              {violations.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setShowViolations(!showViolations)}>
                  {showViolations ? 'Ausblenden' : 'Anzeigen'}
                </Button>
              )}
            </div>
          </CardHeader>
          <AnimatePresence>
            {showViolations && violations.length > 0 && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                <CardContent className="pt-0 pb-3">
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {violations.map((v, i) => (
                      <div key={i} className={`flex items-start gap-2 rounded-md border p-2 text-xs ${v.severity === 'error' ? 'bg-destructive/5 border-destructive/20' : 'bg-warning/5 border-warning/20'}`}>
                        <AlertTriangle className={`mt-0.5 h-3 w-3 shrink-0 ${v.severity === 'error' ? 'text-destructive' : 'text-warning'}`} />
                        <div className="flex-1">
                          <span className="font-medium">{v.employeeName}</span>
                          <Badge variant={v.severity === 'error' ? 'destructive' : 'outline'} className="ml-2 text-[10px] px-1 py-0">{violationTypeLabels[v.type]}</Badge>
                          <Badge variant="outline" className="ml-1 text-[10px] px-1 py-0 font-mono">{v.law}</Badge>
                          <p className="mt-0.5 text-muted-foreground">{v.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      )}

      <ScheduleShiftPalette
        shiftTypes={shiftTypes}
        isAdmin={isAdmin}
        showLegend={showLegend}
        onToggleLegend={() => setShowLegend(prev => !prev)}
        onPaletteDragStart={handlePaletteDragStart}
      />

      {/* Filter bar */}
      <Card className="print:hidden">
        <CardContent className="py-3 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Filter className="h-4 w-4" />
            <span>Filter</span>
          </div>
          {isAdmin ? (
            <div className="flex flex-wrap gap-3">
              {allCostCenters.map(cc => (
                <label key={cc} className="flex items-center gap-1.5 text-sm cursor-pointer">
                  <Checkbox
                    checked={!hiddenCostCenters.has(cc)}
                    onCheckedChange={() => toggleCostCenter(cc)}
                  />
                  <span>{cc || 'Ohne Kostenstelle'}</span>
                </label>
              ))}
              {customEmployeeOrder && (
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setCustomEmployeeOrder(null)}>
                  <Undo2 className="h-3 w-3 mr-1" /> Reihenfolge zurücksetzen
                </Button>
              )}
            </div>
          ) : (
            <Select value={employeeViewMode} onValueChange={(v) => setEmployeeViewMode(v as 'all' | 'my_cc' | 'my_shifts')}>
              <SelectTrigger className="w-[200px] h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Ganzer Dienstplan</SelectItem>
                <SelectItem value="my_cc">Meine Kostenstelle</SelectItem>
                <SelectItem value="my_shifts">Meine Dienste</SelectItem>
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      {/* Auto-generate + Archive – admin only */}
      {isAdmin && (
        <div className="print:hidden space-y-3">
          <ScheduleGenerateDialog
            onGenerate={handleAutoGenerate}
            generating={autoGenerating}
            defaultMonth={new Date(year, month, 1)}
          />
          {undoSnapshot && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="w-full gap-2 text-sm">
                  <Undo2 className="h-4 w-4" />
                  Letzte automatische Erstellung zurückstellen
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Zurückstellen?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Der automatisch erstellte Dienstplan ({undoSnapshot.startDate} – {undoSnapshot.endDate}) wird durch den vorherigen Stand ersetzt ({undoSnapshot.assignments.length} Einträge).
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                  <AlertDialogAction onClick={handleUndoGenerate}>Zurückstellen</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <ScheduleArchivePanel
            currentAssignments={assignments.map(a => ({ employee_id: a.employee_id, date: a.date, shift_type_id: a.shift_type_id }))}
            currentStartDate={`${year}-${String(month + 1).padStart(2, '0')}-01`}
            currentEndDate={`${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`}
            onLoadArchive={() => loadData()}
          />
        </div>
      )}

      <ScheduleTable
        year={year}
        month={month}
        days={days}
        daysInMonth={daysInMonth}
        costCenterGroups={costCenterGroups}
        customEmployeeOrder={customEmployeeOrder}
        isAdmin={isAdmin}
        getAssignment={getAssignment}
        getShiftById={getShiftById}
        getEvent={getEvent}
        violationCells={violationCells}
        handleDragOver={handleDragOver}
        handleDrop={handleDrop}
        handleCellDragStart={handleCellDragStart}
        removeAssignment={removeAssignment}
        onRowReorder={handleRowReorder}
        dailyCosts={dailyCosts}
        totalMonthlyCost={totalMonthlyCost}
        onEventSaved={loadData}
        employeeCount={employees.length}
      />
    </div>
  );
}
