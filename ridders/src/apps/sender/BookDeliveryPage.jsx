import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Button, Input, Card, Divider } from "../../components/common/UI";
import { MapPlaceholder } from "../../components/maps/RiddersMap";
import {
  calculateFare, estimatedMinutes, VEHICLE_OPTIONS, PACKAGE_TYPES, formatNaira
} from "../../utils/helpers";
import { createDelivery } from "../../firebase/firestore";
import { useDelivery } from "../../context/DeliveryContext";
import toast from "react-hot-toast";

const STEPS = ["route", "package", "contacts", "confirm"];

export const BookDeliveryPage = () => {
  const { currentUser, userProfile } = useAuth();
  const { startTracking } = useDelivery();
  const navigate = useNavigate();

  const [step, setStep]     = useState(0);
  const [loading, setLoading] = useState(false);

  // Step 1 — Route
  const [pickup, setPickup]   = useState("");
  const [dropoff, setDropoff] = useState("");
  const [vehicle, setVehicle] = useState("motor");

  // Step 2 — Package
  const [pkgType, setPkgType]   = useState("parcel");
  const [pkgDesc, setPkgDesc]   = useState("");
  const [fragile, setFragile]   = useState(false);

  // Step 3 — Contacts
  const [recipientName,  setRecipientName]  = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [note, setNote] = useState("");

  // Computed
  const distKm = 8.4; // TODO: replace with Google Maps distance API
  const fare    = calculateFare(vehicle, distKm);
  const eta     = estimatedMinutes(distKm, vehicle);

  const canNext = [
    pickup && dropoff,
    pkgType,
    recipientName && recipientPhone,
    true,
  ];

  const next = () => {
    if (!canNext[step]) return toast.error("Please fill required fields");
    setStep(s => s + 1);
  };
  const back = () => setStep(s => s - 1);

  const handleBooking = async () => {
    setLoading(true);
    try {
      const deliveryId = await createDelivery({
        senderId:       currentUser.uid,
        senderName:     userProfile.displayName,
        senderPhone:    userProfile.phone,
        pickup,
        dropoff,
        vehicleType:    vehicle,
        packageType:    pkgType,
        packageDesc:    pkgDesc,
        isFragile:      fragile,
        recipientName,
        recipientPhone,
        note,
        fare,
        distanceKm:     distKm,
        estimatedMinutes: eta,
      });
      startTracking(deliveryId);
      toast.success("Delivery requested! Finding a rider...");
      navigate(`/sender/track/${deliveryId}`);
    } catch (err) {
      toast.error("Booking failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerTitle}>Book Delivery</div>
        <StepIndicator current={step} total={4} />
      </div>

      {/* Map */}
      <MapPlaceholder height="200px" label={pickup && dropoff ? `${pickup} → ${dropoff}` : "Set pickup & dropoff"} />

      <div style={{ padding: "0 16px 100px" }}>

        {/* ── Step 0: Route ── */}
        {step === 0 && (
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Where to pickup and deliver?</div>
            <div style={styles.locationBox}>
              <div style={styles.locationRow}>
                <div style={styles.dotGreen} />
                <input
                  value={pickup} onChange={e => setPickup(e.target.value)}
                  placeholder="Pickup address"
                  style={styles.locationInput}
                />
              </div>
              <div style={styles.locationDivider} />
              <div style={styles.locationRow}>
                <div style={styles.dotRed} />
                <input
                  value={dropoff} onChange={e => setDropoff(e.target.value)}
                  placeholder="Delivery address"
                  style={styles.locationInput}
                />
              </div>
            </div>

            <div style={styles.sectionTitle}>Choose vehicle</div>
            <div style={styles.vehicleGrid}>
              {VEHICLE_OPTIONS.map(v => (
                <div key={v.type} onClick={() => setVehicle(v.type)} style={{
                  ...styles.vehicleCard,
                  borderColor: vehicle === v.type ? "#6366f1" : "#e2e8f0",
                  background: vehicle === v.type ? "#eef2ff" : "#fafafa",
                }}>
                  <div style={{ fontSize: 30 }}>{v.icon}</div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{v.label}</div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>{v.desc}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#6366f1" }}>
                    {formatNaira(calculateFare(v.type, distKm))}
                  </div>
                </div>
              ))}
            </div>

            {pickup && dropoff && (
              <Card style={styles.fareCard}>
                <div style={styles.fareRow}>
                  <span style={{ color: "#64748b" }}>Distance</span>
                  <span style={{ fontWeight: 600 }}>{distKm} km</span>
                </div>
                <div style={styles.fareRow}>
                  <span style={{ color: "#64748b" }}>Estimated time</span>
                  <span style={{ fontWeight: 600 }}>{eta} min</span>
                </div>
                <Divider />
                <div style={styles.fareRow}>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>Total fare</span>
                  <span style={{ fontWeight: 700, fontSize: 18, color: "#6366f1" }}>
                    {formatNaira(fare)}
                  </span>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* ── Step 1: Package ── */}
        {step === 1 && (
          <div style={styles.section}>
            <div style={styles.sectionTitle}>What are you sending?</div>
            <div style={styles.pkgGrid}>
              {PACKAGE_TYPES.map(p => (
                <div key={p.type} onClick={() => setPkgType(p.type)} style={{
                  ...styles.pkgCard,
                  borderColor: pkgType === p.type ? "#6366f1" : "#e2e8f0",
                  background: pkgType === p.type ? "#eef2ff" : "#fafafa",
                }}>
                  <div style={{ fontSize: 24 }}>{p.icon}</div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{p.label}</div>
                </div>
              ))}
            </div>

            <Input label="Describe the package (optional)" value={pkgDesc}
              onChange={e => setPkgDesc(e.target.value)}
              placeholder="e.g. Laptop bag, black color" style={{ marginTop: 16 }} />

            <div onClick={() => setFragile(f => !f)} style={{
              ...styles.fragileToggle,
              borderColor: fragile ? "#f59e0b" : "#e2e8f0",
              background: fragile ? "#fef9c3" : "#fafafa",
            }}>
              <span style={{ fontSize: 22 }}>⚠️</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>Fragile item</div>
                <div style={{ fontSize: 12, color: "#64748b" }}>Rider will handle with care</div>
              </div>
              <div style={{ marginLeft: "auto", fontSize: 20 }}>
                {fragile ? "✅" : "⬜"}
              </div>
            </div>
          </div>
        )}

        {/* ── Step 2: Contacts ── */}
        {step === 2 && (
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Sender (you)</div>
            <Card style={{ ...styles.contactCard, marginBottom: 16 }}>
              <div style={styles.contactRow}>
                <div style={{ fontSize: 28 }}>👤</div>
                <div>
                  <div style={{ fontWeight: 600 }}>{userProfile?.displayName}</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>{userProfile?.phone}</div>
                </div>
              </div>
            </Card>

            <div style={styles.sectionTitle}>Recipient</div>
            <Input label="Recipient name" value={recipientName}
              onChange={e => setRecipientName(e.target.value)}
              placeholder="Full name" icon="👤" />
            <Input label="Recipient phone" type="tel" value={recipientPhone}
              onChange={e => setRecipientPhone(e.target.value)}
              placeholder="+234 800 000 0000" icon="📞" style={{ marginTop: 12 }} />
            <Input label="Note to rider (optional)" value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="e.g. Call before arriving" style={{ marginTop: 12 }} />
          </div>
        )}

        {/* ── Step 3: Confirm ── */}
        {step === 3 && (
          <div style={styles.section}>
            <div style={styles.sectionTitle}>Confirm your delivery</div>

            <Card style={{ marginBottom: 12 }}>
              <SummaryRow icon="📍" label="Pickup"   value={pickup} />
              <Divider />
              <SummaryRow icon="🏁" label="Dropoff"  value={dropoff} />
              <Divider />
              <SummaryRow icon={VEHICLE_OPTIONS.find(v=>v.type===vehicle)?.icon} label="Vehicle" value={VEHICLE_OPTIONS.find(v=>v.type===vehicle)?.label} />
              <Divider />
              <SummaryRow icon={PACKAGE_TYPES.find(p=>p.type===pkgType)?.icon} label="Package" value={pkgDesc || pkgType} />
            </Card>

            <Card style={{ marginBottom: 12 }}>
              <SummaryRow icon="👤" label="Sender"    value={`${userProfile?.displayName} · ${userProfile?.phone}`} />
              <Divider />
              <SummaryRow icon="📲" label="Recipient" value={`${recipientName} · ${recipientPhone}`} />
            </Card>

            <Card style={{ background: "#f0fdf4", border: "1.5px solid #bbf7d0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ color: "#64748b" }}>Delivery fee</span>
                <span style={{ fontWeight: 700, fontSize: 20, color: "#16a34a" }}>{formatNaira(fare)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#64748b" }}>Estimated time</span>
                <span style={{ fontWeight: 600 }}>{eta} min</span>
              </div>
              <Divider />
              <div style={{ fontSize: 12, color: "#16a34a", textAlign: "center" }}>
                🔐 Auto-generated delivery PIN will be sent to recipient
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <div style={styles.bottomBar}>
        {step > 0 && (
          <Button variant="outline" onClick={back} style={{ flex: 1 }}>
            ← Back
          </Button>
        )}
        {step < 3 ? (
          <Button onClick={next} style={{ flex: 2 }} size="lg">
            Continue →
          </Button>
        ) : (
          <Button onClick={handleBooking} loading={loading} variant="success" style={{ flex: 2 }} size="lg">
            🚀 Request Rider
          </Button>
        )}
      </div>
    </div>
  );
};

// ── Helper sub-components ─────────────────────────────────────────
const StepIndicator = ({ current, total }) => (
  <div style={{ display: "flex", gap: 6 }}>
    {Array.from({ length: total }).map((_, i) => (
      <div key={i} style={{
        width: i === current ? 24 : 8, height: 8, borderRadius: 4,
        background: i <= current ? "#6366f1" : "#e2e8f0",
        transition: "all .2s",
      }} />
    ))}
  </div>
);

const SummaryRow = ({ icon, label, value }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 0" }}>
    <span style={{ fontSize: 18, width: 24 }}>{icon}</span>
    <div>
      <div style={{ fontSize: 11, color: "#94a3b8" }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 500 }}>{value}</div>
    </div>
  </div>
);

// ── Styles ────────────────────────────────────────────────────────
const styles = {
  page: { minHeight: "100vh", background: "#f8fafc", fontFamily: "system-ui,sans-serif" },
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "14px 16px", background: "#fff", borderBottom: "1px solid #f1f5f9",
  },
  headerTitle: { fontSize: 17, fontWeight: 700, color: "#0f172a" },
  section: { paddingTop: 20, display: "flex", flexDirection: "column", gap: 12 },
  sectionTitle: { fontSize: 13, fontWeight: 700, color: "#374151", marginTop: 8 },
  locationBox: {
    background: "#fff", borderRadius: 14, padding: "6px 14px",
    boxShadow: "0 1px 4px rgba(0,0,0,.08)", border: "1px solid #f1f5f9",
  },
  locationRow: { display: "flex", alignItems: "center", gap: 10, padding: "10px 0" },
  locationDivider: { height: 1, background: "#f1f5f9", marginLeft: 28 },
  dotGreen: { width: 12, height: 12, borderRadius: "50%", background: "#22c55e", flexShrink: 0 },
  dotRed:   { width: 12, height: 12, borderRadius: "50%", background: "#ef4444", flexShrink: 0 },
  locationInput: {
    flex: 1, border: "none", outline: "none", fontSize: 14, color: "#0f172a",
    background: "transparent", fontFamily: "inherit",
  },
  vehicleGrid: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 },
  vehicleCard: {
    display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
    padding: "14px 8px", borderRadius: 12, border: "2px solid", cursor: "pointer",
    transition: "all .15s", textAlign: "center",
  },
  fareCard: { background: "#f0f9ff", border: "1.5px solid #bae6fd" },
  fareRow: { display: "flex", justifyContent: "space-between", marginBottom: 8 },
  pkgGrid: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 },
  pkgCard: {
    display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
    padding: "12px 8px", borderRadius: 12, border: "2px solid", cursor: "pointer",
    transition: "all .15s", textAlign: "center",
  },
  fragileToggle: {
    display: "flex", alignItems: "center", gap: 12, padding: 14,
    borderRadius: 12, border: "2px solid", cursor: "pointer", transition: "all .15s",
  },
  contactCard: { padding: 14 },
  contactRow: { display: "flex", alignItems: "center", gap: 12 },
  bottomBar: {
    position: "fixed", bottom: 0, left: 0, right: 0,
    background: "#fff", padding: "12px 16px", display: "flex", gap: 10,
    borderTop: "1px solid #f1f5f9", boxShadow: "0 -4px 20px rgba(0,0,0,.06)",
  },
};
