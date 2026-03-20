import { useNavigate } from 'react-router-dom';
import { useShiftReminder } from '@/hooks/useShiftReminder';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock } from 'lucide-react';

export function ShiftReminderBanner() {
  const banner = useShiftReminder();
  const navigate = useNavigate();

  return (
    <AnimatePresence>
      {banner && (
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.3 }}
          className={`sticky top-0 z-50 flex items-center justify-between gap-3 px-4 py-3 text-sm font-medium ${
            banner.type === 'start'
              ? 'bg-destructive text-destructive-foreground'
              : 'bg-warning text-warning-foreground'
          }`}
        >
          <span className="flex-1">{banner.message}</span>
          <Button
            size="sm"
            variant="secondary"
            className="flex-shrink-0 gap-1.5"
            onClick={() => navigate('/clock')}
          >
            <Clock className="h-3.5 w-3.5" />
            {banner.type === 'start' ? 'Einstempeln' : 'Ausstempeln'}
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
