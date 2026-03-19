import { DragEvent } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Assignment } from '@/types';

type DragData =
  | { type: 'palette'; shiftId: string }
  | { type: 'cell'; assignmentId: string; shiftId: string; employeeId: string; day: number };

interface UseScheduleDragDropParams {
  year: number;
  month: number; // 0-indexed
  isAdmin: boolean;
  getAssignment: (employeeId: string, day: number) => Assignment | undefined;
  loadData: () => void;
}

export function useScheduleDragDrop({ year, month, isAdmin, getAssignment, loadData }: UseScheduleDragDropParams) {
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

  return {
    handlePaletteDragStart,
    handleCellDragStart,
    handleDragOver,
    handleDrop,
    removeAssignment,
  };
}
