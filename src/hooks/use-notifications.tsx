/**
 * Notification provider for managing push notifications lifecycle.
 */

import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { requestNotificationPermissions, schedulePeriodicLowStockChecks, cancelAllLowStockNotifications } from '@/lib/notifications';
import { useBackup } from '@/hooks/use-backup';

export function NotificationProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const { account, autoBackup } = useBackup();
  const cleanupRef = useRef<(() => void) | null>(null);
  const permissionsRequestedRef = useRef(false);

  const initializeNotifications = useCallback(async () => {
    // Only request permissions once
    if (permissionsRequestedRef.current) return;
    permissionsRequestedRef.current = true;

    const granted = await requestNotificationPermissions();
    if (granted && autoBackup && account) {
      // Start periodic checks if user has auto-backup enabled (indicates they want cloud features)
      cleanupRef.current = schedulePeriodicLowStockChecks(db);
    }
  }, [autoBackup, account, db]);

  const handleAppStateChange = useCallback((nextState: string) => {
    if (nextState === 'active') {
      // Re-check permissions and restart checks when app becomes active
      initializeNotifications();
    }
  }, [initializeNotifications]);

  useEffect(() => {
    initializeNotifications();

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [initializeNotifications, handleAppStateChange]);

  // Cleanup on unmount or when autoBackup/account changes
  useEffect(() => {
    if (!autoBackup || !account) {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
      cancelAllLowStockNotifications();
    } else if (cleanupRef.current === null) {
      // Restart if we have permissions
      initializeNotifications();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoBackup, account]);

  return <>{children}</>;
}