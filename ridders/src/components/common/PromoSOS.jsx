import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { Button, Modal, Input } from "../../components/common/UI";
import {
  validatePromoCode, applyPromoCode, calculateDiscountedFare,
  triggerSOS, createPromoCode
} from "../../firebase/promoSOS";
import { formatNaira } from "../../utils/helpers";
import toast from "react-hot-toast";

// ─────────────────────────────────────────────────────────────────
// PROMO CODE INPUT (embedded in booking confirm step)
// ─────────────────────────────────────────────────────────────────
export const PromoCodeInput = ({ fare, onApply }) => {
  const { currentUser } = useAuth();
  const [code,     setCode]     = useState("");
  const [loading,  setLoading]  = useState(false);
  const [applied,  setApplied]  = useState(null);  // promo object

  const handleApply = async () => {
    if (!code.trim()) return;
    setLoading(true);
    try {
      const result = await validatePromoCode(code, currentUser.uid);
      if (!result.valid) {
        toast.error(result.message);
        return;
      }
      const discountedFare = calculateDiscountedFare(fare, result);
      setApplied(result);
      onApply && onApply({ promo: result, discountedFare });
      toast.success(result.message);
    } catch (err) {
      toast.error("Could not validate code");
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = () => {
    setApplied(null);
    setCode("");
    onApply && onApply({ promo: null, discountedFare: fare });
  };

  if (applied) {
    const discounted = calculateDiscountedFare(fare, applied);
    return (
      <div style={styles.appliedBox}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 20 }}>🎁</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: "#166534" }}>
              Promo applied: {applied.code}
            </div>
            <div style={{ fontSize: 12, color: "#64748b" }}>
              <span style={{ textDecoration: "line-through", color: "#94a3b8" }}>
                {formatNaira(fare)}
              </span>{" "}
              → <span style={{ fontWeight: 700, color: "#16a34a" }}>{formatNaira(discounted)}</span>
            </div>
          </div>
        </div>
        <button onClick={handleRemove} style={styles.removeBtn}>✕ Remove</button>
      </div>
    );
  }

  return (
    <div style={styles.promoRow}>
      <input
        value={code}
        onChange={e => setCode(e.target.value.toUpperCase())}
        placeholder="Enter promo code"
        style={styles.promoInput}
        onKeyDown={e => e.key === "Enter" && handleApply()}
      />
      <Button onClick={handleApply} loading={loading} size="sm" variant="outline">
        Apply
      </Button>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// SOS BUTTON (shown on TrackDeliveryPage and RiderDashboardPage)
// ─────────────────────────────────────────────────────────────────
export const SOSButton = ({ deliveryId }) => {
  const { currentUser, userProfile, isRider } = useAuth();
  const [open,      setOpen]      = useState(false);
  const [message,   setMessage]   = useState("");
  const [loading,   setLoading]   = useState(false);
  const [triggered, setTriggered] = useState(false);

  const handleSOS = async () => {
    setLoading(true);
    try {
      // Try to get GPS location
      let location = null;
      try {
        const pos = await new Promise((res, rej) =>
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 })
        );
        location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      } catch (_) {}

      await triggerSOS({
        userId:     currentUser.uid,
        userName:   userProfile.displayName,
        userRole:   isRider ? "rider" : "sender",
        deliveryId,
        location,
        message:    message || "Emergency! Please help immediately.",
      });

      setTriggered(true);
      toast.error("🆘 SOS sent! Admin has been notified.", { duration: 6000 });
      setTimeout(() => setOpen(false), 3000);
    } catch (err) {
      toast.error("Failed to send SOS. Please call emergency services.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button onClick={() => setOpen(true)} style={styles.sosBtn}>
        🆘 SOS
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Emergency SOS">
        {triggered ? (
          <div style={{ textAlign: "center", padding: 20 }}>
            <div style={{ fontSize: 60 }}>🆘</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#dc2626", marginTop: 12 }}>
              SOS Sent!
            </div>
            <div style={{ fontSize: 14, color: "#64748b", marginTop: 8 }}>
              Admin has been notified. Help is on the way.
            </div>
            <div style={{ marginTop: 16, fontSize: 13, color: "#374151" }}>
              Emergency numbers:<br />
              <strong>Police: 112</strong> · <strong>FRSC: 122</strong>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={styles.sosWarning}>
              ⚠️ Only use SOS in a genuine emergency. This will alert our admin team immediately.
            </div>
            <Input
              label="Describe your emergency (optional)"
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="e.g. I'm being followed, accident happened..."
            />
            <div style={{ fontSize: 12, color: "#64748b" }}>
              Your location will be shared automatically if GPS is available.
            </div>
            <Button
              onClick={handleSOS}
              loading={loading}
              variant="danger"
              fullWidth
              size="lg"
              style={{ fontSize: 16 }}
            >
              🆘 Send Emergency Alert
            </Button>
            <Button variant="ghost" onClick={() => setOpen(false)} fullWidth>
              Cancel
            </Button>
          </div>
        )}
      </Modal>
    </>
  );
};

// ─────────────────────────────────────────────────────────────────
// ADMIN: Create promo code form
// ─────────────────────────────────────────────────────────────────
export const AdminCreatePromo = ({ onCreated }) => {
  const [form, setForm] = useState({
    code: "", discount: "", type: "percent",
    maxUses: "100", expiresAt: "", description: "",
  });
  const [loading, setLoading] = useState(false);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handle = async () => {
    if (!form.code || !form.discount) return toast.error("Code and discount are required");
    setLoading(true);
    try {
      await createPromoCode({
        code:        form.code,
        discount:    Number(form.discount),
        type:        form.type,
        maxUses:     Number(form.maxUses) || 100,
        expiresAt:   form.expiresAt || null,
        description: form.description,
      });
      toast.success(`Promo code ${form.code} created!`);
      setForm({ code:"", discount:"", type:"percent", maxUses:"100", expiresAt:"", description:"" });
      onCreated && onCreated();
    } catch (err) {
      toast.error("Failed to create promo code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Input label="Code (e.g. RIDDERS20)" value={form.code}
          onChange={set("code")} placeholder="RIDDERS20"
          inputStyle={{ textTransform: "uppercase" }} />
        <Input label="Discount value" value={form.discount}
          onChange={set("discount")} placeholder="e.g. 20" type="number" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>Type</label>
          <select value={form.type} onChange={set("type")} style={styles.select}>
            <option value="percent">Percent (%)</option>
            <option value="flat">Flat (₦)</option>
          </select>
        </div>
        <Input label="Max uses" value={form.maxUses}
          onChange={set("maxUses")} placeholder="100" type="number" />
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>Expires</label>
          <input type="datetime-local" value={form.expiresAt}
            onChange={set("expiresAt")} style={styles.dateInput} />
        </div>
      </div>
      <Input label="Description (internal note)" value={form.description}
        onChange={set("description")} placeholder="e.g. New user welcome code" />
      <Button onClick={handle} loading={loading} variant="purple">
        Create Promo Code
      </Button>
    </div>
  );
};

const styles = {
  promoRow: {
    display: "flex", gap: 8, alignItems: "center",
  },
  promoInput: {
    flex: 1, padding: "10px 12px", borderRadius: 8, fontSize: 13,
    border: "1.5px solid #e2e8f0", outline: "none",
    fontFamily: "inherit", letterSpacing: 2, fontWeight: 600,
  },
  appliedBox: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    background: "#f0fdf4", border: "1.5px solid #bbf7d0",
    borderRadius: 10, padding: "10px 14px",
  },
  removeBtn: {
    border: "none", background: "none", color: "#ef4444",
    fontSize: 12, cursor: "pointer", fontWeight: 600,
  },
  sosBtn: {
    background: "#dc2626", color: "#fff",
    border: "none", borderRadius: 10, padding: "10px 20px",
    fontSize: 14, fontWeight: 700, cursor: "pointer",
    boxShadow: "0 2px 8px rgba(220,38,38,.4)",
  },
  sosWarning: {
    background: "#fef9c3", border: "1.5px solid #fde68a",
    borderRadius: 8, padding: "10px 12px",
    fontSize: 13, color: "#854d0e",
  },
  select: {
    width: "100%", padding: "10px 12px", borderRadius: 8, fontSize: 13,
    border: "1.5px solid #e2e8f0", outline: "none",
    fontFamily: "inherit", background: "#fff", marginTop: 4,
  },
  dateInput: {
    width: "100%", padding: "10px 12px", borderRadius: 8, fontSize: 13,
    border: "1.5px solid #e2e8f0", outline: "none",
    fontFamily: "inherit", boxSizing: "border-box", marginTop: 4,
  },
};
