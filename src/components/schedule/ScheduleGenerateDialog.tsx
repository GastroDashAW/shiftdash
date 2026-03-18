import { useState } from 'react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { CalendarIcon, Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface ScheduleGenerateDialogProps {
  onGenerate: (startDate: Date, endDate: Date) => void;
  generating: boolean;
  defaultMonth: Date;
}

export function ScheduleGenerateDialog({ onGenerate, generating, defaultMonth }: ScheduleGenerateDialogProps) {
  const [open, setOpen] = useState(false);
  // Default: first and last of displayed month
  const defaultStart = new Date(defaultMonth.getFullYear(), defaultMonth.getMonth(), 1);
  const defaultEnd = new Date(defaultMonth.getFullYear(), defaultMonth.getMonth() + 1, 0);
  const [startDate, setStartDate] = useState<Date>(defaultStart);
  const [endDate, setEndDate] = useState<Date>(defaultEnd);

  // Reset dates when dialog opens
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setStartDate(new Date(defaultMonth.getFullYear(), defaultMonth.getMonth(), 1));
      setEndDate(new Date(defaultMonth.getFullYear(), defaultMonth.getMonth() + 1, 0));
    }
    setOpen(isOpen);
  };

  const handleConfirm = () => {
    onGenerate(startDate, endDate);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="lg" disabled={generating} className="w-full gap-3 text-base font-semibold py-6">
          <Wand2 className="h-5 w-5" />
          {generating ? 'Dienstplan wird erstellt...' : 'Automatisch erstellen'}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Dienstplan erstellen</DialogTitle>
          <DialogDescription>
            Wähle den Zeitraum, für den der Dienstplan automatisch generiert werden soll.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Von</label>
            <Popover modal={false}>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, 'dd.MM.yyyy') : 'Datum wählen'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={(d) => d && setStartDate(d)}
                  locale={de}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Bis</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, 'dd.MM.yyyy') : 'Datum wählen'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={(d) => d && setEndDate(d)}
                  locale={de}
                  disabled={(date) => date < startDate}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        {startDate && endDate && (
          <p className="text-sm text-muted-foreground">
            Zeitraum: {Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1} Tage
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Abbrechen</Button>
          <Button onClick={handleConfirm} disabled={!startDate || !endDate || endDate < startDate}>
            <Wand2 className="mr-2 h-4 w-4" />
            Erstellen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
