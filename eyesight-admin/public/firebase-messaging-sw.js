importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// Firebase configuration - Eye-Sight App
const firebaseConfig = {
  apiKey: 'AIzaSyAwOsfS1X4IMFP-wU9VdHMCU0dR4A7H1Rg',
  authDomain: 'vnb-clinic-management.firebaseapp.com',
  projectId: 'vnb-clinic-management',
  storageBucket: 'vnb-clinic-management.firebasestorage.app',
  messagingSenderId: '973836519597',
  appId: '1:973836519597:web:d6235cf35a651dd4531e24',
  measurementId: 'G-RTZ7TQ92DX',
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Create broadcast channel for communication with main thread
const broadcastChannel = new BroadcastChannel('firebase-messages');

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('Received background message:', payload);

  // Broadcast message to all open tabs
  broadcastChannel.postMessage(payload);

  const notificationTitle = payload.notification?.title || 'Thông báo';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: '/logo.png',
    badge: '/badge.png',
    data: payload.data || {},
    tag: payload.data?.type || 'default',
    requireInteraction: false,
  };

  // Show notification
  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event.notification);

  event.notification.close();

  // Handle different notification types
  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Focus existing window if available
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // Open new window if no existing window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

