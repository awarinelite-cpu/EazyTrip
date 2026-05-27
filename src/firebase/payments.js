// ── Paystack integration ──────────────────────────────────────────
// Add your Paystack public key to .env:
// REACT_APP_PAYSTACK_PUBLIC_KEY=pk_live_xxxx

import { doc, updateDoc, serverTimestamp, increment } from "firebase/firestore";
import { db } from "./config";
import { addDocument, COLLECTIONS } from "./firestore";

const PAYSTACK_KEY = process.env.REACT_APP_PAYSTACK_PUBLIC_KEY || "pk_test_your_key_here";

// ── Load Paystack script dynamically ─────────────────────────────
export const loadPaystack = () =>
  new Promise((resolve) => {
    if (window.PaystackPop) return resolve(window.PaystackPop);
    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v1/inline.js";
    script.onload = () => resolve(window.PaystackPop);
    document.body.appendChild(script);
  });

// ── Initiate wallet top-up via Paystack popup ─────────────────────
export const initiateTopup = async ({ userId, email, amountNaira, onSuccess, onCancel }) => {
  const PaystackPop = await loadPaystack();

  const handler = PaystackPop.setup({
    key:       PAYSTACK_KEY,
    email,
    amount:    amountNaira * 100,        // Paystack uses kobo
    currency:  "NGN",
    ref:       `RIDDERS_TOPUP_${userId}_${Date.now()}`,
    metadata:  { userId, type: "wallet_topup" },

    callback: async (response) => {
      // Verify on server ideally; for now we trust the ref
      await creditWallet({ userId, amountNaira, ref: response.reference, type: "topup" });
      onSuccess && onSuccess(response);
    },
    onClose: () => onCancel && onCancel(),
  });

  handler.openIframe();
};

// ── Credit a user's wallet in Firestore ───────────────────────────
export const creditWallet = async ({ userId, amountNaira, ref, type = "credit", note = "" }) => {
  // 1. Update wallet balance
  await updateDoc(doc(db, "users", userId), {
    walletBalance: increment(amountNaira),
    updatedAt:     serverTimestamp(),
  });

  // 2. Record transaction
  await addDocument(COLLECTIONS.TRANSACTIONS, {
    userId,
    type,           // topup | credit | debit | payout
    amount:    amountNaira,
    ref,
    note,
    status:    "success",
    balanceAfter: null, // could fetch and store if needed
  });
};

// ── Debit wallet for delivery payment ────────────────────────────
export const debitWallet = async ({ userId, amountNaira, deliveryId }) => {
  await updateDoc(doc(db, "users", userId), {
    walletBalance: increment(-amountNaira),
    updatedAt:     serverTimestamp(),
  });
  await addDocument(COLLECTIONS.TRANSACTIONS, {
    userId,
    type:       "debit",
    amount:     amountNaira,
    ref:        `DELIVERY_${deliveryId}`,
    note:       `Payment for delivery #${deliveryId?.slice(-6).toUpperCase()}`,
    status:     "success",
  });
};

// ── Rider payout request ──────────────────────────────────────────
export const requestPayout = async ({ riderId, amountNaira, bankName, accountNumber, accountName }) => {
  if (amountNaira < 500) throw new Error("Minimum payout is ₦500");

  // Deduct from wallet immediately (hold state)
  await updateDoc(doc(db, "users", riderId), {
    walletBalance: increment(-amountNaira),
    updatedAt:     serverTimestamp(),
  });

  // Create payout request for admin to process
  const payoutId = await addDocument("payouts", {
    riderId,
    amount:        amountNaira,
    bankName,
    accountNumber,
    accountName,
    status:        "pending",    // pending → processing → paid | rejected
    requestedAt:   serverTimestamp(),
  });

  await addDocument(COLLECTIONS.TRANSACTIONS, {
    userId:  riderId,
    type:    "payout",
    amount:  amountNaira,
    ref:     payoutId,
    note:    `Payout to ${bankName} — ${accountNumber}`,
    status:  "pending",
  });

  return payoutId;
};

// ── Admin approve payout ──────────────────────────────────────────
export const approvePayout = async (payoutId) => {
  await updateDoc(doc(db, "payouts", payoutId), {
    status:      "paid",
    processedAt: serverTimestamp(),
  });
  // In production: trigger Paystack Transfer API here
};

export const rejectPayout = async (payoutId, riderId, amount) => {
  // Refund wallet
  await updateDoc(doc(db, "users", riderId), {
    walletBalance: increment(amount),
    updatedAt:     serverTimestamp(),
  });
  await updateDoc(doc(db, "payouts", payoutId), {
    status:      "rejected",
    processedAt: serverTimestamp(),
  });
};
