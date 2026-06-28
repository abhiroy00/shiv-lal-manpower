import { useState } from "react";
import { useSelector } from "react-redux";
import {
  useGetPayrollRunsQuery,
  useRunPayrollMutation,
  useApprovePayrollRunMutation,
  useMarkPaidPayrollRunMutation,
  useGetPayslipsQuery,
} from "./payrollApi";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const STATUS_CFG = {
  draft:    { bg: "#FBF1DC", color: "#C98A12", label: "Draft" },
  approved: { bg: "#E3EEF9", color: "#1565C0", label: "Approved" },
  paid:     { bg: "#E1F4EC", color: "#15966A", label: "Paid" },
};

const inr = (v) => String.fromCharCode(8377) + Number(v || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });

export default function PayrollPage() {
  const now = new Date();
  const [month, setMonth]           = useState(now.getMonth() + 1);
  const [year, setYear]             = useState(now.getFullYear());
  const [selectedRun, setSelectedRun] = useState(null);
  const [toast, setToast]           = useState(null);

  const accessToken = useSelector((s) => s.auth.accessToken);

  const { data: runsData, isLoading: runsLoading } = useGetPayrollRunsQuery();
  const runs = runsData?.results || runsData || [];

  const { data: payslipsData, isLoading: slipsLoading } = useGetPayslipsQuery(
    { payroll_run: selectedRun?.id },
    { skip: !selectedRun }
  );
  const payslips = payslipsData?.results || payslipsData || [];

  const [runPayroll,  { isLoading: running }]     = useRunPayrollMutation();
  const [approveRun,  { isLoading: approving }]   = useApprovePayrollRunMutation();
  const [markPaid,    { isLoading: markingPaid }] = useMarkPaidPayrollRunMutation();

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const handleRun = async () => {
    try {
      const res = await runPayroll({ month, year }).unwrap();
      setSelectedRun(res);
      showToast("Payroll run complete — " + res.payslip_count + " payslips generated");
    } catch (e) {
      showToast(e?.data?.detail || "Payroll run failed", false);
    }
  };

  const handleApprove = async () => {
    try {
      const res = await approveRun(selectedRun.id).unwrap();
      setSelectedRun(res);
      showToast("Payroll approved");
    } catch (e) {
      showToast(e?.data?.detail || "Approval failed", false);
    }
  };

  const handleMarkPaid = async () => {
    try {
      const res = await markPaid(selectedRun.id).unwrap();
      setSelectedRun(res);
      showToast("Payroll marked as paid");
    } catch (e) {
      showToast(e?.data?.detail || "Failed", false);
    }
  };

  const download = async (url, filename) => {
    const res = await fetch(url, { headers: { Authorization: "Bearer " + accessToken } });
    if (!res.ok) { showToast("Download failed", false); return; }
    const blob = await res.blob();
    const objUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objUrl; a.download = filename; a.click();
    URL.revokeObjectURL(objUrl);
  };

  const handleBankAdvice = () =>
    download(
      "/api/payroll-runs/" + selectedRun.id + "/bank-advice/",
      "bank_advice_" + selectedRun.year + "_" + String(selectedRun.month).padStart(2,"0") + ".xlsx"
    );

  const handleSalarySheet = () =>
    download(
      "/api/payroll-runs/" + selectedRun.id + "/salary-sheet/",
      "salary_sheet_" + selectedRun.year + "_" + String(selectedRun.month).padStart(2,"0") + ".xlsx"
    );

  const handleAllPDFs = () =>
    download(
      "/api/payroll-runs/" + selectedRun.id + "/payslips-zip/",
      "payslips_" + selectedRun.year + "_" + String(selectedRun.month).padStart(2,"0") + ".zip"
    );

  const handleStructureTemplate = () =>
    download("/api/salary-structures/template/", "salary_structure_template.xlsx");

  const structFileRef = { current: null };
  const handleStructureUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/salary-structures/upload/", {
        method: "POST",
        headers: { Authorization: "Bearer " + accessToken },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) { showToast(data.detail || "Upload failed", false); return; }
      showToast(`✓ ${data.created} created, ${data.updated} updated${data.errors ? ", " + data.errors + " errors" : ""}`);
    } catch {
      showToast("Upload failed", false);
    }
    e.target.value = "";
  };

  const handleSlipPDF = (slip) =>
    download(
      "/api/payslips/" + slip.id + "/pdf/",
      "payslip_" + slip.emp_code + "_" + selectedRun.year + "_" + String(selectedRun.month).padStart(2,"0") + ".pdf"
    );

  const run = selectedRun;
  const sc  = run ? (STATUS_CFG[run.run_status] || STATUS_CFG.draft) : null;

  return (
    <div style={S.page}>
      {toast && (
        <div style={{ ...S.toast, background: toast.ok ? "#15966A" : "#D2453F" }}>
          {toast.msg}
        </div>
      )}

      <div style={S.left}>
        {/* Salary structure quick actions */}
        <div style={S.structBox}>
          <div style={S.structTitle}>Salary Structures</div>
          <button style={S.structBtn} onClick={handleStructureTemplate}>
            ⬇ Download Template
          </button>
          <label style={S.structUploadBtn}>
            ⬆ Upload Sheet
            <input type="file" accept=".xlsx" style={{ display: "none" }} onChange={handleStructureUpload} />
          </label>
          <div style={S.structNote}>
            Basic ≥ ₹30,000 → TDS (10%)<br />
            Basic &lt; ₹30,000 → PF (12%) + ESIC (0.75%)
          </div>
        </div>

        <div style={S.leftHead}>
          <div style={S.h2}>Payroll Runs</div>
          <div style={S.runControls}>
            <select style={S.sel} value={month} onChange={(e) => setMonth(+e.target.value)}>
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
            <select style={S.sel} value={year} onChange={(e) => setYear(+e.target.value)}>
              {[2024, 2025, 2026, 2027].map((y) => <option key={y}>{y}</option>)}
            </select>
            <button style={S.runBtn} onClick={handleRun} disabled={running}>
              {running ? "Running..." : "Run"}
            </button>
          </div>
        </div>
        <div style={S.runsList}>
          {runsLoading && <div style={S.dim}>Loading...</div>}
          {!runsLoading && runs.length === 0 && (
            <div style={S.dim}>No payroll runs yet.</div>
          )}
          {runs.map((r) => {
            const cfg    = STATUS_CFG[r.run_status] || STATUS_CFG.draft;
            const active = selectedRun?.id === r.id;
            return (
              <div key={r.id} style={{ ...S.runCard, ...(active ? S.runCardOn : {}) }}
                onClick={() => setSelectedRun(r)}>
                <div style={S.runMonth}>{r.month_label}</div>
                <div style={S.runMeta}>{r.payslip_count} employees</div>
                <span style={{ ...S.pill, background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                <div style={S.runNet}>{inr(r.total_net)}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={S.right}>
        {!run ? (
          <div style={S.emptyState}>
            <div style={S.emptyIcon}>&#8377;</div>
            <div style={S.emptyTitle}>Select a payroll run</div>
            <div style={S.emptyText}>Or run payroll for a new month using the panel on the left.</div>
          </div>
        ) : (
          <>
            <div style={S.runHead}>
              <div>
                <h1 style={S.h1}>{run.month_label} Payroll</h1>
                <span style={{ ...S.pill, background: sc.bg, color: sc.color }}>{sc.label}</span>
              </div>
              <div style={S.runActions}>
                {run.run_status === "draft" && (
                  <button style={S.btnApprove} onClick={handleApprove} disabled={approving}>
                    {approving ? "..." : "Approve"}
                  </button>
                )}
                {run.run_status === "approved" && (
                  <button style={S.btnPaid} onClick={handleMarkPaid} disabled={markingPaid}>
                    {markingPaid ? "..." : "Mark Paid"}
                  </button>
                )}
                <button style={S.btnBank} onClick={handleBankAdvice}>
                  Bank Advice
                </button>
                <button style={S.btnSalary} onClick={handleSalarySheet}>
                  Salary Sheet
                </button>
                <button style={S.btnBank} onClick={handleAllPDFs}>
                  All Payslips ZIP
                </button>
              </div>
            </div>

            <div style={S.kpiRow}>
              {[
                { label: "Employees",      val: run.payslip_count,   fmt: (v) => v, color: "#1E3563" },
                { label: "Basic + HRA",    val: Number(run.total_basic||0) + Number(run.total_hra||0), fmt: inr, color: "#1E3563" },
                { label: "Bonus (8.33%)",  val: run.total_bonus,     fmt: inr,      color: "#C98A12" },
                { label: "Deductions",     val: run.total_deductions, fmt: inr,     color: "#D2453F" },
                { label: "TDS",            val: run.total_tds,        fmt: inr,     color: "#D2453F" },
                { label: "Net Payable",    val: run.total_net,        fmt: inr,     color: "#15966A" },
              ].map(({ label, val, fmt, color }) => (
                <div key={label} style={S.kpi}>
                  <div style={{ ...S.kpiVal, color }}>{fmt(val)}</div>
                  <div style={S.kpiLabel}>{label}</div>
                </div>
              ))}
            </div>

            <div style={S.tableWrap}>
              <table style={S.table}>
                <thead>
                  <tr>
                    {["Employee","Site","Days","Basic","HRA","Bonus(8.33%)","EPF(12%)","ESIC(0.75%)","TDS","Net Pay",""].map((h) => (
                      <th key={h} style={S.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {slipsLoading && <tr><td colSpan={11} style={S.tdCenter}>Loading payslips...</td></tr>}
                  {!slipsLoading && payslips.map((p, idx) => (
                    <tr key={p.id} style={idx % 2 === 1 ? { background: "#F8F9FC" } : {}}>
                      <td style={S.td}>
                        <div style={S.empCell}>
                          <div style={S.av}>{(p.employee_name || "?").slice(0,2).toUpperCase()}</div>
                          <div>
                            <div style={S.empName}>{p.employee_name}</div>
                            <div style={S.empCode}>{p.emp_code} · {p.designation}</div>
                          </div>
                        </div>
                      </td>
                      <td style={S.td}>{p.site_name || "—"}</td>
                      <td style={S.td}>
                        <span style={S.daysBadge}>{p.present_days}/{p.working_days}</span>
                      </td>
                      <td style={S.td}>{inr(p.basic)}</td>
                      <td style={S.td}>{inr(p.hra)}</td>
                      <td style={{ ...S.td, color: "#C98A12" }}>{inr(p.bonus)}</td>
                      <td style={{ ...S.td, color: "#D2453F" }}>{inr(p.pf_employee)}</td>
                      <td style={{ ...S.td, color: "#D2453F" }}>{inr(p.esi_employee)}</td>
                      <td style={{ ...S.td, color: "#D2453F" }}>{inr(p.tds)}</td>
                      <td style={{ ...S.td, fontWeight: 700, color: "#15966A" }}>
                        {inr(p.net_pay)}
                      </td>
                      <td style={S.td}>
                        <span style={S.pdfLink} onClick={() => handleSlipPDF(p)}>PDF</span>
                      </td>
                    </tr>
                  ))}
                  {!slipsLoading && payslips.length === 0 && (
                    <tr><td colSpan={11} style={S.tdCenter}>No payslips found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const S = {
  page:       { display: "flex", gap: 16, height: "calc(100vh - 110px)", minHeight: 0 },
  toast:      { position: "fixed", top: 20, right: 24, zIndex: 200, color: "#fff", fontWeight: 600, fontSize: 13.5, padding: "12px 20px", borderRadius: 10, boxShadow: "0 4px 20px rgba(0,0,0,.18)" },
  left:       { width: 256, flexShrink: 0, display: "flex", flexDirection: "column" },
  leftHead:   { background: "#fff", border: "1px solid #E2E7F0", borderRadius: "14px 14px 0 0", padding: "14px 14px 10px" },
  h2:         { fontFamily: "Archivo", fontSize: 15, fontWeight: 700, color: "#0F1E3D", marginBottom: 10 },
  runControls:{ display: "flex", gap: 6, flexWrap: "wrap" },
  sel:        { flex: 1, minWidth: 76, padding: "7px 6px", border: "1px solid #E2E7F0", borderRadius: 8, fontSize: 12, fontFamily: "inherit", background: "#fff" },
  runBtn:     { padding: "7px 12px", border: 0, borderRadius: 8, background: "#E8821E", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer" },
  runsList:   { background: "#fff", border: "1px solid #E2E7F0", borderTop: 0, borderRadius: "0 0 14px 14px", overflowY: "auto", flex: 1, padding: "6px 8px 8px" },
  runCard:    { padding: "10px 12px", borderRadius: 10, cursor: "pointer", marginBottom: 4, border: "1px solid transparent" },
  runCardOn:  { background: "#EEF3FB", border: "1px solid #C5D4EE" },
  runMonth:   { fontWeight: 700, fontSize: 13, color: "#0F1E3D" },
  runMeta:    { fontSize: 11, color: "#6B7793", margin: "2px 0" },
  runNet:     { fontSize: 12.5, fontWeight: 700, color: "#15966A", marginTop: 4 },
  dim:        { fontSize: 12.5, color: "#6B7793", padding: "16px 8px", textAlign: "center" },
  pill:       { display: "inline-flex", padding: "3px 9px", borderRadius: 30, fontSize: 11, fontWeight: 600 },
  right:      { flex: 1, display: "flex", flexDirection: "column", gap: 14, minWidth: 0, overflow: "hidden" },
  emptyState: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 },
  emptyIcon:  { fontSize: 56, color: "#D0D7E5" },
  emptyTitle: { fontFamily: "Archivo", fontSize: 18, fontWeight: 700, color: "#0F1E3D" },
  emptyText:  { fontSize: 13, color: "#6B7793" },
  runHead:    { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" },
  h1:         { fontFamily: "Archivo", fontSize: 20, fontWeight: 700, color: "#0F1E3D", marginBottom: 6 },
  runActions: { display: "flex", gap: 8, flexWrap: "wrap" },
  btnApprove: { padding: "8px 16px", border: 0, borderRadius: 9, background: "#1565C0", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" },
  btnPaid:    { padding: "8px 16px", border: 0, borderRadius: 9, background: "#15966A", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" },
  btnBank:    { padding: "8px 14px", border: "1px solid #E2E7F0", borderRadius: 9, background: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" },
  kpiRow:     { display: "flex", gap: 12, flexWrap: "wrap" },
  kpi:        { flex: 1, minWidth: 110, background: "#fff", border: "1px solid #E2E7F0", borderRadius: 12, padding: "14px 18px" },
  kpiVal:     { fontSize: 20, fontWeight: 700, fontFamily: "Archivo" },
  kpiLabel:   { fontSize: 11, color: "#6B7793", marginTop: 4 },
  tableWrap:  { background: "#fff", border: "1px solid #E2E7F0", borderRadius: 14, overflow: "auto", flex: 1 },
  table:      { width: "100%", borderCollapse: "collapse", minWidth: 700 },
  th:         { fontSize: 11, textTransform: "uppercase", color: "#6B7793", textAlign: "left", padding: "11px 14px", borderBottom: "1px solid #E2E7F0", fontWeight: 700, background: "#F4F6FA", whiteSpace: "nowrap" },
  td:         { padding: "11px 14px", fontSize: 13, borderBottom: "1px solid #E2E7F0", color: "#1B2540" },
  tdCenter:   { textAlign: "center", padding: 40, color: "#6B7793" },
  empCell:    { display: "flex", alignItems: "center", gap: 10 },
  av:         { width: 30, height: 30, borderRadius: 8, background: "#1E3563", color: "#fff", display: "grid", placeItems: "center", fontSize: 10, fontWeight: 700, flexShrink: 0 },
  empName:    { fontWeight: 600, color: "#0F1E3D", fontSize: 13 },
  empCode:    { fontSize: 11, color: "#6B7793" },
  daysBadge:  { background: "#F4F6FA", border: "1px solid #E2E7F0", borderRadius: 6, padding: "2px 8px", fontSize: 12, fontWeight: 600, color: "#1E3563" },
  pdfLink:    { color: "#E8821E", fontWeight: 600, fontSize: 12, cursor: "pointer" },
  btnSalary:  { padding: "8px 14px", border: "1px solid #D4AF37", borderRadius: 9, background: "#FFFBE6", fontWeight: 600, fontSize: 13, cursor: "pointer", color: "#7B5800" },
  structBox:  { background: "#fff", border: "1px solid #E2E7F0", borderRadius: 14, padding: "12px 14px", marginBottom: 10, display: "flex", flexDirection: "column", gap: 6 },
  structTitle:{ fontSize: 12, fontWeight: 700, color: "#0F1E3D", marginBottom: 2 },
  structBtn:  { padding: "7px 10px", border: "1px solid #E2E7F0", borderRadius: 8, background: "#F4F6FA", fontSize: 12, fontWeight: 600, cursor: "pointer", color: "#1E3563", textAlign: "center" },
  structUploadBtn: { padding: "7px 10px", border: "1px solid #15966A", borderRadius: 8, background: "#E1F4EC", fontSize: 12, fontWeight: 600, cursor: "pointer", color: "#15966A", textAlign: "center" },
  structNote: { fontSize: 10.5, color: "#7B1FA2", lineHeight: 1.5, background: "#F3E5F5", borderRadius: 6, padding: "5px 8px" },
};
