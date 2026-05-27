import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Button, Input, Card } from "../../components/common/UI";
import toast from "react-hot-toast";

// ── Login Page ────────────────────────────────────────────────────
export const LoginPage = () => {
  const { login, userProfile } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleLogin = async () => {
    if (!form.email || !form.password) return toast.error("Fill all fields");
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success("Welcome back!");
      // Navigation handled in App.jsx based on role
    } catch (err) {
      toast.error(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.brand}>
        <div style={styles.logo}>🛵</div>
        <div style={styles.appName}>Ridders</div>
        <div style={styles.tagline}>Fast. Reliable. Delivered.</div>
      </div>

      <Card style={styles.card}>
        <div style={styles.cardTitle}>Sign in to your account</div>

        <div style={styles.form}>
          <Input
            label="Email address"
            type="email"
            value={form.email}
            onChange={set("email")}
            placeholder="you@example.com"
            icon="✉️"
          />
          <Input
            label="Password"
            type="password"
            value={form.password}
            onChange={set("password")}
            placeholder="••••••••"
            icon="🔒"
          />

          <div style={{ textAlign: "right" }}>
            <Link to="/forgot-password" style={styles.link}>Forgot password?</Link>
          </div>

          <Button onClick={handleLogin} loading={loading} fullWidth size="lg">
            Sign In
          </Button>
        </div>

        <div style={styles.switchRow}>
          New to Ridders?{" "}
          <Link to="/register" style={styles.link}>Create account</Link>
        </div>
      </Card>
    </div>
  );
};

// ── Register Page ─────────────────────────────────────────────────
export const RegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState("sender");
  const [form, setForm] = useState({
    displayName: "", email: "", phone: "", password: "", confirm: "",
    vehicleType: "motor", vehiclePlate: "",
  });
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleRegister = async () => {
    if (!form.displayName || !form.email || !form.phone || !form.password)
      return toast.error("Fill all required fields");
    if (form.password !== form.confirm)
      return toast.error("Passwords do not match");
    if (form.password.length < 6)
      return toast.error("Password must be at least 6 characters");

    setLoading(true);
    try {
      const extra = { phone: form.phone };
      if (role === "rider") {
        extra.vehicleType  = form.vehicleType;
        extra.vehiclePlate = form.vehiclePlate;
        extra.isVerified   = false; // needs KYC
        extra.isOnline     = false;
      }
      await register(form.email, form.password, form.displayName, role, extra);
      toast.success("Account created! Welcome to Ridders 🎉");
    } catch (err) {
      toast.error(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.brand}>
        <div style={styles.logo}>🛵</div>
        <div style={styles.appName}>Ridders</div>
      </div>

      <Card style={{ ...styles.card, maxWidth: 460 }}>
        <div style={styles.cardTitle}>Create your account</div>

        {/* Role selector */}
        <div style={styles.roleRow}>
          {[
            { r: "sender", icon: "📦", label: "I'm a Sender" },
            { r: "rider",  icon: "🛵", label: "I'm a Rider"  },
          ].map(({ r, icon, label }) => (
            <div key={r} onClick={() => setRole(r)} style={{
              ...styles.roleCard,
              borderColor: role === r ? "#6366f1" : "#e2e8f0",
              background: role === r ? "#eef2ff" : "#fafafa",
            }}>
              <div style={{ fontSize: 28 }}>{icon}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: role === r ? "#4338ca" : "#374151" }}>
                {label}
              </div>
            </div>
          ))}
        </div>

        <div style={styles.form}>
          <Input label="Full name" value={form.displayName} onChange={set("displayName")}
            placeholder="Chidi Okafor" icon="👤" />
          <Input label="Email address" type="email" value={form.email} onChange={set("email")}
            placeholder="you@example.com" icon="✉️" />
          <Input label="Phone number" type="tel" value={form.phone} onChange={set("phone")}
            placeholder="+234 800 000 0000" icon="📞" />

          {role === "rider" && (
            <>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>Vehicle type</label>
                <div style={styles.vehicleRow}>
                  {[
                    { t: "car", icon: "🚗", label: "Car" },
                    { t: "motor", icon: "🛵", label: "Motor" },
                    { t: "bike", icon: "🚲", label: "Bike" },
                  ].map(({ t, icon, label }) => (
                    <div key={t} onClick={() => setForm(f => ({ ...f, vehicleType: t }))} style={{
                      ...styles.vehicleCard,
                      borderColor: form.vehicleType === t ? "#6366f1" : "#e2e8f0",
                      background: form.vehicleType === t ? "#eef2ff" : "#fafafa",
                    }}>
                      <div style={{ fontSize: 22 }}>{icon}</div>
                      <div style={{ fontSize: 11, color: "#374151" }}>{label}</div>
                    </div>
                  ))}
                </div>
              </div>
              <Input label="Vehicle plate number" value={form.vehiclePlate}
                onChange={set("vehiclePlate")} placeholder="ABC 123 XY" icon="🚘" />
            </>
          )}

          <Input label="Password" type="password" value={form.password} onChange={set("password")}
            placeholder="Min. 6 characters" icon="🔒" />
          <Input label="Confirm password" type="password" value={form.confirm} onChange={set("confirm")}
            placeholder="Repeat password" icon="🔒" />

          <Button onClick={handleRegister} loading={loading} fullWidth size="lg"
            variant={role === "rider" ? "purple" : "primary"}>
            Create Account
          </Button>
        </div>

        <div style={styles.switchRow}>
          Already have an account?{" "}
          <Link to="/login" style={styles.link}>Sign in</Link>
        </div>
      </Card>
    </div>
  );
};

// ── Forgot Password ───────────────────────────────────────────────
export const ForgotPasswordPage = () => {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!email) return toast.error("Enter your email");
    setLoading(true);
    try {
      await resetPassword(email);
      setSent(true);
      toast.success("Reset link sent!");
    } catch (err) {
      toast.error(err.message || "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.brand}>
        <div style={styles.logo}>🛵</div>
        <div style={styles.appName}>Ridders</div>
      </div>
      <Card style={styles.card}>
        <div style={styles.cardTitle}>Reset your password</div>
        {sent ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 48 }}>📧</div>
            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 12 }}>Check your email</div>
            <div style={{ fontSize: 13, color: "#64748b", marginTop: 6 }}>
              We sent a reset link to {email}
            </div>
            <Link to="/login" style={{ ...styles.link, display: "block", marginTop: 16 }}>
              Back to login
            </Link>
          </div>
        ) : (
          <div style={styles.form}>
            <Input label="Email address" type="email" value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com" icon="✉️" />
            <Button onClick={handleReset} loading={loading} fullWidth>Send reset link</Button>
            <div style={styles.switchRow}>
              <Link to="/login" style={styles.link}>Back to login</Link>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

// ── Styles ────────────────────────────────────────────────────────
const styles = {
  page: {
    minHeight: "100vh", background: "linear-gradient(135deg,#0f172a 0%,#1e1b4b 50%,#0f172a 100%)",
    display: "flex", flexDirection: "column", alignItems: "center",
    justifyContent: "center", padding: 20, gap: 24,
  },
  brand: { textAlign: "center", color: "#fff" },
  logo:  { fontSize: 52, lineHeight: 1 },
  appName: { fontSize: 32, fontWeight: 800, letterSpacing: "-0.5px", marginTop: 8 },
  tagline: { fontSize: 14, color: "#94a3b8", marginTop: 4 },
  card: { width: "100%", maxWidth: 400, padding: "28px 32px" },
  cardTitle: { fontSize: 18, fontWeight: 700, color: "#0f172a", marginBottom: 20, textAlign: "center" },
  form: { display: "flex", flexDirection: "column", gap: 14 },
  link: { color: "#6366f1", textDecoration: "none", fontWeight: 600, fontSize: 13 },
  switchRow: { textAlign: "center", fontSize: 13, color: "#64748b", marginTop: 16 },
  roleRow: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 },
  roleCard: {
    display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
    padding: "14px 10px", borderRadius: 10, border: "2px solid", cursor: "pointer",
    transition: "all .15s",
  },
  vehicleRow: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 6 },
  vehicleCard: {
    display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
    padding: "10px 6px", borderRadius: 8, border: "2px solid", cursor: "pointer",
    transition: "all .15s",
  },
};
