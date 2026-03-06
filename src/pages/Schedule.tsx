import { useState, useEffect, useCallback, useMemo, DragEvent } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, AlertTriangle, CheckCircle, Printer, Filter } from 'lucide-react';
import { validateSchedule, LgavViolation } from '@/lib/lgav-schedule-validation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';

interface ShiftType {
  id: string;
  name: string;
  short_code: string;
  color: string;
  start_time: string | null;
  end_time: string | null;
}

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  weekly_hours: number | null;
  hourly_rate: number | null;
  cost_center: string;
  position: string;
}

interface Assignment {
  id: string;
  employee_id: string;
  date: string;
  shift_type_id: string;
}

interface ScheduleEvent {
  id: string;
  date: string;
  label: string;
}

const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

const POSITION_HIERARCHY: Record<string, number> = {
  'Geschäftsführer': 1, 'Direktor': 2, 'Betriebsleiter': 3,
  'Küchenchef': 10, 'Sous-Chef': 11, 'Chef de Partie': 12, 'Demichef': 13, 'Commis': 14, 'Koch': 15, 'Hilfskoch': 16,
  'Restaurantleiter': 20, 'Chef de Service': 21, 'Serviceleiter': 22, 'Servicefachangestellte': 23, 'Servicemitarbeiter': 24,
  'Barkeeper': 30, 'Rezeptionist': 31, 'Hausdame': 32, 'Zimmermädchen': 33,
  'Lehrling': 90, 'Aushilfe': 91, 'Praktikant': 92,
};

function getPositionOrder(position: string): number {
  const normalized = position.trim();
  if (POSITION_HIERARCHY[normalized] !== undefined) return POSITION_HIERARCHY[normalized];
  for (const [key, val] of Object.entries(POSITION_HIERARCHY)) {
    if (normalized.toLowerCase().includes(key.toLowerCase())) return val;
  }
  return 50;
}

type DragData = { type: 'palette'; shiftId: string } | { type: 'cell'; assignmentId: string; shiftId: string; employeeId: string; day: number };

export default function Schedule() {
  const { isAdmin, employeeId } = useAuth();
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [shiftTypes, setShiftTypes] = useState<ShiftType[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [showViolations, setShowViolations] = useState(true);
  const [editingEventDay, setEditingEventDay] = useState<number | null>(null);
  const [eventText, setEventText] = useState('');

  // Admin: set of visible cost centers; Employee: view mode
  const [hiddenCostCenters, setHiddenCostCenters] = useState<Set<string>>(new Set());
  const [employeeViewMode, setEmployeeViewMode] = useState<'all' | 'my_cc' | 'my_shifts'>('all');

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const loadData = useCallback(async () => {
    const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

    const [shiftsRes, empRes, assignRes, eventsRes] = await Promise.all([
      supabase.from('shift_types').select('*').order('sort_order'),
      supabase.from('employees').select('id, first_name, last_name, weekly_hours, hourly_rate, cost_center, position').eq('is_active', true),
      supabase.from('schedule_assignments').select('*').gte('date', startDate).lte('date', endDate),
      supabase.from('schedule_events').select('*').gte('date', startDate).lte('date', endDate),
    ]);

    const sorted = (empRes.data || []).sort((a, b) => {
      const ccCompare = (a.cost_center || '').localeCompare(b.cost_center || '');
      if (ccCompare !== 0) return ccCompare;
      return getPositionOrder(a.position || '') - getPositionOrder(b.position || '');
    });

    setShiftTypes(shiftsRes.data || []);
    setEmployees(sorted);
    setAssignments(assignRes.data || []);
    setEvents(eventsRes.data || []);
  }, [year, month, daysInMonth]);

  useEffect(() => { loadData(); }, [loadData]);

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

  const getAssignment = (employeeId: string, day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return assignments.find(a => a.employee_id === employeeId && a.date === dateStr);
  };

  const getShiftById = (id: string) => shiftTypes.find(s => s.id === id);

  const getEvent = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.find(e => e.date === dateStr);
  };

  // Drag handlers (admin only)
  const handlePaletteDragStart = (e: DragEvent, shiftId: string) => {
    if (!isAdmin) return;
    e.dataTransfer.setData('application/json', JSON.stringify({ type: 'palette', shiftId }));
    e.dataTransfer.effectAllowed = 'copyMove';
  };

  const handleCellDragStart = (e: DragEvent, assignment: Assignment) => {
    if (!isAdmin) { e.preventDefault(); return; }
    const data: DragData = {
      type: 'cell',
      assignmentId: assignment.id,
      shiftId: assignment.shift_type_id,
      employeeId: assignment.employee_id,
      day: parseInt(assignment.date.split('-')[2]),
    };
    e.dataTransfer.setData('application/json', JSON.stringify(data));
    e.dataTransfer.effectAllowed = 'copyMove';
  };

  const handleDragOver = (e: DragEvent) => {
    if (!isAdmin) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: DragEvent, employeeId: string, day: number) => {
    if (!isAdmin) return;
    e.preventDefault();
    let data: DragData;
    try {
      data = JSON.parse(e.dataTransfer.getData('application/json'));
    } catch {
      return;
    }

    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const existing = getAssignment(employeeId, day);

    if (data.type === 'cell') {
      if (data.employeeId === employeeId && data.day === day) return;
      await supabase.from('schedule_assignments').delete().eq('id', data.assignmentId);
      if (existing) {
        await supabase.from('schedule_assignments').update({ shift_type_id: data.shiftId }).eq('id', existing.id);
      } else {
        await supabase.from('schedule_assignments').insert({ employee_id: employeeId, date: dateStr, shift_type_id: data.shiftId });
      }
    } else {
      if (existing) {
        await supabase.from('schedule_assignments').update({ shift_type_id: data.shiftId }).eq('id', existing.id);
      } else {
        await supabase.from('schedule_assignments').insert({ employee_id: employeeId, date: dateStr, shift_type_id: data.shiftId });
      }
    }

    loadData();
  };

  const removeAssignment = async (assignmentId: string) => {
    if (!isAdmin) return;
    await supabase.from('schedule_assignments').delete().eq('id', assignmentId);
    loadData();
  };

  const saveEvent = async (day: number) => {
    if (!isAdmin) return;
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const existing = getEvent(day);

    if (!eventText.trim()) {
      if (existing) {
        await supabase.from('schedule_events').delete().eq('id', existing.id);
      }
    } else if (existing) {
      await supabase.from('schedule_events').update({ label: eventText.trim() }).eq('id', existing.id);
    } else {
      await supabase.from('schedule_events').insert({ date: dateStr, label: eventText.trim() });
    }

    setEditingEventDay(null);
    setEventText('');
    loadData();
  };

  const getDayOfWeek = (day: number) => {
    const date = new Date(year, month, day);
    return date.toLocaleDateString('de-CH', { weekday: 'short' });
  };

  const isWeekend = (day: number) => {
    const date = new Date(year, month, day);
    return date.getDay() === 0 || date.getDay() === 6;
  };

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const handlePrint = () => {
    window.print();
  };

  const violationTypeLabels: Record<string, string> = {
    rest_time: 'Ruhezeit', weekly_rest: 'Ruhetag', weekly_hours: 'Wochenstunden',
    consecutive_days: 'Arbeitstage', daily_hours: 'Tagesarbeitszeit',
    rest_days_month: 'Ruhetage/Monat', max_weekly_hours: 'Höchstarbeitszeit',
    reduced_rest: 'Red. Ruhezeit',
  };

  const allCostCenters = useMemo(() => {
    const seen = new Set<string>();
    for (const emp of employees) seen.add(emp.cost_center || '');
    return Array.from(seen);
  }, [employees]);

  // Find current employee's cost center
  const myEmployee = useMemo(() => {
    if (!employeeId) return null;
    return employees.find(e => e.id === employeeId) || null;
  }, [employees, employeeId]);

  const costCenterGroups = useMemo(() => {
    const groups: { costCenter: string; employees: Employee[] }[] = [];
    let current = '';
    let currentGroup: Employee[] = [];

    // Filter employees based on role and view mode
    let filteredEmployees = employees;
    if (isAdmin) {
      filteredEmployees = employees.filter(emp => !hiddenCostCenters.has(emp.cost_center || ''));
    } else {
      if (employeeViewMode === 'my_cc' && myEmployee) {
        filteredEmployees = employees.filter(emp => emp.cost_center === myEmployee.cost_center);
      } else if (employeeViewMode === 'my_shifts' && employeeId) {
        const myAssignedDates = new Set(assignments.filter(a => a.employee_id === employeeId).map(a => a.date));
        // Show only own employee if they have assignments, otherwise show empty
        filteredEmployees = employees.filter(emp => emp.id === employeeId);
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
  }, [employees, isAdmin, hiddenCostCenters, employeeViewMode, myEmployee, employeeId, assignments]);

  const toggleCostCenter = (cc: string) => {
    setHiddenCostCenters(prev => {
      const next = new Set(prev);
      if (next.has(cc)) next.delete(cc);
      else next.add(cc);
      return next;
    });
  };

  // Daily cost analysis: for each day, sum up hours × hourly_rate of all assigned shifts
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
        if (hours < 0) hours += 24; // overnight
        totalCost += hours * emp.hourly_rate;
      }
      costs[day] = Math.round(totalCost * 100) / 100;
    }
    return costs;
  }, [isAdmin, assignments, employees, shiftTypes, days, year, month]);

  const totalMonthlyCost = useMemo(() => {
    return Object.values(dailyCosts).reduce((sum, c) => sum + c, 0);
  }, [dailyCosts]);

  const formatTime = (t: string | null) => t ? t.slice(0, 5) : '';

  return (
    <div className="space-y-4 pb-20 md:pb-4 print:pb-0 print:space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between print:mb-2">
        <h1 className="font-heading text-2xl font-bold print:text-xl">Dienstplan</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={handlePrint} className="print:hidden" title="Drucken">
            <Printer className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={prevMonth} className="print:hidden"><ChevronLeft className="h-4 w-4" /></Button>
          <span className="font-heading font-semibold min-w-[140px] text-center">{MONTHS[month]} {year}</span>
          <Button variant="outline" size="icon" onClick={nextMonth} className="print:hidden"><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

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

      {/* Shift legend with times */}
      <Card className="print:border print:shadow-none">
        <CardHeader className="py-3 print:py-1">
          <CardTitle className="text-sm print:text-xs">
            {isAdmin ? 'Dienste (ziehen & ablegen)' : 'Legende'}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 pb-3 print:pb-2 print:gap-1">
          {shiftTypes.map(shift => (
            <div
              key={shift.id}
              draggable={isAdmin}
              onDragStart={isAdmin ? e => handlePaletteDragStart(e, shift.id) : undefined}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-shadow print:px-2 print:py-1 print:text-[10px] ${isAdmin ? 'cursor-grab hover:shadow-md active:cursor-grabbing' : 'cursor-default'}`}
              style={{ borderColor: shift.color, backgroundColor: shift.color + '15' }}
            >
              <div className="h-4 w-4 rounded shrink-0 print:h-3 print:w-3" style={{ backgroundColor: shift.color }} />
              <span className="font-bold">{shift.short_code}</span>
              <span className="text-xs text-muted-foreground print:text-[9px]">
                {shift.name}
                {shift.start_time && shift.end_time && (
                  <span className="ml-1 font-mono">({formatTime(shift.start_time)}–{formatTime(shift.end_time)})</span>
                )}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

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

      {/* Matrix */}
      <Card className="print:border print:shadow-none">
        <CardContent className="p-0">
          <div className="overflow-x-auto print:overflow-visible">
            <table className="w-full text-xs print:text-[9px]">
              <thead>
                <tr className="border-b">
                  <th className="sticky left-0 z-10 min-w-[140px] bg-card px-3 py-2 text-left font-medium text-muted-foreground print:static print:min-w-[100px] print:px-1 print:py-1">
                    Mitarbeiter
                  </th>
                  {days.map(day => (
                    <th key={day} className={`min-w-[40px] px-1 py-2 text-center font-medium print:min-w-[22px] print:px-0 print:py-1 ${isWeekend(day) ? 'bg-muted/50 text-muted-foreground' : ''}`}>
                      <div className="text-[10px] text-muted-foreground print:text-[8px]">{getDayOfWeek(day)}</div>
                      <div>{day}</div>
                    </th>
                  ))}
                </tr>
                {/* Events row */}
                <tr className="border-b bg-accent/10">
                  <th className="sticky left-0 z-10 bg-accent/10 px-3 py-1 text-left text-[10px] font-medium text-foreground print:static print:px-1 print:text-[8px]">
                    Anlass
                  </th>
                  {days.map(day => {
                    const ev = getEvent(day);
                    return (
                      <td key={day} className="px-0.5 py-1 text-center min-w-[40px] print:min-w-[22px] print:px-0">
                        {isAdmin && editingEventDay === day ? (
                          <Input
                            className="h-5 w-full min-w-[36px] text-[9px] px-1 py-0"
                            value={eventText}
                            onChange={e => setEventText(e.target.value)}
                            onBlur={() => saveEvent(day)}
                            onKeyDown={e => { if (e.key === 'Enter') saveEvent(day); if (e.key === 'Escape') { setEditingEventDay(null); setEventText(''); } }}
                            autoFocus
                          />
                        ) : (
                          <div
                            className={`mx-auto min-h-[18px] rounded px-0.5 text-[9px] leading-tight text-foreground truncate max-w-[38px] print:text-[7px] print:max-w-[20px] ${isAdmin ? 'cursor-pointer hover:bg-accent/30' : ''}`}
                            title={ev?.label || (isAdmin ? 'Klicken zum Eintragen' : '')}
                            onClick={isAdmin ? () => { setEditingEventDay(day); setEventText(ev?.label || ''); } : undefined}
                          >
                            {ev?.label || ''}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {costCenterGroups.map(group => (
                  <>
                    <tr key={`cc-${group.costCenter}`} className="bg-muted/40">
                      <td colSpan={daysInMonth + 1} className="sticky left-0 px-3 py-1 text-[10px] font-heading font-semibold uppercase tracking-wider text-muted-foreground print:static print:px-1 print:text-[8px]">
                        {group.costCenter || 'Ohne Kostenstelle'}
                      </td>
                    </tr>
                    {group.employees.map(emp => (
                      <tr key={emp.id} className="border-b last:border-0 hover:bg-muted/30 print:hover:bg-transparent">
                        <td className="sticky left-0 z-10 bg-card px-3 py-2 whitespace-nowrap print:static print:px-1 print:py-1">
                          <div className="font-medium text-xs print:text-[9px]">{emp.first_name} {emp.last_name}</div>
                          <div className="text-[10px] text-muted-foreground print:text-[8px]">{emp.position}</div>
                        </td>
                        {days.map(day => {
                          const assignment = getAssignment(emp.id, day);
                          const shift = assignment ? getShiftById(assignment.shift_type_id) : null;
                          const hasViolation = isAdmin && violationCells.has(`${emp.id}-${day}`);
                          return (
                            <td
                              key={day}
                              className={`px-0.5 py-1 text-center print:px-0 print:py-0.5 ${isWeekend(day) ? 'bg-muted/30' : ''} ${hasViolation ? 'bg-destructive/10' : ''}`}
                              onDragOver={isAdmin ? handleDragOver : undefined}
                              onDrop={isAdmin ? e => handleDrop(e, emp.id, day) : undefined}
                            >
                              {shift ? (
                                <div
                                  draggable={isAdmin}
                                  onDragStart={isAdmin ? e => handleCellDragStart(e, assignment!) : undefined}
                                  className={`group relative mx-auto flex h-7 w-8 items-center justify-center rounded text-[10px] font-bold text-white print:h-5 print:w-6 print:text-[8px] ${isAdmin ? 'cursor-grab active:cursor-grabbing' : ''} ${hasViolation ? 'ring-2 ring-destructive ring-offset-1' : ''}`}
                                  style={{ backgroundColor: shift.color }}
                                  title={`${shift.name}${shift.start_time ? ` (${formatTime(shift.start_time)}–${formatTime(shift.end_time)})` : ''}${hasViolation ? ' ⚠️ L-GAV Verstoss' : ''}`}
                                >
                                  {shift.short_code}
                                  {isAdmin && (
                                    <div
                                      className="absolute -right-1 -top-1 hidden h-3 w-3 items-center justify-center rounded-full bg-destructive text-[8px] text-destructive-foreground group-hover:flex print:hidden"
                                      onClick={(e) => { e.stopPropagation(); removeAssignment(assignment!.id); }}
                                    >
                                      ×
                                    </div>
                                  )}
                                </div>
                              ) : (
                                isAdmin ? (
                                  <div className="mx-auto h-7 w-8 rounded border border-dashed border-border/50 print:h-5 print:w-6" />
                                ) : (
                                  <div className="mx-auto h-7 w-8 print:h-5 print:w-6" />
                                )
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </>
                ))}
                {/* Daily cost row – admin only */}
                {isAdmin && employees.length > 0 && (
                  <tr className="border-t-2 border-primary/20 bg-primary/5 font-medium">
                    <td className="sticky left-0 z-10 bg-primary/5 px-3 py-2 whitespace-nowrap print:static print:px-1 print:py-1">
                      <div className="font-heading font-semibold text-xs text-primary print:text-[9px]">Tageskosten</div>
                      <div className="text-[10px] text-muted-foreground print:text-[8px]">
                        Total: CHF {totalMonthlyCost.toLocaleString('de-CH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </div>
                    </td>
                    {days.map(day => {
                      const cost = dailyCosts[day] || 0;
                      return (
                        <td key={day} className={`px-0.5 py-1.5 text-center print:px-0 print:py-0.5 ${isWeekend(day) ? 'bg-muted/30' : ''}`}>
                          {cost > 0 ? (
                            <div className="mx-auto text-[9px] font-mono font-semibold text-primary print:text-[7px]">
                              {cost.toFixed(0)}
                            </div>
                          ) : (
                            <div className="mx-auto text-[9px] text-muted-foreground/40 print:text-[7px]">–</div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                )}
                {employees.length === 0 && (
                  <tr>
                    <td colSpan={daysInMonth + 1} className="py-8 text-center text-sm text-muted-foreground">
                      Keine Mitarbeiter vorhanden
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
