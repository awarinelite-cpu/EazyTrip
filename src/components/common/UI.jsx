import React from "react";

// ── Button ────────────────────────────────────────────────────────
export const Button = ({
  children, onClick, variant = "primary", size = "md",
  disabled = false, loading = false, fullWidth = false, style = {}, type = "button"
}) => {
  const base = {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    gap: 8, border: "none", borderRadius: 10, fontWeight: 600,
    cursor: disabled || loading ? "not-allowed" : "pointer",
    opacity: disabled || loading ? 0.6 : 1,
    transition: "all .18s", width: fullWidth ? "100%" : "auto",
    fontFamily: "inherit", ...style,
  };
  const sizes = {
    sm: { padding: "7px 14px", fontSize: 12 },
    md: { padding: "11px 20px", fontSize: 14 },
    lg: { padding: "14px 28px", fontSize: 15 },
  };
  const variants = {
    primary:  { background: "#1a1a2e", color: "#fff" },
    secondary:{ background: "#f1f5f9", color: "#1a1a2e" },
    success:  { background: "#16a34a", color: "#fff" },
    danger:   { background: "#dc2626", color: "#fff" },
    warning:  { background: "#d97706", color: "#fff" },
    outline:  { background: "transparent", color: "#1a1a2e", border: "1.5px solid #cbd5e1" },
    ghost:    { background: "transparent", color: "#64748b" },
    purple:   { background: "#6366f1", color: "#fff" },
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled || loading}
      style={{ ...base, ...sizes[size], ...variants[variant] }}>
      {loading ? <Spinner size={14} color="currentColor" /> : null}
      {children}
    </button>
  );
};

// ── Input ─────────────────────────────────────────────────────────
export const Input = ({
  label, value, onChange, placeholder, type = "text",
  icon, error, disabled = false, style = {}, inputStyle = {}
}) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 4, ...style }}>
    {label && <label style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>{label}</label>}
    <div style={{ position: "relative" }}>
      {icon && (
        <span style={{
          position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)",
          fontSize: 16, color: "#94a3b8",
        }}>{icon}</span>
      )}
      <input
        type={type} value={value} onChange={onChange}
        placeholder={placeholder} disabled={disabled}
        style={{
          width: "100%", padding: icon ? "10px 12px 10px 36px" : "10px 12px",
          borderRadius: 8, fontSize: 13, border: `1.5px solid ${error ? "#ef4444" : "#e2e8f0"}`,
          outline: "none", background: disabled ? "#f8fafc" : "#fff",
          fontFamily: "inherit", boxSizing: "border-box", ...inputStyle,
        }}
      />
    </div>
    {error && <span style={{ fontSize: 11, color: "#ef4444" }}>{error}</span>}
  </div>
);

// ── Textarea ──────────────────────────────────────────────────────
export const Textarea = ({ label, value, onChange, placeholder, rows = 3, style = {} }) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 4, ...style }}>
    {label && <label style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>{label}</label>}
    <textarea
      value={value} onChange={onChange} placeholder={placeholder} rows={rows}
      style={{
        width: "100%", padding: "10px 12px", borderRadius: 8, fontSize: 13,
        border: "1.5px solid #e2e8f0", outline: "none", fontFamily: "inherit",
        resize: "vertical", boxSizing: "border-box",
      }}
    />
  </div>
);

// ── Badge ─────────────────────────────────────────────────────────
const BADGE_STYLES = {
  green:  { background: "#dcfce7", color: "#166534" },
  red:    { background: "#fee2e2", color: "#991b1b" },
  yellow: { background: "#fef9c3", color: "#854d0e" },
  blue:   { background: "#dbeafe", color: "#1e40af" },
  purple: { background: "#ede9fe", color: "#5b21b6" },
  gray:   { background: "#f1f5f9", color: "#475569" },
  orange: { background: "#ffedd5", color: "#9a3412" },
};
export const Badge = ({ label, color = "gray", style = {} }) => (
  <span style={{
    display: "inline-block", padding: "3px 10px", borderRadius: 20,
    fontSize: 11, fontWeight: 600, ...BADGE_STYLES[color], ...style,
  }}>{label}</span>
);

// ── Card ──────────────────────────────────────────────────────────
export const Card = ({ children, style = {}, onClick }) => (
  <div onClick={onClick} style={{
    background: "#fff", borderRadius: 14, padding: 16,
    boxShadow: "0 1px 4px rgba(0,0,0,.07)", border: "1px solid #f1f5f9",
    cursor: onClick ? "pointer" : "default", ...style,
  }}>
    {children}
  </div>
);

// ── Avatar ────────────────────────────────────────────────────────
const AVATAR_BG = ["#dbeafe","#dcfce7","#ede9fe","#ffedd5","#fce7f3","#e0f2fe"];
export const Avatar = ({ name = "", size = 38, style = {} }) => {
  const initials = name.split(" ").slice(0,2).map(w=>w[0]?.toUpperCase()).join("");
  const bg = AVATAR_BG[name.charCodeAt(0) % AVATAR_BG.length];
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", background: bg,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.35, fontWeight: 700, color: "#1e293b",
      flexShrink: 0, ...style,
    }}>{initials}</div>
  );
};

// ── Spinner ───────────────────────────────────────────────────────
export const Spinner = ({ size = 24, color = "#6366f1" }) => (
  <div style={{
    width: size, height: size, border: `2.5px solid ${color}33`,
    borderTop: `2.5px solid ${color}`, borderRadius: "50%",
    animation: "spin .7s linear infinite", flexShrink: 0,
  }} />
);

// ── Divider ───────────────────────────────────────────────────────
export const Divider = ({ style = {} }) => (
  <div style={{ height: 1, background: "#f1f5f9", margin: "8px 0", ...style }} />
);

// ── Modal ─────────────────────────────────────────────────────────
export const Modal = ({ open, onClose, title, children, width = 440 }) => {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,.45)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 1000, padding: 16,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "#fff", borderRadius: 16, width: "100%", maxWidth: width,
        maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,.2)",
      }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 20px", borderBottom: "1px solid #f1f5f9",
        }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a" }}>{title}</div>
          <button onClick={onClose} style={{
            border: "none", background: "#f1f5f9", borderRadius: 8,
            width: 30, height: 30, cursor: "pointer", fontSize: 16, color: "#64748b",
          }}>x</button>
        </div>
        <div style={{ padding: "16px 20px" }}>{children}</div>
      </div>
    </div>
  );
};

// ── Toggle ────────────────────────────────────────────────────────
export const Toggle = ({ value, onChange, label }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
    {label && <span style={{ fontSize: 13, color: "#374151" }}>{label}</span>}
    <div onClick={() => onChange(!value)} style={{
      width: 44, height: 24, borderRadius: 12, padding: 3,
      background: value ? "#22c55e" : "#d1d5db",
      display: "flex", alignItems: "center",
      justifyContent: value ? "flex-end" : "flex-start",
      cursor: "pointer", transition: "all .2s",
    }}>
      <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff" }} />
    </div>
  </div>
);

// ── Stars rating display ──────────────────────────────────────────
export const Stars = ({ rating = 0, size = 14 }) => (
  <span style={{ color: "#f59e0b", fontSize: size }}>
    {"star".repeat(Math.round(rating)).split("").map((_,i)=>"★").join("")}
    {"star".repeat(5-Math.round(rating)).split("").map((_,i)=>"☆").join("")}
    <span style={{ color: "#94a3b8", fontSize: size - 2, marginLeft: 4 }}>
      {Number(rating).toFixed(1)}
    </span>
  </span>
);

// ── Empty state ───────────────────────────────────────────────────
export const EmptyState = ({ icon = "📭", title, desc, action }) => (
  <div style={{
    display: "flex", flexDirection: "column", alignItems: "center",
    justifyContent: "center", gap: 10, padding: "48px 24px", textAlign: "center",
  }}>
    <div style={{ fontSize: 48 }}>{icon}</div>
    <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>{title}</div>
    {desc && <div style={{ fontSize: 13, color: "#64748b", maxWidth: 280 }}>{desc}</div>}
    {action}
  </div>
);

// ── Global spinner styles ─────────────────────────────────────────
if (typeof document !== "undefined" && !document.getElementById("ridders-spin")) {
  const s = document.createElement("style");
  s.id = "ridders-spin";
  s.textContent = "@keyframes spin{to{transform:rotate(360deg)}}";
  document.head.appendChild(s);
}
