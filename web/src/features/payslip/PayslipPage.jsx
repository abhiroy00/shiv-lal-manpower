export default function PayslipPage() {
  const slip = {
    name: "Suresh Pal", code: "EMP-1042", designation: "Security Guard",
    site: "Delhi Secretariat", present: 26, working: 26, uan: "1001xxxx4521",
    basic: 18000, hra: 4200, pf: 2160, esi: 0, net: 20040,
  };

  const fmt = (n) => `₹${n.toLocaleString("en-IN")}`;

  return (
    <div>
      <div style={S.pageHead}>
        <div>
          <h1 style={S.h1}>Payslip</h1>
          <p style={S.sub}>Employee can view &amp; download payslip from web or mobile app</p>
        </div>
        <div style={S.actions}>
          <button style={S.btn}>📧 Email Payslip</button>
          <button style={S.btnSolid}>📤 Download PDF</button>
        </div>
      </div>

      <div style={S.payslip}>
        <div style={S.psTop}>
          <div>
            <h4 style={S.psCompany}>Shiv Lal Manpower Services</h4>
            <div style={S.psMeta}>Payslip for June 2026</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={S.psMeta}>{slip.code}</div>
            <div style={S.psEmpName}>{slip.name}</div>
          </div>
        </div>

        <div style={S.psBody}>
          <div style={S.psGrid}>
            <div>
              {[["Designation", slip.designation], ["Site", slip.site], ["Present Days", `${slip.present} / ${slip.working}`], ["UAN", slip.uan]].map(([k, v]) => (
                <div key={k} style={S.psLine}><span style={S.psK}>{k}</span><span style={S.psV}>{v}</span></div>
              ))}
            </div>
            <div>
              {[["Basic + DA", fmt(slip.basic)], ["HRA + Allowances", fmt(slip.hra)], ["PF Deduction", `– ${fmt(slip.pf)}`], ["ESI Deduction", `– ${fmt(slip.esi)}`]].map(([k, v]) => (
                <div key={k} style={S.psLine}><span style={S.psK}>{k}</span><span style={S.psV}>{v}</span></div>
              ))}
            </div>
          </div>
          <div style={S.psNet}>
            <span style={S.psNetK}>Net Pay (June 2026)</span>
            <span style={S.psNetV}>{fmt(slip.net)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const S = {
  pageHead: { display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 18 },
  h1: { fontFamily: "Archivo", fontSize: 22, fontWeight: 700, color: "#0F1E3D" },
  sub: { fontSize: 13, color: "#6B7793", marginTop: 3 },
  actions: { display: "flex", gap: 9 },
  btn: { padding: "9px 14px", borderRadius: 9, border: "1px solid #E2E7F0", background: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" },
  btnSolid: { padding: "9px 14px", borderRadius: 9, border: 0, background: "#E8821E", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" },
  payslip: { maxWidth: 640, border: "1px solid #E2E7F0", borderRadius: 12, overflow: "hidden" },
  psTop: { background: "#0F1E3D", color: "#fff", padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
  psCompany: { fontFamily: "Archivo", fontSize: 16 },
  psMeta: { fontSize: 12, color: "#AEB9D4", marginTop: 3 },
  psEmpName: { fontWeight: 600, marginTop: 2 },
  psBody: { padding: "22px 24px" },
  psGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 18 },
  psLine: { display: "flex", justifyContent: "space-between", fontSize: 13, padding: "7px 0", borderBottom: "1px dashed #E2E7F0" },
  psK: { color: "#6B7793" },
  psV: { fontWeight: 600, color: "#0F1E3D" },
  psNet: { display: "flex", justifyContent: "space-between", alignItems: "center", background: "#E1F4EC", borderRadius: 10, padding: "14px 18px" },
  psNetK: { fontWeight: 700, color: "#15966A" },
  psNetV: { fontFamily: "Archivo", fontSize: 22, fontWeight: 800, color: "#15966A" },
};
