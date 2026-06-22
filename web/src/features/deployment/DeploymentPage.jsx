const DISTRICTS = [
  { name: "Delhi – Secretariat", state: "Delhi", sanctioned: 180, deployed: 176, present: 168 },
  { name: "Noida – Sec 62", state: "Uttar Pradesh", sanctioned: 140, deployed: 138, present: 122 },
  { name: "Gurugram – Mini Sectt.", state: "Haryana", sanctioned: 120, deployed: 112, present: 86 },
  { name: "Faridabad – Depot", state: "Haryana", sanctioned: 95, deployed: 95, present: 89 },
  { name: "Lucknow – Govt Hospital", state: "Uttar Pradesh", sanctioned: 110, deployed: 104, present: 71 },
  { name: "Kanpur – District Court", state: "Uttar Pradesh", sanctioned: 80, deployed: 78, present: 72 },
  { name: "Jaipur – Collectorate", state: "Rajasthan", sanctioned: 70, deployed: 62, present: 40 },
];

function healthColor(pct) {
  if (pct >= 85) return { bg: "#E1F4EC", color: "#15966A" };
  if (pct >= 70) return { bg: "#FBF1DC", color: "#C98A12" };
  return { bg: "#FBE6E5", color: "#D2453F" };
}

export default function DeploymentPage() {
  return (
    <div>
      <div style={S.pageHead}>
        <div>
          <h1 style={S.h1}>District-wise Deployment Report</h1>
          <p style={S.sub}>Tender-critical view – manpower count &amp; attendance health per district</p>
        </div>
        <button style={S.btnSolid}>📤 Export</button>
      </div>

      <div style={S.card}>
        <table style={S.table}>
          <thead>
            <tr>
              {["District / Site", "State", "Sanctioned", "Deployed", "Present Today", "Fill Rate", "Health"].map((h) => (
                <th key={h} style={S.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DISTRICTS.map((d) => {
              const pct = Math.round((d.present / d.deployed) * 100);
              const hc = healthColor(pct);
              return (
                <tr key={d.name}>
                  <td style={{ ...S.td, fontWeight: 600 }}>{d.name}</td>
                  <td style={S.td}>{d.state}</td>
                  <td style={S.td}>{d.sanctioned}</td>
                  <td style={S.td}>{d.deployed}</td>
                  <td style={S.td}>{d.present}</td>
                  <td style={S.td}>
                    <div style={S.bar}><div style={{ ...S.barFill, width: `${pct}%`, background: hc.color }} /></div>
                  </td>
                  <td style={S.td}>
                    <span style={{ ...S.pill, background: hc.bg, color: hc.color }}>{pct}%</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const S = {
  pageHead: { display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 18 },
  h1: { fontFamily: "Archivo", fontSize: 22, fontWeight: 700, color: "#0F1E3D" },
  sub: { fontSize: 13, color: "#6B7793", marginTop: 3 },
  btnSolid: { padding: "9px 14px", borderRadius: 9, border: 0, background: "#E8821E", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" },
  card: { background: "#fff", border: "1px solid #E2E7F0", borderRadius: 14, overflow: "auto" },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 720 },
  th: { fontSize: 11, textTransform: "uppercase", color: "#6B7793", textAlign: "left", padding: "11px 14px", borderBottom: "1px solid #E2E7F0", fontWeight: 700, background: "#F4F6FA" },
  td: { padding: "12px 14px", fontSize: 13, borderBottom: "1px solid #E2E7F0" },
  bar: { height: 8, borderRadius: 6, background: "#F4F6FA", overflow: "hidden", width: 120 },
  barFill: { height: "100%", borderRadius: 6 },
  pill: { display: "inline-flex", padding: "4px 10px", borderRadius: 30, fontSize: 11.5, fontWeight: 600 },
};
