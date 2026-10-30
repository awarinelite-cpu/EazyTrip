// public/firebase-messaging-sw.js
// This file MUST be in the /public folder

importScripts("https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey:            "AIzaSyAPBK_l-NHx2LfEyWGf-GpExXgWqT3QCnY",
  authDomain:        "rider-s-901dc.firebaseapp.com",
  projectId:         "rider-s-901dc",
  storageBucket:     "rider-s-901dc.firebasestorage.app",
  messagingSenderId: "674894824291",
  appId:             "1:674894824291:web:86e891bfe27bb361908956",
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
