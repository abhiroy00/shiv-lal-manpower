import { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "../features/auth/authSlice";
import { NAV } from "../constants/nav";

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((s) => s.auth.user);

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  return (
    <div style={S.shell}>
      {/* Sidebar */}
      <aside style={{ ...S.sidebar, ...(sidebarOpen ? S.sidebarOpen : {}) }}>
        <div style={S.brand}>
          <div style={S.logoMark}>SL</div>
          <div>
            <div style={S.brandName}>Shiv Lal Manpower</div>
            <div style={S.brandSub}>Operations Console</div>
          </div>
        </div>

        {NAV.map((section) => (
          <div key={section.group} style={S.navGroup}>
            <div style={S.groupLabel}>{section.group}</div>
            {section.items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                style={({ isActive }) => ({ ...S.navItem, ...(isActive ? S.navItemOn : {}) })}
                onClick={() => setSidebarOpen(false)}
              >
                <span style={S.ico}>{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}

        <div style={S.sbFoot}>v1.0 · Professional Plan</div>
      </aside>

      {/* Backdrop (mobile) */}
      {sidebarOpen && (
        <div style={S.backdrop} onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main */}
      <div style={S.main}>
        <header style={S.topbar}>
          <button style={S.hamburger} onClick={() => setSidebarOpen(!sidebarOpen)}>☰</button>
          <span style={S.crumb}>Console</span>
          <div style={S.topActions}>
            <div style={S.userChip}>
              <div style={S.avatar}>{user?.full_name?.[0] || "U"}</div>
              <div>
                <div style={S.userName}>{user?.full_name || "User"}</div>
                <div style={S.userRole}>{user?.role || "admin"}</div>
              </div>
            </div>
            <button style={S.logoutBtn} onClick={handleLogout}>Logout</button>
          </div>
        </header>

        <div style={S.content}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}

const S = {
  shell: { display: "grid", gridTemplateColumns: "250px 1fr", height: "100vh", background: "#F4F6FA" },
  sidebar: { background: "#0F1E3D", color: "#cdd6ec", display: "flex", flexDirection: "column", overflowY: "auto", transition: "transform .25s ease" },
  sidebarOpen: {},
  brand: { padding: "20px 18px", display: "flex", gap: 11, alignItems: "center", borderBottom: "1px solid #24365E" },
  logoMark: { width: 38, height: 38, borderRadius: 10, background: "linear-gradient(135deg,#E8821E,#C45F0C)", display: "grid", placeItems: "center", color: "#fff", fontFamily: "Archivo", fontWeight: 800, fontSize: 17, flexShrink: 0 },
  brandName: { fontFamily: "Archivo", fontWeight: 700, color: "#fff", fontSize: 14.5 },
  brandSub: { fontSize: 11, color: "#9AA6BF", fontWeight: 500 },
  navGroup: { padding: "14px 10px 4px" },
  groupLabel: { fontSize: 10.5, letterSpacing: ".14em", textTransform: "uppercase", color: "#5d6c91", padding: "0 10px 8px", fontWeight: 700 },
  navItem: { display: "flex", alignItems: "center", gap: 11, padding: "10px 12px", borderRadius: 10, fontSize: 13.5, fontWeight: 500, color: "#c2cce6", cursor: "pointer", marginBottom: 2, textDecoration: "none" },
  navItemOn: { background: "#1E3563", color: "#fff", fontWeight: 600 },
  ico: { width: 18, textAlign: "center", fontSize: 15, flexShrink: 0 },
  sbFoot: { marginTop: "auto", padding: 14, borderTop: "1px solid #24365E", fontSize: 11, color: "#5d6c91" },
  main: { display: "flex", flexDirection: "column", overflow: "hidden" },
  topbar: { height: 62, background: "#fff", borderBottom: "1px solid #E2E7F0", display: "flex", alignItems: "center", gap: 16, padding: "0 22px", flexShrink: 0 },
  hamburger: { background: "transparent", border: 0, fontSize: 20, cursor: "pointer", color: "#0F1E3D" },
  crumb: { fontSize: 13, color: "#6B7793" },
  topActions: { marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 },
  userChip: { display: "flex", alignItems: "center", gap: 9, padding: "5px 10px 5px 5px", borderRadius: 30, border: "1px solid #E2E7F0", cursor: "pointer" },
  avatar: { width: 30, height: 30, borderRadius: "50%", background: "#1E3563", color: "#fff", display: "grid", placeItems: "center", fontSize: 12, fontWeight: 700 },
  userName: { fontSize: 13, fontWeight: 600, color: "#0F1E3D" },
  userRole: { fontSize: 11, color: "#6B7793" },
  logoutBtn: { padding: "7px 13px", borderRadius: 9, border: "1px solid #E2E7F0", background: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", color: "#D2453F" },
  content: { flex: 1, overflowY: "auto", padding: 24 },
  backdrop: { position: "fixed", inset: 0, background: "rgba(15,30,61,.45)", zIndex: 40 },
};
