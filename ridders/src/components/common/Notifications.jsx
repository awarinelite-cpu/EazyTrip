import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { listenToNotifications } from "../../firebase/firestore";
import { updateDocument, COLLECTIONS } from "../../firebase/firestore";
import { registerPushToken, onForegroundMessage } from "../../firebase/notifications";
import { formatDate } from "../../utils/helpers";
import toast from "react-hot-toast";

// ── Notification hook ─────────────────────────────────────────────
export const useNotifications = () => {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    if (!currentUser) return;

    // Register push token
    registerPushToken(currentUser.uid);

    // Listen to Firestore notifications
    const unsub = listenToNotifications(currentUser.uid, setNotifications);

    // Handle foreground push messages
    const unsubFg = onForegroundMessage(({ title, body }) => {
      toast(
        <div>
          <div style={{ fontWeight: 700 }}>{title}</div>
          <div style={{ fontSize: 12, color: "#64748b" }}>{body}</div>
        </div>,
        { duration: 5000, icon: "🔔" }
      );
    });

    return () => { unsub(); unsubFg(); };
  }, [currentUser]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markRead = async (notifId) => {
    await updateDocument(COLLECTIONS.NOTIFICATIONS, notifId, { read: true });
  };

  const markAllRead = async () => {
    const unread = notifications.filter(n => !n.read);
    await Promise.all(unread.map(n => markRead(n.id)));
  };

  return { notifications, unreadCount, markRead, markAllRead };
};

// ── Notification bell icon with badge ─────────────────────────────
export const NotificationBell = ({ onClick, count = 0 }) => (
  <button onClick={onClick} style={styles.bellBtn}>
    <span style={{ fontSize: 22 }}>🔔</span>
    {count > 0 && (
      <span style={styles.badge}>
        {count > 9 ? "9+" : count}
      </span>
    )}
  </button>
);

// ── Notifications panel ───────────────────────────────────────────
export const NotificationsPanel = ({ open, onClose }) => {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();

  if (!open) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={styles.panel}>
        {/* Header */}
        <div style={styles.panelHeader}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>
            Notifications
            {unreadCount > 0 && (
              <span style={styles.unreadPill}>{unreadCount} new</span>
            )}
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {unreadCount > 0 && (
              <button onClick={markAllRead} style={styles.markAllBtn}>
                Mark all read
              </button>
            )}
            <button onClick={onClose} style={styles.closeBtn}>✕</button>
          </div>
        </div>

        {/* List */}
        <div style={styles.list}>
          {notifications.length === 0 ? (
            <div style={styles.empty}>
              <div style={{ fontSize: 40 }}>🔕</div>
              <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 10 }}>
                No notifications yet
              </div>
            </div>
          ) : (
            notifications.map(n => (
              <div key={n.id} onClick={() => markRead(n.id)} style={{
                ...styles.notifItem,
                background: n.read ? "transparent" : "#f0f9ff",
                borderLeft: n.read ? "3px solid transparent" : "3px solid #6366f1",
              }}>
                <div style={styles.notifIcon}>{getIcon(n.type)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: n.read ? 500 : 700, fontSize: 13 }}>
                    {n.title}
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 2, lineHeight: 1.4 }}>
                    {n.body}
                  </div>
                  <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 4 }}>
                    {formatDate(n.createdAt)}
                  </div>
                </div>
                {!n.read && <div style={styles.unreadDot} />}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// ── Full notifications page ───────────────────────────────────────
export const NotificationsPage = () => {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc", fontFamily: "system-ui,sans-serif" }}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 16px", background: "#fff", borderBottom: "1px solid #f1f5f9",
      }}>
        <div style={{ fontSize: 17, fontWeight: 700 }}>Notifications</div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} style={{ border: "none", background: "none",
            color: "#6366f1", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
            Mark all read
          </button>
        )}
      </div>

      <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
        {notifications.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ fontSize: 48 }}>🔕</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginTop: 12 }}>All caught up!</div>
            <div style={{ fontSize: 13, color: "#64748b", marginTop: 6 }}>No notifications yet</div>
          </div>
        ) : (
          notifications.map(n => (
            <div key={n.id} onClick={() => markRead(n.id)} style={{
              display: "flex", gap: 12, padding: "14px 16px",
              background: n.read ? "#fff" : "#f0f9ff",
              borderRadius: 12, border: `1px solid ${n.read ? "#f1f5f9" : "#bfdbfe"}`,
              cursor: "pointer",
            }}>
              <div style={{ fontSize: 24, flexShrink: 0 }}>{getIcon(n.type)}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: n.read ? 500 : 700, fontSize: 14 }}>{n.title}</div>
                <div style={{ fontSize: 13, color: "#64748b", marginTop: 3 }}>{n.body}</div>
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 5 }}>{formatDate(n.createdAt)}</div>
              </div>
              {!n.read && <div style={styles.unreadDot} />}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// ── Helpers ───────────────────────────────────────────────────────
const getIcon = (type) => ({
  delivery_accepted:  "🛵",
  rider_at_pickup:    "📦",
  in_transit:         "🚀",
  delivered:          "✅",
  new_request:        "📬",
  payout_processed:   "💰",
  new_message:        "💬",
  sos:                "🆘",
  kyc_approved:       "✅",
  kyc_rejected:       "❌",
  promo:              "🎁",
}[type] || "🔔");

const styles = {
  bellBtn: {
    position: "relative", border: "none", background: "none",
    cursor: "pointer", padding: 4,
  },
  badge: {
    position: "absolute", top: -2, right: -2,
    background: "#ef4444", color: "#fff",
    fontSize: 9, fontWeight: 700, borderRadius: 10,
    padding: "1px 5px", minWidth: 16, textAlign: "center",
  },
  overlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,.4)",
    zIndex: 300, display: "flex", justifyContent: "flex-end",
  },
  panel: {
    width: 360, background: "#fff", height: "100vh",
    display: "flex", flexDirection: "column",
    boxShadow: "-4px 0 20px rgba(0,0,0,.12)",
  },
  panelHeader: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "18px 20px", borderBottom: "1px solid #f1f5f9",
  },
  unreadPill: {
    marginLeft: 8, background: "#6366f1", color: "#fff",
    fontSize: 11, padding: "2px 8px", borderRadius: 20, fontWeight: 600,
  },
  markAllBtn: {
    border: "none", background: "none", color: "#6366f1",
    fontSize: 12, fontWeight: 600, cursor: "pointer",
  },
  closeBtn: {
    border: "1.5px solid #e2e8f0", background: "#f8fafc",
    borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 14,
  },
  list: { flex: 1, overflowY: "auto" },
  notifItem: {
    display: "flex", gap: 12, padding: "14px 20px",
    cursor: "pointer", borderBottom: "1px solid #f8fafc",
    transition: "background .15s",
  },
  notifIcon: { fontSize: 22, flexShrink: 0 },
  unreadDot: {
    width: 8, height: 8, borderRadius: "50%",
    background: "#6366f1", flexShrink: 0, alignSelf: "center",
  },
  empty: {
    display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center",
    padding: "80px 20px",
  },
};
