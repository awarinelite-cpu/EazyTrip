import {
  doc, getDoc, updateDoc, serverTimestamp, increment,
  collection, addDoc, query, where, getDocs
} from "firebase/firestore";
import { db } from "./config";
import { addDocument, COLLECTIONS } from "./firestore";

// ─────────────────────────────────────────────────────────────────
// PROMO CODES
// ─────────────────────────────────────────────────────────────────

/**
 * Validate and apply a promo code for a sender
 * Returns { valid, discount, message, type }
 * type: "percent" | "flat"
 */
export const validatePromoCode = async (code, userId) => {
  if (!code?.trim()) return { valid: false, message: "Enter a promo code" };

  const snap = await getDocs(
    query(collection(db, "promoCodes"), where("code", "==", code.toUpperCase().trim()))
  );

  if (snap.empty) return { valid: false, message: "Invalid promo code" };

  const promoDoc = snap.docs[0];
  const promo    = promoDoc.data();

  // Check expiry
  if (promo.expiresAt && promo.expiresAt.toDate() < new Date())
    return { valid: false, message: "This promo code has expired" };

  // Check usage limit
  if (promo.maxUses && promo.usedCount >= promo.maxUses)
    return { valid: false, message: "This promo code has been used up" };

  // Check per-user limit (max 1 use per user by default)
  const userUsage = promo.usedBy || [];
  if (userUsage.includes(userId))
    return { valid: false, message: "You've already used this code" };

  return {
    valid:    true,
    promoId:  promoDoc.id,
    code:     promo.code,
    discount: promo.discount,       // e.g. 20 → 20% or ₦200
    type:     promo.type,           // "percent" | "flat"
    message:  `Code applied! ${promo.type === "percent" ? promo.discount + "% off" : "₦" + promo.discount + " off"}`,
  };
};

export const applyPromoCode = async (promoId, userId) => {
  const ref = doc(db, "promoCodes", promoId);
  await updateDoc(ref, {
    usedCount:  increment(1),
    usedBy:     [...((await getDoc(ref)).data().usedBy || []), userId],
    updatedAt:  serverTimestamp(),
  });
};

export const calculateDiscountedFare = (originalFare, promo) => {
  if (!promo?.valid) return originalFare;
  if (promo.type === "percent")
    return Math.max(0, Math.round(originalFare * (1 - promo.discount / 100)));
  if (promo.type === "flat")
    return Math.max(0, originalFare - promo.discount);
  return originalFare;
};

// Admin: create a promo code
export const createPromoCode = async ({
  code, discount, type = "percent",
  maxUses = 100, expiresAt = null, description = ""
}) => {
  return addDocument("promoCodes", {
    code:       code.toUpperCase().trim(),
    discount,
    type,
    maxUses,
    usedCount:  0,
    usedBy:     [],
    expiresAt:  expiresAt ? new Date(expiresAt) : null,
    description,
    isActive:   true,
  });
};

// ─────────────────────────────────────────────────────────────────
// SOS EMERGENCY SYSTEM
// ─────────────────────────────────────────────────────────────────

/**
 * Trigger an SOS alert — stored in Firestore, notifies admin
 * Can be called by rider OR sender
 */
export const triggerSOS = async ({
  userId, userName, userRole, deliveryId,
  location = null, message = "Emergency! Please help."
}) => {
  const sosId = await addDocument("sosAlerts", {
    userId,
    userName,
    userRole,
    deliveryId,
    location,         // { lat, lng } if GPS available
    message,
    status:    "active",       // active | resolved
    resolvedBy: null,
    resolvedAt: null,
  });

  // Also write to notifications for all admins
  await addDocument(COLLECTIONS.NOTIFICATIONS, {
    userId:  "ADMIN_BROADCAST",
    title:   "🆘 SOS Alert!",
    body:    `${userName} (${userRole}) triggered emergency on delivery #${deliveryId?.slice(-6).toUpperCase()}`,
    type:    "sos",
    data:    { sosId, deliveryId, userId },
    read:    false,
  });

  return sosId;
};

export const resolveSOS = async (sosId, resolvedByAdminId) => {
  await updateDoc(doc(db, "sosAlerts", sosId), {
    status:     "resolved",
    resolvedBy: resolvedByAdminId,
    resolvedAt: serverTimestamp(),
  });
};
