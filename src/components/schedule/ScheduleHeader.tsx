import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Printer } from 'lucide-react';
import { MONTHS } from '@/constants';

interface ScheduleHeaderProps {
  year: number;
  month: number; // 0-indexed
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onPrint: () => void;
}

export function ScheduleHeader({ year, month, onPrevMonth, onNextMonth, onPrint }: ScheduleHeaderProps) {
  return (
    <div className="flex items-center justify-between print:mb-2">
      <h1 className="font-heading text-2xl font-bold print:text-xl">Dienstplan</h1>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={onPrint} className="print:hidden" title="Drucken">
          <Printer className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" onClick={onPrevMonth} className="print:hidden">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="font-heading font-semibold min-w-[140px] text-center">
          {MONTHS[month]} {year}
        </span>
        <Button variant="outline" size="icon" onClick={onNextMonth} className="print:hidden">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
