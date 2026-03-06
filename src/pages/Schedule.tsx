import { useState, useEffect, useCallback, DragEvent } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';

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
}

interface Assignment {
  id: string;
  employee_id: string;
  date: string;
  shift_type_id: string;
}

const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

export default function Schedule() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [shiftTypes, setShiftTypes] = useState<ShiftType[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [draggedShift, setDraggedShift] = useState<string | null>(null);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const loadData = useCallback(async () => {
    const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

    const [shiftsRes, empRes, assignRes] = await Promise.all([
      supabase.from('shift_types').select('*').order('sort_order'),
      supabase.from('employees').select('id, first_name, last_name').eq('is_active', true).order('last_name'),
      supabase.from('schedule_assignments').select('*').gte('date', startDate).lte('date', endDate),
    ]);

    setShiftTypes(shiftsRes.data || []);
    setEmployees(empRes.data || []);
    setAssignments(assignRes.data || []);
  }, [year, month, daysInMonth]);

  useEffect(() => { loadData(); }, [loadData]);

  const getAssignment = (employeeId: string, day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return assignments.find(a => a.employee_id === employeeId && a.date === dateStr);
  };

  const getShiftById = (id: string) => shiftTypes.find(s => s.id === id);

  const handleDragStart = (e: DragEvent, shiftId: string) => {
    e.dataTransfer.setData('shiftId', shiftId);
    setDraggedShift(shiftId);
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = async (e: DragEvent, employeeId: string, day: number) => {
    e.preventDefault();
    const shiftId = e.dataTransfer.getData('shiftId');
    if (!shiftId) return;

    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const existing = getAssignment(employeeId, day);

    if (existing) {
      const { error } = await supabase.from('schedule_assignments')
        .update({ shift_type_id: shiftId })
        .eq('id', existing.id);
      if (error) { toast.error('Fehler'); return; }
    } else {
      const { error } = await supabase.from('schedule_assignments')
        .insert({ employee_id: employeeId, date: dateStr, shift_type_id: shiftId });
      if (error) { toast.error('Fehler'); return; }
    }

    setDraggedShift(null);
    loadData();
  };

  const removeAssignment = async (assignmentId: string) => {
    await supabase.from('schedule_assignments').delete().eq('id', assignmentId);
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

      {/* Shift palette for drag */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">Dienste (ziehen & ablegen)</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2 pb-3">
          {shiftTypes.map(shift => (
            <div
              key={shift.id}
              draggable
              onDragStart={e => handleDragStart(e, shift.id)}
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
                  <th className="sticky left-0 z-10 min-w-[120px] bg-card px-3 py-2 text-left font-medium text-muted-foreground">
                    Mitarbeiter
                  </th>
                  {days.map(day => (
                    <th
                      key={day}
                      className={`min-w-[40px] px-1 py-2 text-center font-medium ${isWeekend(day) ? 'bg-muted/50 text-muted-foreground' : ''}`}
                    >
                      <div className="text-[10px] text-muted-foreground">{getDayOfWeek(day)}</div>
                      <div>{day}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {employees.map(emp => (
                  <tr key={emp.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="sticky left-0 z-10 bg-card px-3 py-2 font-medium whitespace-nowrap">
                      {emp.first_name} {emp.last_name}
                    </td>
                    {days.map(day => {
                      const assignment = getAssignment(emp.id, day);
                      const shift = assignment ? getShiftById(assignment.shift_type_id) : null;
                      return (
                        <td
                          key={day}
                          className={`px-0.5 py-1 text-center ${isWeekend(day) ? 'bg-muted/30' : ''}`}
                          onDragOver={handleDragOver}
                          onDrop={e => handleDrop(e, emp.id, day)}
                        >
                          {shift ? (
                            <div
                              className="group relative mx-auto flex h-7 w-8 items-center justify-center rounded text-[10px] font-bold text-white cursor-pointer"
                              style={{ backgroundColor: shift.color }}
                              title={`${shift.name}${shift.start_time ? ` (${shift.start_time.slice(0,5)}–${shift.end_time?.slice(0,5)})` : ''}`}
                              onClick={() => removeAssignment(assignment!.id)}
                            >
                              {shift.short_code}
                              <div className="absolute -right-1 -top-1 hidden h-3 w-3 items-center justify-center rounded-full bg-destructive text-[8px] text-destructive-foreground group-hover:flex">
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
