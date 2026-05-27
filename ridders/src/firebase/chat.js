import {
  collection, doc, addDoc, onSnapshot, query,
  orderBy, serverTimestamp, updateDoc, where, getDocs
} from "firebase/firestore";
import { db } from "./config";

// Each delivery has one chat thread stored under:
// chats/{deliveryId}/messages/{messageId}

// ── Send a message ────────────────────────────────────────────────
export const sendMessage = async (deliveryId, { senderId, senderName, senderRole, text }) => {
  await addDoc(collection(db, "chats", deliveryId, "messages"), {
    senderId,
    senderName,
    senderRole,   // "sender" | "rider" | "admin"
    text: text.trim(),
    read: false,
    createdAt: serverTimestamp(),
  });
  // Update last message on delivery doc for badge counts
  await updateDoc(doc(db, "deliveries", deliveryId), {
    lastMessage:    text.trim(),
    lastMessageAt:  serverTimestamp(),
    lastMessageBy:  senderRole,
    unreadCount:    1,     // simplified; could be per-user
  });
};

// ── Listen to messages in real-time ──────────────────────────────
export const listenToMessages = (deliveryId, callback) =>
  onSnapshot(
    query(
      collection(db, "chats", deliveryId, "messages"),
      orderBy("createdAt", "asc")
    ),
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  );

// ── Mark all messages as read ────────────────────────────────────
export const markMessagesRead = async (deliveryId, readerId) => {
  const snap = await getDocs(
    query(
      collection(db, "chats", deliveryId, "messages"),
      where("senderId", "!=", readerId),
      where("read", "==", false)
    )
  );
  const batch = snap.docs.map(d => updateDoc(d.ref, { read: true }));
  await Promise.all(batch);
};

// ── Predefined quick replies ──────────────────────────────────────
export const QUICK_REPLIES = {
  sender: [
    "I'm ready at the pickup",
    "Please be careful with the package",
    "Call me when you're close",
    "How far are you?",
    "Thank you! 🙏",
  ],
  rider: [
    "I'm on my way to pickup",
    "I have arrived at pickup",
    "Package collected, heading to you",
    "I'm 5 minutes away",
    "Please confirm the PIN",
  ],
};
