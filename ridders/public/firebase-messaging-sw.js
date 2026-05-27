// public/firebase-messaging-sw.js
// This file MUST be in the /public folder

importScripts("https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey:            "YOUR_API_KEY",
  authDomain:        "YOUR_PROJECT.firebaseapp.com",
  projectId:         "YOUR_PROJECT_ID",
  storageBucket:     "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId:             "YOUR_APP_ID",
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {};
  self.registration.showNotification(title || "Ridders", {
    body:  body || "",
    icon:  "/logo192.png",
    badge: "/logo192.png",
    data:  payload.data,
    actions: [
      { action: "open",    title: "Open app" },
      { action: "dismiss", title: "Dismiss"  },
    ],
  });
});

// Handle notification click
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  if (event.action === "dismiss") return;
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes("ridders") && "focus" in client)
          return client.focus();
      }
      if (clients.openWindow) return clients.openWindow("/");
    })
  );
});
