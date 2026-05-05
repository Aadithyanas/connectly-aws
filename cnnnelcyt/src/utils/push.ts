import webpush from 'web-push';
import { query } from '../db';
import dotenv from 'dotenv';
dotenv.config();

// Configure web-push with VAPID keys
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:test@example.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

export const sendPushNotification = async (userId: string, payload: any) => {
  try {
    const result = await query('SELECT * FROM push_subscriptions WHERE user_id = $1', [userId]);
    const subscriptions = result.rows;

    if (!subscriptions || subscriptions.length === 0) return;

    for (const sub of subscriptions) {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth
        }
      };

      try {
        await webpush.sendNotification(pushSubscription, JSON.stringify(payload));
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          // Subscription has expired or is no longer valid, delete it
          await query('DELETE FROM push_subscriptions WHERE endpoint = $1', [sub.endpoint]);
        } else {
          console.error('[Web Push] Error sending notification to user', userId, err);
        }
      }
    }
  } catch (err) {
    console.error('[Web Push] DB Error fetching subscriptions:', err);
  }
};
