import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { backendUrl, backendPublishableKey } from '@/lib/backend-config';

const VAPID_PUBLIC_KEY = 'BBwcddUTutV3JjgkcVRui3uT3sKgA3A7ErhhMTFAqHN5ugKVyqyOtL2EX9P4lnxhSUousxarNVnniAN8e1-fF8Q';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const { user, employeeId } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setIsSupported(supported);
    if (supported) {
      setPermission(Notification.permission);
    }
  }, []);

  // Check existing subscription
  useEffect(() => {
    if (!isSupported || !user) return;
    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setIsSubscribed(!!sub);
    }).catch(() => {});
  }, [isSupported, user]);

  const subscribe = useCallback(async () => {
    if (!isSupported || !user || !employeeId) return false;

    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') return false;

      // Register service worker if not already
      const registration = await navigator.serviceWorker.register('/sw-push.js', { scope: '/' });
      await navigator.serviceWorker.ready;

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      // Save to database
      const subJson = subscription.toJSON();
      const { error } = await supabase.from('push_subscriptions' as any).upsert(
        {
          user_id: user.id,
          employee_id: employeeId,
          subscription: subJson,
        },
        { onConflict: 'user_id' }
      );

      if (error) {
        console.error('[Push] Save subscription error:', error);
        return false;
      }

      setIsSubscribed(true);
      return true;
    } catch (err) {
      console.error('[Push] Subscribe error:', err);
      return false;
    }
  }, [isSupported, user, employeeId]);

  const unsubscribe = useCallback(async () => {
    if (!isSupported || !user) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();

      await supabase.from('push_subscriptions' as any).delete().eq('user_id', user.id);
      setIsSubscribed(false);
    } catch (err) {
      console.error('[Push] Unsubscribe error:', err);
    }
  }, [isSupported, user]);

  return { isSupported, permission, isSubscribed, subscribe, unsubscribe };
}
