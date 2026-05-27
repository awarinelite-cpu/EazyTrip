import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Spinner } from "../../components/common/UI";
import { sendMessage, listenToMessages, markMessagesRead, QUICK_REPLIES } from "../../firebase/chat";
import { formatDate } from "../../utils/helpers";
import toast from "react-hot-toast";

export const ChatPage = ({ deliveryId: propDeliveryId, recipientName = "Rider", onClose }) => {
  const { deliveryId: paramId } = useParams();
  const deliveryId = propDeliveryId || paramId;

  const { currentUser, userProfile, isRider } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text,     setText]     = useState("");
  const [loading,  setLoading]  = useState(true);
  const [sending,  setSending]  = useState(false);
  const bottomRef = useRef(null);

  const role     = isRider ? "rider" : "sender";
  const quickRep = QUICK_REPLIES[role] || [];

  // Listen to messages
  useEffect(() => {
    if (!deliveryId) return;
    const unsub = listenToMessages(deliveryId, (msgs) => {
      setMessages(msgs);
      setLoading(false);
      markMessagesRead(deliveryId, currentUser.uid);
    });
    return unsub;
  }, [deliveryId]);

  // Auto scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (customText) => {
    const msg = (customText || text).trim();
    if (!msg) return;
    setSending(true);
    setText("");
    try {
      await sendMessage(deliveryId, {
        senderId:   currentUser.uid,
        senderName: userProfile.displayName,
        senderRole: role,
        text:       msg,
      });
    } catch (err) {
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Group messages by time
  const grouped = groupByDate(messages);

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerInfo}>
          <div style={styles.avatarCircle}>
            {(recipientName || "R")[0].toUpperCase()}
          </div>
          <div>
            <div style={styles.recipientName}>{recipientName}</div>
            <div style={styles.onlineDot}>● Online</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button style={styles.iconBtn} title="Call">📞</button>
          {onClose && <button style={styles.iconBtn} onClick={onClose}>✕</button>}
        </div>
      </div>

      {/* Messages */}
      <div style={styles.messageArea}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
            <Spinner />
          </div>
        ) : messages.length === 0 ? (
          <div style={styles.emptyChat}>
            <div style={{ fontSize: 40 }}>💬</div>
            <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 10 }}>
              No messages yet. Say hello!
            </div>
          </div>
        ) : (
          Object.entries(grouped).map(([date, msgs]) => (
            <div key={date}>
              <div style={styles.dateDivider}>{date}</div>
              {msgs.map(m => {
                const isMine = m.senderId === currentUser.uid;
                return (
                  <div key={m.id} style={{
                    display: "flex",
                    justifyContent: isMine ? "flex-end" : "flex-start",
                    marginBottom: 6,
                    padding: "0 16px",
                  }}>
                    {!isMine && (
                      <div style={styles.senderDot}>
                        {(m.senderName||"?")[0].toUpperCase()}
                      </div>
                    )}
                    <div style={{
                      ...styles.bubble,
                      background:   isMine ? "#6366f1" : "#fff",
                      color:        isMine ? "#fff"    : "#0f172a",
                      borderRadius: isMine
                        ? "18px 18px 4px 18px"
                        : "18px 18px 18px 4px",
                      boxShadow: isMine ? "none" : "0 1px 3px rgba(0,0,0,.08)",
                    }}>
                      <div style={{ fontSize: 14, lineHeight: 1.4 }}>{m.text}</div>
                      <div style={{
                        fontSize: 10,
                        color: isMine ? "rgba(255,255,255,.6)" : "#94a3b8",
                        marginTop: 4, textAlign: "right",
                        display: "flex", alignItems: "center",
                        justifyContent: "flex-end", gap: 4,
                      }}>
                        {m.createdAt?.toDate
                          ? m.createdAt.toDate().toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" })
                          : ""}
                        {isMine && <span style={{ fontSize: 12 }}>{m.read ? "✓✓" : "✓"}</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick replies */}
      {quickRep.length > 0 && (
        <div style={styles.quickRow}>
          {quickRep.map(q => (
            <button key={q} onClick={() => handleSend(q)} style={styles.quickChip}>
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={styles.inputArea}>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Type a message..."
          rows={1}
          style={styles.input}
        />
        <button
          onClick={() => handleSend()}
          disabled={!text.trim() || sending}
          style={{
            ...styles.sendBtn,
            background: text.trim() ? "#6366f1" : "#e2e8f0",
            color:      text.trim() ? "#fff"    : "#94a3b8",
          }}
        >
          {sending ? "..." : "➤"}
        </button>
      </div>
    </div>
  );
};

// ── Chat Modal wrapper ────────────────────────────────────────────
export const ChatModal = ({ deliveryId, recipientName, open, onClose }) => {
  if (!open) return null;
  return (
    <div style={styles.overlay} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={styles.modalWrap}>
        <ChatPage
          deliveryId={deliveryId}
          recipientName={recipientName}
          onClose={onClose}
        />
      </div>
    </div>
  );
};

// ── Helpers ───────────────────────────────────────────────────────
const groupByDate = (messages) => {
  return messages.reduce((acc, m) => {
    const d = m.createdAt?.toDate?.() || new Date();
    const today     = new Date();
    const yesterday = new Date(Date.now() - 86400000);
    let label;
    if (d.toDateString() === today.toDateString())     label = "Today";
    else if (d.toDateString() === yesterday.toDateString()) label = "Yesterday";
    else label = d.toLocaleDateString("en-NG", { day:"numeric", month:"short" });
    (acc[label] = acc[label] || []).push(m);
    return acc;
  }, {});
};

const styles = {
  container: {
    display: "flex", flexDirection: "column",
    height: "100%", background: "#f8fafc",
    fontFamily: "system-ui,sans-serif",
  },
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "12px 16px", background: "#fff",
    borderBottom: "1px solid #f1f5f9",
    boxShadow: "0 1px 4px rgba(0,0,0,.05)",
  },
  headerInfo: { display: "flex", alignItems: "center", gap: 10 },
  avatarCircle: {
    width: 38, height: 38, borderRadius: "50%",
    background: "#6366f1", color: "#fff",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 16, fontWeight: 700,
  },
  recipientName: { fontWeight: 700, fontSize: 14 },
  onlineDot: { fontSize: 11, color: "#16a34a" },
  iconBtn: {
    border: "1.5px solid #e2e8f0", background: "#f8fafc",
    borderRadius: 8, width: 36, height: 36, cursor: "pointer", fontSize: 16,
  },
  messageArea: {
    flex: 1, overflowY: "auto", padding: "12px 0",
    display: "flex", flexDirection: "column",
  },
  emptyChat: {
    flex: 1, display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center", padding: 60,
  },
  dateDivider: {
    textAlign: "center", fontSize: 11, color: "#94a3b8",
    margin: "10px 0", fontWeight: 600,
  },
  senderDot: {
    width: 28, height: 28, borderRadius: "50%",
    background: "#e2e8f0", color: "#475569",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 12, fontWeight: 700, marginRight: 6, flexShrink: 0, alignSelf: "flex-end",
  },
  bubble: {
    maxWidth: "72%", padding: "10px 14px",
    wordBreak: "break-word",
  },
  quickRow: {
    display: "flex", gap: 8, overflowX: "auto",
    padding: "8px 16px", background: "#fff",
    borderTop: "1px solid #f1f5f9",
  },
  quickChip: {
    whiteSpace: "nowrap", padding: "6px 14px",
    borderRadius: 20, border: "1.5px solid #e2e8f0",
    background: "#f8fafc", fontSize: 12, cursor: "pointer",
    fontFamily: "inherit", color: "#374151",
  },
  inputArea: {
    display: "flex", alignItems: "flex-end", gap: 8,
    padding: "10px 12px", background: "#fff",
    borderTop: "1px solid #f1f5f9",
  },
  input: {
    flex: 1, padding: "10px 14px", borderRadius: 22,
    border: "1.5px solid #e2e8f0", outline: "none",
    fontSize: 14, fontFamily: "inherit", resize: "none",
    maxHeight: 100, lineHeight: 1.5,
  },
  sendBtn: {
    width: 42, height: 42, borderRadius: "50%",
    border: "none", cursor: "pointer",
    fontSize: 18, display: "flex", alignItems: "center",
    justifyContent: "center", transition: "all .15s", flexShrink: 0,
  },
  overlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,.45)",
    display: "flex", alignItems: "flex-end", justifyContent: "center",
    zIndex: 200,
  },
  modalWrap: {
    width: "100%", maxWidth: 500,
    height: "80vh", borderRadius: "20px 20px 0 0",
    overflow: "hidden",
  },
};
