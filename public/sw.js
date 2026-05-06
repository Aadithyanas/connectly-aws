// ── Connectly Service Worker ──────────────────────────────────────────────────
// Handles push notifications for calls and messages when the app is closed.

self.addEventListener('push', function(event) {
  if (!event.data) return;
  
  const data = event.data.json();
  
  // Default options for normal messages
  let options = {
    body: data.body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    silent: false, // Allow the system notification sound to play
    data: {
      url: data.url || '/',
      type: data.type || 'message'
    }
  };

  // If it's a Call, make it persistent and ring/vibrate aggressively
  if (data.type === 'call') {
    options.requireInteraction = true; // Keep notification visible until user acts
    options.vibrate = [
      500, 200, 500, 200, 500, 200,  // Ring pattern 1
      500, 200, 500, 200, 500, 200,  // Ring pattern 2
      500, 200, 500, 200, 500        // Ring pattern 3
    ];
    options.tag = 'incoming-call'; // Replace old call notifications
    options.renotify = true; // Re-alert even if same tag
    options.silent = false; // Ensure system sound plays
    options.actions = [
      { action: 'answer', title: '📞 Answer' },
      { action: 'decline', title: '❌ Decline' }
    ];
    options.body = `📞 ${data.caller?.name || 'Someone'} is calling you...`;
  }

  // Create a promise to show the notification
  const showNotificationPromise = self.registration.showNotification(data.title || 'Connectly', options);

  // Create a promise to tell the server the message was actually received by the device
  let reportDeliveryPromise = Promise.resolve();
  if (data.messageId && data.chatId) {
    const apiUrl = self.location.hostname === 'localhost' 
      ? 'http://localhost:5000/api' 
      : 'https://api.aadithyan.in/api';
      
    reportDeliveryPromise = fetch(`${apiUrl}/messages/webhook/delivered`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messageId: data.messageId, chatId: data.chatId })
    }).catch(err => console.error('[SW] Webhook failed', err));
  }

  // Wait for both
  event.waitUntil(Promise.all([showNotificationPromise, reportDeliveryPromise]));
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  const data = event.notification.data || {};
  
  // If user clicks "decline", just close it
  if (event.action === 'decline') {
    return;
  }

  // Determine the URL to open
  const targetUrl = data.url || '/chat';

  // Otherwise, open/focus the app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      // Try to focus an existing window first
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if ('focus' in client) {
          return client.focus().then(focusedClient => {
            // Navigate to the call/chat if needed
            if (focusedClient && 'navigate' in focusedClient) {
              return focusedClient.navigate(targetUrl);
            }
          });
        }
      }
      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// Keep the service worker alive and responsive
self.addEventListener('activate', function(event) {
  event.waitUntil(clients.claim());
});
