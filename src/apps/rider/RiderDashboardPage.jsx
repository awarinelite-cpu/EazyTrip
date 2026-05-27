import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useDelivery } from "../../context/DeliveryContext";
import { Avatar, Badge, Button, Card, Divider, Spinner, EmptyState } from "../../components/common/UI";
import { MapPlaceholder } from "../../components/maps/RiddersMap";
import { formatNaira, formatDate, VEHICLE_OPTIONS } from "../../utils/helpers";
import { updateDocument, COLLECTIONS } from "../../firebase/firestore";
import { doc, updateDoc, serverTimestamp, collection, query, where, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase/config";
import toast from "react-hot-toast";

export const RiderDashboardPage = () => {
  const { currentUser, userProfile, logout } = useAuth();
  const { activeDelivery, nearbyRequests } = useDelivery();
  const navigate = useNavigate();

  const [isOnline,  setIsOnline]  = useState(userProfile?.isOnline || false);
  const [todayEarnings, setTodayEarnings] = useState(0);
  const [todayTrips, setTodayTrips] = useState(0);
  const [history, setHistory] = useState([]);
  const [tab, setTab] = useState("requests");

  // Sync online status
  useEffect(() => { setIsOnline(userProfile?.isOnline || false); }, [userProfile]);

  // Load today's earnings from completed trips
  useEffect(() => {
    if (!currentUser) return;
    const today = new Date(); today.setHours(0,0,0,0);
    const q = query(
      collection(db, COLLECTIONS.DELIVERIES),
      where("riderId", "==", currentUser.uid),
      where("status", "==", "delivered"),
      orderBy("createdAt", "desc"),
      limit(50)
    );
    const unsub = onSnapshot(q, snap => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setHistory(docs);
      const todayDocs = docs.filter(d => {
        const ts = d.createdAt?.toDate?.();
        return ts && ts >= today;
      });
      setTodayTrips(todayDocs.length);
      setTodayEarnings(todayDocs.reduce((sum, d) => sum + (d.riderEarning || 0), 0));
    });
    return unsub;
  }, [currentUser]);

  const toggleOnline = async () => {
    const next = !isOnline;
    setIsOnline(next);
    await updateDoc(doc(db, "users", currentUser.uid), {
      isOnline: next, updatedAt: serverTimestamp(),
    });
    toast(next ? "You're online! 🟢" : "You're offline 🔴");
  };

  const acceptDelivery = async (delivery) => {
    await updateDocument(COLLECTIONS.DELIVERIES, delivery.id, {
      status:      "accepted",
      riderId:     currentUser.uid,
      riderName:   userProfile.displayName,
      riderPhone:  userProfile.phone,
      riderRating: userProfile.rating || 5,
      vehiclePlate: userProfile.vehiclePlate || "",
    });
    toast.success("Delivery accepted! Head to pickup 🛵");
  };

  const markPickedUp = async () => {
    await updateDocument(COLLECTIONS.DELIVERIES, activeDelivery.id, { status: "in_transit" });
    toast.success("Marked as picked up — heading to recipient");
  };

  const confirmDelivery = async (pin) => {
    if (pin !== activeDelivery.deliveryPin) {
      toast.error("Wrong PIN. Ask recipient for the correct PIN.");
      return;
    }
    const { riderEarning } = await import("../../utils/helpers");
    const earning = riderEarning(activeDelivery.fare);
    await updateDocument(COLLECTIONS.DELIVERIES, activeDelivery.id, {
      status: "delivered", deliveredAt: serverTimestamp(), riderEarning: earning,
    });
    // Update rider wallet
    await updateDoc(doc(db, "users", currentUser.uid), {
      walletBalance:    (userProfile.walletBalance || 0) + earning,
      totalDeliveries:  (userProfile.totalDeliveries || 0) + 1,
      updatedAt:        serverTimestamp(),
    });
    toast.success(`Delivery complete! Earned ${formatNaira(earning)} 💰`);
  };

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Avatar name={userProfile?.displayName || ""} size={42} />
          <div>
            <div style={{ fontSize: 12, color: "#64748b" }}>Rider</div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{userProfile?.displayName}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div onClick={toggleOnline} style={{
            ...styles.onlineToggle,
            background: isOnline ? "#dcfce7" : "#fee2e2",
            borderColor: isOnline ? "#86efac" : "#fca5a5",
          }}>
            <div style={{
              width: 10, height: 10, borderRadius: "50%",
              background: isOnline ? "#16a34a" : "#dc2626",
              boxShadow: isOnline ? "0 0 6px #16a34a" : "none",
            }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: isOnline ? "#15803d" : "#dc2626" }}>
              {isOnline ? "ONLINE" : "OFFLINE"}
            </span>
          </div>
          <button onClick={logout} style={{ border: "none", background: "none", fontSize: 20, cursor: "pointer" }}>👋</button>
        </div>
      </div>

      {/* Map */}
      <MapPlaceholder height="180px" label={activeDelivery ? `Active: ${activeDelivery.pickup} → ${activeDelivery.dropoff}` : "Your location"} />

      <div style={{ padding: "0 16px 100px" }}>

        {/* Earnings summary */}
        <Card style={styles.earningsCard}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ color: "rgba(255,255,255,.7)", fontSize: 12 }}>Today's earnings</div>
              <div style={{ fontSize: 30, fontWeight: 800, color: "#fff" }}>
                {formatNaira(todayEarnings)}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={styles.statPill}>{todayTrips} trips</div>
              <div style={{ ...styles.statPill, marginTop: 6 }}>⭐ {(userProfile?.rating || 5).toFixed(1)}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <button style={styles.earningsBtn}>💳 Withdraw</button>
            <button style={styles.earningsBtn}>📊 All earnings</button>
          </div>
        </Card>

        {/* KYC warning */}
        {!userProfile?.isVerified && (
          <Card style={{ background: "#fef9c3", border: "1.5px solid #fde68a", marginTop: 12 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <span style={{ fontSize: 24 }}>⚠️</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>KYC verification pending</div>
                <div style={{ fontSize: 12, color: "#92400e" }}>You cannot receive deliveries until admin verifies your ID</div>
              </div>
            </div>
          </Card>
        )}

        {/* Active trip panel */}
        {activeDelivery && (
          <ActiveTripPanel
            delivery={activeDelivery}
            onMarkPickedUp={markPickedUp}
            onConfirmDelivery={confirmDelivery}
          />
        )}

        {/* Tabs */}
        <div style={styles.tabRow}>
          {[
            { key: "requests", label: `Requests (${nearbyRequests.length})` },
            { key: "history",  label: "History" },
          ].map(t => (
            <div key={t.key} onClick={() => setTab(t.key)} style={{
              ...styles.tab,
              borderBottom: tab === t.key ? "2.5px solid #7c3aed" : "2.5px solid transparent",
              color: tab === t.key ? "#7c3aed" : "#64748b",
            }}>{t.label}</div>
          ))}
        </div>

        {/* Requests */}
        {tab === "requests" && (
          isOnline && userProfile?.isVerified ? (
            nearbyRequests.length === 0 ? (
              <EmptyState icon="🔍" title="No requests right now" desc="New delivery requests will appear here" />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {nearbyRequests.map(d => (
                  <RequestCard key={d.id} delivery={d}
                    onAccept={() => acceptDelivery(d)}
                    disabled={!!activeDelivery}
                  />
                ))}
              </div>
            )
          ) : (
            <EmptyState icon={isOnline ? "🚫" : "💤"}
              title={isOnline ? "Complete KYC to receive jobs" : "You are offline"}
              desc={isOnline ? "Admin will verify your documents soon" : "Tap the ONLINE toggle to start receiving deliveries"} />
          )
        )}

        {/* History */}
        {tab === "history" && (
          history.length === 0 ? (
            <EmptyState icon="📋" title="No completed deliveries yet" />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {history.map(d => (
                <Card key={d.id} style={{ padding: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={styles.vehicleIcon}>
                      {d.vehicleType === "car" ? "🚗" : d.vehicleType === "motor" ? "🛵" : "🚲"}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{d.dropoff}</div>
                      <div style={{ fontSize: 11, color: "#94a3b8" }}>{formatDate(d.createdAt)}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 700, color: "#16a34a" }}>{formatNaira(d.riderEarning || 0)}</div>
                      <div style={{ fontSize: 11, color: "#94a3b8" }}>earned</div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )
        )}
      </div>

      {/* Bottom nav */}
      <div style={styles.bottomNav}>
        <NavItem icon="🏠" label="Home"    active />
        <NavItem icon="📋" label="History" />
        <NavItem icon="💰" label="Wallet" />
        <NavItem icon="👤" label="Profile" />
      </div>
    </div>
  );
};

// ── Active trip panel ─────────────────────────────────────────────
const ActiveTripPanel = ({ delivery: d, onMarkPickedUp, onConfirmDelivery }) => {
  const [pin, setPin] = useState("");
  return (
    <Card style={{ background: "#eff6ff", border: "2px solid #3b82f6", marginTop: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#1e40af", marginBottom: 10 }}>
        🛵 Active delivery
      </div>
      <div style={{ fontSize: 12, marginBottom: 6 }}>
        <strong>Pickup:</strong> {d.pickup}
      </div>
      <div style={{ fontSize: 12, marginBottom: 6 }}>
        <strong>Deliver to:</strong> {d.dropoff}
      </div>
      <div style={{ fontSize: 12, marginBottom: 6 }}>
        <strong>Recipient:</strong> {d.recipientName} · {d.recipientPhone}
      </div>
      {d.note && (
        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 6 }}>
          📝 {d.note}
        </div>
      )}
      <Divider />
      <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
        <button style={styles.contactBtn}>📞 {d.senderPhone}</button>
        <button style={styles.contactBtn}>📞 {d.recipientPhone}</button>
      </div>

      {d.status === "accepted" && (
        <Button onClick={onMarkPickedUp} fullWidth style={{ marginTop: 12 }} variant="purple">
          📦 Confirm Pickup
        </Button>
      )}

      {d.status === "in_transit" && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>Enter recipient's PIN to complete:</div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              value={pin} onChange={e => setPin(e.target.value)}
              placeholder="4-digit PIN" maxLength={4}
              style={{ flex: 1, padding: "10px 12px", borderRadius: 8, border: "1.5px solid #e2e8f0", fontSize: 18, letterSpacing: 8, textAlign: "center", fontWeight: 700, outline: "none" }}
            />
            <Button onClick={() => onConfirmDelivery(pin)} variant="success">
              Confirm
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};

// ── Request card ──────────────────────────────────────────────────
const RequestCard = ({ delivery: d, onAccept, disabled }) => (
  <Card style={{ padding: 14, border: "1.5px solid #e0e7ff" }}>
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
      <div style={{ fontWeight: 700, fontSize: 14 }}>{formatNaira(d.fare)}</div>
      <Badge label={d.vehicleType} color="purple" />
    </div>
    <div style={{ fontSize: 12, color: "#374151", marginBottom: 4 }}>
      📍 <strong>Pickup:</strong> {d.pickup}
    </div>
    <div style={{ fontSize: 12, color: "#374151", marginBottom: 10 }}>
      🏁 <strong>Deliver:</strong> {d.dropoff}
    </div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div style={{ fontSize: 11, color: "#94a3b8" }}>
        {d.distanceKm} km · ~{d.estimatedMinutes} min
      </div>
      <Button onClick={onAccept} disabled={disabled} variant="purple" size="sm">
        Accept
      </Button>
    </div>
  </Card>
);

const NavItem = ({ icon, label, active, onClick }) => (
  <div onClick={onClick} style={{
    display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
    flex: 1, cursor: "pointer", padding: "6px 0",
    color: active ? "#7c3aed" : "#94a3b8", fontSize: 11, fontWeight: active ? 700 : 400,
  }}>
    <span style={{ fontSize: 20 }}>{icon}</span>
    {label}
  </div>
);

const styles = {
  page: { minHeight: "100vh", background: "#f8fafc", fontFamily: "system-ui,sans-serif" },
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "14px 16px", background: "#fff", borderBottom: "1px solid #f1f5f9",
  },
  onlineToggle: {
    display: "flex", alignItems: "center", gap: 7, padding: "7px 14px",
    borderRadius: 20, border: "1.5px solid", cursor: "pointer", transition: "all .2s",
  },
  earningsCard: {
    background: "linear-gradient(135deg,#4c1d95,#7c3aed)",
    marginTop: 16, padding: 20,
  },
  statPill: {
    background: "rgba(255,255,255,.15)", color: "#fff",
    padding: "4px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, display: "inline-block",
  },
  earningsBtn: {
    padding: "7px 16px", borderRadius: 20, border: "1.5px solid rgba(255,255,255,.35)",
    background: "transparent", color: "#fff", fontSize: 12, cursor: "pointer", fontWeight: 600,
  },
  tabRow: { display: "flex", borderBottom: "1px solid #f1f5f9", margin: "16px 0 12px" },
  tab: {
    flex: 1, textAlign: "center", padding: "10px 4px", fontSize: 12,
    fontWeight: 600, cursor: "pointer", transition: "all .15s",
  },
  vehicleIcon: {
    width: 44, height: 44, borderRadius: 12, background: "#f1f5f9",
    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
  },
  contactBtn: {
    flex: 1, padding: "8px", borderRadius: 8, border: "1.5px solid #bfdbfe",
    background: "#eff6ff", color: "#1e40af", fontSize: 11, cursor: "pointer", fontWeight: 600,
  },
  bottomNav: {
    position: "fixed", bottom: 0, left: 0, right: 0,
    background: "#fff", display: "flex", borderTop: "1px solid #f1f5f9",
    boxShadow: "0 -4px 20px rgba(0,0,0,.05)",
  },
};
