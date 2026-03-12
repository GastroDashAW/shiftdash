import { BRANDING } from '@/config/branding';
import { AlertTriangle } from 'lucide-react';

export function StagingBanner() {
  if (!BRANDING.isStaging) return null;

  return (
    <div className="bg-warning text-warning-foreground text-center text-xs font-medium py-1 px-2 flex items-center justify-center gap-1.5">
      <AlertTriangle className="h-3 w-3" />
      {BRANDING.stagingLabel}
    </div>
  );
}
