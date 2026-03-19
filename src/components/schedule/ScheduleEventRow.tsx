import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import type { ScheduleEvent } from '@/types';

interface ScheduleEventRowProps {
  days: number[];
  year: number;
  month: number; // 0-indexed
  getEvent: (day: number) => ScheduleEvent | undefined;
  isAdmin: boolean;
  onEventSaved: () => void;
}

export function ScheduleEventRow({ days, year, month, getEvent, isAdmin, onEventSaved }: ScheduleEventRowProps) {
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [eventText, setEventText] = useState('');

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

    setEditingDay(null);
    setEventText('');
    onEventSaved();
  };

  return (
    <tr className="border-b bg-accent/10">
      <th className="sticky left-0 z-10 bg-accent/10 px-3 py-1 text-left text-[10px] font-medium text-foreground print:static print:px-1 print:text-[8px]">
        Anlass
      </th>
      {days.map(day => {
        const ev = getEvent(day);
        return (
          <td key={day} className="px-0.5 py-1 text-center min-w-[40px] print:min-w-[22px] print:px-0">
            {isAdmin && editingDay === day ? (
              <Input
                className="h-5 w-full min-w-[36px] text-[9px] px-1 py-0"
                value={eventText}
                onChange={e => setEventText(e.target.value)}
                onBlur={() => saveEvent(day)}
                onKeyDown={e => {
                  if (e.key === 'Enter') saveEvent(day);
                  if (e.key === 'Escape') { setEditingDay(null); setEventText(''); }
                }}
                autoFocus
              />
            ) : (
              <div
                className={`mx-auto min-h-[18px] rounded px-0.5 text-[9px] leading-tight text-foreground truncate max-w-[38px] print:text-[7px] print:max-w-[20px] ${isAdmin ? 'cursor-pointer hover:bg-accent/30' : ''}`}
                title={ev?.label || (isAdmin ? 'Klicken zum Eintragen' : '')}
                onClick={isAdmin ? () => { setEditingDay(day); setEventText(ev?.label || ''); } : undefined}
              >
                {ev?.label || ''}
              </div>
            )}
          </td>
        );
      })}
    </tr>
  );
}
