interface ScheduleCostRowProps {
  days: number[];
  dailyCosts: Record<number, number>;
  totalMonthlyCost: number;
  isWeekend: (day: number) => boolean;
}

export function ScheduleCostRow({ days, dailyCosts, totalMonthlyCost, isWeekend }: ScheduleCostRowProps) {
  return (
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
  );
}
