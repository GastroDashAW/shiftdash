import { DragEvent } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { ShiftType } from '@/types';

interface ScheduleShiftPaletteProps {
  shiftTypes: ShiftType[];
  isAdmin: boolean;
  showLegend: boolean;
  onToggleLegend: () => void;
  onPaletteDragStart: (e: DragEvent, shiftId: string) => void;
}

function formatTime(t: string | null) {
  return t ? t.slice(0, 5) : '';
}

export function ScheduleShiftPalette({ shiftTypes, isAdmin, showLegend, onToggleLegend, onPaletteDragStart }: ScheduleShiftPaletteProps) {
  return (
    <Card className="print:border print:shadow-none">
      <CardHeader className="py-3 print:py-1">
        <button
          type="button"
          onClick={onToggleLegend}
          className="flex w-full items-center justify-between"
        >
          <CardTitle className="text-sm print:text-xs">
            {isAdmin ? 'Dienste (ziehen & ablegen)' : 'Legende'}
          </CardTitle>
          {showLegend
            ? <ChevronUp className="h-4 w-4 text-muted-foreground print:hidden" />
            : <ChevronDown className="h-4 w-4 text-muted-foreground print:hidden" />
          }
        </button>
      </CardHeader>
      {showLegend && (
        <CardContent className="flex flex-wrap gap-2 pb-3 print:pb-2 print:gap-1">
          {shiftTypes.map(shift => (
            <div
              key={shift.id}
              draggable={isAdmin}
              onDragStart={isAdmin ? e => onPaletteDragStart(e, shift.id) : undefined}
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
      )}
    </Card>
  );
}
