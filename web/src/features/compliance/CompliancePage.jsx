export default function CompliancePage() {
  const epf = { employee: 1430000, employer: 1430000 };
  const esi = { employee: 176250, employer: 763750 };

  const fmt = (n) => `₹${n.toLocaleString("en-IN")}`;

  return (
    <div>
      <div style={S.pageHead}>
        <div>
          <h1 style={S.h1}>PF &amp; ESI Management</h1>
          <p style={S.sub}>Statutory compliance – auto challan calculation &amp; ECR-ready export</p>
        </div>
        <div style={S.actions}>
          <button style={S.btn}>📤 ECR File (EPFO)</button>
          <button style={S.btnSolid}>📤 ESI Challan</button>
        </div>
      </div>

      <div style={S.grid2}>
        <div style={S.card}>
          <div style={S.cardH}><h3 style={S.cardTitle}>EPF Summary</h3></div>
          <div style={S.cardBody}>
            {[["Employee Share (12%)", fmt(epf.employee)], ["Employer Share (12%)", fmt(epf.employer)]].map(([k, v]) => (
              <div key={k} style={S.line}><span style={S.lineK}>{k}</span><span style={S.lineV}>{v}</span></div>
            ))}
            <div style={S.netRow}>
              <span style={S.netK}>Total EPF Challan</span>
              <span style={S.netV}>{fmt(epf.employee + epf.employer)}</span>
            </div>
          </div>
        </div>

        <div style={S.card}>
          <div style={S.cardH}><h3 style={S.cardTitle}>ESI Summary</h3></div>
          <div style={S.cardBody}>
            {[["Employee Share (0.75%)", fmt(esi.employee)], ["Employer Share (3.25%)", fmt(esi.employer)]].map(([k, v]) => (
              <div key={k} style={S.line}><span style={S.lineK}>{k}</span><span style={S.lineV}>{v}</span></div>
            ))}
            <div style={S.netRow}>
              <span style={S.netK}>Total ESI Challan</span>
              <span style={S.netV}>{fmt(esi.employee + esi.employer)}</span>
            </div>
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
  grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 },
  card: { background: "#fff", border: "1px solid #E2E7F0", borderRadius: 14 },
  cardH: { padding: "15px 18px", borderBottom: "1px solid #E2E7F0" },
  cardTitle: { fontSize: 14.5, fontWeight: 700, color: "#0F1E3D" },
  cardBody: { padding: 18 },
  line: { display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px dashed #E2E7F0", fontSize: 13 },
  lineK: { color: "#6B7793" },
  lineV: { fontWeight: 600, color: "#0F1E3D" },
  netRow: { display: "flex", justifyContent: "space-between", alignItems: "center", background: "#E1F4EC", borderRadius: 10, padding: "14px 18px", marginTop: 8 },
  netK: { fontWeight: 700, color: "#15966A" },
  netV: { fontFamily: "Archivo", fontSize: 20, fontWeight: 800, color: "#15966A" },
};
