import { useState } from "react";
import { useGetAttendanceQuery, useGetTodaySummaryQuery } from "./attendanceApi";

const STATUS_COLORS = {
  present: { bg: "#E1F4EC", color: "#15966A" },
  late: { bg: "#FBF1DC", color: "#C98A12" },
  review: { bg: "#FBF1DC", color: "#C98A12" },
  absent: { bg: "#FBE6E5", color: "#D2453F" },
};

export default function AttendancePage() {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const { data: summary } = useGetTodaySummaryQuery();
  const { data, isLoading } = useGetAttendanceQuery({ date });

  const records = data?.results || [];

  const kpis = [
    { label: "Check-ins Today", value: summary?.present ?? "—" },
    { label: "Total Active", value: summary?.total_active ?? "—" },
    { label: "Absent", value: summary?.absent_today ?? "—" },
    { label: "Under Review", value: summary?.under_review ?? "—" },
  ];

  return (
    <div>
      <div style={S.pageHead}>
        <div>
          <h1 style={S.h1}>Attendance – GPS + Selfie Verified</h1>
          <p style={S.sub}>Every check-in is geo-tagged and face-verified</p>
        </div>
        <div style={S.actions}>
          <input type="date" style={S.datePicker} value={date} onChange={(e) => setDate(e.target.value)} />
          <button style={S.btnSolid}>📤 Export Register</button>
        </div>
      </div>

      <div style={S.kpiGrid}>
        {kpis.map((k) => (
          <div key={k.label} style={S.kpi}>
            <div style={S.kpiLabel}>{k.label}</div>
            <div style={S.kpiVal}>{k.value}</div>
          </div>
        ))}
      </div>

      <div style={S.card}>
        <div style={S.cardH}>
          <h3 style={S.cardTitle}>Attendance Register – {date}</h3>
        </div>
        <table style={S.table}>
          <thead>
            <tr>
              {["Employee", "Site", "Check-in", "GPS", "Geofence", "Status"].map((h) => (
                <th key={h} style={S.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={6} style={{ textAlign: "center", padding: 32, color: "#6B7793" }}>Loading…</td></tr>
            )}
            {records.map((r) => {
              const sc = STATUS_COLORS[r.status] || STATUS_COLORS.absent;
              return (
                <tr key={r.id}>
                  <td style={S.td}>
                    <div style={S.empCell}>
                      <div style={S.av}>{r.employee_name?.slice(0, 2).toUpperCase()}</div>
                      <div>
                        <div style={S.empName}>{r.employee_name}</div>
                        <div style={S.empCode}>{r.emp_code}</div>
                      </div>
                    </div>
                  </td>
                  <td style={S.td}>{r.site_name || "—"}</td>
                  <td style={S.td}>{r.check_in_time || "—"}</td>
                  <td style={S.td}>{r.lat && r.lng ? `${r.lat}°N, ${r.lng}°E` : "—"}</td>
                  <td style={S.td}>
                    <span style={{ ...S.pill, ...(r.geofence_ok ? { bg: "#E1F4EC", color: "#15966A" } : { background: "#FBE6E5", color: "#D2453F" }) }}>
                      {r.geofence_ok ? "✓ OK" : "⚠ Outside"}
                    </span>
                  </td>
                  <td style={S.td}>
                    <span style={{ ...S.pill, background: sc.bg, color: sc.color }}>{r.status}</span>
                  </td>
                </tr>
              );
            })}
            {!isLoading && records.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: "center", padding: 32, color: "#6B7793" }}>No records for {date}</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const S = {
  pageHead: { display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 12 },
  h1: { fontFamily: "Archivo", fontSize: 22, fontWeight: 700, color: "#0F1E3D" },
  sub: { fontSize: 13, color: "#6B7793", marginTop: 3 },
  actions: { display: "flex", gap: 9 },
  datePicker: { padding: "9px 12px", border: "1px solid #E2E7F0", borderRadius: 9, fontSize: 13, fontFamily: "inherit" },
  btnSolid: { padding: "9px 14px", borderRadius: 9, border: 0, background: "#E8821E", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" },
  kpiGrid: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 16 },
  kpi: { background: "#fff", border: "1px solid #E2E7F0", borderRadius: 14, padding: 16 },
  kpiLabel: { fontSize: 12, color: "#6B7793", fontWeight: 600 },
  kpiVal: { fontFamily: "Archivo", fontSize: 27, fontWeight: 800, color: "#0F1E3D", marginTop: 6 },
  card: { background: "#fff", border: "1px solid #E2E7F0", borderRadius: 14, overflow: "auto" },
  cardH: { padding: "15px 18px", borderBottom: "1px solid #E2E7F0" },
  cardTitle: { fontSize: 14.5, fontWeight: 700, color: "#0F1E3D" },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 680 },
  th: { fontSize: 11, textTransform: "uppercase", color: "#6B7793", textAlign: "left", padding: "11px 14px", borderBottom: "1px solid #E2E7F0", fontWeight: 700, background: "#F4F6FA" },
  td: { padding: "12px 14px", fontSize: 13, borderBottom: "1px solid #E2E7F0" },
  empCell: { display: "flex", alignItems: "center", gap: 10 },
  av: { width: 32, height: 32, borderRadius: 8, background: "#1E3563", color: "#fff", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 700 },
  empName: { fontWeight: 600, color: "#0F1E3D" },
  empCode: { fontSize: 11, color: "#6B7793" },
  pill: { display: "inline-flex", padding: "4px 10px", borderRadius: 30, fontSize: 11.5, fontWeight: 600 },
};
