/**
 * Local push notifications for low stock alerts.
 * Uses expo-notifications for scheduling and displaying notifications.
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { AndroidImportance } from 'expo-notifications/build/NotificationChannelManager.types';

import { getStockAlerts } from '@/db/repos/metrics';
import type { SQLiteDatabase } from 'expo-sqlite';
import type { StockAlert } from '@/db/types';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const NOTIFICATION_CHANNEL_ID = 'low-stock-alerts';
const LOW_STOCK_CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
const NOTIFICATION_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours cooldown per product

interface NotificationState {
  lastNotified: Record<string, number>; // alertId -> timestamp
}

const STORAGE_KEY = 'pyme.notifications.state';

async function loadNotificationState(): Promise<NotificationState> {
  try {
    const { Storage } = await import('expo-sqlite/kv-store');
    const raw = Storage.getItemSync(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as NotificationState) : { lastNotified: {} };
  } catch {
    return { lastNotified: {} };
  }
}

async function saveNotificationState(state: NotificationState): Promise<void> {
  try {
    const { Storage } = await import('expo-sqlite/kv-store');
    Storage.setItemSync(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn('Failed to save notification state:', error);
  }
}

/**
 * Requests notification permissions from the user.
 * Call this on app startup or when enabling notifications in settings.
 */
export async function requestNotificationPermissions(): Promise<boolean> {
  if (!Device.isDevice) {
    console.log('Notifications only work on physical devices');
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Notification permissions not granted');
    return false;
  }

  // Configure Android notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
      name: 'Stock Bajo',
      importance: AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#F59E0B', // amber/warning color
      description: 'Alertas cuando el stock de productos o insumos está por debajo del mínimo',
    });
  }

  return true;
}

/**
 * Checks current stock levels and sends notifications for low stock items.
 * Respects cooldown period to avoid spam.
 */
export async function checkAndNotifyLowStock(db: SQLiteDatabase): Promise<void> {
  const alerts = await getStockAlerts(db, '00000000-0000-4000-8000-000000000001');
  if (alerts.length === 0) return;

  const state = await loadNotificationState();
  const now = Date.now();
  let hasUpdates = false;

  for (const alert of alerts) {
    const alertId = `${alert.kind}-${alert.id}`;
    const lastNotified = state.lastNotified[alertId] ?? 0;

    // Check cooldown
    if (now - lastNotified < NOTIFICATION_COOLDOWN_MS) {
      continue;
    }

    // Send notification
    await sendLowStockNotification(alert);
    state.lastNotified[alertId] = now;
    hasUpdates = true;
  }

  if (hasUpdates) {
    await saveNotificationState(state);
  }
}

/**
 * Sends a single low stock notification.
 */
async function sendLowStockNotification(alert: StockAlert): Promise<void> {
  const title = '⚠️ Stock bajo';
  const body = `${alert.name}: quedan ${alert.stock} ${alert.unit} (mínimo: ${alert.minStock})`;

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: {
        type: 'low_stock',
        alertId: `${alert.kind}-${alert.id}`,
        kind: alert.kind,
        name: alert.name,
      },
      sound: true,
      priority: Notifications.AndroidNotificationPriority.HIGH,
    },
    trigger: null, // Send immediately
    identifier: `low-stock-${alert.kind}-${alert.id}-${Date.now()}`,
  });
}

/**
 * Schedules periodic low stock checks.
 * Call this on app startup when user has granted permissions.
 */
export function schedulePeriodicLowStockChecks(db: SQLiteDatabase): () => void {
  // Initial check after a short delay
  const initialTimeout = setTimeout(() => {
    checkAndNotifyLowStock(db).catch(console.error);
  }, 5000);

  // Periodic checks
  const interval = setInterval(() => {
    checkAndNotifyLowStock(db).catch(console.error);
  }, LOW_STOCK_CHECK_INTERVAL_MS);

  // Return cleanup function
  return () => {
    clearTimeout(initialTimeout);
    clearInterval(interval);
  };
}

/**
 * Cancels all scheduled low stock notifications.
 */
export async function cancelAllLowStockNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/**
 * Gets the count of pending low stock notifications.
 */
export async function getPendingLowStockNotificationsCount(): Promise<number> {
  const notifications = await Notifications.getAllScheduledNotificationsAsync();
  return notifications.filter((n) => n.identifier?.startsWith('low-stock-')).length;
}

/**
 * Notification payload type for handling taps.
 */
export type LowStockNotificationData = {
  type: 'low_stock';
  alertId: string;
  kind: 'product' | 'supply';
  name: string;
};

/**
 * Checks if a notification response is a low stock notification.
 */
export function isLowStockNotification(
  response: Notifications.NotificationResponse,
): response is Notifications.NotificationResponse & { notification: { request: { content: { data: LowStockNotificationData } } } } {
  return response.notification.request.content.data?.type === 'low_stock';
}