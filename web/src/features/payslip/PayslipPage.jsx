import { useState } from "react";
import { useSelector } from "react-redux";
import { useGetPayrollRunsQuery, useGetPayslipsQuery } from "../payroll/payrollApi";

const MONTHS = ["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const inr    = (v) => "₹" + Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 0 });

const SC = {
  draft:    { bg: "#FBF1DC", color: "#C98A12" },
  approved: { bg: "#E3EEF9", color: "#1565C0" },
  paid:     { bg: "#E1F4EC", color: "#15966A" },
};

function PayslipDetail({ slip, onClose }) {
  const accessToken = useSelector((s) => s.auth.accessToken);
  const gross = Number(slip.basic) + Number(slip.hra) + Number(slip.da) + Number(slip.other_allowances);
  const totalDed = Number(slip.pf_employee) + Number(slip.esi_employee) + Number(slip.other_deductions);
  // Use month_label from serializer (e.g. "June 2026") — avoids stale runLabel
  const label = slip.month_label || `${MONTHS[slip.run_month] || ""} ${slip.run_year || ""}`;

  const handlePdf = async () => {
    const res = await fetch(`/api/payslips/${slip.id}/pdf/`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",  // Force fresh fetch — bypass browser cache
    });
    if (!res.ok) return alert("PDF generation failed");
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `payslip_${slip.emp_code}_${label.replace(" ", "_")}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={D.wrap}>
      {/* Header */}
      <div style={D.head}>
        <div>
          <div style={D.company}>Shiv Lal Manpower Services</div>
          <div style={D.title}>PAY SLIP – {label.toUpperCase()}</div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button style={D.pdfBtn} onClick={handlePdf}>📄 Download PDF</button>
          <button style={D.closeBtn} onClick={onClose}>✕ Close</button>
        </div>
      </div>

      {/* Employee info */}
      <div style={D.empRow}>
        {[
          ["Employee Code", slip.emp_code],
          ["Name",          slip.employee_name],
          ["Designation",   slip.designation],
          ["Site",          slip.site_name],
          ["Days Worked",   `${slip.present_days} / ${slip.working_days}`],
          ["Bank Account",  slip.bank_account || "—"],
          ["IFSC",          slip.ifsc || "—"],
        ].map(([k, v]) => (
          <div key={k} style={D.empCell}>
            <div style={D.empKey}>{k}</div>
            <div style={D.empVal}>{v}</div>
          </div>
        ))}
      </div>

      {/* Earnings + Deductions */}
      <div style={D.grid2}>
        {/* Earnings */}
        <div style={D.section}>
          <div style={D.secTitle}>EARNINGS</div>
          <div style={D.table}>
            {[
              ["Basic Salary",          slip.basic],
              ["House Rent Allowance",  slip.hra],
              ["Dearness Allowance",    slip.da],
              ["Other Allowances",      slip.other_allowances],
            ].filter(([, v]) => Number(v) > 0).map(([k, v]) => (
              <div key={k} style={D.row}>
                <span style={D.rowK}>{k}</span>
                <span style={{ ...D.rowV, color: "#15966A" }}>{inr(v)}</span>
              </div>
            ))}
            <div style={{ ...D.row, ...D.totalRow }}>
              <span style={D.totalK}>Gross Earnings</span>
              <span style={{ ...D.totalV, color: "#15966A" }}>{inr(gross)}</span>
            </div>
          </div>
        </div>

        {/* Deductions */}
        <div style={D.section}>
          <div style={D.secTitle}>DEDUCTIONS</div>
          <div style={D.table}>
            {[
              ["PF (Employee 12%)",    slip.pf_employee],
              ["ESI (Employee 0.75%)", slip.esi_employee],
              ["Other Deductions",     slip.other_deductions],
            ].filter(([, v]) => Number(v) > 0).map(([k, v]) => (
              <div key={k} style={D.row}>
                <span style={D.rowK}>{k}</span>
                <span style={{ ...D.rowV, color: "#D2453F" }}>- {inr(v)}</span>
              </div>
            ))}
            <div style={{ ...D.row, ...D.totalRow }}>
              <span style={D.totalK}>Total Deductions</span>
              <span style={{ ...D.totalV, color: "#D2453F" }}>- {inr(totalDed)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Net pay */}
      <div style={D.netBar}>
        <span style={D.netLabel}>NET PAY</span>
        <span style={D.netAmt}>{inr(slip.net_pay)}</span>
      </div>
    </div>
  );
}

export default function PayslipPage() {
  const [selectedRunId, setSelectedRunId] = useState("");
  const [search, setSearch]               = useState("");
  const [selected, setSelected]           = useState(null);

  const { data: runsRaw } = useGetPayrollRunsQuery();
  const runs = runsRaw?.results || runsRaw || [];

  const { data: slipsRaw, isLoading } = useGetPayslipsQuery(
    { payroll_run: selectedRunId || undefined },
    { skip: false }
  );
  const allSlips = slipsRaw?.results || slipsRaw || [];

  const slips = search.trim()
    ? allSlips.filter((s) =>
        s.employee_name?.toLowerCase().includes(search.toLowerCase()) ||
        s.emp_code?.toLowerCase().includes(search.toLowerCase())
      )
    : allSlips;

  const selectedRun = runs.find((r) => String(r.id) === String(selectedRunId));
  const runLabel    = selectedRun
    ? `${MONTHS[selectedRun.month]} ${selectedRun.year}`
    : "All";

  const statusCfg = selectedRun ? SC[selectedRun.run_status] || SC.draft : null;

  const totals = slips.reduce(
    (acc, s) => ({
      gross:  acc.gross  + Number(s.gross_pay || 0),
      net:    acc.net    + Number(s.net_pay   || 0),
      pf:     acc.pf     + Number(s.pf_employee || 0),
      esi:    acc.esi    + Number(s.esi_employee || 0),
    }),
    { gross: 0, net: 0, pf: 0, esi: 0 }
  );

  if (selected) {
    return (
      <PayslipDetail
        slip={selected}
        onClose={() => setSelected(null)}
      />
    );
  }

  return (
    <div>
      {/* Page header */}
      <div style={S.pageHead}>
        <div>
          <h1 style={S.h1}>Payslips</h1>
          <p style={S.sub}>Browse and download employee payslips</p>
        </div>
      </div>

      {/* Controls */}
      <div style={S.controls}>
        <select style={S.select} value={selectedRunId} onChange={(e) => { setSelectedRunId(e.target.value); setSelected(null); }}>
          <option value="">All payroll runs</option>
          {runs.map((r) => (
            <option key={r.id} value={r.id}>
              {MONTHS[r.month]} {r.year} — {r.run_status}
            </option>
          ))}
        </select>
        <input
          style={S.search}
          placeholder="Search employee name or code…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {selectedRun && (
          <span style={{ ...S.pill, background: statusCfg.bg, color: statusCfg.color }}>
            {selectedRun.run_status.toUpperCase()}
          </span>
        )}
      </div>

      {/* Summary strip */}
      {slips.length > 0 && (
        <div style={S.strip}>
          {[
            ["Employees",     slips.length,         "#0F1E3D"],
            ["Gross Payable", inr(totals.gross),     "#1E6CB5"],
            ["PF Deductions", inr(totals.pf),        "#D2453F"],
            ["ESI Deductions",inr(totals.esi),       "#D2453F"],
            ["Net Payable",   inr(totals.net),       "#15966A"],
          ].map(([label, val, color]) => (
            <div key={label} style={S.stripItem}>
              <div style={S.stripLabel}>{label}</div>
              <div style={{ ...S.stripVal, color }}>{val}</div>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div style={S.card}>
        {isLoading ? (
          <div style={S.empty}>Loading payslips…</div>
        ) : slips.length === 0 ? (
          <div style={S.empty}>
            {selectedRunId ? "No payslips found for this run." : "Select a payroll run above to view payslips."}
          </div>
        ) : (
          <table style={S.table}>
            <thead>
              <tr>
                {["Code", "Name", "Month", "Designation", "Site", "Days", "Gross", "PF", "ESI", "Net Pay", "Status", ""].map((h) => (
                  <th key={h} style={S.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slips.map((slip, i) => {
                const sc    = SC[slip.run_status] || SC.draft;
                const gross = Number(slip.gross_pay || 0);
                const label = slip.month_label || `${MONTHS[slip.run_month] || "?"} ${slip.run_year || ""}`;
                return (
                  <tr key={slip.id} style={{ ...S.tr, background: i % 2 === 0 ? "#fff" : "#FAFBFD" }}>
                    <td style={S.td}><span style={S.code}>{slip.emp_code}</span></td>
                    <td style={S.td}><b style={{ color: "#0F1E3D" }}>{slip.employee_name}</b></td>
                    <td style={S.td}>{label}</td>
                    <td style={S.td}>{slip.designation}</td>
                    <td style={S.td}>{slip.site_name || "—"}</td>
                    <td style={{ ...S.td, textAlign: "center" }}>{slip.present_days}/{slip.working_days}</td>
                    <td style={{ ...S.td, fontWeight: 600 }}>{inr(gross)}</td>
                    <td style={{ ...S.td, color: "#D2453F" }}>{inr(slip.pf_employee)}</td>
                    <td style={{ ...S.td, color: "#D2453F" }}>{inr(slip.esi_employee)}</td>
                    <td style={{ ...S.td, fontWeight: 700, color: "#0F1E3D" }}>{inr(slip.net_pay)}</td>
                    <td style={S.td}>
                      <span style={{ ...S.pill, background: sc.bg, color: sc.color }}>
                        {slip.run_status || "draft"}
                      </span>
                    </td>
                    <td style={S.td}>
                      <button style={S.viewBtn} onClick={() => setSelected(slip)}>View →</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

const S = {
  pageHead:   { display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 16 },
  h1:         { fontFamily: "Archivo", fontSize: 22, fontWeight: 700, color: "#0F1E3D" },
  sub:        { fontSize: 13, color: "#6B7793", marginTop: 3 },
  controls:   { display: "flex", gap: 12, marginBottom: 16, alignItems: "center" },
  select:     { padding: "10px 14px", border: "1px solid #E2E7F0", borderRadius: 10, fontSize: 14, color: "#0F1E3D", background: "#fff", minWidth: 220 },
  search:     { flex: 1, padding: "10px 14px", border: "1px solid #E2E7F0", borderRadius: 10, fontSize: 14, color: "#0F1E3D" },
  pill:       { display: "inline-flex", padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, whiteSpace: "nowrap" },
  strip:      { display: "flex", gap: 12, marginBottom: 14, flexWrap: "wrap" },
  stripItem:  { background: "#fff", border: "1px solid #E2E7F0", borderRadius: 12, padding: "14px 18px", flex: "1 1 140px", minWidth: 120 },
  stripLabel: { fontSize: 11, color: "#6B7793", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 6 },
  stripVal:   { fontFamily: "Archivo", fontSize: 20, fontWeight: 800 },
  card:       { background: "#fff", border: "1px solid #E2E7F0", borderRadius: 14, overflow: "hidden" },
  table:      { width: "100%", borderCollapse: "collapse" },
  th:         { padding: "11px 14px", fontSize: 11, fontWeight: 700, color: "#6B7793", textTransform: "uppercase", letterSpacing: ".4px", textAlign: "left", background: "#F8F9FC", borderBottom: "1px solid #E2E7F0" },
  tr:         {},
  td:         { padding: "12px 14px", fontSize: 13, color: "#1B2540", borderBottom: "1px solid #F0F2F8" },
  code:       { background: "#EEF1F8", color: "#0F1E3D", fontWeight: 700, fontSize: 11, padding: "3px 8px", borderRadius: 6 },
  viewBtn:    { background: "none", border: "1px solid #E2E7F0", borderRadius: 8, padding: "5px 12px", fontSize: 12, color: "#0F1E3D", cursor: "pointer", fontWeight: 600 },
  empty:      { padding: 48, textAlign: "center", color: "#9AA6BF", fontSize: 14 },
};

const D = {
  wrap:       { maxWidth: 860, margin: "0 auto" },
  head:       { display: "flex", justifyContent: "space-between", alignItems: "flex-start", background: "#0F1E3D", borderRadius: 14, padding: "20px 24px", marginBottom: 16 },
  company:    { fontSize: 12, color: "rgba(255,255,255,.5)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".5px" },
  title:      { fontSize: 20, fontWeight: 800, color: "#fff", marginTop: 4, fontFamily: "Archivo" },
  pdfBtn:     { padding: "9px 18px", background: "#E8821E", color: "#fff", border: 0, borderRadius: 9, fontWeight: 700, fontSize: 13, cursor: "pointer" },
  closeBtn:   { padding: "9px 14px", background: "rgba(255,255,255,.15)", color: "#fff", border: 0, borderRadius: 9, fontWeight: 600, fontSize: 13, cursor: "pointer" },
  empRow:     { display: "flex", flexWrap: "wrap", gap: 0, background: "#fff", border: "1px solid #E2E7F0", borderRadius: 12, overflow: "hidden", marginBottom: 14 },
  empCell:    { flex: "1 1 200px", padding: "12px 16px", borderRight: "1px solid #F0F2F8", borderBottom: "1px solid #F0F2F8" },
  empKey:     { fontSize: 11, color: "#6B7793", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 4 },
  empVal:     { fontSize: 13, fontWeight: 700, color: "#0F1E3D" },
  grid2:      { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 },
  section:    {},
  secTitle:   { fontSize: 11, fontWeight: 700, color: "#6B7793", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 8 },
  table:      { background: "#fff", border: "1px solid #E2E7F0", borderRadius: 12, overflow: "hidden" },
  row:        { display: "flex", justifyContent: "space-between", padding: "10px 14px", borderBottom: "1px solid #F0F2F8" },
  rowK:       { fontSize: 13, color: "#6B7793" },
  rowV:       { fontSize: 13, fontWeight: 600 },
  totalRow:   { background: "#F8F9FC" },
  totalK:     { fontSize: 13, fontWeight: 700, color: "#0F1E3D" },
  totalV:     { fontSize: 13, fontWeight: 800 },
  netBar:     { display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0F1E3D", borderRadius: 12, padding: "18px 24px" },
  netLabel:   { fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,.6)" },
  netAmt:     { fontFamily: "Archivo", fontSize: 28, fontWeight: 800, color: "#E8821E" },
};
