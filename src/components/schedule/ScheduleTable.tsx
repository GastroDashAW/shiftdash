import { useState, DragEvent } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GripVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Employee, ShiftType, Assignment, ScheduleEvent } from '@/types';
import { ScheduleEventRow } from './ScheduleEventRow';
import { ScheduleCostRow } from './ScheduleCostRow';

interface CostCenterGroup {
  costCenter: string;
  employees: Employee[];
}

interface ScheduleTableProps {
  year: number;
  month: number; // 0-indexed
  days: number[];
  daysInMonth: number;
  costCenterGroups: CostCenterGroup[];
  customEmployeeOrder: string[] | null;
  isAdmin: boolean;
  // Data lookups
  getAssignment: (employeeId: string, day: number) => Assignment | undefined;
  getShiftById: (id: string) => ShiftType | undefined;
  getEvent: (day: number) => ScheduleEvent | undefined;
  // Violations
  violationCells: Set<string>;
  // Drag-drop handlers
  handleDragOver: (e: DragEvent) => void;
  handleDrop: (e: DragEvent, employeeId: string, day: number) => void;
  handleCellDragStart: (e: DragEvent, assignment: Assignment) => void;
  removeAssignment: (assignmentId: string) => void;
  // Row reorder
  onRowReorder: (sourceId: string, targetId: string) => void;
  // Cost row
  dailyCosts: Record<number, number>;
  totalMonthlyCost: number;
  // Events
  onEventSaved: () => void;
  // Employees count
  employeeCount: number;
}

function formatTime(t: string | null) {
  return t ? t.slice(0, 5) : '';
}

export function ScheduleTable({
  year, month, days, daysInMonth,
  costCenterGroups, customEmployeeOrder,
  isAdmin,
  getAssignment, getShiftById, getEvent,
  violationCells,
  handleDragOver, handleDrop, handleCellDragStart, removeAssignment,
  onRowReorder,
  dailyCosts, totalMonthlyCost,
  onEventSaved,
  employeeCount,
}: ScheduleTableProps) {
  const [dragRowId, setDragRowId] = useState<string | null>(null);
  const [mobileTooltip, setMobileTooltip] = useState<{ empId: string; day: number } | null>(null);

  const getDayOfWeek = (day: number) => {
    const date = new Date(year, month, day);
    return date.toLocaleDateString('de-CH', { weekday: 'short' });
  };

  const isWeekend = (day: number) => {
    const date = new Date(year, month, day);
    return date.getDay() === 0 || date.getDay() === 6;
  };

  const handleRowDragStart = (e: DragEvent, empId: string) => {
    e.dataTransfer.setData('text/row-reorder', empId);
    e.dataTransfer.effectAllowed = 'move';
    setDragRowId(empId);
  };

  const handleRowDragOver = (e: DragEvent) => {
    if (!e.dataTransfer.types.includes('text/row-reorder')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleRowDrop = (e: DragEvent, targetEmpId: string) => {
    const sourceId = e.dataTransfer.getData('text/row-reorder');
    if (!sourceId || sourceId === targetEmpId) { setDragRowId(null); return; }
    e.preventDefault();
    onRowReorder(sourceId, targetEmpId);
    setDragRowId(null);
  };

  return (
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
              <ScheduleEventRow
                days={days}
                year={year}
                month={month}
                getEvent={getEvent}
                isAdmin={isAdmin}
                onEventSaved={onEventSaved}
              />
            </thead>
            <tbody>
              {costCenterGroups.map(group => (
                <>
                  {group.costCenter && !customEmployeeOrder && (
                    <tr key={`cc-${group.costCenter}`} className="bg-muted/40">
                      <td colSpan={daysInMonth + 1} className="sticky left-0 px-3 py-1 text-[10px] font-heading font-semibold uppercase tracking-wider text-muted-foreground print:static print:px-1 print:text-[8px]">
                        {group.costCenter || 'Ohne Kostenstelle'}
                      </td>
                    </tr>
                  )}
                  {group.employees.map(emp => (
                    <tr
                      key={emp.id}
                      className={`border-b last:border-0 hover:bg-muted/30 print:hover:bg-transparent transition-colors ${dragRowId === emp.id ? 'opacity-40' : ''}`}
                      onDragOver={isAdmin ? handleRowDragOver : undefined}
                      onDrop={isAdmin ? (e) => handleRowDrop(e, emp.id) : undefined}
                    >
                      <td className="sticky left-0 z-10 bg-card px-3 py-2 whitespace-nowrap print:static print:px-1 print:py-1">
                        <div className="flex items-center gap-1.5">
                          {isAdmin && (
                            <div
                              draggable
                              onDragStart={(e) => handleRowDragStart(e as unknown as DragEvent, emp.id)}
                              onDragEnd={() => setDragRowId(null)}
                              className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground print:hidden shrink-0"
                            >
                              <GripVertical className="h-3.5 w-3.5" />
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-xs print:text-[9px]">{emp.first_name} {emp.last_name}</div>
                            <div className="text-[10px] text-muted-foreground print:text-[8px]">{emp.position}</div>
                          </div>
                        </div>
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
                                onClick={() => {
                                  if (shift.start_time && shift.end_time) {
                                    setMobileTooltip({ empId: emp.id, day });
                                    setTimeout(() => setMobileTooltip(null), 3000);
                                  }
                                }}
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
                                <AnimatePresence>
                                  {mobileTooltip?.empId === emp.id && mobileTooltip?.day === day && (
                                    <motion.div
                                      initial={{ opacity: 0, y: 4, scale: 0.95 }}
                                      animate={{ opacity: 1, y: 0, scale: 1 }}
                                      exit={{ opacity: 0, y: 4, scale: 0.95 }}
                                      transition={{ duration: 0.15 }}
                                      className="absolute -top-10 left-1/2 -translate-x-1/2 z-50 whitespace-nowrap rounded bg-foreground px-2 py-1 text-[10px] font-medium text-background shadow-lg print:hidden pointer-events-none"
                                    >
                                      {shift.name} {formatTime(shift.start_time)}–{formatTime(shift.end_time)}
                                      <div className="absolute left-1/2 -translate-x-1/2 top-full h-0 w-0 border-x-4 border-t-4 border-x-transparent border-t-foreground" />
                                    </motion.div>
                                  )}
                                </AnimatePresence>
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
              {isAdmin && employeeCount > 0 && (
                <ScheduleCostRow
                  days={days}
                  dailyCosts={dailyCosts}
                  totalMonthlyCost={totalMonthlyCost}
                  isWeekend={isWeekend}
                />
              )}
              {employeeCount === 0 && (
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
  );
}
