import React, { useEffect, useState } from "react";
import { useNavigate, Routes, Route, Link, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Avatar, Badge, Button, Card, Divider, Spinner, Toggle } from "../../components/common/UI";
import { formatNaira, formatDate } from "../../utils/helpers";
import { db } from "../../firebase/config";
import {
  collection, query, orderBy, limit, onSnapshot,
  where, updateDoc, doc, serverTimestamp, getDocs
} from "firebase/firestore";
import { COLLECTIONS } from "../../firebase/firestore";
import toast from "react-hot-toast";

// ── Admin Shell ───────────────────────────────────────────────────
export const AdminApp = () => {
  const { logout, userProfile } = useAuth();
  const location = useLocation();
  const path = location.pathname;

  const NAV = [
    { to: "/admin",              icon: "📊", label: "Overview"     },
    { to: "/admin/deliveries",   icon: "📦", label: "Deliveries"   },
    { to: "/admin/riders",       icon: "🛵", label: "Riders"       },
    { to: "/admin/senders",      icon: "👥", label: "Senders"      },
    { to: "/admin/finance",      icon: "💰", label: "Finance"      },
    { to: "/admin/alerts",       icon: "🔔", label: "Alerts"       },
    { to: "/admin/settings",     icon: "⚙️",  label: "Settings"     },
  ];

  return (
    <div style={styles.shell}>
      {/* Sidebar */}
      <div style={styles.sidebar}>
        <div style={styles.sbBrand}>
          <span style={{ fontSize: 22 }}>🛵</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800 }}>Ridders</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,.4)" }}>Admin Panel</div>
          </div>
        </div>
        <div style={styles.sbNav}>
          {NAV.map(n => (
            <Link key={n.to} to={n.to} style={{
              ...styles.sbItem,
              background: path === n.to ? "rgba(255,255,255,.12)" : "transparent",
              color: path === n.to ? "#fff" : "rgba(255,255,255,.55)",
            }}>
              <span>{n.icon}</span> {n.label}
            </Link>
          ))}
        </div>
        <div style={styles.sbFooter}>
          <Avatar name={userProfile?.displayName || "Admin"} size={32} />
          <div style={{ flex: 1, fontSize: 12, color: "rgba(255,255,255,.6)" }}>
            {userProfile?.displayName}
          </div>
          <button onClick={logout} style={styles.logoutBtn}>Exit</button>
        </div>
      </div>

      {/* Main content */}
      <div style={styles.main}>
        <Routes>
          <Route index          element={<AdminOverview />} />
          <Route path="deliveries" element={<AdminDeliveries />} />
          <Route path="riders"     element={<AdminRiders />} />
          <Route path="senders"    element={<AdminSenders />} />
          <Route path="finance"    element={<AdminFinance />} />
          <Route path="alerts"     element={<AdminAlerts />} />
          <Route path="settings"   element={<AdminSettings />} />
        </Routes>
      </div>
    </div>
  );
};

// ── Overview ──────────────────────────────────────────────────────
const AdminOverview = () => {
  const [stats,      setStats]      = useState({ deliveries: 0, revenue: 0, riders: 0, pendingKyc: 0 });
  const [deliveries, setDeliveries] = useState([]);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    // Live deliveries
    const unsubDel = onSnapshot(
      query(collection(db, COLLECTIONS.DELIVERIES), orderBy("createdAt","desc"), limit(20)),
      snap => {
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setDeliveries(docs);
        const today = new Date(); today.setHours(0,0,0,0);
        const todayDocs = docs.filter(d => d.createdAt?.toDate?.() >= today);
        setStats(s => ({
          ...s,
          deliveries: todayDocs.length,
          revenue: todayDocs.reduce((sum,d) => sum + (d.fare||0), 0),
        }));
        setLoading(false);
      }
    );
    // Riders
    const unsubRiders = onSnapshot(
      query(collection(db, COLLECTIONS.USERS || "users"), where("role","==","rider")),
      snap => {
        const riders = snap.docs.map(d => d.data());
        setStats(s => ({
          ...s,
          riders: riders.filter(r => r.isOnline).length,
          pendingKyc: riders.filter(r => !r.isVerified).length,
        }));
      }
    );
    return () => { unsubDel(); unsubRiders(); };
  }, []);

  return (
    <div style={styles.page}>
      <PageHeader title="Overview" subtitle={`${new Date().toDateString()} · live dashboard`} />

      {/* Stats */}
      <div style={styles.statGrid}>
        <StatCard icon="📦" label="Deliveries today"   value={stats.deliveries}            color="#6366f1" />
        <StatCard icon="💰" label="Revenue today"      value={formatNaira(stats.revenue)}  color="#16a34a" />
        <StatCard icon="🛵" label="Online riders"      value={stats.riders}                color="#0ea5e9" />
        <StatCard icon="⚠️" label="Pending KYC"        value={stats.pendingKyc}            color="#f59e0b" alert />
      </div>

      {/* Active delivery count pills */}
      <div style={styles.pillRow}>
        {["searching","accepted","in_transit","delivered","cancelled"].map(s => {
          const count = deliveries.filter(d => d.status === s).length;
          const colors = { searching:"#f59e0b", accepted:"#3b82f6", in_transit:"#0ea5e9", delivered:"#16a34a", cancelled:"#ef4444" };
          const labels = { searching:"Searching", accepted:"Accepted", in_transit:"In Transit", delivered:"Delivered", cancelled:"Cancelled" };
          return (
            <div key={s} style={{ ...styles.pill, background: colors[s]+"22", border:`1.5px solid ${colors[s]}44` }}>
              <span style={{ fontWeight: 700, color: colors[s] }}>{count}</span>
              <span style={{ fontSize: 11, color: "#64748b" }}>{labels[s]}</span>
            </div>
          );
        })}
      </div>

      {/* Recent deliveries table */}
      <Card style={{ marginTop: 16 }}>
        <div style={styles.tableHeader}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Recent deliveries</div>
          <Link to="/admin/deliveries" style={styles.viewAll}>View all →</Link>
        </div>
        {loading ? <div style={{ textAlign:"center", padding: 30 }}><Spinner /></div> : (
          <div style={{ overflowX: "auto" }}>
            <table style={styles.table}>
              <thead>
                <tr>{["Order","Sender","Rider","Route","Vehicle","Fare","Status"].map(h => (
                  <th key={h} style={styles.th}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {deliveries.slice(0,10).map(d => (
                  <tr key={d.id} style={styles.tr}>
                    <td style={styles.td}>#{d.id.slice(-6).toUpperCase()}</td>
                    <td style={styles.td}>{d.senderName || "—"}</td>
                    <td style={styles.td}>{d.riderName  || <span style={{color:"#94a3b8"}}>—</span>}</td>
                    <td style={styles.td}>
                      <div style={{ fontSize: 11 }}>{d.pickup?.slice(0,20)}</div>
                      <div style={{ fontSize: 11, color:"#94a3b8" }}>→ {d.dropoff?.slice(0,20)}</div>
                    </td>
                    <td style={styles.td}>{d.vehicleType}</td>
                    <td style={styles.td}>{formatNaira(d.fare)}</td>
                    <td style={styles.td}>
                      <Badge label={d.status.replace("_"," ")} color={
                        d.status==="delivered"?"green":d.status==="cancelled"?"red":
                        d.status==="in_transit"?"blue":"yellow"
                      } />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

// ── Deliveries ────────────────────────────────────────────────────
const AdminDeliveries = () => {
  const [deliveries, setDeliveries] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, COLLECTIONS.DELIVERIES), orderBy("createdAt","desc"), limit(100));
    const unsub = onSnapshot(q, snap => {
      setDeliveries(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  const filtered = filter === "all" ? deliveries : deliveries.filter(d => d.status === filter);

  return (
    <div style={styles.page}>
      <PageHeader title="All Deliveries" subtitle={`${deliveries.length} total`} />
      <div style={styles.filterRow}>
        {["all","searching","accepted","in_transit","delivered","cancelled"].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            ...styles.filterBtn,
            background: filter===f ? "#1a1a2e" : "#f1f5f9",
            color:      filter===f ? "#fff"    : "#374151",
          }}>{f.replace("_"," ")}</button>
        ))}
      </div>
      <Card>
        {loading ? <div style={{padding:30,textAlign:"center"}}><Spinner/></div> : (
          <div style={{ overflowX:"auto" }}>
            <table style={styles.table}>
              <thead><tr>
                {["Order","Date","Sender","Rider","Route","Fare","Status","Action"].map(h=>(
                  <th key={h} style={styles.th}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {filtered.map(d => (
                  <tr key={d.id} style={styles.tr}>
                    <td style={styles.td}>#{d.id.slice(-6).toUpperCase()}</td>
                    <td style={styles.td}>{formatDate(d.createdAt)}</td>
                    <td style={styles.td}>{d.senderName}</td>
                    <td style={styles.td}>{d.riderName || "—"}</td>
                    <td style={styles.td} style={{maxWidth:160}}>
                      <div style={{fontSize:11}}>{d.pickup?.slice(0,22)}</div>
                      <div style={{fontSize:11,color:"#94a3b8"}}>→ {d.dropoff?.slice(0,22)}</div>
                    </td>
                    <td style={styles.td}>{formatNaira(d.fare)}</td>
                    <td style={styles.td}>
                      <Badge label={d.status.replace("_"," ")} color={
                        d.status==="delivered"?"green":d.status==="cancelled"?"red":
                        d.status==="in_transit"?"blue":"yellow"} />
                    </td>
                    <td style={styles.td}>
                      {["searching","accepted","in_transit"].includes(d.status) && (
                        <button onClick={async () => {
                          await updateDoc(doc(db, COLLECTIONS.DELIVERIES, d.id),
                            { status:"cancelled", updatedAt: serverTimestamp() });
                          toast("Delivery cancelled by admin");
                        }} style={styles.dangerBtn}>Cancel</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};

// ── Riders ────────────────────────────────────────────────────────
const AdminRiders = () => {
  const [riders,  setRiders]  = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "users"), where("role","==","rider"), orderBy("createdAt","desc"));
    const unsub = onSnapshot(q, snap => {
      setRiders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  const toggleSuspend = async (rider) => {
    await updateDoc(doc(db, "users", rider.id), {
      isActive: !rider.isActive, updatedAt: serverTimestamp(),
    });
    toast(`Rider ${rider.isActive ? "suspended" : "reinstated"}`);
  };

  const approveKyc = async (rider) => {
    await updateDoc(doc(db, "users", rider.id), {
      isVerified: true, updatedAt: serverTimestamp(),
    });
    toast.success("KYC approved ✅");
  };

  return (
    <div style={styles.page}>
      <PageHeader title="Rider Management" subtitle={`${riders.length} registered riders`} />
      {loading ? <div style={{textAlign:"center",padding:40}}><Spinner/></div> : (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {riders.map(r => (
            <Card key={r.id} style={{ padding: 16 }}>
              <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                <Avatar name={r.displayName} size={46} />
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700, fontSize:14 }}>{r.displayName}</div>
                  <div style={{ fontSize:12, color:"#64748b" }}>
                    {r.phone} · {r.vehicleType} · {r.vehiclePlate || "No plate"}
                  </div>
                  <div style={{ fontSize:12, color:"#64748b" }}>
                    ⭐ {(r.rating||5).toFixed(1)} · {r.totalDeliveries||0} deliveries · {formatNaira(r.walletBalance||0)} wallet
                  </div>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:6, alignItems:"flex-end" }}>
                  <Badge label={r.isOnline ? "Online" : "Offline"} color={r.isOnline ? "green" : "gray"} />
                  <Badge label={r.isVerified ? "KYC OK" : "Pending KYC"} color={r.isVerified ? "blue" : "yellow"} />
                  <Badge label={r.isActive ? "Active" : "Suspended"} color={r.isActive ? "green" : "red"} />
                </div>
              </div>
              <Divider style={{ margin:"12px 0" }} />
              <div style={{ display:"flex", gap:8 }}>
                {!r.isVerified && (
                  <Button variant="success" size="sm" onClick={() => approveKyc(r)}>Approve KYC</Button>
                )}
                <Button variant={r.isActive ? "danger" : "success"} size="sm" onClick={() => toggleSuspend(r)}>
                  {r.isActive ? "Suspend" : "Reinstate"}
                </Button>
                <Button variant="secondary" size="sm">View trips</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Senders ───────────────────────────────────────────────────────
const AdminSenders = () => {
  const [senders, setSenders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "users"), where("role","==","sender"), orderBy("createdAt","desc"));
    const unsub = onSnapshot(q, snap => {
      setSenders(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  return (
    <div style={styles.page}>
      <PageHeader title="Sender Management" subtitle={`${senders.length} registered senders`} />
      {loading ? <div style={{textAlign:"center",padding:40}}><Spinner/></div> : (
        <table style={{...styles.table, width:"100%"}}>
          <thead><tr>{["Name","Email","Phone","Total Deliveries","Status","Action"].map(h=>(
            <th key={h} style={styles.th}>{h}</th>
          ))}</tr></thead>
          <tbody>
            {senders.map(s => (
              <tr key={s.id} style={styles.tr}>
                <td style={styles.td}><div style={{display:"flex",alignItems:"center",gap:8}}><Avatar name={s.displayName} size={32}/>{s.displayName}</div></td>
                <td style={styles.td}>{s.email}</td>
                <td style={styles.td}>{s.phone}</td>
                <td style={styles.td}>{s.totalDeliveries||0}</td>
                <td style={styles.td}><Badge label={s.isActive?"Active":"Banned"} color={s.isActive?"green":"red"}/></td>
                <td style={styles.td}>
                  <button onClick={async () => {
                    await updateDoc(doc(db,"users",s.id),{isActive:!s.isActive,updatedAt:serverTimestamp()});
                    toast(`Sender ${s.isActive?"banned":"unbanned"}`);
                  }} style={{...styles.dangerBtn,background:s.isActive?"#fee2e2":"#dcfce7",color:s.isActive?"#991b1b":"#166534"}}>
                    {s.isActive?"Ban":"Unban"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

// ── Finance ───────────────────────────────────────────────────────
const AdminFinance = () => {
  const [deliveries, setDeliveries] = useState([]);
  const [commission, setCommission] = useState(15);

  useEffect(() => {
    const q = query(collection(db, COLLECTIONS.DELIVERIES),
      where("status","==","delivered"), orderBy("createdAt","desc"), limit(200));
    const unsub = onSnapshot(q, snap => setDeliveries(snap.docs.map(d=>({id:d.id,...d.data()}))));
    return unsub;
  }, []);

  const totalRevenue = deliveries.reduce((s,d)=>s+(d.fare||0),0);
  const platformEarning = Math.round(totalRevenue * commission / 100);
  const riderPayouts = totalRevenue - platformEarning;

  return (
    <div style={styles.page}>
      <PageHeader title="Finance Control" subtitle="Revenue, payouts & commissions" />
      <div style={styles.statGrid}>
        <StatCard icon="💰" label="Total revenue" value={formatNaira(totalRevenue)} color="#16a34a" />
        <StatCard icon="🏦" label="Platform earned" value={formatNaira(platformEarning)} color="#6366f1" />
        <StatCard icon="🛵" label="Rider payouts" value={formatNaira(riderPayouts)} color="#f59e0b" />
        <StatCard icon="📋" label="Completed trips" value={deliveries.length} color="#0ea5e9" />
      </div>
      <Card style={{ marginTop: 16 }}>
        <div style={{ fontWeight:700, marginBottom:12 }}>Commission rate</div>
        <div style={{ display:"flex", alignItems:"center", gap:16 }}>
          <input type="range" min={5} max={30} value={commission}
            onChange={e => setCommission(Number(e.target.value))}
            style={{ flex:1 }} />
          <div style={{ fontSize:22, fontWeight:800, color:"#6366f1", minWidth:60 }}>{commission}%</div>
          <Button size="sm" onClick={() => toast.success(`Commission set to ${commission}%`)}>Save</Button>
        </div>
        <div style={{ fontSize:12, color:"#64748b", marginTop:8 }}>
          Rider keeps {100-commission}% of each delivery fare
        </div>
      </Card>
    </div>
  );
};

// ── Alerts ────────────────────────────────────────────────────────
const AdminAlerts = () => {
  const [deliveries, setDeliveries] = useState([]);

  useEffect(() => {
    const q = query(collection(db, COLLECTIONS.DELIVERIES),
      where("status","in",["searching","accepted","pickup","in_transit"]),
      orderBy("createdAt","desc"));
    const unsub = onSnapshot(q, snap => setDeliveries(snap.docs.map(d=>({id:d.id,...d.data()}))));
    return unsub;
  }, []);

  const overdue = deliveries.filter(d => {
    const created = d.createdAt?.toDate?.();
    if (!created) return false;
    const mins = (Date.now() - created.getTime()) / 60000;
    return mins > (d.estimatedMinutes || 30) + 15;
  });

  return (
    <div style={styles.page}>
      <PageHeader title="Alerts & Monitoring" />
      {overdue.length > 0 && (
        <div>
          <div style={{ fontWeight:700, marginBottom:10, color:"#dc2626" }}>⚠️ Overdue deliveries ({overdue.length})</div>
          {overdue.map(d => (
            <Card key={d.id} style={{ background:"#fee2e2", border:"1.5px solid #fca5a5", marginBottom:8 }}>
              <div style={{ fontWeight:600 }}>#{d.id.slice(-6).toUpperCase()} · {d.dropoff}</div>
              <div style={{ fontSize:12, color:"#991b1b" }}>Rider: {d.riderName||"none"} · Status: {d.status}</div>
            </Card>
          ))}
        </div>
      )}
      <Card style={{ marginTop:16 }}>
        <div style={{ fontWeight:700, marginBottom:10 }}>All active deliveries</div>
        {deliveries.map(d => (
          <div key={d.id} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:"1px solid #f1f5f9" }}>
            <div>
              <div style={{ fontSize:13, fontWeight:600 }}>#{d.id.slice(-6).toUpperCase()} — {d.dropoff?.slice(0,30)}</div>
              <div style={{ fontSize:11, color:"#94a3b8" }}>Rider: {d.riderName||"searching"}</div>
            </div>
            <Badge label={d.status.replace("_"," ")} color={d.status==="in_transit"?"blue":"yellow"} />
          </div>
        ))}
      </Card>
    </div>
  );
};

// ── Settings ──────────────────────────────────────────────────────
const AdminSettings = () => {
  const [settings, setSettings] = useState({
    maintenance: false, newRiders: true, surgeEnabled: false,
    cashOnDelivery: true, inAppChat: true, surgeFactor: 1.5,
  });
  const [notifMsg, setNotifMsg] = useState("");

  const toggle = k => setSettings(s => ({ ...s, [k]: !s[k] }));

  return (
    <div style={styles.page}>
      <PageHeader title="App Settings" subtitle="System-wide toggles and controls" />
      <Card>
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          {[
            { key:"maintenance",    label:"Maintenance mode",        desc:"Takes app offline for all users" },
            { key:"newRiders",      label:"New rider registrations",  desc:"Allow new riders to sign up"    },
            { key:"surgeEnabled",   label:"Surge pricing",           desc:`Active multiplier: ${settings.surgeFactor}×` },
            { key:"cashOnDelivery", label:"Cash on delivery",        desc:"Allow cash payments"            },
            { key:"inAppChat",      label:"In-app chat",             desc:"Rider ↔ sender messaging"       },
          ].map(item => (
            <div key={item.key}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div>
                  <div style={{ fontWeight:600, fontSize:14 }}>{item.label}</div>
                  <div style={{ fontSize:12, color:"#94a3b8" }}>{item.desc}</div>
                </div>
                <Toggle value={settings[item.key]} onChange={() => toggle(item.key)} />
              </div>
              <Divider />
            </div>
          ))}
        </div>
      </Card>

      <Card style={{ marginTop:16 }}>
        <div style={{ fontWeight:700, marginBottom:12 }}>Push notification broadcast</div>
        <textarea value={notifMsg} onChange={e => setNotifMsg(e.target.value)}
          placeholder="Type your message to all riders or senders..."
          rows={3}
          style={{ width:"100%", padding:"10px 12px", borderRadius:8, border:"1.5px solid #e2e8f0",
            fontSize:13, fontFamily:"inherit", outline:"none", boxSizing:"border-box" }} />
        <div style={{ display:"flex", gap:10, marginTop:10 }}>
          <Button onClick={() => { toast.success("Sent to all riders"); setNotifMsg(""); }} disabled={!notifMsg} size="sm">
            Send to riders
          </Button>
          <Button variant="outline" onClick={() => { toast.success("Sent to all senders"); setNotifMsg(""); }} disabled={!notifMsg} size="sm">
            Send to senders
          </Button>
        </div>
      </Card>
    </div>
  );
};

// ── Shared sub-components ─────────────────────────────────────────
const PageHeader = ({ title, subtitle }) => (
  <div style={{ marginBottom: 20 }}>
    <div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a" }}>{title}</div>
    {subtitle && <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 2 }}>{subtitle}</div>}
  </div>
);

const StatCard = ({ icon, label, value, color, alert }) => (
  <Card style={{ textAlign:"center", padding:16, borderTop:`3px solid ${color}` }}>
    <div style={{ fontSize:28 }}>{icon}</div>
    <div style={{ fontSize:22, fontWeight:800, color: alert ? color : "#0f172a", marginTop:6 }}>{value}</div>
    <div style={{ fontSize:12, color:"#94a3b8", marginTop:2 }}>{label}</div>
  </Card>
);

// ── Styles ────────────────────────────────────────────────────────
const styles = {
  shell: { display:"flex", minHeight:"100vh", fontFamily:"system-ui,sans-serif" },
  sidebar: {
    width: 220, background:"#0f172a", display:"flex", flexDirection:"column",
    position:"fixed", height:"100vh", top:0, left:0, zIndex:10,
  },
  sbBrand: {
    display:"flex", alignItems:"center", gap:10,
    padding:"20px 18px 16px", borderBottom:"1px solid rgba(255,255,255,.08)",
    color:"#fff",
  },
  sbNav: { flex:1, padding:"10px 0", overflowY:"auto" },
  sbItem: {
    display:"flex", alignItems:"center", gap:10,
    padding:"10px 18px", fontSize:13, fontWeight:500,
    textDecoration:"none", transition:"all .15s", cursor:"pointer",
  },
  sbFooter: {
    display:"flex", alignItems:"center", gap:10,
    padding:"14px 18px", borderTop:"1px solid rgba(255,255,255,.08)",
  },
  logoutBtn: {
    border:"1px solid rgba(255,255,255,.2)", background:"transparent",
    color:"rgba(255,255,255,.5)", borderRadius:6, padding:"4px 10px",
    fontSize:11, cursor:"pointer",
  },
  main: { marginLeft:220, flex:1, background:"#f8fafc", padding:28, minHeight:"100vh" },
  page: { maxWidth:1100, margin:"0 auto" },
  statGrid: { display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:14 },
  pillRow: { display:"flex", gap:10, flexWrap:"wrap", marginTop:14 },
  pill: { display:"flex", flexDirection:"column", alignItems:"center", padding:"10px 18px", borderRadius:10, fontSize:16 },
  filterRow: { display:"flex", gap:8, flexWrap:"wrap", marginBottom:16 },
  filterBtn: { padding:"6px 14px", borderRadius:20, border:"none", fontSize:12, fontWeight:600, cursor:"pointer" },
  tableHeader: { display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 },
  viewAll: { fontSize:13, color:"#6366f1", textDecoration:"none", fontWeight:600 },
  table: { width:"100%", borderCollapse:"collapse", fontSize:13 },
  th: { textAlign:"left", padding:"10px 12px", borderBottom:"2px solid #f1f5f9", color:"#94a3b8", fontWeight:600, whiteSpace:"nowrap" },
  td: { padding:"12px 12px", borderBottom:"1px solid #f8fafc", verticalAlign:"middle" },
  tr: { transition:"background .1s", cursor:"default" },
  dangerBtn: { padding:"5px 12px", borderRadius:6, border:"none", background:"#fee2e2", color:"#991b1b", fontSize:11, fontWeight:600, cursor:"pointer" },
};
