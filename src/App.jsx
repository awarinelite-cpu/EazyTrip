import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { DeliveryProvider } from "./context/DeliveryContext";

// Auth
import { LoginPage, RegisterPage, ForgotPasswordPage } from "./apps/sender/AuthPages";

// Sender
import { SenderHomePage }          from "./apps/sender/SenderHomePage";
import { BookDeliveryPage }        from "./apps/sender/BookDeliveryPage";
import { TrackDeliveryPage }       from "./apps/sender/TrackDeliveryPage";
import { WalletPage }              from "./apps/sender/WalletPage";
import { ScheduledDeliveriesPage } from "./apps/sender/ScheduledDelivery";
import { NotificationsPage }       from "./components/common/Notifications";

// Rider
import { RiderDashboardPage } from "./apps/rider/RiderDashboardPage";

// Admin
import { AdminApp } from "./apps/admin/AdminApp";

// ── Protected route ───────────────────────────────────────────────
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { currentUser, userProfile, loading } = useAuth();
  if (loading) return <FullPageSpinner />;
  if (!currentUser) return <Navigate to="/login" replace />;
  if (allowedRoles.length && !allowedRoles.includes(userProfile?.role))
    return <Navigate to={getRoleHome(userProfile?.role)} replace />;
  return children;
};

const RoleRedirect = () => {
  const { currentUser, userProfile, loading } = useAuth();
  if (loading) return <FullPageSpinner />;
  if (!currentUser) return <Navigate to="/login" replace />;
  return <Navigate to={getRoleHome(userProfile?.role)} replace />;
};

const getRoleHome = (role) => {
  if (role === "admin") return "/admin";
  if (role === "rider") return "/rider";
  return "/sender";
};

const FullPageSpinner = () => (
  <div style={{
    minHeight:"100vh", display:"flex", alignItems:"center",
    justifyContent:"center", background:"#0f172a",
    flexDirection:"column", gap:16,
  }}>
    <div style={{ fontSize:52 }}>🛵</div>
    <div style={{
      width:40, height:40, border:"3px solid rgba(255,255,255,.1)",
      borderTop:"3px solid #6366f1", borderRadius:"50%",
      animation:"spin .7s linear infinite",
    }} />
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </div>
);

const S = ({ children }) => (
  <ProtectedRoute allowedRoles={["sender"]}>{children}</ProtectedRoute>
);
const R = ({ children }) => (
  <ProtectedRoute allowedRoles={["rider"]}>{children}</ProtectedRoute>
);
const A = ({ children }) => (
  <ProtectedRoute allowedRoles={["admin"]}>{children}</ProtectedRoute>
);

const AppRoutes = () => (
  <Routes>
    {/* Public */}
    <Route path="/login"           element={<LoginPage />} />
    <Route path="/register"        element={<RegisterPage />} />
    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
    <Route path="/"                element={<RoleRedirect />} />

    {/* Sender */}
    <Route path="/sender"                    element={<S><SenderHomePage /></S>} />
    <Route path="/sender/book"               element={<S><BookDeliveryPage /></S>} />
    <Route path="/sender/track/:deliveryId"  element={<S><TrackDeliveryPage /></S>} />
    <Route path="/sender/wallet"             element={<S><WalletPage /></S>} />
    <Route path="/sender/scheduled"          element={<S><ScheduledDeliveriesPage /></S>} />
    <Route path="/sender/notifications"      element={<S><NotificationsPage /></S>} />

    {/* Rider */}
    <Route path="/rider"    element={<R><RiderDashboardPage /></R>} />
    <Route path="/rider/*"  element={<R><RiderDashboardPage /></R>} />

    {/* Admin */}
    <Route path="/admin/*" element={<A><AdminApp /></A>} />

    {/* Fallback */}
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <DeliveryProvider>
        <AppRoutes />
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3500,
            style: { borderRadius:10, fontSize:13, fontWeight:600 },
            success: { iconTheme: { primary:"#16a34a", secondary:"#fff" } },
          }}
        />
      </DeliveryProvider>
    </AuthProvider>
  </BrowserRouter>
);

export default App;
