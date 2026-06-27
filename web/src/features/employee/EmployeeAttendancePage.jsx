import { useState } from "react";
import { useGetAttendanceQuery } from "../attendance/attendanceApi";

const STATUS_COLORS = {
  present: { bg: "#E1F4EC", color: "#15966A", label: "Present" },
  late:    { bg: "#FBF1DC", color: "#C98A12", label: "Late"    },
  review:  { bg: "#EEF3FB", color: "#1E3563", label: "Review"  },
  absent:  { bg: "#FBE6E5", color: "#D2453F", label: "Absent"  },
};

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

export default function EmployeeAttendancePage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year,  setYear]  = useState(now.getFullYear());

  // Build date range for the selected month
  const fromDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay  = new Date(year, month, 0).getDate();
  const toDate   = `${year}-${String(month).padStart(2, "0")}-${lastDay}`;

  // Backend filters by logged-in employee automatically for non-admin/hr roles
  const { data: raw, isLoading } = useGetAttendanceQuery(
    { date__gte: fromDate, date__lte: toDate, page_size: 100 }
  );
  const records = raw?.results || raw || [];

  const counts = records.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});

  const years = [now.getFullYear() - 1, now.getFullYear()];

  return (
    <div>
      <div style={S.pageHead}>
        <div>
          <h1 style={S.h1}>My Attendance</h1>
          <p style={S.sub}>Your monthly attendance record</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <select style={S.sel} value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select style={S.sel} value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Summary strip */}
      <div style={S.strip}>
        {[
          ["Present",  counts.present || 0,  "#15966A", "#E1F4EC"],
          ["Late",     counts.late    || 0,  "#C98A12", "#FBF1DC"],
          ["Absent",   counts.absent  || 0,  "#D2453F", "#FBE6E5"],
          ["Total",    records.length,        "#0F1E3D", "#F4F6FA"],
        ].map(([label, val, color, bg]) => (
          <div key={label} style={{ ...S.stripCard, background: bg }}>
            <div style={{ fontSize: 28, fontWeight: 800, color }}>{val}</div>
            <div style={{ fontSize: 12, color, fontWeight: 600 }}>{label}</div>
          </div>
        ))}
      </div>

      <div style={S.card}>
        {isLoading ? (
          <div style={S.empty}>Loading attendance…</div>
        ) : records.length === 0 ? (
          <div style={S.empty}>No attendance records for {MONTHS[month - 1]} {year}.</div>
        ) : (
          <table style={S.table}>
            <thead>
              <tr>
                {["Date", "Check In", "Check Out", "Status"].map((h) => (
                  <th key={h} style={S.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map((r, i) => {
                const sc = STATUS_COLORS[r.status] || STATUS_COLORS.absent;
                const fmtTime = (t) => t ? new Date(`1970-01-01T${t}`).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—";
                return (
                  <tr key={r.id} style={{ background: i % 2 === 0 ? "#fff" : "#FAFBFD" }}>
                    <td style={{ ...S.td, fontWeight: 600 }}>
                      {new Date(r.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td style={S.td}>{fmtTime(r.check_in_time)}</td>
                    <td style={S.td}>{fmtTime(r.check_out_time)}</td>
                    <td style={S.td}>
                      <span style={{ ...S.pill, background: sc.bg, color: sc.color }}>
                        {sc.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div style={S.mobileNote}>
        Use the mobile app to mark your daily attendance with GPS + selfie verification.
      </div>
    </div>
  );
}

const S = {
  pageHead:   { display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 },
  h1:         { fontFamily: "Archivo", fontSize: 22, fontWeight: 700, color: "#0F1E3D" },
  sub:        { fontSize: 13, color: "#6B7793", marginTop: 3 },
  sel:        { padding: "9px 12px", border: "1px solid #E2E7F0", borderRadius: 9, fontSize: 13, color: "#0F1E3D", background: "#fff" },
  strip:      { display: "flex", gap: 12, marginBottom: 14 },
  stripCard:  { flex: 1, borderRadius: 12, padding: "16px 20px", display: "flex", flexDirection: "column", gap: 4, border: "1px solid #E2E7F0" },
  card:       { background: "#fff", border: "1px solid #E2E7F0", borderRadius: 14, overflow: "hidden", marginBottom: 14 },
  table:      { width: "100%", borderCollapse: "collapse" },
  th:         { padding: "11px 14px", fontSize: 11, fontWeight: 700, color: "#6B7793", textTransform: "uppercase", letterSpacing: ".4px", textAlign: "left", background: "#F8F9FC", borderBottom: "1px solid #E2E7F0" },
  td:         { padding: "12px 14px", fontSize: 13, color: "#1B2540", borderBottom: "1px solid #F0F2F8" },
  pill:       { display: "inline-flex", padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600 },
  empty:      { padding: 48, textAlign: "center", color: "#9AA6BF", fontSize: 14 },
  mobileNote: { textAlign: "center", fontSize: 12, color: "#9AA6BF", padding: "12px 0", borderTop: "1px solid #F0F2F8" },
};
