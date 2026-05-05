self.addEventListener('push', function(event) {
  if (event.data) {
    const data = event.data.json();
    
    // Default options for normal messages
    let options = {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      vibrate: [100, 50, 100],
      data: {
        url: data.url || '/'
      }
    };

    // If it's a Call, make it persistent and ring/vibrate aggressively
    if (data.type === 'call') {
      options.requireInteraction = true;
      options.vibrate = [500, 250, 500, 250, 500, 250, 500, 250, 500]; // simulate ringing
      options.tag = 'incoming-call'; // Replace old call notifications
      // Some browsers support actions on push notifications
      options.actions = [
        { action: 'answer', title: 'Answer' },
        { action: 'decline', title: 'Decline' }
      ];
    }

    event.waitUntil(
      self.registration.showNotification(data.title || 'Connectly', options)
    );
  }
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  // If user clicks "decline", just close it
  if (event.action === 'decline') {
    return;
  }

  // Otherwise, open the app
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(windowClients => {
      // Check if there is already a window/tab open with the target URL
      for (let i = 0; i < windowClients.length; i++) {
        let client = windowClients[i];
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url);
      }
    })
  );
});
