const REPORTS = [
  { key: "attendance", label: "Monthly Attendance Register", desc: "Full GPS + selfie verified attendance, site-wise.", icon: "✅", iconBg: "#E1F4EC", iconColor: "#15966A" },
  { key: "payroll", label: "Payroll Statement", desc: "Salary register with basic, allowance & deductions.", icon: "₹", iconBg: "#FCEFDD", iconColor: "#E8821E" },
  { key: "pf_esi", label: "PF / ESI Compliance", desc: "ECR & challan files, ready for EPFO/ESIC upload.", icon: "🛡", iconBg: "#E7ECF7", iconColor: "#1E3563" },
  { key: "deployment", label: "District Deployment", desc: "Sanctioned vs deployed manpower, per site.", icon: "📍", iconBg: "#FBF1DC", iconColor: "#C98A12" },
  { key: "recruitment", label: "Recruitment Status", desc: "Open requisitions & candidate pipeline summary.", icon: "🔍", iconBg: "#E1F4EC", iconColor: "#15966A" },
  { key: "mis_pack", label: "MIS Tender Pack", desc: "Consolidated report bundle for tender evaluation.", icon: "📦", iconBg: "#FBE6E5", iconColor: "#D2453F" },
];

export default function ReportsPage() {
  return (
    <div>
      <div style={S.pageHead}>
        <div>
          <h1 style={S.h1}>Reports – Excel &amp; PDF</h1>
          <p style={S.sub}>One-click exports for tender submissions, audits &amp; internal review</p>
        </div>
      </div>

      <div style={S.grid}>
        {REPORTS.map((r) => (
          <div key={r.key} style={S.repCard}>
            <div style={{ ...S.icon, background: r.iconBg, color: r.iconColor }}>{r.icon}</div>
            <h4 style={S.repTitle}>{r.label}</h4>
            <p style={S.repDesc}>{r.desc}</p>
            <div style={S.repBtns}>
              <button style={S.xlsBtn}>📥 Excel</button>
              <button style={S.pdfBtn}>📥 PDF</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const S = {
  pageHead: { marginBottom: 18 },
  h1: { fontFamily: "Archivo", fontSize: 22, fontWeight: 700, color: "#0F1E3D" },
  sub: { fontSize: 13, color: "#6B7793", marginTop: 3 },
  grid: { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 },
  repCard: { border: "1px solid #E2E7F0", borderRadius: 12, padding: 18, background: "#fff" },
  icon: { width: 40, height: 40, borderRadius: 11, display: "grid", placeItems: "center", fontSize: 18, marginBottom: 11 },
  repTitle: { fontSize: 14, color: "#0F1E3D", fontWeight: 700 },
  repDesc: { fontSize: 12, color: "#6B7793", margin: "5px 0 13px" },
  repBtns: { display: "flex", gap: 8 },
  xlsBtn: { padding: "7px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, border: "1px solid #bfe6d4", color: "#15966A", cursor: "pointer", background: "#fff" },
  pdfBtn: { padding: "7px 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, border: "1px solid #f3cfcd", color: "#D2453F", cursor: "pointer", background: "#fff" },
};
