import { useSelector } from "react-redux";

export default function EmployeeProfilePage() {
  const user = useSelector((s) => s.auth.user);

  return (
    <div>
      <div style={S.pageHead}>
        <h1 style={S.h1}>My Profile</h1>
        <p style={S.sub}>Your account information</p>
      </div>

      <div style={S.card}>
        <div style={S.avatar}>{user?.full_name?.[0] || "E"}</div>
        <div style={S.name}>{user?.full_name || "—"}</div>
        <div style={S.role}>{user?.role || "employee"}</div>

        <div style={S.infoGrid}>
          {[
            ["Phone",       user?.phone || "—"],
            ["Employee ID", user?.emp_code || "—"],
            ["Role",        user?.role || "—"],
          ].map(([k, v]) => (
            <div key={k} style={S.infoCell}>
              <div style={S.infoKey}>{k}</div>
              <div style={S.infoVal}>{v}</div>
            </div>
          ))}
        </div>

        <div style={S.note}>
          To update your profile details, contact your HR administrator.
        </div>
      </div>
    </div>
  );
}

const S = {
  pageHead: { marginBottom: 16 },
  h1:       { fontFamily: "Archivo", fontSize: 22, fontWeight: 700, color: "#0F1E3D" },
  sub:      { fontSize: 13, color: "#6B7793", marginTop: 3 },
  card:     { background: "#fff", border: "1px solid #E2E7F0", borderRadius: 14, padding: 32, maxWidth: 500, textAlign: "center" },
  avatar:   { width: 80, height: 80, borderRadius: "50%", background: "#0F1E3D", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, fontWeight: 800, margin: "0 auto 16px" },
  name:     { fontSize: 22, fontWeight: 800, color: "#0F1E3D", marginBottom: 4 },
  role:     { fontSize: 13, color: "#6B7793", textTransform: "capitalize", marginBottom: 24, padding: "4px 14px", background: "#E3EEF9", borderRadius: 20, display: "inline-block", color: "#1565C0", fontWeight: 600 },
  infoGrid: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 20 },
  infoCell: { background: "#F8F9FC", borderRadius: 10, padding: "12px 16px", textAlign: "left" },
  infoKey:  { fontSize: 11, color: "#6B7793", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 4 },
  infoVal:  { fontSize: 14, fontWeight: 700, color: "#0F1E3D" },
  note:     { fontSize: 12, color: "#9AA6BF", padding: "12px 16px", background: "#F8F9FC", borderRadius: 8 },
};
