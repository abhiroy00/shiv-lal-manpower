import { useGetKPIsQuery } from "./dashboardApi";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

export default function DashboardPage() {
  const { data, isLoading } = useGetKPIsQuery();

  const kpis = [
    { label: "Total Manpower", value: data?.total_manpower ?? "—", color: "#15966A", icon: "👥" },
    { label: "Present Today", value: data?.present_today ?? "—", color: "#E8821E", icon: "✅" },
    { label: "Absent", value: data?.absent_today ?? "—", color: "#D2453F", icon: "❌" },
    { label: "Attendance %", value: data ? `${data.attendance_pct}%` : "—", color: "#1E3563", icon: "📈" },
  ];

  return (
    <div>
      <div style={S.pageHead}>
        <div>
          <h1 style={S.h1}>MIS Dashboard</h1>
          <p style={S.sub}>Live workforce status across all active tender sites</p>
        </div>
        <button style={S.btnSolid}>📤 Export MIS</button>
      </div>

      {/* KPI cards */}
      <div style={S.kpiGrid}>
        {kpis.map((k) => (
          <div key={k.label} style={S.kpi}>
            <div style={{ ...S.spark, color: k.color }}>{k.icon}</div>
            <div style={S.kpiLabel}>{k.label}</div>
            <div style={S.kpiVal}>{isLoading ? "…" : k.value}</div>
          </div>
        ))}
      </div>

      {/* Trend chart */}
      <div style={S.card}>
        <div style={S.cardH}><h3 style={S.cardTitle}>Attendance Trend – Last 7 Days</h3></div>
        <div style={{ padding: 18, height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data?.trend || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EDF1F7" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9AA6BF" }} />
              <YAxis tick={{ fontSize: 11, fill: "#9AA6BF" }} />
              <Tooltip />
              <Line type="monotone" dataKey="present" stroke="#E8821E" strokeWidth={2.5} dot={{ r: 4, fill: "#E8821E" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Category breakdown */}
      {data?.categories?.length > 0 && (
        <div style={{ ...S.card, marginTop: 14 }}>
          <div style={S.cardH}><h3 style={S.cardTitle}>Workforce by Category</h3></div>
          <div style={{ padding: 18 }}>
            {data.categories.map((c) => (
              <div key={c.designation} style={S.catRow}>
                <span style={S.catLabel}>{c.designation}</span>
                <span style={S.catCount}>{c.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const S = {
  pageHead: { display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 18 },
  h1: { fontFamily: "Archivo", fontSize: 22, fontWeight: 700, color: "#0F1E3D" },
  sub: { fontSize: 13, color: "#6B7793", marginTop: 3 },
  btnSolid: { padding: "9px 16px", borderRadius: 9, border: 0, background: "#E8821E", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" },
  kpiGrid: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 16 },
  kpi: { background: "#fff", border: "1px solid #E2E7F0", borderRadius: 14, padding: 16, boxShadow: "0 1px 2px rgba(15,30,61,.06)", position: "relative" },
  spark: { position: "absolute", right: 14, top: 14, fontSize: 20 },
  kpiLabel: { fontSize: 12, color: "#6B7793", fontWeight: 600 },
  kpiVal: { fontFamily: "Archivo", fontSize: 27, fontWeight: 800, color: "#0F1E3D", marginTop: 6 },
  card: { background: "#fff", border: "1px solid #E2E7F0", borderRadius: 14, boxShadow: "0 1px 2px rgba(15,30,61,.06)" },
  cardH: { padding: "15px 18px", borderBottom: "1px solid #E2E7F0" },
  cardTitle: { fontSize: 14.5, fontWeight: 700, color: "#0F1E3D" },
  catRow: { display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px solid #E2E7F0", fontSize: 13 },
  catLabel: { color: "#1B2540" },
  catCount: { fontWeight: 700, color: "#0F1E3D" },
};
