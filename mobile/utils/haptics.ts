import { Platform } from 'react-native';

// Dynamically import expo-haptics to ensure safety and graceful fallback on non-native platforms (e.g. web/simulators)
let Haptics: any = null;

try {
  if (Platform.OS === 'ios' || Platform.OS === 'android') {
    Haptics = require('expo-haptics');
  }
} catch (error) {
  console.warn('Failed to load expo-haptics:', error);
}

/**
 * Safe wrapper for triggering notification feedback (success, warning, error).
 */
export async function triggerNotification(type: 'success' | 'warning' | 'error'): Promise<void> {
  if (!Haptics) return;

  try {
    let feedbackType;
    switch (type) {
      case 'success':
        feedbackType = Haptics.NotificationFeedbackType.Success;
        break;
      case 'warning':
        feedbackType = Haptics.NotificationFeedbackType.Warning;
        break;
      case 'error':
        feedbackType = Haptics.NotificationFeedbackType.Error;
        break;
    }

    if (feedbackType !== undefined) {
      await Haptics.notificationAsync(feedbackType);
    }
  } catch (error) {
    console.warn(`Haptics.notificationAsync(${type}) failed:`, error);
  }
}

/**
 * Safe wrapper for triggering impact feedback (light, medium, heavy).
 */
export async function triggerImpact(style: 'light' | 'medium' | 'heavy'): Promise<void> {
  if (!Haptics) return;

  try {
    let impactStyle;
    switch (style) {
      case 'light':
        impactStyle = Haptics.ImpactFeedbackStyle.Light;
        break;
      case 'medium':
        impactStyle = Haptics.ImpactFeedbackStyle.Medium;
        break;
      case 'heavy':
        impactStyle = Haptics.ImpactFeedbackStyle.Heavy;
        break;
    }

    if (impactStyle !== undefined) {
      await Haptics.impactAsync(impactStyle);
    }
  } catch (error) {
    console.warn(`Haptics.impactAsync(${style}) failed:`, error);
  }
}

/**
 * Safe wrapper for selection haptic feedback.
 */
export async function triggerSelection(): Promise<void> {
  if (!Haptics) return;

  try {
    await Haptics.selectionAsync();
  } catch (error) {
    console.warn('Haptics.selectionAsync failed:', error);
  }
}

/**
 * Semantic tactile triggers for key in-game activities
 */
export const hapticTriggers = {
  /** Triggered on successful joins (e.g. registered/started a hunt successfully) */
  joinSuccess: () => triggerNotification('success'),
  
  /** Triggered on scanning items (e.g. QR codes or location beacons) */
  scanSuccess: () => triggerImpact('medium'),
  scanSubtle: () => triggerImpact('light'),
  
  /** Triggered on action or task completions / reward claims */
  taskSuccess: () => triggerNotification('success'),
  rewardHeavy: () => triggerImpact('heavy'),
};
