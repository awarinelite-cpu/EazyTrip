import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDelivery } from "../../context/DeliveryContext";
import { Avatar, Badge, Button, Card, Divider, Spinner } from "../../components/common/UI";
import { MapPlaceholder } from "../../components/maps/RiddersMap";
import { formatNaira, formatDate, STATUS_LABELS, STATUS_COLORS } from "../../utils/helpers";
import { updateDocument, COLLECTIONS, addDocument } from "../../firebase/firestore";
import toast from "react-hot-toast";

const TIMELINE = [
  { key: "searching",  label: "Finding a rider",    icon: "🔍" },
  { key: "accepted",   label: "Rider accepted",      icon: "✅" },
  { key: "pickup",     label: "Rider at pickup",     icon: "📦" },
  { key: "in_transit", label: "In transit",          icon: "🛵" },
  { key: "delivered",  label: "Delivered",           icon: "🏁" },
];
const STATUS_ORDER = ["searching","accepted","pickup","in_transit","delivered"];

export const TrackDeliveryPage = () => {
  const { deliveryId } = useParams();
  const { activeDelivery, startTracking } = useDelivery();
  const navigate = useNavigate();
  const [showRating, setShowRating] = useState(false);
  const [ratingValue, setRatingValue] = useState(5);
  const [ratingNote, setRatingNote] = useState("");

  useEffect(() => {
    if (deliveryId) startTracking(deliveryId);
  }, [deliveryId]);

  useEffect(() => {
    if (activeDelivery?.status === "delivered") {
      setShowRating(true);
    }
  }, [activeDelivery?.status]);

  const handleCancel = async () => {
    if (!window.confirm("Cancel this delivery?")) return;
    await updateDocument(COLLECTIONS.DELIVERIES, deliveryId, { status: "cancelled" });
    toast("Delivery cancelled");
    navigate("/sender");
  };

  const handleRating = async () => {
    await addDocument(COLLECTIONS.RATINGS, {
      deliveryId,
      riderId:  activeDelivery.riderId,
      senderId: activeDelivery.senderId,
      rating:   ratingValue,
      note:     ratingNote,
      type:     "sender_to_rider",
    });
    toast.success("Thank you for rating!");
    navigate("/sender");
  };

  if (!activeDelivery) {
    return (
      <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh" }}>
        <Spinner size={40} />
      </div>
    );
  }

  const d = activeDelivery;
  const statusIdx = STATUS_ORDER.indexOf(d.status);

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <div style={styles.headerTitle}>Live Tracking</div>
          <div style={{ fontSize: 12, color: "#64748b" }}>Order #{deliveryId?.slice(-6).toUpperCase()}</div>
        </div>
        <Badge
          label={STATUS_LABELS[d.status] || d.status}
          color={d.status === "delivered" ? "green" : d.status === "cancelled" ? "red" : d.status === "in_transit" ? "blue" : "yellow"}
        />
      </div>

      {/* Map */}
      <MapPlaceholder height="220px" label={`${d.pickup} → ${d.dropoff}`} />

      <div style={{ padding: "16px 16px 100px" }}>

        {/* Timeline */}
        <Card style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Delivery timeline</div>
          {TIMELINE.map((t, i) => {
            const done   = i <= statusIdx;
            const active = i === statusIdx;
            return (
              <div key={t.key} style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: i < TIMELINE.length - 1 ? 0 : 0 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: "50%", display: "flex",
                    alignItems: "center", justifyContent: "center", fontSize: 16,
                    background: done ? (active ? STATUS_COLORS[t.key] : "#dcfce7") : "#f1f5f9",
                    border: active ? `2px solid ${STATUS_COLORS[t.key]}` : "2px solid transparent",
                    flexShrink: 0,
                  }}>{done ? t.icon : "○"}</div>
                  {i < TIMELINE.length - 1 && (
                    <div style={{ width: 2, height: 28, background: done ? "#bbf7d0" : "#f1f5f9", margin: "2px 0" }} />
                  )}
                </div>
                <div style={{ paddingTop: 6, flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: active ? 700 : 500, color: done ? "#0f172a" : "#94a3b8" }}>
                    {t.label}
                  </div>
                  {active && d.status === "in_transit" && (
                    <div style={{ fontSize: 11, color: "#6366f1", marginTop: 2 }}>
                      ETA ~{d.estimatedMinutes} min · {d.distanceKm} km
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </Card>

        {/* Rider info (shown when accepted+) */}
        {d.riderId && d.riderName && (
          <Card style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Your rider</div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Avatar name={d.riderName} size={46} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{d.riderName}</div>
                <div style={{ fontSize: 12, color: "#64748b" }}>
                  ⭐ {d.riderRating?.toFixed(1) || "—"} · {d.vehicleType} · {d.vehiclePlate || ""}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button style={styles.actionBtn} title="Call rider">📞</button>
                <button style={styles.actionBtn} title="Chat">💬</button>
              </div>
            </div>
          </Card>
        )}

        {/* Delivery PIN */}
        <Card style={{ background: "#fef9c3", border: "1.5px solid #fde68a", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 24 }}>🔐</span>
            <div>
              <div style={{ fontSize: 12, color: "#92400e" }}>Delivery PIN — share with recipient</div>
              <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: 8, color: "#78350f" }}>
                {d.deliveryPin}
              </div>
            </div>
          </div>
        </Card>

        {/* Delivery details */}
        <Card style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Delivery details</div>
          <DetailRow icon="📍" label="Pickup"    value={d.pickup} />
          <Divider />
          <DetailRow icon="🏁" label="Deliver to" value={d.dropoff} />
          <Divider />
          <DetailRow icon="👤" label="Recipient" value={`${d.recipientName} · ${d.recipientPhone}`} />
          <Divider />
          <DetailRow icon="📦" label="Package"   value={d.packageDesc || d.packageType} />
          <Divider />
          <DetailRow icon="💰" label="Fare"      value={formatNaira(d.fare)} />
        </Card>

        {/* Cancel button (only while searching/accepted) */}
        {["searching","accepted"].includes(d.status) && (
          <Button variant="danger" onClick={handleCancel} fullWidth>
            Cancel Delivery
          </Button>
        )}
      </div>

      {/* Rating modal */}
      {showRating && (
        <div style={styles.ratingOverlay}>
          <Card style={styles.ratingCard}>
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 48 }}>🎉</div>
              <div style={{ fontSize: 18, fontWeight: 700, marginTop: 8 }}>Delivered!</div>
              <div style={{ fontSize: 13, color: "#64748b" }}>Rate your experience with {d.riderName}</div>
            </div>
            <div style={{ display: "flex", justifyContent: "center", gap: 8, fontSize: 36, marginBottom: 16 }}>
              {[1,2,3,4,5].map(star => (
                <span key={star} onClick={() => setRatingValue(star)}
                  style={{ cursor: "pointer", color: star <= ratingValue ? "#f59e0b" : "#d1d5db" }}>★</span>
              ))}
            </div>
            <input value={ratingNote} onChange={e => setRatingNote(e.target.value)}
              placeholder="Optional comment..." style={styles.ratingInput} />
            <Button onClick={handleRating} fullWidth size="lg" style={{ marginTop: 12 }}>Submit Rating</Button>
            <Button variant="ghost" onClick={() => navigate("/sender")} fullWidth style={{ marginTop: 6 }}>
              Skip
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
};

const DetailRow = ({ icon, label, value }) => (
  <div style={{ display: "flex", gap: 10, padding: "4px 0" }}>
    <span style={{ fontSize: 16, width: 22 }}>{icon}</span>
    <div>
      <div style={{ fontSize: 11, color: "#94a3b8" }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 500 }}>{value}</div>
    </div>
  </div>
);

const styles = {
  page: { minHeight: "100vh", background: "#f8fafc", fontFamily: "system-ui,sans-serif" },
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "14px 16px", background: "#fff", borderBottom: "1px solid #f1f5f9",
  },
  headerTitle: { fontSize: 17, fontWeight: 700, color: "#0f172a" },
  actionBtn: {
    width: 38, height: 38, borderRadius: "50%", border: "1.5px solid #e2e8f0",
    background: "#f8fafc", fontSize: 16, cursor: "pointer", display: "flex",
    alignItems: "center", justifyContent: "center",
  },
  ratingOverlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,.5)",
    display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 100,
  },
  ratingCard: { width: "100%", maxWidth: 500, borderRadius: "20px 20px 0 0", padding: 24 },
  ratingInput: {
    width: "100%", padding: "10px 12px", borderRadius: 8, fontSize: 13,
    border: "1.5px solid #e2e8f0", outline: "none", fontFamily: "inherit",
    boxSizing: "border-box",
  },
};
