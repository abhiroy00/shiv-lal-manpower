import { useState } from "react";
import { useSelector } from "react-redux";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const REPORTS = [
  {
    key: "payroll", label: "Payroll Statement", needsMonth: true,
    desc: "Complete salary register with basic, HRA, DA, allowances, PF, ESI and net pay for all employees.",
    icon: "₹", iconBg: "#FEF3E8", iconColor: "#E8821E", accentColor: "#E8821E",
    url: "/api/reports/payroll-statement/",
    filename: (m,y) => `payroll_statement_${y}_${String(m).padStart(2,"0")}.xlsx`,
  },
  {
    key: "attendance", label: "Monthly Attendance Summary", needsMonth: true,
    desc: "Employee-wise present/late/absent days with attendance % for the selected month.",
    icon: "✅", iconBg: "#E1F4EC", iconColor: "#15966A", accentColor: "#15966A",
    url: "/api/reports/attendance-summary/",
    filename: (m,y) => `attendance_summary_${y}_${String(m).padStart(2,"0")}.xlsx`,
  },
  {
    key: "deployment", label: "Deployment Strength", needsMonth: false,
    desc: "Site-wise sanctioned vs deployed strength with fill % and vacancy gap across all states.",
    icon: "📍", iconBg: "#F3E5F5", iconColor: "#6A0DAD", accentColor: "#6A0DAD",
    url: "/api/reports/deployment-strength/",
    filename: () => "deployment_strength.xlsx",
  },
  {
    key: "pf_esi", label: "PF / ESI Deduction Register", needsMonth: true,
    desc: "Employee-wise EPF, EPS, EDLI and ESI deductions from payroll run — ready for challan verification.",
    icon: "🛡", iconBg: "#FDECEA", iconColor: "#D2453F", accentColor: "#D2453F",
    url: "/api/reports/deduction-register/",
    filename: (m,y) => `deduction_register_${y}_${String(m).padStart(2,"0")}.xlsx`,
  },
  {
    key: "recruitment", label: "Recruitment Status", needsMonth: false,
    desc: "Pipeline summary by stage + full candidate list + open requisitions — 3-sheet workbook.",
    icon: "🔍", iconBg: "#EBF3FC", iconColor: "#1565C0", accentColor: "#1565C0",
    url: "/api/reports/recruitment-status/",
    filename: () => "recruitment_status.xlsx",
  },
  {
    key: "mis_pack", label: "MIS Tender Pack", needsMonth: true,
    desc: "Consolidated 4-sheet Excel: Headcount, Deployment, Payroll Summary, Recruitment Snapshot.",
    icon: "📦", iconBg: "#FBF1DC", iconColor: "#C98A12", accentColor: "#C98A12",
    url: "/api/reports/mis-pack/",
    filename: (m,y) => `mis_pack_${y}_${String(m).padStart(2,"0")}.xlsx`,
  },
];

export default function ReportsPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear]   = useState(now.getFullYear());
  const [loading, setLoading] = useState({});
  const [toast, setToast] = useState(null);

  const accessToken = useSelector((s) => s.auth.accessToken);

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const handleDownload = async (report) => {
    setLoading((l) => ({ ...l, [report.key]: true }));
    try {
      const params = new URLSearchParams();
      if (report.needsMonth) {
        params.set("month", month);
        params.set("year", year);
      }
      const url = `${report.url}?${params}`;
      const res = await fetch(url, {
        headers: { Authorization: "Bearer " + accessToken },
      });
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objUrl;
      a.download = report.filename(month, year);
      a.click();
      URL.revokeObjectURL(objUrl);
      showToast(`${report.label} downloaded`);
    } catch {
      showToast(`Failed to generate ${report.label}`, false);
    } finally {
      setLoading((l) => ({ ...l, [report.key]: false }));
    }
  };

  const monthLabel = `${MONTHS[month - 1]} ${year}`;

  return (
    <div>
      {toast && (
        <div style={{ ...S.toast, background: toast.ok ? "#15966A" : "#D2453F" }}>
          {toast.msg}
        </div>
      )}

      <div style={S.pageHead}>
        <div>
          <h1 style={S.h1}>Reports</h1>
          <p style={S.sub}>One-click Excel exports for tender submissions, audits &amp; internal review</p>
        </div>
        {/* Global month/year selector */}
        <div style={S.monthPicker}>
          <span style={S.pickerLabel}>Report Period:</span>
          <select style={S.sel} value={month} onChange={(e) => setMonth(+e.target.value)}>
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <select style={S.sel} value={year} onChange={(e) => setYear(+e.target.value)}>
            {[2024, 2025, 2026, 2027].map((y) => <option key={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Period banner */}
      <div style={S.periodBanner}>
        <span style={S.periodIcon}>📅</span>
        <span style={S.periodText}>
          Month-dependent reports will use: <b>{monthLabel}</b>
        </span>
        <span style={S.periodNote}>
          Deployment &amp; Recruitment reports always show current data
        </span>
      </div>

      <div style={S.grid}>
        {REPORTS.map((r) => (
          <div key={r.key} style={{ ...S.card, borderTop: `3px solid ${r.accentColor}` }}>
            <div style={S.cardTop}>
              <div style={{ ...S.iconBox, background: r.iconBg, color: r.iconColor }}>
                {r.icon}
              </div>
              {r.needsMonth && (
                <span style={{ ...S.monthBadge, background: r.iconBg, color: r.accentColor }}>
                  {monthLabel}
                </span>
              )}
              {!r.needsMonth && (
                <span style={{ ...S.monthBadge, background: "#F4F6FA", color: "#9AA6BF" }}>
                  Current
                </span>
              )}
            </div>

            <h4 style={S.cardTitle}>{r.label}</h4>
            <p style={S.cardDesc}>{r.desc}</p>

            <div style={S.cardFoot}>
              <button
                style={{
                  ...S.dlBtn,
                  background: loading[r.key] ? "#F4F6FA" : r.accentColor,
                  color: loading[r.key] ? "#9AA6BF" : "#fff",
                  cursor: loading[r.key] ? "not-allowed" : "pointer",
                }}
                onClick={() => handleDownload(r)}
                disabled={!!loading[r.key]}
              >
                {loading[r.key] ? (
                  <span>Generating…</span>
                ) : (
                  <span>Download Excel</span>
                )}
              </button>
              <span style={S.sheetHint}>
                {r.key === "mis_pack" ? "4 sheets" :
                 r.key === "recruitment" ? "3 sheets" : "1 sheet"} · .xlsx
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Info box */}
      <div style={S.infoBox}>
        <div style={S.infoTitle}>Report Details</div>
        <div style={S.infoGrid}>
          {[
            ["Payroll Statement", "Salary register: gross wages, deductions, net pay. Auto-totals row. Filter-ready."],
            ["Attendance Summary", "Per employee: present/late/absent/Sunday days + attendance %. Color-coded by % (green/amber/red)."],
            ["Deployment Strength", "All 11 sites: sanctioned vs deployed, vacancy gap, fill % status (Full/Partial/Critical)."],
            ["PF/ESI Deduction Register", "EPF + EPS + EDLI (employer) + ESI employee + ESI employer — all in one sheet."],
            ["Recruitment Status", "Sheet 1: pipeline counts. Sheet 2: full candidate list. Sheet 3: open requisitions."],
            ["MIS Tender Pack", "Headcount + Deployment + Payroll + Recruitment — 4-sheet bundle for tender evaluation."],
          ].map(([title, detail]) => (
            <div key={title} style={S.infoItem}>
              <div style={S.infoItemTitle}>{title}</div>
              <div style={S.infoItemDetail}>{detail}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const S = {
  toast:       { position: "fixed", top: 20, right: 24, zIndex: 200, color: "#fff", fontWeight: 600, fontSize: 13.5, padding: "12px 20px", borderRadius: 10, boxShadow: "0 4px 20px rgba(0,0,0,.18)" },
  pageHead:    { display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 14 },
  h1:          { fontFamily: "Archivo", fontSize: 22, fontWeight: 700, color: "#0F1E3D" },
  sub:         { fontSize: 13, color: "#6B7793", marginTop: 3 },
  monthPicker: { display: "flex", alignItems: "center", gap: 8 },
  pickerLabel: { fontSize: 13, color: "#6B7793", fontWeight: 600 },
  sel:         { padding: "8px 10px", border: "1px solid #E2E7F0", borderRadius: 8, fontSize: 13, fontFamily: "inherit", background: "#fff" },

  periodBanner: { display: "flex", alignItems: "center", gap: 10, background: "#F4F6FA", border: "1px solid #E2E7F0", borderRadius: 10, padding: "10px 16px", marginBottom: 16 },
  periodIcon:   { fontSize: 16 },
  periodText:   { fontSize: 13, color: "#1B2540", flex: 1 },
  periodNote:   { fontSize: 12, color: "#9AA6BF" },

  grid:        { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 18 },
  card:        { background: "#fff", border: "1px solid #E2E7F0", borderRadius: 12, padding: 18, display: "flex", flexDirection: "column", gap: 0 },
  cardTop:     { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  iconBox:     { width: 44, height: 44, borderRadius: 12, display: "grid", placeItems: "center", fontSize: 20 },
  monthBadge:  { fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20 },
  cardTitle:   { fontSize: 14, fontWeight: 700, color: "#0F1E3D", marginBottom: 6 },
  cardDesc:    { fontSize: 12.5, color: "#6B7793", lineHeight: 1.5, flex: 1, marginBottom: 14 },
  cardFoot:    { display: "flex", alignItems: "center", gap: 10, marginTop: "auto" },
  dlBtn:       { padding: "9px 18px", border: 0, borderRadius: 9, fontWeight: 700, fontSize: 13, transition: "background .15s" },
  sheetHint:   { fontSize: 11, color: "#9AA6BF" },

  infoBox:     { background: "#fff", border: "1px solid #E2E7F0", borderRadius: 12, padding: "18px 20px" },
  infoTitle:   { fontSize: 13, fontWeight: 700, color: "#6B7793", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 12 },
  infoGrid:    { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 },
  infoItem:    { padding: "10px 12px", background: "#F8F9FC", borderRadius: 8 },
  infoItemTitle:{ fontSize: 12.5, fontWeight: 700, color: "#0F1E3D", marginBottom: 4 },
  infoItemDetail:{ fontSize: 12, color: "#6B7793", lineHeight: 1.5 },
};
