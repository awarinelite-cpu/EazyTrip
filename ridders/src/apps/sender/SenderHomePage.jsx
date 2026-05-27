import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Avatar, Badge, Button, Card, EmptyState, Spinner } from "../../components/common/UI";
import { formatNaira, formatDate, STATUS_LABELS } from "../../utils/helpers";
import { db } from "../../firebase/config";
import { collection, query, where, orderBy, limit, onSnapshot } from "firebase/firestore";
import { COLLECTIONS } from "../../firebase/firestore";

const STATUS_COLOR = { delivered:"green", cancelled:"red", in_transit:"blue", searching:"yellow", accepted:"yellow", pickup:"purple" };

export const SenderHomePage = () => {
  const { currentUser, userProfile, logout } = useAuth();
  const navigate = useNavigate();
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");

  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, COLLECTIONS.DELIVERIES),
      where("senderId", "==", currentUser.uid),
      orderBy("createdAt", "desc"),
      limit(30)
    );
    const unsub = onSnapshot(q, snap => {
      setDeliveries(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [currentUser]);

  const filtered = tab === "all" ? deliveries
    : deliveries.filter(d => d.status === tab);

  const active = deliveries.find(d => ["searching","accepted","pickup","in_transit"].includes(d.status));

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Avatar name={userProfile?.displayName || ""} size={42} />
          <div>
            <div style={{ fontSize: 12, color: "#64748b" }}>Welcome back</div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{userProfile?.displayName}</div>
          </div>
        </div>
        <button onClick={logout} style={styles.logoutBtn}>👋</button>
      </div>

      {/* Active delivery banner */}
      {active && (
        <div onClick={() => navigate(`/sender/track/${active.id}`)} style={styles.activeBanner}>
          <span style={{ fontSize: 20 }}>🛵</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{STATUS_LABELS[active.status]}</div>
            <div style={{ fontSize: 12, opacity: .85 }}>{active.dropoff}</div>
          </div>
          <span style={{ fontSize: 18 }}>→</span>
        </div>
      )}

      <div style={{ padding: "0 16px 100px" }}>
        {/* Wallet card */}
        <Card style={styles.walletCard}>
          <div style={{ color: "rgba(255,255,255,.7)", fontSize: 12 }}>Wallet balance</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#fff", margin: "4px 0" }}>
            {formatNaira(userProfile?.walletBalance || 0)}
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
            <button style={styles.walletBtn}>➕ Top up</button>
            <button style={styles.walletBtn}>📋 History</button>
          </div>
        </Card>

        {/* Quick stats */}
        <div style={styles.statsRow}>
          <StatBox icon="📦" label="Total sent" value={userProfile?.totalDeliveries || 0} />
          <StatBox icon="⭐" label="Your rating" value={`${(userProfile?.rating || 5).toFixed(1)}`} />
          <StatBox icon="🎁" label="Promo codes" value="1 active" />
        </div>

        {/* Delivery history */}
        <div style={styles.sectionHeader}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>Delivery history</div>
        </div>

        <div style={styles.tabRow}>
          {[
            { key: "all",        label: "All" },
            { key: "in_transit", label: "Active" },
            { key: "delivered",  label: "Delivered" },
            { key: "cancelled",  label: "Cancelled" },
          ].map(t => (
            <div key={t.key} onClick={() => setTab(t.key)} style={{
              ...styles.tab, borderBottom: tab === t.key ? "2.5px solid #6366f1" : "2.5px solid transparent",
              color: tab === t.key ? "#6366f1" : "#64748b",
            }}>{t.label}</div>
          ))}
        </div>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
            <Spinner />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon="📭" title="No deliveries yet"
            desc="Your delivery history will appear here"
            action={<Button onClick={() => navigate("/sender/book")} size="sm">Book your first delivery</Button>}
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map(d => (
              <Card key={d.id} onClick={() => navigate(`/sender/track/${d.id}`)} style={styles.deliveryCard}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={styles.vehicleIcon}>
                    {d.vehicleType === "car" ? "🚗" : d.vehicleType === "motor" ? "🛵" : "🚲"}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{d.dropoff}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                      {d.pickup} · {formatDate(d.createdAt)}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{formatNaira(d.fare)}</div>
                    <Badge label={STATUS_LABELS[d.status] || d.status}
                      color={STATUS_COLOR[d.status] || "gray"} style={{ marginTop: 4 }} />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <div style={styles.bottomNav}>
        <NavItem icon="🏠" label="Home"     active onClick={() => {}} />
        <NavItem icon="📦" label="Book"     onClick={() => navigate("/sender/book")} />
        <NavItem icon="🔔" label="Alerts"   onClick={() => {}} />
        <NavItem icon="👤" label="Profile"  onClick={() => {}} />
      </div>

      {/* FAB */}
      <button onClick={() => navigate("/sender/book")} style={styles.fab}>
        + Book
      </button>
    </div>
  );
};

const StatBox = ({ icon, label, value }) => (
  <Card style={{ flex: 1, textAlign: "center", padding: 12 }}>
    <div style={{ fontSize: 22 }}>{icon}</div>
    <div style={{ fontSize: 16, fontWeight: 700, marginTop: 4 }}>{value}</div>
    <div style={{ fontSize: 11, color: "#94a3b8" }}>{label}</div>
  </Card>
);

const NavItem = ({ icon, label, active, onClick }) => (
  <div onClick={onClick} style={{
    display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
    flex: 1, cursor: "pointer", padding: "6px 0",
    color: active ? "#6366f1" : "#94a3b8", fontSize: 11, fontWeight: active ? 700 : 400,
  }}>
    <span style={{ fontSize: 20 }}>{icon}</span>
    {label}
  </div>
);

const styles = {
  page: { minHeight: "100vh", background: "#f8fafc", fontFamily: "system-ui,sans-serif" },
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "16px", background: "#fff", borderBottom: "1px solid #f1f5f9",
  },
  logoutBtn: { border: "none", background: "none", fontSize: 22, cursor: "pointer" },
  activeBanner: {
    display: "flex", alignItems: "center", gap: 12,
    background: "#6366f1", color: "#fff", padding: "12px 16px", cursor: "pointer",
  },
  walletCard: {
    background: "linear-gradient(135deg,#1a1a2e,#312e81)",
    marginTop: 16, padding: 20,
  },
  walletBtn: {
    padding: "7px 16px", borderRadius: 20, border: "1.5px solid rgba(255,255,255,.35)",
    background: "transparent", color: "#fff", fontSize: 12, cursor: "pointer", fontWeight: 600,
  },
  statsRow: { display: "flex", gap: 10, marginTop: 14 },
  sectionHeader: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    marginTop: 20, marginBottom: 8,
  },
  tabRow: { display: "flex", borderBottom: "1px solid #f1f5f9", marginBottom: 14 },
  tab: {
    flex: 1, textAlign: "center", padding: "10px 4px", fontSize: 12,
    fontWeight: 600, cursor: "pointer", transition: "all .15s",
  },
  deliveryCard: { padding: 14, cursor: "pointer" },
  vehicleIcon: {
    width: 44, height: 44, borderRadius: 12, background: "#f1f5f9",
    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
  },
  bottomNav: {
    position: "fixed", bottom: 0, left: 0, right: 0,
    background: "#fff", display: "flex", borderTop: "1px solid #f1f5f9",
    boxShadow: "0 -4px 20px rgba(0,0,0,.05)",
  },
  fab: {
    position: "fixed", right: 20, bottom: 76,
    background: "#6366f1", color: "#fff", border: "none",
    borderRadius: 50, padding: "14px 22px", fontSize: 14, fontWeight: 700,
    boxShadow: "0 4px 16px rgba(99,102,241,.4)", cursor: "pointer",
  },
};
