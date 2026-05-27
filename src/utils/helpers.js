// ── Pricing ───────────────────────────────────────────────────────
const BASE_RATES = {
  car:   { base: 500, perKm: 150 },
  motor: { base: 300, perKm:  90 },
  bike:  { base: 200, perKm:  60 },
};
const PLATFORM_COMMISSION = 0.15; // 15%

export const calculateFare = (vehicleType, distanceKm, surgeFactor = 1) => {
  const rate = BASE_RATES[vehicleType] || BASE_RATES.motor;
  const raw  = (rate.base + rate.perKm * distanceKm) * surgeFactor;
  return Math.round(raw / 50) * 50; // round to nearest ₦50
};

export const platformCut  = (fare) => Math.round(fare * PLATFORM_COMMISSION);
export const riderEarning = (fare) => fare - platformCut(fare);

// ── Distance ──────────────────────────────────────────────────────
export const haversineKm = (lat1, lng1, lat2, lng2) => {
  const R  = 6371;
  const dL = ((lat2 - lat1) * Math.PI) / 180;
  const dG = ((lng2 - lng1) * Math.PI) / 180;
  const a  =
    Math.sin(dL / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dG / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

export const estimatedMinutes = (distanceKm, vehicleType) => {
  const speeds = { car: 30, motor: 25, bike: 15 }; // avg km/h in Lagos traffic
  return Math.round((distanceKm / (speeds[vehicleType] || 25)) * 60);
};

// ── Delivery PIN ──────────────────────────────────────────────────
export const generatePin = () =>
  Math.floor(1000 + Math.random() * 9000).toString();

// ── Formatting ────────────────────────────────────────────────────
export const formatNaira = (amount) =>
  `₦${Number(amount).toLocaleString("en-NG")}`;

export const formatDate = (ts) => {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString("en-NG", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
};

export const initials = (name = "") =>
  name.split(" ").slice(0, 2).map(w => w[0]?.toUpperCase()).join("");

// ── Delivery statuses ─────────────────────────────────────────────
export const STATUS_LABELS = {
  searching:  "Searching for rider",
  accepted:   "Rider accepted",
  pickup:     "Rider at pickup",
  in_transit: "In transit",
  delivered:  "Delivered",
  cancelled:  "Cancelled",
};

export const STATUS_COLORS = {
  searching:  "#f59e0b",
  accepted:   "#3b82f6",
  pickup:     "#8b5cf6",
  in_transit: "#0ea5e9",
  delivered:  "#22c55e",
  cancelled:  "#ef4444",
};

// ── Vehicle labels ────────────────────────────────────────────────
export const VEHICLE_OPTIONS = [
  { type: "car",   label: "Car",   icon: "🚗", desc: "Large packages, AC" },
  { type: "motor", label: "Motor", icon: "🛵", desc: "Fast, city rides"    },
  { type: "bike",  label: "Bike",  icon: "🚲", desc: "Small parcels"       },
];

// ── Package types ─────────────────────────────────────────────────
export const PACKAGE_TYPES = [
  { type: "parcel",   label: "Parcel",   icon: "📦" },
  { type: "food",     label: "Food",     icon: "🍔" },
  { type: "medicine", label: "Meds",     icon: "💊" },
  { type: "shopping", label: "Shopping", icon: "🛍" },
  { type: "document", label: "Document", icon: "📄" },
  { type: "fragile",  label: "Fragile",  icon: "🪟" },
];
