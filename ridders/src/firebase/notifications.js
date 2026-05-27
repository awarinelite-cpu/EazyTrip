import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./config";
import app from "./config";

// Add to your Firebase config:
// REACT_APP_FCM_VAPID_KEY=your_vapid_key_from_firebase_console

const VAPID_KEY = process.env.REACT_APP_FCM_VAPID_KEY || "YOUR_VAPID_KEY";

let messaging = null;

const getMessagingInstance = () => {
  if (!messaging) {
    try { messaging = getMessaging(app); } catch (e) { return null; }
  }
  return messaging;
};

// ── Register device for push notifications ────────────────────────
export const registerPushToken = async (userId) => {
  try {
    const msg = getMessagingInstance();
    if (!msg) return null;

    const permission = await Notification.requestPermission();
    if (permission !== "granted") return null;

    const token = await getToken(msg, { vapidKey: VAPID_KEY });
    if (!token) return null;

    // Save token to user's document
    await updateDoc(doc(db, "users", userId), {
      fcmToken:    token,
      updatedAt:   serverTimestamp(),
    });

    return token;
  } catch (err) {
    console.warn("Push registration failed:", err.message);
    return null;
  }
};

// ── Listen to foreground messages ────────────────────────────────
export const onForegroundMessage = (callback) => {
  const msg = getMessagingInstance();
  if (!msg) return () => {};
  return onMessage(msg, (payload) => {
    callback({
      title: payload.notification?.title || "Ridders",
      body:  payload.notification?.body  || "",
      data:  payload.data || {},
    });
  });
};

// ── Notification types and templates ─────────────────────────────
export const NOTIF_TEMPLATES = {
  DELIVERY_ACCEPTED: (riderName) => ({
    title: "🛵 Rider found!",
    body:  `${riderName} has accepted your delivery and is heading to pickup.`,
  }),
  RIDER_AT_PICKUP: () => ({
    title: "📦 Rider at pickup",
    body:  "Your rider has arrived at the pickup location.",
  }),
  IN_TRANSIT: () => ({
    title: "🚀 Package in transit",
    body:  "Your package is on its way to the recipient!",
  }),
  DELIVERED: () => ({
    title: "✅ Delivered!",
    body:  "Your package has been delivered successfully.",
  }),
  NEW_REQUEST: (pickup, dropoff, fare) => ({
    title: "📦 New delivery request",
    body:  `${pickup} → ${dropoff} · ₦${fare?.toLocaleString()}`,
  }),
  PAYOUT_PROCESSED: (amount) => ({
    title: "💰 Payout sent",
    body:  `Your withdrawal of ₦${amount?.toLocaleString()} has been processed.`,
  }),
  NEW_MESSAGE: (senderName, text) => ({
    title: `💬 ${senderName}`,
    body:  text?.slice(0, 80),
  }),
};

// ── Save a notification record to Firestore ───────────────────────
// (Used by cloud functions or admin to push to a user)
export const saveNotification = async (db, userId, { title, body, type, data = {} }) => {
  const { addDocument, COLLECTIONS } = await import("./firestore");
  return addDocument(COLLECTIONS.NOTIFICATIONS, {
    userId, title, body, type, data,
    read: false,
  });
};
