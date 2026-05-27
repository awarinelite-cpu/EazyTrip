import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Button, Card, Input, Badge, EmptyState, Divider } from "../../components/common/UI";
import { formatNaira, formatDate, VEHICLE_OPTIONS, calculateFare } from "../../utils/helpers";
import { addDocument, updateDocument, COLLECTIONS } from "../../firebase/firestore";
import { db } from "../../firebase/config";
import {
  collection, query, where, orderBy, onSnapshot, Timestamp
} from "firebase/firestore";
import toast from "react-hot-toast";

// Scheduled delivery is a delivery with status: "scheduled"
// A Cloud Function (or cron) should auto-dispatch when scheduledFor time arrives.
// Here we also provide a manual "Dispatch now" button for admin.

// ── Scheduled delivery booking form (embedded in BookDeliveryPage) ─
export const ScheduleToggle = ({ scheduled, onToggle, scheduledFor, onTimeChange }) => {
  // Min time: 30 minutes from now
  const minTime = new Date(Date.now() + 30 * 60 * 1000);
  const minStr  = minTime.toISOString().slice(0, 16);

  return (
    <div style={styles.scheduleBox}>
      <div style={styles.scheduleHeader}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>⏰ Schedule for later</div>
          <div style={{ fontSize: 12, color: "#64748b" }}>Book now, deliver at a specific time</div>
        </div>
        <div
          onClick={onToggle}
          style={{
            width: 44, height: 24, borderRadius: 12, padding: 3,
            background: scheduled ? "#6366f1" : "#d1d5db",
            display: "flex", alignItems: "center",
            justifyContent: scheduled ? "flex-end" : "flex-start",
            cursor: "pointer", transition: "all .2s",
          }}
        >
          <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff" }} />
        </div>
      </div>

      {scheduled && (
        <div style={{ marginTop: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>
            Pickup date & time
          </label>
          <input
            type="datetime-local"
            min={minStr}
            value={scheduledFor}
            onChange={e => onTimeChange(e.target.value)}
            style={styles.dateInput}
          />
          {scheduledFor && (
            <div style={styles.schedulePreview}>
              📅 Scheduled for{" "}
              <strong>
                {new Date(scheduledFor).toLocaleString("en-NG", {
                  weekday: "short", day: "numeric", month: "short",
                  hour: "2-digit", minute: "2-digit",
                })}
              </strong>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Create a scheduled delivery ───────────────────────────────────
export const createScheduledDelivery = async (baseDeliveryData, scheduledFor) => {
  const scheduledTimestamp = Timestamp.fromDate(new Date(scheduledFor));
  return addDocument(COLLECTIONS.DELIVERIES, {
    ...baseDeliveryData,
    status:           "scheduled",
    scheduledFor:     scheduledTimestamp,
    riderId:          null,
    deliveryPin:      Math.floor(1000 + Math.random() * 9000).toString(),
    isScheduled:      true,
  });
};

// ── Scheduled deliveries list page ────────────────────────────────
export const ScheduledDeliveriesPage = () => {
  const { currentUser } = useAuth();
  const navigate        = useNavigate();
  const [items, setItems]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, COLLECTIONS.DELIVERIES),
      where("senderId",    "==", currentUser.uid),
      where("status",      "==", "scheduled"),
      orderBy("scheduledFor", "asc")
    );
    const unsub = onSnapshot(q, snap => {
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, [currentUser]);

  const cancelScheduled = async (id) => {
    if (!window.confirm("Cancel this scheduled delivery?")) return;
    await updateDocument(COLLECTIONS.DELIVERIES, id, { status: "cancelled" });
    toast("Scheduled delivery cancelled");
  };

  const editScheduled = (id) => {
    navigate(`/sender/schedule/edit/${id}`);
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div style={styles.headerTitle}>Scheduled Deliveries</div>
        <Button size="sm" onClick={() => navigate("/sender/book")}>+ New</Button>
      </div>

      <div style={{ padding: "16px 16px 80px" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 40 }}>Loading...</div>
        ) : items.length === 0 ? (
          <EmptyState
            icon="📅"
            title="No scheduled deliveries"
            desc="Book a delivery in advance and it will appear here"
            action={
              <Button onClick={() => navigate("/sender/book")} size="sm">
                Schedule a delivery
              </Button>
            }
          />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {items.map(item => (
              <ScheduledCard
                key={item.id}
                item={item}
                onCancel={() => cancelScheduled(item.id)}
                onEdit={() => editScheduled(item.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ── Scheduled card component ──────────────────────────────────────
const ScheduledCard = ({ item, onCancel, onEdit }) => {
  const scheduledDate = item.scheduledFor?.toDate?.() || new Date(item.scheduledFor);
  const now           = new Date();
  const diffMs        = scheduledDate - now;
  const diffHrs       = Math.round(diffMs / 3600000);
  const isPast        = diffMs < 0;

  const vehicle = VEHICLE_OPTIONS.find(v => v.type === item.vehicleType);

  const timeLabel = isPast
    ? "Dispatching now..."
    : diffHrs < 1
      ? `In ${Math.round(diffMs / 60000)} min`
      : diffHrs < 24
        ? `In ${diffHrs} hour${diffHrs > 1 ? "s" : ""}`
        : scheduledDate.toLocaleString("en-NG", {
            weekday: "short", day: "numeric", month: "short",
            hour: "2-digit", minute: "2-digit",
          });

  return (
    <Card style={{ padding: 16 }}>
      {/* Time badge */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          background: isPast ? "#f0fdf4" : "#eff6ff",
          padding: "6px 12px", borderRadius: 20,
        }}>
          <span style={{ fontSize: 16 }}>⏰</span>
          <span style={{
            fontSize: 12, fontWeight: 700,
            color: isPast ? "#16a34a" : "#1e40af",
          }}>{timeLabel}</span>
        </div>
        <Badge label={vehicle?.label || item.vehicleType} color="blue" />
      </div>

      {/* Route */}
      <div style={styles.routeRow}>
        <div style={styles.dotGreen} />
        <div style={styles.routeText}>{item.pickup}</div>
      </div>
      <div style={{ ...styles.routeConnector }} />
      <div style={styles.routeRow}>
        <div style={styles.dotRed} />
        <div style={styles.routeText}>{item.dropoff}</div>
      </div>

      <Divider style={{ margin: "12px 0" }} />

      {/* Details */}
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#64748b" }}>
        <span>📦 {item.packageType}</span>
        <span>👤 {item.recipientName}</span>
        <span style={{ fontWeight: 700, color: "#0f172a" }}>{formatNaira(item.fare)}</span>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <Button variant="outline" size="sm" onClick={onEdit} style={{ flex: 1 }}>
          ✏️ Edit
        </Button>
        <Button variant="danger" size="sm" onClick={onCancel} style={{ flex: 1 }}>
          Cancel
        </Button>
      </div>
    </Card>
  );
};

// ── Admin: manually dispatch a scheduled delivery ─────────────────
export const AdminDispatchScheduled = () => {
  const [items, setItems] = useState([]);

  useEffect(() => {
    const q = query(
      collection(db, COLLECTIONS.DELIVERIES),
      where("status", "==", "scheduled"),
      orderBy("scheduledFor", "asc")
    );
    return onSnapshot(q, snap =>
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
  }, []);

  const dispatch = async (id) => {
    await updateDocument(COLLECTIONS.DELIVERIES, id, { status: "searching" });
    toast.success("Delivery dispatched — searching for rider");
  };

  if (items.length === 0) return null;

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ fontWeight: 700, marginBottom: 10, color: "#374151" }}>
        ⏰ Scheduled — ready to dispatch ({items.length})
      </div>
      {items.map(item => {
        const scheduledDate = item.scheduledFor?.toDate?.() || new Date();
        return (
          <div key={item.id} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "10px 14px", background: "#eff6ff", borderRadius: 10,
            border: "1.5px solid #bfdbfe", marginBottom: 8,
          }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>
                {item.pickup?.slice(0,25)} → {item.dropoff?.slice(0,25)}
              </div>
              <div style={{ fontSize: 11, color: "#64748b" }}>
                Sender: {item.senderName} · {scheduledDate.toLocaleString("en-NG")}
              </div>
            </div>
            <Button size="sm" variant="purple" onClick={() => dispatch(item.id)}>
              Dispatch
            </Button>
          </div>
        );
      })}
    </div>
  );
};

const styles = {
  page: { minHeight: "100vh", background: "#f8fafc", fontFamily: "system-ui,sans-serif" },
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "14px 16px", background: "#fff", borderBottom: "1px solid #f1f5f9",
  },
  headerTitle: { fontSize: 17, fontWeight: 700 },
  scheduleBox: {
    background: "#fff", borderRadius: 14, padding: 14,
    border: "1.5px solid #e2e8f0",
    boxShadow: "0 1px 4px rgba(0,0,0,.06)",
  },
  scheduleHeader: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  dateInput: {
    width: "100%", padding: "10px 12px", borderRadius: 8, fontSize: 13,
    border: "1.5px solid #e2e8f0", outline: "none", fontFamily: "inherit",
    boxSizing: "border-box", marginTop: 8,
  },
  schedulePreview: {
    marginTop: 8, padding: "8px 12px", background: "#eff6ff",
    borderRadius: 8, fontSize: 12, color: "#1e40af",
  },
  routeRow: { display: "flex", alignItems: "center", gap: 10 },
  routeConnector: {
    width: 2, height: 16, background: "#e2e8f0",
    marginLeft: 5, margin: "3px 0 3px 5px",
  },
  routeText: { fontSize: 13, color: "#374151", fontWeight: 500 },
  dotGreen: { width: 12, height: 12, borderRadius: "50%", background: "#22c55e", flexShrink: 0 },
  dotRed:   { width: 12, height: 12, borderRadius: "50%", background: "#ef4444", flexShrink: 0 },
};
