import { useState, useEffect, useCallback, useMemo, DragEvent } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, AlertTriangle, CheckCircle } from 'lucide-react';
import { validateSchedule, LgavViolation } from '@/lib/lgav-schedule-validation';
import { motion, AnimatePresence } from 'framer-motion';

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

// Position hierarchy for sorting (lower = higher rank)
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
  // Try partial match
  for (const [key, val] of Object.entries(POSITION_HIERARCHY)) {
    if (normalized.toLowerCase().includes(key.toLowerCase())) return val;
  }
  return 50; // default mid-rank
}

type DragData = { type: 'palette'; shiftId: string } | { type: 'cell'; assignmentId: string; shiftId: string; employeeId: string; day: number };

export default function Schedule() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [shiftTypes, setShiftTypes] = useState<ShiftType[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [showViolations, setShowViolations] = useState(true);
  const [editingEventDay, setEditingEventDay] = useState<number | null>(null);
  const [eventText, setEventText] = useState('');

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const loadData = useCallback(async () => {
    const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

    const [shiftsRes, empRes, assignRes, eventsRes] = await Promise.all([
      supabase.from('shift_types').select('*').order('sort_order'),
      supabase.from('employees').select('id, first_name, last_name, weekly_hours, cost_center, position').eq('is_active', true),
      supabase.from('schedule_assignments').select('*').gte('date', startDate).lte('date', endDate),
      supabase.from('schedule_events').select('*').gte('date', startDate).lte('date', endDate),
    ]);

    // Sort employees by cost_center then position hierarchy
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

  // L-GAV validation
  const violations = useMemo(() => {
    if (employees.length === 0 || shiftTypes.length === 0) return [];
    return validateSchedule(assignments, employees, shiftTypes, year, month);
  }, [assignments, employees, shiftTypes, year, month]);

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

  // Drag handlers supporting both palette and cell-to-cell
  const handlePaletteDragStart = (e: DragEvent, shiftId: string) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ type: 'palette', shiftId }));
    e.dataTransfer.effectAllowed = 'copyMove';
  };

  const handleCellDragStart = (e: DragEvent, assignment: Assignment) => {
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
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: DragEvent, employeeId: string, day: number) => {
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
      // Moving from another cell
      // If dropping on same cell, do nothing
      if (data.employeeId === employeeId && data.day === day) return;

      // Delete old assignment
      await supabase.from('schedule_assignments').delete().eq('id', data.assignmentId);

      // Upsert new
      if (existing) {
        await supabase.from('schedule_assignments')
          .update({ shift_type_id: data.shiftId })
          .eq('id', existing.id);
      } else {
        await supabase.from('schedule_assignments')
          .insert({ employee_id: employeeId, date: dateStr, shift_type_id: data.shiftId });
      }
    } else {
      // From palette
      if (existing) {
        await supabase.from('schedule_assignments')
          .update({ shift_type_id: data.shiftId })
          .eq('id', existing.id);
      } else {
        await supabase.from('schedule_assignments')
          .insert({ employee_id: employeeId, date: dateStr, shift_type_id: data.shiftId });
      }
    }

    loadData();
  };

  const removeAssignment = async (assignmentId: string) => {
    await supabase.from('schedule_assignments').delete().eq('id', assignmentId);
    loadData();
  };

  // Event handling
  const saveEvent = async (day: number) => {
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

  const violationTypeLabels: Record<string, string> = {
    rest_time: 'Ruhezeit', weekly_rest: 'Ruhetag', weekly_hours: 'Wochenstunden', consecutive_days: 'Arbeitstage',
  };
  const violationTypeColors: Record<string, string> = {
    rest_time: 'text-destructive', weekly_rest: 'text-warning', weekly_hours: 'text-warning', consecutive_days: 'text-destructive',
  };

  // Group employees by cost center for display
  const costCenterGroups = useMemo(() => {
    const groups: { costCenter: string; employees: Employee[] }[] = [];
    let current = '';
    let currentGroup: Employee[] = [];
    for (const emp of employees) {
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
  }, [employees]);

  return (
    <div className="space-y-4 pb-20 md:pb-4">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold">Dienstplan</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
          <span className="font-heading font-semibold min-w-[140px] text-center">{MONTHS[month]} {year}</span>
          <Button variant="outline" size="icon" onClick={nextMonth}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>

      {/* L-GAV Compliance Panel */}
      <Card className={violations.length > 0 ? 'border-destructive/50' : 'border-success/50'}>
        <CardHeader className="py-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm">
              {violations.length > 0 ? (
                <>
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <span className="text-destructive">{violations.length} L-GAV Verstösse</span>
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 text-success" />
                  <span className="text-success">L-GAV konform</span>
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
                    <div key={i} className="flex items-start gap-2 rounded-md border bg-card p-2 text-xs">
                      <AlertTriangle className={`mt-0.5 h-3 w-3 shrink-0 ${violationTypeColors[v.type]}`} />
                      <div className="flex-1">
                        <span className="font-medium">{v.employeeName}</span>
                        <Badge variant="outline" className="ml-2 text-[10px] px-1 py-0">{violationTypeLabels[v.type]}</Badge>
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

      {/* Shift palette */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Dienste (ziehen & ablegen)</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 pb-3">
          {shiftTypes.map(shift => (
            <div
              key={shift.id}
              draggable
              onDragStart={e => handlePaletteDragStart(e, shift.id)}
              className="flex cursor-grab items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-shadow hover:shadow-md active:cursor-grabbing"
              style={{ borderColor: shift.color, backgroundColor: shift.color + '15' }}
            >
              <div className="h-4 w-4 rounded" style={{ backgroundColor: shift.color }} />
              <span>{shift.short_code}</span>
              <span className="hidden text-xs text-muted-foreground sm:inline">{shift.name}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Matrix */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b">
                  <th className="sticky left-0 z-10 min-w-[140px] bg-card px-3 py-2 text-left font-medium text-muted-foreground">
                    Mitarbeiter
                  </th>
                  {days.map(day => (
                    <th key={day} className={`min-w-[40px] px-1 py-2 text-center font-medium ${isWeekend(day) ? 'bg-muted/50 text-muted-foreground' : ''}`}>
                      <div className="text-[10px] text-muted-foreground">{getDayOfWeek(day)}</div>
                      <div>{day}</div>
                    </th>
                  ))}
                </tr>
                {/* Events row */}
                <tr className="border-b bg-accent/10">
                  <th className="sticky left-0 z-10 bg-accent/10 px-3 py-1 text-left text-[10px] font-medium text-foreground">
                    Anlass
                  </th>
                  {days.map(day => {
                    const ev = getEvent(day);
                    return (
                      <td key={day} className="px-0.5 py-1 text-center min-w-[40px]">
                        {editingEventDay === day ? (
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
                            className="mx-auto min-h-[18px] cursor-pointer rounded px-0.5 text-[9px] leading-tight text-foreground hover:bg-accent/30 truncate max-w-[38px]"
                            title={ev?.label || 'Klicken zum Eintragen'}
                            onClick={() => { setEditingEventDay(day); setEventText(ev?.label || ''); }}
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
                    {/* Cost center separator */}
                    <tr key={`cc-${group.costCenter}`} className="bg-muted/40">
                      <td colSpan={daysInMonth + 1} className="sticky left-0 px-3 py-1 text-[10px] font-heading font-semibold uppercase tracking-wider text-muted-foreground">
                        {group.costCenter || 'Ohne Kostenstelle'}
                      </td>
                    </tr>
                    {group.employees.map(emp => (
                      <tr key={emp.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="sticky left-0 z-10 bg-card px-3 py-2 whitespace-nowrap">
                          <div className="font-medium text-xs">{emp.first_name} {emp.last_name}</div>
                          <div className="text-[10px] text-muted-foreground">{emp.position}</div>
                        </td>
                        {days.map(day => {
                          const assignment = getAssignment(emp.id, day);
                          const shift = assignment ? getShiftById(assignment.shift_type_id) : null;
                          const hasViolation = violationCells.has(`${emp.id}-${day}`);
                          return (
                            <td
                              key={day}
                              className={`px-0.5 py-1 text-center ${isWeekend(day) ? 'bg-muted/30' : ''} ${hasViolation ? 'bg-destructive/10' : ''}`}
                              onDragOver={handleDragOver}
                              onDrop={e => handleDrop(e, emp.id, day)}
                            >
                              {shift ? (
                                <div
                                  draggable
                                  onDragStart={e => handleCellDragStart(e, assignment!)}
                                  className={`group relative mx-auto flex h-7 w-8 items-center justify-center rounded text-[10px] font-bold text-white cursor-grab active:cursor-grabbing ${hasViolation ? 'ring-2 ring-destructive ring-offset-1' : ''}`}
                                  style={{ backgroundColor: shift.color }}
                                  title={`${shift.name}${shift.start_time ? ` (${shift.start_time.slice(0,5)}–${shift.end_time?.slice(0,5)})` : ''}${hasViolation ? ' ⚠️ L-GAV Verstoss' : ''}`}
                                >
                                  {shift.short_code}
                                  <div
                                    className="absolute -right-1 -top-1 hidden h-3 w-3 items-center justify-center rounded-full bg-destructive text-[8px] text-destructive-foreground group-hover:flex"
                                    onClick={(e) => { e.stopPropagation(); removeAssignment(assignment!.id); }}
                                  >
                                    ×
                                  </div>
                                </div>
                              ) : (
                                <div className="mx-auto h-7 w-8 rounded border border-dashed border-border/50" />
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </>
                ))}
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
