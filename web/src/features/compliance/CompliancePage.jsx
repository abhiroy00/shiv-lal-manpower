import { useState } from "react";
import { useSelector } from "react-redux";
import { useGetPayrollRunsQuery } from "../payroll/payrollApi";

const inr = (v) => String.fromCharCode(8377) + Number(v || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });

export default function CompliancePage() {
  const [runId, setRunId]     = useState("");
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast]     = useState(null);

  const accessToken = useSelector((s) => s.auth.accessToken);
  const { data: runsData } = useGetPayrollRunsQuery();
  const runs = runsData?.results || runsData || [];

  const authHdr = { Authorization: "Bearer " + accessToken };

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchSummary = async (id) => {
    if (!id) { setSummary(null); return; }
    setLoading(true);
    try {
      const r = await fetch("/api/compliance/summary/?payroll_run=" + id, { headers: authHdr });
      setSummary(await r.json());
    } finally { setLoading(false); }
  };

  const handleRunChange = (e) => {
    setRunId(e.target.value);
    fetchSummary(e.target.value);
  };

  const handleGenerate = async () => {
    if (!runId) return;
    setLoading(true);
    try {
      const r = await fetch("/api/compliance/generate/", {
        method: "POST",
        headers: { ...authHdr, "Content-Type": "application/json" },
        body: JSON.stringify({ payroll_run: runId }),
      });
      if (!r.ok) throw new Error();
      showToast("Challan generated successfully");
      fetchSummary(runId);
    } catch { showToast("Generation failed", false); }
    finally { setLoading(false); }
  };

  const download = async (url, filename) => {
    const r = await fetch(url, { headers: authHdr });
    if (!r.ok) { showToast("Download failed", false); return; }
    const blob = await r.blob();
    const obj  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = obj; a.download = filename; a.click();
    URL.revokeObjectURL(obj);
  };

  const handleEPF = () => download(
    "/api/compliance/epf-challan/?payroll_run=" + runId,
    "epf_ecr_" + runId + ".xlsx"
  );
  const handleESI = () => download(
    "/api/compliance/esi-challan/?payroll_run=" + runId,
    "esi_challan_" + runId + ".xlsx"
  );

  const s = summary;

  return (
    <div>
      {toast && (
        <div style={{ ...S.toast, background: toast.ok ? "#15966A" : "#D2453F" }}>{toast.msg}</div>
      )}

      <div style={S.pageHead}>
        <div>
          <h1 style={S.h1}>PF &amp; ESI Compliance</h1>
          <p style={S.sub}>Auto-calculated from payroll · ECR-ready for EPFO · ESI challan export</p>
        </div>
      </div>

      {/* Controls */}
      <div style={S.controls}>
        <select style={S.sel} value={runId} onChange={handleRunChange}>
          <option value="">Select payroll run...</option>
          {runs.map((r) => (
            <option key={r.id} value={r.id}>{r.month_label} ({r.run_status})</option>
          ))}
        </select>
        <button style={S.btnGenerate} onClick={handleGenerate} disabled={!runId || loading}>
          {loading ? "Working..." : "Generate Challan"}
        </button>
        {s && (
          <>
            <button style={S.btnEPF} onClick={handleEPF} disabled={!runId}>
              EPF / ECR Download
            </button>
            <button style={S.btnESI} onClick={handleESI} disabled={!runId}>
              ESI Challan Download
            </button>
          </>
        )}
      </div>

      {!s && !loading && (
        <div style={S.emptyState}>
          <div style={S.emptyIcon}>🛡</div>
          <div style={S.emptyTitle}>Select a payroll run</div>
          <div style={S.emptyText}>Select a payroll run and click Generate Challan to compute PF & ESI contributions.</div>
        </div>
      )}

      {loading && <div style={S.loadingMsg}>Computing compliance figures...</div>}

      {s && !loading && (
        <>
          {/* Summary bar */}
          <div style={S.infoBar}>
            <span style={S.infoItem}><b>{s.month_label}</b></span>
            <span style={S.infoItem}>{s.employees} employees</span>
            <span style={S.infoItem}>ESI eligible: {s.esi_eligible}</span>
          </div>

          <div style={S.grid2}>
            {/* EPF Card */}
            <div style={S.card}>
              <div style={{ ...S.cardHead, background: "#1E3563" }}>
                <span style={S.cardTitle}>EPF (Provident Fund)</span>
                <span style={S.cardSub}>Employee + Employer Contribution</span>
              </div>
              <div style={S.cardBody}>
                {[
                  ["Employee Share (12% of Basic)",  inr(s.pf_employee_share)],
                  ["Employer EPF (3.67% of Basic)",  inr(s.pf_employer_share - s.pf_eps - s.pf_edli)],
                  ["Employer EPS (8.33% of Basic)",  inr(s.pf_eps)],
                  ["Employer EDLI (0.5% of Basic)",  inr(s.pf_edli)],
                  ["Employer Total Share",            inr(s.pf_employer_share)],
                ].map(([k, v]) => (
                  <div key={k} style={S.line}>
                    <span style={S.lineK}>{k}</span>
                    <span style={S.lineV}>{v}</span>
                  </div>
                ))}
                <div style={{ ...S.totalRow, background: "#E3EEF9", borderColor: "#1E3563" }}>
                  <span style={{ ...S.totalLabel, color: "#1E3563" }}>Total EPF Challan</span>
                  <span style={{ ...S.totalAmt, color: "#1E3563" }}>{inr(s.pf_total)}</span>
                </div>
                <div style={S.filedBadge}>
                  {s.pf_filed
                    ? <span style={{ ...S.badge, background: "#E1F4EC", color: "#15966A" }}>Filed</span>
                    : <span style={{ ...S.badge, background: "#FBF1DC", color: "#C98A12" }}>Pending Filing</span>}
                </div>
              </div>
            </div>

            {/* ESI Card */}
            <div style={S.card}>
              <div style={{ ...S.cardHead, background: "#6A0DAD" }}>
                <span style={S.cardTitle}>ESI (Employee State Insurance)</span>
                <span style={S.cardSub}>Eligible employees: {s.esi_eligible} (Gross &le; 21,000)</span>
              </div>
              <div style={S.cardBody}>
                {[
                  ["IP Wages (Gross of eligible emps)", inr(s.esi_wages)],
                  ["Employee Share (0.75% of Gross)",   inr(s.esi_employee_share)],
                  ["Employer Share (3.25% of Gross)",   inr(s.esi_employer_share)],
                ].map(([k, v]) => (
                  <div key={k} style={S.line}>
                    <span style={S.lineK}>{k}</span>
                    <span style={S.lineV}>{v}</span>
                  </div>
                ))}
                <div style={{ ...S.totalRow, background: "#F3E5F5", borderColor: "#6A0DAD" }}>
                  <span style={{ ...S.totalLabel, color: "#6A0DAD" }}>Total ESI Challan</span>
                  <span style={{ ...S.totalAmt, color: "#6A0DAD" }}>{inr(s.esi_total)}</span>
                </div>
                <div style={S.filedBadge}>
                  {s.esi_filed
                    ? <span style={{ ...S.badge, background: "#E1F4EC", color: "#15966A" }}>Filed</span>
                    : <span style={{ ...S.badge, background: "#FBF1DC", color: "#C98A12" }}>Pending Filing</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Combined liability */}
          <div style={S.totalLiability}>
            <span style={S.liabilityLabel}>Total Statutory Liability</span>
            <span style={S.liabilityAmt}>{inr(s.pf_total + s.esi_total)}</span>
            <span style={S.liabilityNote}>EPF + ESI combined · {s.month_label}</span>
          </div>
        </>
      )}
    </div>
  );
}

const S = {
  toast:     { position: "fixed", top: 20, right: 24, zIndex: 200, color: "#fff", fontWeight: 600, fontSize: 13.5, padding: "12px 20px", borderRadius: 10, boxShadow: "0 4px 20px rgba(0,0,0,.18)" },
  pageHead:  { display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 18 },
  h1:        { fontFamily: "Archivo", fontSize: 22, fontWeight: 700, color: "#0F1E3D" },
  sub:       { fontSize: 13, color: "#6B7793", marginTop: 3 },
  controls:  { display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" },
  sel:       { padding: "9px 12px", border: "1px solid #E2E7F0", borderRadius: 9, fontSize: 13, fontFamily: "inherit", background: "#fff", minWidth: 220 },
  btnGenerate:{ padding: "9px 16px", borderRadius: 9, border: 0, background: "#0F1E3D", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" },
  btnEPF:    { padding: "9px 16px", borderRadius: 9, border: 0, background: "#1E3563", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" },
  btnESI:    { padding: "9px 16px", borderRadius: 9, border: 0, background: "#6A0DAD", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" },
  emptyState:{ textAlign: "center", padding: "80px 0", color: "#6B7793" },
  emptyIcon: { fontSize: 48, marginBottom: 10 },
  emptyTitle:{ fontFamily: "Archivo", fontSize: 18, fontWeight: 700, color: "#0F1E3D", marginBottom: 6 },
  emptyText: { fontSize: 13, color: "#6B7793" },
  loadingMsg:{ textAlign: "center", padding: 40, color: "#6B7793", fontSize: 14 },
  infoBar:   { display: "flex", gap: 20, marginBottom: 14, background: "#F4F6FA", border: "1px solid #E2E7F0", borderRadius: 10, padding: "10px 18px" },
  infoItem:  { fontSize: 13, color: "#1B2540" },
  grid2:     { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 },
  card:      { background: "#fff", border: "1px solid #E2E7F0", borderRadius: 14, overflow: "hidden" },
  cardHead:  { padding: "14px 18px" },
  cardTitle: { display: "block", fontSize: 14, fontWeight: 700, color: "#fff" },
  cardSub:   { display: "block", fontSize: 11.5, color: "rgba(255,255,255,.7)", marginTop: 3 },
  cardBody:  { padding: 18 },
  line:      { display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: "1px dashed #E2E7F0", fontSize: 13 },
  lineK:     { color: "#6B7793" },
  lineV:     { fontWeight: 600, color: "#0F1E3D" },
  totalRow:  { display: "flex", justifyContent: "space-between", alignItems: "center", borderRadius: 10, padding: "13px 16px", marginTop: 12, border: "1.5px solid" },
  totalLabel:{ fontWeight: 700, fontSize: 13 },
  totalAmt:  { fontFamily: "Archivo", fontSize: 20, fontWeight: 800 },
  filedBadge:{ marginTop: 10 },
  badge:     { display: "inline-flex", padding: "4px 12px", borderRadius: 30, fontSize: 12, fontWeight: 600 },
  totalLiability: { background: "#0F1E3D", borderRadius: 14, padding: "20px 24px", display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" },
  liabilityLabel: { fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,.8)" },
  liabilityAmt:   { fontFamily: "Archivo", fontSize: 28, fontWeight: 800, color: "#fff" },
  liabilityNote:  { fontSize: 12, color: "rgba(255,255,255,.5)", marginLeft: "auto" },
};
