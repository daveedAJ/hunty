/**
 * NotificationsProvider
 *
 * Centralises all expo-notifications subscription management:
 *  - Configures the notification handler on mount.
 *  - Listens for incoming notifications (foreground + background).
 *  - Listens for notification taps and drives deep-link navigation.
 *  - Handles the last-response that arrived before the app opened (cold-start).
 *  - Cleans up all subscriptions on unmount.
 *
 * Wrap this provider inside Web3Provider so wallet state is available when
 * handling navigation targets.
 */

import React, { createContext, useContext, useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import {
  configureNotificationHandler,
  ensureAndroidChannel,
  extractPayload,
  extractResponsePayload,
} from '@services/notifications/notificationService';
import { resolveNavTarget } from '@services/notifications/types';

// ─── Context (exposed for convenience hooks) ──────────────────────────────────

interface NotificationsContextValue {
  /** Shortcut to check if a subscription is active — always true while mounted */
  isListening: boolean;
}

const NotificationsContext = createContext<NotificationsContextValue>({ isListening: false });

export function useNotificationsContext(): NotificationsContextValue {
  return useContext(NotificationsContext);
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const isListeningRef = useRef(false);

  useEffect(() => {
    // Configure handler as early as possible so foreground notifications show
    configureNotificationHandler();

    // Ensure Android channel exists
    void ensureAndroidChannel();

    isListeningRef.current = true;

    // ── Foreground notification listener ──────────────────────────────────
    const receiveSubscription = Notifications.addNotificationReceivedListener((notification) => {
      const payload = extractPayload(notification);
      if (__DEV__) console.log('[Notifications] Received:', payload);
    });

    // ── Tap / interaction listener ────────────────────────────────────────
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const payload = extractResponsePayload(response);
        if (!payload) return;
        const { path } = resolveNavTarget(payload);
        if (__DEV__) console.log('[Notifications] Tapped → navigating to:', path);
        router.push(path as Parameters<typeof router.push>[0]);
      },
    );

    // ── Cold-start: handle the last notification the user tapped before ───
    // ── the app was fully open ────────────────────────────────────────────
    Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (!response) return;
        const payload = extractResponsePayload(response);
        if (!payload) return;
        const { path } = resolveNavTarget(payload);
        if (__DEV__) console.log('[Notifications] Cold-start → navigating to:', path);
        router.push(path as Parameters<typeof router.push>[0]);
      })
      .catch(() => {
        // Non-critical — ignore failures
      });

    return () => {
      receiveSubscription.remove();
      responseSubscription.remove();
      isListeningRef.current = false;
    };
  }, [router]);

  return (
    <NotificationsContext.Provider value={{ isListening: isListeningRef.current }}>
      {children}
    </NotificationsContext.Provider>
  );
};
