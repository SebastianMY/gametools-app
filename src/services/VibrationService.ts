import * as Haptics from 'expo-haptics';

/**
 * VibrationService encapsulates Expo Haptics for haptic feedback.
 * Provides graceful fallback on devices that do not support haptics.
 * Per ADR-006 and ADR-020: relies on Expo Haptics' built-in graceful
 * fallback — all methods silently no-op on unsupported devices.
 */
class VibrationService {
  /**
   * Trigger a single haptic notification pulse.
   * Maps to Haptics.notificationAsync(NotificationFeedbackType.Success).
   */
  async triggerNotification(): Promise<void> {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // Silently ignore errors on unsupported devices (ADR-020)
    }
  }

  /**
   * Trigger a success haptic pattern: two short pulses ~75ms apart.
   */
  async triggerSuccess(): Promise<void> {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await new Promise<void>(resolve => setTimeout(resolve, 75));
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // Silently ignore errors on unsupported devices (ADR-020)
    }
  }

  /**
   * Trigger an error haptic pattern: three quick pulses ~50ms apart.
   */
  async triggerError(): Promise<void> {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      await new Promise<void>(resolve => setTimeout(resolve, 50));
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await new Promise<void>(resolve => setTimeout(resolve, 50));
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      // Silently ignore errors on unsupported devices (ADR-020)
    }
  }
}

export default new VibrationService();
