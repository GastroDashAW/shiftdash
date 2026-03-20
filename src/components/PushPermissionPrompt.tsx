import { useState } from 'react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const DISMISSED_KEY = 'shiftdash-push-prompt-dismissed';

export function PushPermissionPrompt() {
  const { isSupported, permission, isSubscribed, subscribe } = usePushNotifications();
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem(DISMISSED_KEY) === '1');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Don't show if not supported, already subscribed/granted, or dismissed
  if (!isSupported || isSubscribed || permission === 'granted' || permission === 'denied' || dismissed) {
    return null;
  }

  const handleSubscribe = async () => {
    setLoading(true);
    const ok = await subscribe();
    setLoading(false);
    if (ok) setSuccess(true);
  };

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISSED_KEY, '1');
    setDismissed(true);
  };

  return (
    <AnimatePresence>
      {!success ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="flex items-start gap-4 p-4">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Bell className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-heading text-sm font-semibold text-foreground">Schicht-Erinnerungen aktivieren</h4>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  Erhalte eine Benachrichtigung 5 Minuten vor Schichtbeginn und wenn deine Schicht zu Ende geht.
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <Button size="sm" onClick={handleSubscribe} disabled={loading} className="text-xs">
                    {loading ? 'Aktivieren...' : 'Erinnerungen aktivieren'}
                  </Button>
                  <button onClick={handleDismiss} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                    Später
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 rounded-lg bg-success/10 border border-success/20 p-3 text-sm text-success"
        >
          <Check className="h-4 w-4" />
          Erinnerungen aktiviert ✓
        </motion.div>
      )}
    </AnimatePresence>
  );
}
