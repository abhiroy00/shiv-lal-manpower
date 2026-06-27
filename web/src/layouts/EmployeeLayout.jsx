import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "../features/auth/authSlice";
import { baseApi } from "../api/baseApi";

const EMP_NAV = [
  { label: "My Payslips",  path: "/employee/payslip",    icon: "🧾" },
  { label: "Attendance",   path: "/employee/attendance",  icon: "✅" },
  { label: "Leave",        path: "/employee/leave",       icon: "🏖️" },
  { label: "My Profile",   path: "/employee/profile",     icon: "👤" },
];

export default function EmployeeLayout() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((s) => s.auth.user);

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
    dispatch(baseApi.util.resetApiState());
  };

  return (
    <div style={S.shell}>
      <aside style={S.sidebar}>
        <div style={S.brand}>
          <div style={{ width: 80, height: 80, borderRadius: 12, overflow: "hidden", backgroundColor: "#B71C1C", border: "2px solid #D4AF37" }}>
            <img src="/shivlal_logo.jpeg" alt="Shiv Lal" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={S.brandName}>Shiv Lal Manpower</div>
            <div style={S.brandSub}>Employee Portal</div>
          </div>
        </div>

        <div style={S.navGroup}>
          <div style={S.groupLabel}>My Account</div>
          {EMP_NAV.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              style={({ isActive }) => ({ ...S.navItem, ...(isActive ? S.navItemOn : {}) })}
            >
              <span style={S.ico}>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </div>

        <div style={S.sbFoot}>Employee Self-Service</div>
      </aside>

      <div style={S.main}>
        <header style={S.topbar}>
          <span style={S.crumb}>Employee Portal</span>
          <div style={S.topActions}>
            <div style={S.userChip}>
              <div style={S.avatar}>{user?.full_name?.[0] || "E"}</div>
              <div>
                <div style={S.userName}>{user?.full_name || "Employee"}</div>
                <div style={S.userRole}>{user?.role || "employee"}</div>
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
  shell:      { display: "grid", gridTemplateColumns: "220px 1fr", height: "100vh", background: "#F4F6FA" },
  sidebar:    { background: "#0F1E3D", color: "#cdd6ec", display: "flex", flexDirection: "column", overflowY: "auto" },
  brand:      { padding: "20px 16px", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, borderBottom: "1px solid #24365E" },
  brandName:  { fontFamily: "Archivo", fontWeight: 700, color: "#fff", fontSize: 13, textAlign: "center" },
  brandSub:   { fontSize: 11, color: "#9AA6BF", fontWeight: 500, textAlign: "center" },
  navGroup:   { padding: "14px 10px 4px" },
  groupLabel: { fontSize: 10.5, letterSpacing: ".14em", textTransform: "uppercase", color: "#5d6c91", padding: "0 10px 8px", fontWeight: 700 },
  navItem:    { display: "flex", alignItems: "center", gap: 11, padding: "10px 12px", borderRadius: 10, fontSize: 13.5, fontWeight: 500, color: "#c2cce6", cursor: "pointer", marginBottom: 2, textDecoration: "none" },
  navItemOn:  { background: "#1E3563", color: "#fff", fontWeight: 600 },
  ico:        { width: 18, textAlign: "center", fontSize: 15, flexShrink: 0 },
  sbFoot:     { marginTop: "auto", padding: 14, borderTop: "1px solid #24365E", fontSize: 11, color: "#5d6c91" },
  main:       { display: "flex", flexDirection: "column", overflow: "hidden" },
  topbar:     { height: 62, background: "#fff", borderBottom: "1px solid #E2E7F0", display: "flex", alignItems: "center", gap: 16, padding: "0 22px", flexShrink: 0 },
  crumb:      { fontSize: 13, color: "#6B7793" },
  topActions: { marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 },
  userChip:   { display: "flex", alignItems: "center", gap: 9, padding: "5px 10px 5px 5px", borderRadius: 30, border: "1px solid #E2E7F0" },
  avatar:     { width: 30, height: 30, borderRadius: "50%", background: "#1E3563", color: "#fff", display: "grid", placeItems: "center", fontSize: 12, fontWeight: 700 },
  userName:   { fontSize: 13, fontWeight: 600, color: "#0F1E3D" },
  userRole:   { fontSize: 11, color: "#6B7793" },
  logoutBtn:  { padding: "7px 13px", borderRadius: 9, border: "1px solid #E2E7F0", background: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", color: "#D2453F" },
  content:    { flex: 1, overflowY: "auto", padding: 24 },
};
