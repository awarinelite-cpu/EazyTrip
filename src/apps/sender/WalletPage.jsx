import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { Button, Card, Input, Divider, Badge, EmptyState, Spinner, Modal } from "../../components/common/UI";
import { formatNaira, formatDate } from "../../utils/helpers";
import { initiateTopup, requestPayout } from "../../firebase/payments";
import { db } from "../../firebase/config";
import { collection, query, where, orderBy, limit, onSnapshot } from "firebase/firestore";
import { COLLECTIONS } from "../../firebase/firestore";
import toast from "react-hot-toast";

const TOPUP_AMOUNTS = [500, 1000, 2000, 5000, 10000, 20000];
const NIGERIAN_BANKS = [
  "Access Bank","First Bank","GTBank","Zenith Bank","UBA",
  "Fidelity Bank","Sterling Bank","Polaris Bank","Kuda Bank","Opay",
];

export const WalletPage = () => {
  const { currentUser, userProfile, isRider } = useAuth();
  const [tab, setTab]           = useState("wallet");
  const [transactions, setTxns] = useState([]);
  const [loading, setLoading]   = useState(true);

  // Modals
  const [showTopup,  setShowTopup]  = useState(false);
  const [showPayout, setShowPayout] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, COLLECTIONS.TRANSACTIONS),
      where("userId", "==", currentUser.uid),
      orderBy("createdAt", "desc"),
      limit(50)
    );
    const unsub = onSnapshot(q, snap => {
      setTxns(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [currentUser]);

  const balance = userProfile?.walletBalance || 0;

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div style={styles.headerTitle}>My Wallet</div>
      </div>

      {/* Balance card */}
      <div style={styles.balanceCard}>
        <div style={{ color: "rgba(255,255,255,.65)", fontSize: 13 }}>Available balance</div>
        <div style={{ fontSize: 36, fontWeight: 800, color: "#fff", margin: "6px 0" }}>
          {formatNaira(balance)}
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          {!isRider && (
            <button onClick={() => setShowTopup(true)} style={styles.walletBtn}>
              ➕ Top Up
            </button>
          )}
          {isRider && (
            <button onClick={() => setShowPayout(true)} style={styles.walletBtn}
              disabled={balance < 500}>
              💸 Withdraw
            </button>
          )}
          <button style={styles.walletBtn}>📤 Share receipt</button>
        </div>
      </div>

      {/* Quick stats */}
      <div style={styles.statsRow}>
        <StatMini
          icon="📈"
          label="Total funded"
          value={formatNaira(transactions.filter(t=>t.type==="topup").reduce((s,t)=>s+t.amount,0))}
        />
        <StatMini
          icon="📦"
          label={isRider ? "Total earned" : "Total spent"}
          value={formatNaira(transactions.filter(t=>isRider?t.type==="credit":t.type==="debit").reduce((s,t)=>s+t.amount,0))}
        />
        <StatMini
          icon="🔄"
          label="Transactions"
          value={transactions.length}
        />
      </div>

      {/* Transaction history */}
      <div style={{ padding: "0 16px 100px" }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Transaction history</div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 40 }}><Spinner /></div>
        ) : transactions.length === 0 ? (
          <EmptyState icon="💳" title="No transactions yet"
            desc="Your transaction history will appear here" />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {transactions.map(t => (
              <Card key={t.id} style={{ padding: "12px 16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 12,
                    background: TX_COLORS[t.type]?.bg || "#f1f5f9",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 20,
                  }}>
                    {TX_ICONS[t.type] || "💳"}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>
                      {TX_LABELS[t.type] || t.type}
                    </div>
                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                      {t.note || t.ref?.slice(0,30)} · {formatDate(t.createdAt)}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{
                      fontWeight: 700, fontSize: 15,
                      color: ["debit","payout"].includes(t.type) ? "#ef4444" : "#16a34a",
                    }}>
                      {["debit","payout"].includes(t.type) ? "-" : "+"}{formatNaira(t.amount)}
                    </div>
                    <Badge
                      label={t.status}
                      color={t.status==="success"||t.status==="paid"?"green":t.status==="pending"?"yellow":"red"}
                      style={{ marginTop: 4 }}
                    />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Top-up modal */}
      <TopupModal
        open={showTopup}
        onClose={() => setShowTopup(false)}
        email={currentUser?.email}
        userId={currentUser?.uid}
      />

      {/* Payout modal (riders) */}
      <PayoutModal
        open={showPayout}
        onClose={() => setShowPayout(false)}
        riderId={currentUser?.uid}
        balance={balance}
      />
    </div>
  );
};

// ── Top-up modal ──────────────────────────────────────────────────
const TopupModal = ({ open, onClose, email, userId }) => {
  const [amount,  setAmount]  = useState(2000);
  const [custom,  setCustom]  = useState("");
  const [loading, setLoading] = useState(false);

  const finalAmount = custom ? Number(custom) : amount;

  const handlePay = async () => {
    if (finalAmount < 100) return toast.error("Minimum top-up is ₦100");
    setLoading(true);
    try {
      await initiateTopup({
        userId, email, amountNaira: finalAmount,
        onSuccess: (ref) => {
          toast.success(`₦${finalAmount.toLocaleString()} added to wallet! 🎉`);
          onClose();
        },
        onCancel: () => toast("Payment cancelled"),
      });
    } catch (err) {
      toast.error(err.message || "Payment failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Top up wallet">
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <div style={styles.label}>Select amount</div>
          <div style={styles.amountGrid}>
            {TOPUP_AMOUNTS.map(a => (
              <div key={a} onClick={() => { setAmount(a); setCustom(""); }} style={{
                ...styles.amountChip,
                background: amount === a && !custom ? "#6366f1" : "#f1f5f9",
                color:      amount === a && !custom ? "#fff"    : "#374151",
              }}>
                {formatNaira(a)}
              </div>
            ))}
          </div>
        </div>
        <Input
          label="Or enter custom amount (₦)"
          value={custom}
          onChange={e => { setCustom(e.target.value); setAmount(0); }}
          placeholder="e.g. 3500"
          type="number"
        />
        <div style={{
          background: "#f0fdf4", border: "1.5px solid #bbf7d0",
          borderRadius: 10, padding: "12px 14px",
          display: "flex", justifyContent: "space-between",
        }}>
          <span style={{ color: "#374151" }}>You're paying</span>
          <span style={{ fontWeight: 800, fontSize: 18, color: "#16a34a" }}>
            {formatNaira(finalAmount)}
          </span>
        </div>
        <Button onClick={handlePay} loading={loading} fullWidth size="lg" variant="success">
          Pay with Paystack
        </Button>
        <div style={{ fontSize: 11, color: "#94a3b8", textAlign: "center" }}>
          🔒 Secured by Paystack · Card, Bank Transfer, USSD
        </div>
      </div>
    </Modal>
  );
};

// ── Payout modal (riders) ─────────────────────────────────────────
const PayoutModal = ({ open, onClose, riderId, balance }) => {
  const [form, setForm] = useState({
    amount: "", bankName: "", accountNumber: "", accountName: "",
  });
  const [loading, setLoading] = useState(false);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handlePayout = async () => {
    const amt = Number(form.amount);
    if (!amt || amt < 500)       return toast.error("Minimum payout is ₦500");
    if (amt > balance)           return toast.error("Insufficient wallet balance");
    if (!form.bankName)          return toast.error("Select your bank");
    if (!form.accountNumber || form.accountNumber.length !== 10)
                                 return toast.error("Enter valid 10-digit account number");
    if (!form.accountName)       return toast.error("Enter account name");

    setLoading(true);
    try {
      await requestPayout({ riderId, amountNaira: amt, ...form });
      toast.success("Payout request submitted! Admin will process within 24hrs.");
      onClose();
    } catch (err) {
      toast.error(err.message || "Payout request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Withdraw earnings">
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{
          background: "#eff6ff", borderRadius: 10, padding: "10px 14px",
          display: "flex", justifyContent: "space-between",
        }}>
          <span style={{ color: "#374151" }}>Available</span>
          <span style={{ fontWeight: 800, color: "#1e40af" }}>{formatNaira(balance)}</span>
        </div>
        <Input label="Amount to withdraw (₦)" value={form.amount}
          onChange={set("amount")} placeholder="Min. ₦500" type="number" />
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>Bank</label>
          <select value={form.bankName} onChange={set("bankName")} style={styles.select}>
            <option value="">-- Select bank --</option>
            {NIGERIAN_BANKS.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
        <Input label="Account number (10 digits)" value={form.accountNumber}
          onChange={set("accountNumber")} placeholder="0123456789" type="number" />
        <Input label="Account name" value={form.accountName}
          onChange={set("accountName")} placeholder="As on your bank app" />
        <Button onClick={handlePayout} loading={loading} fullWidth size="lg">
          Request Payout
        </Button>
        <div style={{ fontSize: 11, color: "#94a3b8", textAlign: "center" }}>
          Processed within 24 hours · Weekdays only
        </div>
      </div>
    </Modal>
  );
};

// ── Helpers ───────────────────────────────────────────────────────
const StatMini = ({ icon, label, value }) => (
  <Card style={{ flex: 1, textAlign: "center", padding: "10px 8px" }}>
    <div style={{ fontSize: 20 }}>{icon}</div>
    <div style={{ fontSize: 13, fontWeight: 700, marginTop: 4 }}>{value}</div>
    <div style={{ fontSize: 10, color: "#94a3b8" }}>{label}</div>
  </Card>
);

const TX_ICONS  = { topup:"💳", credit:"💚", debit:"📤", payout:"🏦" };
const TX_LABELS = { topup:"Wallet top-up", credit:"Delivery earning", debit:"Delivery payment", payout:"Payout request" };
const TX_COLORS = {
  topup:  { bg: "#dcfce7" }, credit: { bg: "#dcfce7" },
  debit:  { bg: "#fee2e2" }, payout: { bg: "#fef9c3" },
};

const styles = {
  page: { minHeight: "100vh", background: "#f8fafc", fontFamily: "system-ui,sans-serif" },
  header: {
    padding: "14px 16px", background: "#fff", borderBottom: "1px solid #f1f5f9",
  },
  headerTitle: { fontSize: 17, fontWeight: 700 },
  balanceCard: {
    background: "linear-gradient(135deg,#1a1a2e,#312e81)",
    padding: "24px 20px",
  },
  walletBtn: {
    padding: "8px 18px", borderRadius: 20,
    border: "1.5px solid rgba(255,255,255,.35)",
    background: "transparent", color: "#fff",
    fontSize: 13, cursor: "pointer", fontWeight: 600,
  },
  statsRow: { display: "flex", gap: 10, padding: "14px 16px" },
  label: { fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 8 },
  amountGrid: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 },
  amountChip: {
    padding: "10px 8px", borderRadius: 8, textAlign: "center",
    fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all .15s",
  },
  select: {
    width: "100%", padding: "10px 12px", borderRadius: 8, fontSize: 13,
    border: "1.5px solid #e2e8f0", outline: "none", fontFamily: "inherit",
    background: "#fff",
  },
};
