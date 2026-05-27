import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc,
  deleteDoc, query, where, orderBy, onSnapshot,
  serverTimestamp, limit
} from "firebase/firestore";
import { db } from "./config";

// ── Collection names ──────────────────────────────────────────────
export const COLLECTIONS = {
  USERS:         "users",
  RIDERS:        "riders",
  DELIVERIES:    "deliveries",
  TRANSACTIONS:  "transactions",
  NOTIFICATIONS: "notifications",
  RATINGS:       "ratings",
  DISPUTES:      "disputes",
  CONFIG:        "appConfig",
  PROMO_CODES:   "promoCodes",
};

// ── Generic helpers ───────────────────────────────────────────────
export const getDocument = async (col, id) => {
  const snap = await getDoc(doc(db, col, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const addDocument = async (col, data) => {
  const ref = await addDoc(collection(db, col), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
};

export const updateDocument = async (col, id, data) => {
  await updateDoc(doc(db, col, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

export const deleteDocument = async (col, id) => {
  await deleteDoc(doc(db, col, id));
};

// ── Deliveries ────────────────────────────────────────────────────
export const createDelivery = (data) => addDocument(COLLECTIONS.DELIVERIES, {
  ...data,
  status: "searching",          // searching → accepted → pickup → in_transit → delivered | cancelled
  riderId: null,
  riderLocation: null,
  deliveryPin: Math.floor(1000 + Math.random() * 9000).toString(),
});

export const listenToDelivery = (deliveryId, callback) =>
  onSnapshot(doc(db, COLLECTIONS.DELIVERIES, deliveryId), snap =>
    snap.exists() && callback({ id: snap.id, ...snap.data() })
  );

export const listenToActiveDeliveries = (callback) =>
  onSnapshot(
    query(
      collection(db, COLLECTIONS.DELIVERIES),
      where("status", "in", ["searching", "accepted", "pickup", "in_transit"]),
      orderBy("createdAt", "desc")
    ),
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  );

// ── Riders ────────────────────────────────────────────────────────
export const listenToNearbyDeliveries = (callback) =>
  onSnapshot(
    query(
      collection(db, COLLECTIONS.DELIVERIES),
      where("status", "==", "searching"),
      orderBy("createdAt", "desc"),
      limit(10)
    ),
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  );

export const listenToRiderActiveDelivery = (riderId, callback) =>
  onSnapshot(
    query(
      collection(db, COLLECTIONS.DELIVERIES),
      where("riderId", "==", riderId),
      where("status", "in", ["accepted", "pickup", "in_transit"])
    ),
    snap => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      callback(docs[0] || null);
    }
  );

// ── Transactions ──────────────────────────────────────────────────
export const createTransaction = (data) =>
  addDocument(COLLECTIONS.TRANSACTIONS, data);

// ── Notifications ─────────────────────────────────────────────────
export const sendNotification = (userId, data) =>
  addDocument(COLLECTIONS.NOTIFICATIONS, { userId, ...data, read: false });

export const listenToNotifications = (userId, callback) =>
  onSnapshot(
    query(
      collection(db, COLLECTIONS.NOTIFICATIONS),
      where("userId", "==", userId),
      orderBy("createdAt", "desc"),
      limit(20)
    ),
    snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  );
