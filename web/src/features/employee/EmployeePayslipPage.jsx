import { useState } from "react";
import { useSelector } from "react-redux";
import { useGetMyPayslipsQuery } from "../payroll/payrollApi";

const MONTHS = ["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const inr    = (v) => "₹" + Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 0 });

const SC = {
  draft:    { bg: "#FBF1DC", color: "#C98A12" },
  approved: { bg: "#E3EEF9", color: "#1565C0" },
  paid:     { bg: "#E1F4EC", color: "#15966A" },
};

function SlipDetail({ slip, onClose }) {
  const accessToken = useSelector((s) => s.auth.accessToken);
  const bonus      = Number(slip.bonus || 0);
  const tds        = Number(slip.tds   || 0);
  const gross      = Number(slip.basic) + Number(slip.hra) + Number(slip.da) + Number(slip.other_allowances);
  const totalDed   = Number(slip.pf_employee) + Number(slip.esi_employee) + tds + Number(slip.other_deductions);
  const pfEmployer  = Number(slip.basic) * 0.12;
  const esiEmployer = gross <= 21000 ? gross * 0.0325 : 0;
  const label = slip.month_label || `${MONTHS[slip.run_month] || ""} ${slip.run_year || ""}`;

  const handlePdf = async () => {
    const res = await fetch(`/api/payslips/${slip.id}/pdf/`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
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
      <div style={D.head}>
        <div>
          <div style={D.company}>Shiv Lal Manpower Services</div>
          <div style={D.title}>PAY SLIP – {label.toUpperCase()}</div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button style={D.pdfBtn} onClick={handlePdf}>📄 Download PDF</button>
          <button style={D.closeBtn} onClick={onClose}>← Back</button>
        </div>
      </div>

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

      <div style={D.grid2}>
        <div style={D.section}>
          <div style={D.secTitle}>EARNINGS</div>
          <div style={D.table}>
            {[
              ["Basic Salary",         slip.basic],
              ["House Rent Allowance",  slip.hra],
              ["Dearness Allowance",    slip.da],
              ["Other Allowances",      slip.other_allowances],
              ["Bonus (8.33%)",         bonus],
            ].filter(([, v]) => Number(v) > 0).map(([k, v]) => (
              <div key={k} style={D.row}>
                <span style={D.rowK}>{k}</span>
                <span style={{ ...D.rowV, color: "#15966A" }}>{inr(v)}</span>
              </div>
            ))}
            <div style={{ ...D.row, ...D.totalRow }}>
              <span style={D.totalK}>Gross Earnings</span>
              <span style={{ ...D.totalV, color: "#15966A" }}>{inr(gross + bonus)}</span>
            </div>
          </div>
        </div>

        <div style={D.section}>
          <div style={D.secTitle}>DEDUCTIONS</div>
          <div style={D.table}>
            {[
              ["EPF (Employee 12%)",    slip.pf_employee],
              ["ESIC (Employee 0.75%)", slip.esi_employee],
              ["TDS",                   tds],
              ["Other Deductions",      slip.other_deductions],
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

      {/* Employer Contributions */}
      <div style={{ marginBottom: 14 }}>
        <div style={D.secTitle}>EMPLOYER CONTRIBUTIONS</div>
        <div style={D.empContribBox}>
          <div style={D.table}>
            {[
              ["EPF (Employer 12%)",    pfEmployer],
              ["ESIC (Employer 3.25%)", esiEmployer],
              ["Bonus / Other (8.33%)", bonus],
            ].filter(([, v]) => v > 0).map(([k, v]) => (
              <div key={k} style={D.row}>
                <span style={D.rowK}>{k}</span>
                <span style={{ ...D.rowV, color: "#1565C0" }}>{inr(v)}</span>
              </div>
            ))}
            <div style={{ ...D.row, ...D.totalRow }}>
              <span style={D.totalK}>Total Employer Cost</span>
              <span style={{ ...D.totalV, color: "#1565C0" }}>{inr(pfEmployer + esiEmployer + bonus)}</span>
            </div>
          </div>
          <div style={D.empContribNote}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#0F1E3D", marginBottom: 8 }}>About Your Contributions</div>
            <div style={{ fontSize: 12, color: "#6B7793", lineHeight: "1.8" }}>
              <b>EPF:</b> Both you and your employer contribute 12% of your basic salary to your EPF account.<br/>
              <b>ESIC:</b> You contribute 0.75% · Employer contributes 3.25% of gross salary.<br/>
              <b>Bonus:</b> 8.33% of basic salary is paid as statutory bonus.<br/>
              <span style={{ color: "#9AA6BF", fontSize: 11 }}>
                Note: Employer contributions are paid by the company — they are NOT deducted from your salary.
              </span>
            </div>
          </div>
        </div>
      </div>

      <div style={D.netBar}>
        <span style={D.netLabel}>NET PAY</span>
        <span style={D.netAmt}>{inr(slip.net_pay)}</span>
      </div>
    </div>
  );
}

export default function EmployeePayslipPage() {
  const [selected, setSelected] = useState(null);
  const { data: slipsRaw, isLoading } = useGetMyPayslipsQuery();
  const slips = Array.isArray(slipsRaw) ? slipsRaw : (slipsRaw?.results || []);

  if (selected) {
    return <SlipDetail slip={selected} onClose={() => setSelected(null)} />;
  }

  return (
    <div>
      <div style={S.pageHead}>
        <div>
          <h1 style={S.h1}>My Payslips</h1>
          <p style={S.sub}>View and download your monthly salary statements</p>
        </div>
      </div>

      <div style={S.card}>
        {isLoading ? (
          <div style={S.empty}>Loading your payslips…</div>
        ) : slips.length === 0 ? (
          <div style={S.empty}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>📄</div>
            <div style={{ fontWeight: 700, fontSize: 16, color: "#0F1E3D", marginBottom: 6 }}>No payslips yet</div>
            <div style={{ fontSize: 13, color: "#9AA6BF" }}>Payslips will appear here once HR runs payroll for your account.</div>
          </div>
        ) : (
          <table style={S.table}>
            <thead>
              <tr>
                {["Month", "Days", "Gross", "EPF (12%)", "ESIC (0.75%)", "Net Pay", "Status", ""].map((h) => (
                  <th key={h} style={S.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slips.map((slip, i) => {
                const sc    = SC[slip.run_status] || SC.draft;
                const gross = Number(slip.basic || 0) + Number(slip.hra || 0) + Number(slip.da || 0) + Number(slip.other_allowances || 0);
                const label = slip.month_label || `${MONTHS[slip.run_month] || "?"} ${slip.run_year || ""}`;
                return (
                  <tr key={slip.id} style={{ background: i % 2 === 0 ? "#fff" : "#FAFBFD" }}>
                    <td style={{ ...S.td, fontWeight: 600, color: "#0F1E3D" }}>{label}</td>
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
  pageHead: { marginBottom: 16 },
  h1:       { fontFamily: "Archivo", fontSize: 22, fontWeight: 700, color: "#0F1E3D" },
  sub:      { fontSize: 13, color: "#6B7793", marginTop: 3 },
  card:     { background: "#fff", border: "1px solid #E2E7F0", borderRadius: 14, overflow: "hidden" },
  table:    { width: "100%", borderCollapse: "collapse" },
  th:       { padding: "11px 14px", fontSize: 11, fontWeight: 700, color: "#6B7793", textTransform: "uppercase", letterSpacing: ".4px", textAlign: "left", background: "#F8F9FC", borderBottom: "1px solid #E2E7F0" },
  td:       { padding: "12px 14px", fontSize: 13, color: "#1B2540", borderBottom: "1px solid #F0F2F8" },
  pill:     { display: "inline-flex", padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600 },
  viewBtn:  { background: "none", border: "1px solid #E2E7F0", borderRadius: 8, padding: "5px 12px", fontSize: 12, color: "#0F1E3D", cursor: "pointer", fontWeight: 600 },
  empty:    { padding: 60, textAlign: "center", color: "#9AA6BF", fontSize: 14 },
};

const D = {
  wrap:           { maxWidth: 860, margin: "0 auto" },
  head:           { display: "flex", justifyContent: "space-between", alignItems: "flex-start", background: "#0F1E3D", borderRadius: 14, padding: "20px 24px", marginBottom: 16 },
  company:        { fontSize: 12, color: "rgba(255,255,255,.5)", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".5px" },
  title:          { fontSize: 20, fontWeight: 800, color: "#fff", marginTop: 4, fontFamily: "Archivo" },
  pdfBtn:         { padding: "9px 18px", background: "#E8821E", color: "#fff", border: 0, borderRadius: 9, fontWeight: 700, fontSize: 13, cursor: "pointer" },
  closeBtn:       { padding: "9px 14px", background: "rgba(255,255,255,.15)", color: "#fff", border: 0, borderRadius: 9, fontWeight: 600, fontSize: 13, cursor: "pointer" },
  empRow:         { display: "flex", flexWrap: "wrap", background: "#fff", border: "1px solid #E2E7F0", borderRadius: 12, overflow: "hidden", marginBottom: 14 },
  empCell:        { flex: "1 1 200px", padding: "12px 16px", borderRight: "1px solid #F0F2F8", borderBottom: "1px solid #F0F2F8" },
  empKey:         { fontSize: 11, color: "#6B7793", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 4 },
  empVal:         { fontSize: 13, fontWeight: 700, color: "#0F1E3D" },
  grid2:          { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 },
  section:        {},
  secTitle:       { fontSize: 11, fontWeight: 700, color: "#6B7793", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 8 },
  table:          { background: "#fff", border: "1px solid #E2E7F0", borderRadius: 12, overflow: "hidden" },
  row:            { display: "flex", justifyContent: "space-between", padding: "10px 14px", borderBottom: "1px solid #F0F2F8" },
  rowK:           { fontSize: 13, color: "#6B7793" },
  rowV:           { fontSize: 13, fontWeight: 600 },
  totalRow:       { background: "#F8F9FC" },
  totalK:         { fontSize: 13, fontWeight: 700, color: "#0F1E3D" },
  totalV:         { fontSize: 13, fontWeight: 800 },
  empContribBox:  { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 },
  empContribNote: { background: "#F8F9FC", border: "1px solid #E2E7F0", borderRadius: 12, padding: "16px 18px" },
  netBar:         { display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0F1E3D", borderRadius: 12, padding: "18px 24px" },
  netLabel:       { fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,.6)" },
  netAmt:         { fontFamily: "Archivo", fontSize: 28, fontWeight: 800, color: "#E8821E" },
};
