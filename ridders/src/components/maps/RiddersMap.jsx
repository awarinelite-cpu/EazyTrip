import React, { useCallback, useRef } from "react";
import { GoogleMap, useJsApiLoader, Marker, DirectionsRenderer } from "@react-google-maps/api";

// 🔧 Replace with your actual Google Maps API key
const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_KEY || "YOUR_GOOGLE_MAPS_API_KEY";

const LIBRARIES = ["places"];

const MAP_STYLES = [
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "simplified" }] },
];

const defaultCenter = { lat: 6.5244, lng: 3.3792 }; // Lagos, Nigeria

// ── Main Map Component ────────────────────────────────────────────
export const RiddersMap = ({
  center = defaultCenter,
  zoom = 13,
  height = "300px",
  markers = [],        // [{ lat, lng, label, icon }]
  directions = null,
  onClick = null,
  children,
}) => {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: LIBRARIES,
  });

  const mapRef = useRef(null);
  const onLoad  = useCallback(map => { mapRef.current = map; }, []);
  const onUnmount = useCallback(() => { mapRef.current = null; }, []);

  if (loadError || GOOGLE_MAPS_API_KEY === "YOUR_GOOGLE_MAPS_API_KEY") {
    return <MapPlaceholder height={height} />;
  }

  if (!isLoaded) {
    return (
      <div style={{ height, background: "#e8f5e9", borderRadius: 8,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 13, color: "#555" }}>
        Loading map...
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={{ width: "100%", height, borderRadius: 8 }}
      center={center}
      zoom={zoom}
      onLoad={onLoad}
      onUnmount={onUnmount}
      onClick={onClick}
      options={{ styles: MAP_STYLES, disableDefaultUI: false, zoomControl: true }}
    >
      {markers.map((m, i) => (
        <Marker key={i} position={{ lat: m.lat, lng: m.lng }}
          label={m.label} icon={m.icon} />
      ))}
      {directions && <DirectionsRenderer directions={directions} />}
      {children}
    </GoogleMap>
  );
};

// ── Placeholder when no API key ───────────────────────────────────
export const MapPlaceholder = ({ height = "300px", label = "" }) => (
  <div style={{
    height, background: "#e8f5e9", borderRadius: 8, position: "relative",
    display: "flex", alignItems: "center", justifyContent: "center",
    flexDirection: "column", gap: 6, overflow: "hidden",
    border: "1px dashed #a5d6a7",
  }}>
    <div style={{ fontSize: 28 }}>🗺️</div>
    <div style={{ fontSize: 12, color: "#2e7d32", fontWeight: 500 }}>
      Google Maps
    </div>
    {label && <div style={{ fontSize: 11, color: "#558b2f" }}>{label}</div>}
    <div style={{ fontSize: 10, color: "#81c784", position: "absolute",
      bottom: 6, right: 8 }}>
      Add API key in .env
    </div>
    {/* decorative dots */}
    {[
      { top: "30%", left: "25%", color: "#1565c0" },
      { top: "55%", left: "60%", color: "#2e7d32" },
      { top: "40%", left: "70%", color: "#f57c00" },
    ].map((d, i) => (
      <div key={i} style={{
        position: "absolute", top: d.top, left: d.left,
        width: 10, height: 10, borderRadius: "50%", background: d.color,
      }} />
    ))}
  </div>
);

// ── Places Autocomplete input ─────────────────────────────────────
export const PlacesInput = ({ value, onChange, onSelect, placeholder }) => {
  // When Maps API is loaded this upgrades to Autocomplete
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder || "Search address..."}
      style={{
        width: "100%", padding: "10px 12px", borderRadius: 8, fontSize: 13,
        border: "1px solid #e0e0e0", outline: "none", background: "#fafafa",
      }}
    />
  );
};
