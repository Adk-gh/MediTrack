// src/utils/notifier.js
// Lightweight wrapper around the browser Notification API.
// Falls back to console logging if notifications aren't supported/permitted.

let permissionRequested = false;

async function ensurePermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;

  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;

  if (!permissionRequested) {
    permissionRequested = true;
    try {
      const result = await Notification.requestPermission();
      return result === 'granted';
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * Fire a browser notification (if permitted) for a given user event.
 * @param {Object} params
 * @param {string} params.userId - The user this notification is for (used for scoping/logging).
 * @param {string} [params.type] - Notification type/category.
 * @param {string} params.title - Notification title.
 * @param {string} [params.message] - Notification body text.
 */
export async function sendNotification({ userId, type, title, message } = {}) {
  if (!title) return;

  try {
    const allowed = await ensurePermission();
    if (!allowed) {
      console.log(`[notifier] (no permission) ${type || 'notification'} for ${userId}: ${title}`);
      return;
    }

    // Avoid spamming notifications if the tab is already focused/visible
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
      return;
    }

    new Notification(title, {
      body: message || '',
      icon: '/favicon.ico',
      tag: type || 'meditrack-notification',
    });
  } catch (err) {
    console.error('[notifier] Failed to send notification:', err);
  }
}

export default { sendNotification };