import { useGetKPIsQuery } from "./dashboardApi";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

const inr  = (v) => String.fromCharCode(8377) + Number(v || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });
const pct  = (v) => Number(v || 0).toFixed(1) + "%";

const STATUS_CFG = {
  draft:    { bg: "#FBF1DC", color: "#C98A12", label: "Draft" },
  approved: { bg: "#E3EEF9", color: "#1565C0", label: "Approved" },
  paid:     { bg: "#E1F4EC", color: "#15966A", label: "Paid" },
};

// Custom tooltip for attendance trend
function AttTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#fff", border: "1px solid #E2E7F0", borderRadius: 8, padding: "8px 12px", fontSize: 12 }}>
      <div style={{ fontWeight: 700, color: "#0F1E3D", marginBottom: 2 }}>{label}</div>
      <div style={{ color: "#E8821E" }}>Present: <b>{payload[0].value}</b></div>
    </div>
  );
}

export default function DashboardPage() {
  const { data: d, isLoading } = useGetKPIsQuery(undefined, { pollingInterval: 60000 });

  const topKPIs = [
    { label: "Active Employees",   value: d?.total_manpower,   sub: `+${d?.new_this_month ?? 0} this month`, color: "#1E3563", accent: "#E3EEF9", icon: "👥" },
    { label: "Present Today",      value: d?.present_today,    sub: `${d?.absent_today ?? 0} absent`,        color: "#15966A", accent: "#E1F4EC", icon: "✅" },
    { label: "Today's Att%",       value: d ? pct(d.attendance_pct)  : "—", sub: `Month avg ${pct(d?.month_att_pct)}`, color: "#E8821E", accent: "#FEF3E8", icon: "📊" },
    { label: "Active Sites",       value: d?.total_sites,      sub: `${d?.total_states ?? 0} states`,        color: "#6A0DAD", accent: "#F3E5F5", icon: "📍" },
  ];

  const payroll = d?.payroll;
  const comp    = d?.compliance || {};
  const sc      = payroll ? (STATUS_CFG[payroll.run_status] || STATUS_CFG.draft) : null;
  const maxCat  = d?.max_category || 1;

  return (
    <div>
      {/* Page header */}
      <div style={S.pageHead}>
        <div>
          <h1 style={S.h1}>MIS Dashboard</h1>
          <p style={S.sub}>Live workforce status · auto-refreshes every 60 seconds</p>
        </div>
        <div style={S.headerMeta}>
          <span style={S.today}>{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span>
        </div>
      </div>

      {/* KPI row */}
      <div style={S.kpiGrid}>
        {topKPIs.map((k) => (
          <div key={k.label} style={S.kpiCard}>
            <div style={{ ...S.kpiIcon, background: k.accent, color: k.color }}>{k.icon}</div>
            <div style={S.kpiRight}>
              <div style={S.kpiLabel}>{k.label}</div>
              <div style={{ ...S.kpiVal, color: k.color }}>{isLoading ? "…" : (k.value ?? "—")}</div>
              <div style={S.kpiSub}>{k.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Middle row: trend chart + site strength */}
      <div style={S.midRow}>
        {/* Attendance trend */}
        <div style={{ ...S.card, flex: "1 1 55%" }}>
          <div style={S.cardH}>
            <h3 style={S.cardTitle}>30-Day Attendance Trend</h3>
            <span style={S.cardSub}>Daily present count</span>
          </div>
          <div style={{ padding: "12px 8px 4px", height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={d?.trend || []} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EDF1F7" vertical={false} />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 10, fill: "#9AA6BF" }}
                  interval={4}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#9AA6BF" }}
                  axisLine={false}
                  tickLine={false}
                  domain={["auto", "auto"]}
                />
                <Tooltip content={<AttTooltip />} />
                <Line
                  type="monotone"
                  dataKey="present"
                  stroke="#E8821E"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5, fill: "#E8821E" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Site fill rate */}
        <div style={{ ...S.card, flex: "1 1 40%", minWidth: 0 }}>
          <div style={S.cardH}>
            <h3 style={S.cardTitle}>Site Strength</h3>
            <span style={S.cardSub}>Deployed vs Sanctioned (top 10)</span>
          </div>
          <div style={{ padding: "10px 18px", overflowY: "auto", maxHeight: 224 }}>
            {(d?.site_chart || []).map((s) => (
              <div key={s.name} style={S.siteRow}>
                <div style={S.siteName}>{s.name}</div>
                <div style={S.siteBar}>
                  <div
                    style={{
                      ...S.siteBarFill,
                      width: s.fill_pct + "%",
                      background: s.fill_pct >= 90 ? "#15966A" : s.fill_pct >= 60 ? "#E8821E" : "#D2453F",
                    }}
                  />
                </div>
                <div style={S.siteNums}>
                  <b>{s.deployed}</b>
                  <span style={{ color: "#9AA6BF" }}>/{s.sanctioned}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom row: designation breakdown + payroll card + compliance card */}
      <div style={S.bottomRow}>
        {/* Designation breakdown */}
        <div style={{ ...S.card, flex: "1 1 33%" }}>
          <div style={S.cardH}>
            <h3 style={S.cardTitle}>By Designation</h3>
            <span style={S.cardSub}>{d?.total_manpower} active employees</span>
          </div>
          <div style={{ padding: "10px 18px" }}>
            {(d?.categories || []).map((c) => {
              const barW = Math.round((c.count / maxCat) * 100);
              return (
                <div key={c.designation} style={S.catRow}>
                  <div style={S.catTop}>
                    <span style={S.catName}>{c.designation}</span>
                    <span style={S.catCount}>{c.count}</span>
                  </div>
                  <div style={S.catBarBg}>
                    <div style={{ ...S.catBarFill, width: barW + "%" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Latest payroll card */}
        <div style={{ ...S.card, flex: "1 1 30%" }}>
          <div style={S.cardH}>
            <h3 style={S.cardTitle}>Latest Payroll</h3>
            {payroll && (
              <span style={{ ...S.pill, background: sc.bg, color: sc.color }}>{sc.label}</span>
            )}
          </div>
          {payroll ? (
            <div style={{ padding: "12px 18px" }}>
              <div style={S.payMonth}>{payroll.month_label}</div>
              <div style={S.payMetaRow}>
                <span style={S.payMeta}>{payroll.employees} employees</span>
              </div>
              {[
                ["Gross Wages",     inr(payroll.total_gross),    "#1E3563"],
                ["PF Deductions",   inr(payroll.total_pf_emp),   "#D2453F"],
                ["ESI Deductions",  inr(payroll.total_esi_emp),  "#D2453F"],
                ["Net Payable",     inr(payroll.total_net),      "#15966A"],
              ].map(([k, v, c]) => (
                <div key={k} style={S.payLine}>
                  <span style={S.payLineK}>{k}</span>
                  <span style={{ ...S.payLineV, color: c }}>{v}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={S.emptyNote}>No payroll run yet</div>
          )}
        </div>

        {/* Compliance liability card */}
        <div style={{ ...S.card, flex: "1 1 28%" }}>
          <div style={S.cardH}>
            <h3 style={S.cardTitle}>Statutory Liability</h3>
            <span style={S.cardSub}>Latest challan</span>
          </div>
          <div style={{ padding: "12px 18px" }}>
            {/* EPF */}
            <div style={S.compBlock}>
              <div style={S.compLabel}>EPF (PF Challan)</div>
              <div style={{ ...S.compAmt, color: "#1E3563" }}>{inr(comp.pf_total)}</div>
              <span style={{ ...S.badge, ...(comp.pf_filed ? S.badgeFiled : S.badgePending) }}>
                {comp.pf_filed ? "Filed" : "Pending"}
              </span>
            </div>
            <div style={S.compDivider} />
            {/* ESI */}
            <div style={S.compBlock}>
              <div style={S.compLabel}>ESI Challan</div>
              <div style={{ ...S.compAmt, color: "#6A0DAD" }}>{inr(comp.esi_total)}</div>
              <span style={{ ...S.badge, ...(comp.esi_filed ? S.badgeFiled : S.badgePending) }}>
                {comp.esi_filed ? "Filed" : "Pending"}
              </span>
            </div>
            <div style={S.compTotalRow}>
              <span style={S.compTotalLabel}>Total Liability</span>
              <span style={S.compTotalAmt}>{inr((comp.pf_total || 0) + (comp.esi_total || 0))}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const S = {
  pageHead:    { display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 18 },
  h1:          { fontFamily: "Archivo", fontSize: 22, fontWeight: 700, color: "#0F1E3D" },
  sub:         { fontSize: 13, color: "#6B7793", marginTop: 3 },
  headerMeta:  { textAlign: "right" },
  today:       { fontSize: 12, color: "#6B7793" },

  kpiGrid:     { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 14 },
  kpiCard:     { background: "#fff", border: "1px solid #E2E7F0", borderRadius: 14, padding: "16px 18px", display: "flex", alignItems: "center", gap: 14, boxShadow: "0 1px 3px rgba(15,30,61,.05)" },
  kpiIcon:     { width: 48, height: 48, borderRadius: 12, display: "grid", placeItems: "center", fontSize: 22, flexShrink: 0 },
  kpiRight:    { flex: 1, minWidth: 0 },
  kpiLabel:    { fontSize: 11.5, color: "#6B7793", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".4px" },
  kpiVal:      { fontFamily: "Archivo", fontSize: 26, fontWeight: 800, lineHeight: 1.1, marginTop: 3 },
  kpiSub:      { fontSize: 11.5, color: "#9AA6BF", marginTop: 3 },

  midRow:      { display: "flex", gap: 14, marginBottom: 14, flexWrap: "wrap" },
  bottomRow:   { display: "flex", gap: 14, flexWrap: "wrap" },

  card:        { background: "#fff", border: "1px solid #E2E7F0", borderRadius: 14, boxShadow: "0 1px 3px rgba(15,30,61,.05)", overflow: "hidden" },
  cardH:       { padding: "14px 18px", borderBottom: "1px solid #E2E7F0", display: "flex", alignItems: "center", justifyContent: "space-between" },
  cardTitle:   { fontSize: 14, fontWeight: 700, color: "#0F1E3D" },
  cardSub:     { fontSize: 11.5, color: "#9AA6BF" },

  siteRow:     { display: "flex", alignItems: "center", gap: 8, padding: "5px 0" },
  siteName:    { fontSize: 11.5, color: "#1B2540", width: 110, flexShrink: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  siteBar:     { flex: 1, height: 7, background: "#F0F2F8", borderRadius: 4, overflow: "hidden" },
  siteBarFill: { height: "100%", borderRadius: 4, transition: "width .4s ease" },
  siteNums:    { fontSize: 11, width: 48, textAlign: "right", flexShrink: 0, color: "#0F1E3D" },

  catRow:      { marginBottom: 10 },
  catTop:      { display: "flex", justifyContent: "space-between", marginBottom: 4 },
  catName:     { fontSize: 12.5, color: "#1B2540" },
  catCount:    { fontSize: 12.5, fontWeight: 700, color: "#0F1E3D" },
  catBarBg:    { height: 6, background: "#F0F2F8", borderRadius: 4, overflow: "hidden" },
  catBarFill:  { height: "100%", background: "#1E3563", borderRadius: 4, transition: "width .4s ease" },

  pill:        { display: "inline-flex", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600 },
  payMonth:    { fontFamily: "Archivo", fontSize: 16, fontWeight: 700, color: "#0F1E3D", marginBottom: 2 },
  payMetaRow:  { marginBottom: 12 },
  payMeta:     { fontSize: 12, color: "#9AA6BF" },
  payLine:     { display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px dashed #E2E7F0", fontSize: 13 },
  payLineK:    { color: "#6B7793" },
  payLineV:    { fontWeight: 700 },
  emptyNote:   { padding: 24, fontSize: 13, color: "#9AA6BF", textAlign: "center" },

  compBlock:   { display: "flex", alignItems: "center", gap: 10, padding: "10px 0" },
  compLabel:   { flex: 1, fontSize: 13, color: "#6B7793" },
  compAmt:     { fontFamily: "Archivo", fontWeight: 700, fontSize: 14 },
  compDivider: { height: 1, background: "#F0F2F8", margin: "4px 0" },
  badge:       { display: "inline-flex", padding: "3px 9px", borderRadius: 20, fontSize: 11, fontWeight: 600, flexShrink: 0 },
  badgeFiled:  { background: "#E1F4EC", color: "#15966A" },
  badgePending:{ background: "#FBF1DC", color: "#C98A12" },
  compTotalRow:{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#F4F6FA", borderRadius: 10, padding: "10px 14px", marginTop: 10 },
  compTotalLabel:{ fontSize: 12.5, fontWeight: 600, color: "#6B7793" },
  compTotalAmt:  { fontFamily: "Archivo", fontSize: 17, fontWeight: 800, color: "#0F1E3D" },
};
