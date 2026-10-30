import React, { useEffect, useState } from "react";

// Keyless Google Maps embed (same approach as NurseShift's MapModal): uses the
// classic maps.google.com embed URL, which needs no API key. Shows a route when
// both pickup and dropoff are given, a single pin when only one is, and Lagos
// otherwise. Tap the map's expand button for a full-screen view with actions.

const DEFAULT_PLACE = "Lagos, Nigeria";

const withCountry = (text) =>
  /nigeria/i.test(text) ? text.trim() : `${text.trim()}, Nigeria`;

// Delay value changes so typing in an address box doesn't reload the map per key.
const useDebounced = (value, ms = 700) => {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
};

const buildUrls = (pickup, dropoff, coords) => {
  const from = pickup?.trim() ? withCountry(pickup) : "";
  const to = dropoff?.trim() ? withCountry(dropoff) : "";
  const enc = encodeURIComponent;

  if (from && to) {
    return {
      embed: `https://maps.google.com/maps?saddr=${enc(from)}&daddr=${enc(to)}&output=embed`,
      external: `https://www.google.com/maps/dir/?api=1&origin=${enc(from)}&destination=${enc(to)}&travelmode=driving`,
      directions: `https://www.google.com/maps/dir/?api=1&origin=${enc(from)}&destination=${enc(to)}&travelmode=driving`,
      start: `https://www.google.com/maps/dir/?api=1&origin=${enc(from)}&destination=${enc(to)}&travelmode=driving&dir_action=navigate`,
      title: `${pickup.trim()} → ${dropoff.trim()}`,
    };
  }

  const single = from || to;
  const q = single
    ? enc(single)
    : coords
    ? `${coords.lat},${coords.lng}`
    : enc(DEFAULT_PLACE);
  return {
    embed: `https://maps.google.com/maps?q=${q}&z=${single || coords ? 15 : 12}&output=embed`,
    external: `https://www.google.com/maps/search/?api=1&query=${q}`,
    directions: `https://www.google.com/maps/dir/?api=1&destination=${q}`,
    start: `https://www.google.com/maps/dir/?api=1&destination=${q}&dir_action=navigate`,
    title: single || (coords ? "Your location" : DEFAULT_PLACE),
  };
};

export const RouteMap = ({
  pickup = "",
  dropoff = "",
  height = "220px",
  label = "",
  useMyLocation = false, // fall back to the device's location when no addresses
}) => {
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [coords, setCoords] = useState(null);

  const dPickup = useDebounced(pickup);
  const dDropoff = useDebounced(dropoff);

  useEffect(() => {
    if (!useMyLocation || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { timeout: 8000 }
    );
  }, [useMyLocation]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const urls = buildUrls(dPickup, dDropoff, coords);

  const handleShare = async () => {
    const data = { title: urls.title, text: urls.title, url: urls.external };
    if (navigator.share) {
      try { await navigator.share(data); } catch { /* dismissed */ }
      return;
    }
    try {
      await navigator.clipboard.writeText(urls.external);
      setToast("Link copied");
      setTimeout(() => setToast(""), 1800);
    } catch {
      window.open(urls.external, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <>
      <div style={{ position: "relative", height, borderRadius: 8, overflow: "hidden", background: "#e8f5e9" }}>
        <iframe
          title={`Map — ${urls.title}`}
          src={urls.embed}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          style={{ width: "100%", height: "100%", border: 0, display: "block" }}
        />
        <button
          onClick={() => setOpen(true)}
          aria-label="Expand map"
          style={styles.expandBtn}
        >
          ⤢ Expand
        </button>
        {label && <div style={styles.labelChip}>{label}</div>}
      </div>

      {open && (
        <div style={styles.backdrop}>
          <div style={styles.header}>
            <div style={styles.title}>{urls.title}</div>
            <button onClick={() => setOpen(false)} aria-label="Close map" style={styles.closeBtn}>✕</button>
          </div>

          <iframe
            title={`Map — ${urls.title}`}
            src={urls.embed}
            referrerPolicy="no-referrer-when-downgrade"
            style={{ flex: 1, width: "100%", border: 0 }}
          />

          <div style={styles.actions}>
            <a href={urls.directions} target="_blank" rel="noopener noreferrer"
              style={{ ...styles.actionBtn, ...styles.primary }}>Directions</a>
            <a href={urls.start} target="_blank" rel="noopener noreferrer"
              style={styles.actionBtn}>Start</a>
            <button onClick={handleShare} style={styles.actionBtn}>Share</button>
            <a href={urls.external} target="_blank" rel="noopener noreferrer"
              style={styles.actionBtn}>Open in Maps</a>
          </div>

          {toast && <div style={styles.toast}>{toast}</div>}
        </div>
      )}
    </>
  );
};

const styles = {
  expandBtn: {
    position: "absolute", top: 8, right: 8, padding: "6px 10px", borderRadius: 8,
    border: "none", background: "#fff", color: "#111", fontSize: 12, fontWeight: 700,
    boxShadow: "0 1px 4px rgba(0,0,0,.3)", cursor: "pointer",
  },
  labelChip: {
    position: "absolute", left: 8, bottom: 8, maxWidth: "75%", padding: "4px 9px",
    borderRadius: 8, background: "rgba(255,255,255,.92)", fontSize: 11, color: "#333",
    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
    boxShadow: "0 1px 3px rgba(0,0,0,.2)", pointerEvents: "none",
  },
  backdrop: {
    position: "fixed", inset: 0, zIndex: 2000, background: "#fff",
    display: "flex", flexDirection: "column",
  },
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    gap: 10, padding: "12px 14px", background: "#0f172a", color: "#fff",
  },
  title: { fontSize: 14, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  closeBtn: {
    border: "none", background: "rgba(255,255,255,.15)", color: "#fff",
    width: 32, height: 32, borderRadius: "50%", fontSize: 15, cursor: "pointer",
  },
  actions: {
    display: "flex", gap: 8, padding: "10px 12px", background: "#fff",
    borderTop: "1px solid #e5e7eb", flexWrap: "wrap",
  },
  actionBtn: {
    flex: 1, minWidth: 80, textAlign: "center", padding: "11px 10px", borderRadius: 10,
    border: "1px solid #d1d5db", background: "#fff", color: "#111", fontSize: 13,
    fontWeight: 700, textDecoration: "none", cursor: "pointer",
  },
  primary: { background: "#4f46e5", borderColor: "#4f46e5", color: "#fff" },
  toast: {
    position: "absolute", left: "50%", bottom: 80, transform: "translateX(-50%)",
    background: "#111", color: "#fff", padding: "8px 14px", borderRadius: 20, fontSize: 12,
  },
};

export default RouteMap;
