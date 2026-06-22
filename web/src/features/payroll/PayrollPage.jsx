import { useState } from "react";
import { useGetPayslipsQuery, useRunPayrollMutation } from "./payrollApi";

export default function PayrollPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [runPayroll, { isLoading: running }] = useRunPayrollMutation();
  const { data, isLoading } = useGetPayslipsQuery({});
  const payslips = data?.results || [];

  const handleRun = async () => {
    await runPayroll({ month, year });
  };

  return (
    <div>
      <div style={S.pageHead}>
        <div>
          <h1 style={S.h1}>Payroll Processing</h1>
          <p style={S.sub}>Auto-calculated from attendance – basic, allowances, deductions & net pay</p>
        </div>
        <div style={S.actions}>
          <select style={S.select} value={month} onChange={(e) => setMonth(+e.target.value)}>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString("default", { month: "long" })}</option>
            ))}
          </select>
          <select style={S.select} value={year} onChange={(e) => setYear(+e.target.value)}>
            {[2024, 2025, 2026].map((y) => <option key={y}>{y}</option>)}
          </select>
          <button style={S.btnNavy} onClick={handleRun} disabled={running}>
            {running ? "Running…" : "▶ Run Payroll"}
          </button>
          <button style={S.btnSolid}>📤 Bank Advice</button>
        </div>
      </div>

      <div style={S.card}>
        <div style={S.cardH}>
          <h3 style={S.cardTitle}>Payroll Register</h3>
          <span style={S.draftPill}>⏳ Draft</span>
        </div>
        <table style={S.table}>
          <thead>
            <tr>
              {["Employee", "Present Days", "Basic", "Allowances", "PF + ESI", "Net Pay"].map((h) => (
                <th key={h} style={S.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={6} style={{ textAlign: "center", padding: 32 }}>Loading…</td></tr>}
            {payslips.map((p) => (
              <tr key={p.id}>
                <td style={S.td}>
                  <div style={S.empCell}>
                    <div style={S.av}>{p.employee_name?.slice(0, 2).toUpperCase()}</div>
                    <div>
                      <div style={S.empName}>{p.employee_name}</div>
                      <div style={S.empCode}>{p.emp_code}</div>
                    </div>
                  </div>
                </td>
                <td style={S.td}>{p.present_days} / {p.working_days}</td>
                <td style={S.td}>₹{Number(p.basic).toLocaleString("en-IN")}</td>
                <td style={S.td}>₹{(Number(p.hra) + Number(p.da) + Number(p.other_allowances)).toLocaleString("en-IN")}</td>
                <td style={S.td}>₹{(Number(p.pf_employee) + Number(p.esi_employee)).toLocaleString("en-IN")}</td>
                <td style={S.td}><b>₹{Number(p.net_pay).toLocaleString("en-IN")}</b></td>
              </tr>
            ))}
            {!isLoading && payslips.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: "center", padding: 32, color: "#6B7793" }}>No payslips. Run payroll first.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const S = {
  pageHead: { display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 12 },
  h1: { fontFamily: "Archivo", fontSize: 22, fontWeight: 700, color: "#0F1E3D" },
  sub: { fontSize: 13, color: "#6B7793", marginTop: 3 },
  actions: { display: "flex", gap: 9, flexWrap: "wrap" },
  select: { padding: "9px 11px", border: "1px solid #E2E7F0", borderRadius: 9, fontSize: 13, fontFamily: "inherit", background: "#fff" },
  btnNavy: { padding: "9px 14px", borderRadius: 9, border: 0, background: "#0F1E3D", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" },
  btnSolid: { padding: "9px 14px", borderRadius: 9, border: 0, background: "#E8821E", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" },
  card: { background: "#fff", border: "1px solid #E2E7F0", borderRadius: 14, overflow: "auto" },
  cardH: { padding: "15px 18px", borderBottom: "1px solid #E2E7F0", display: "flex", alignItems: "center", justifyContent: "space-between" },
  cardTitle: { fontSize: 14.5, fontWeight: 700, color: "#0F1E3D" },
  draftPill: { fontSize: 11, background: "#FBF1DC", color: "#C98A12", padding: "4px 10px", borderRadius: 30, fontWeight: 600 },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 680 },
  th: { fontSize: 11, textTransform: "uppercase", color: "#6B7793", textAlign: "left", padding: "11px 14px", borderBottom: "1px solid #E2E7F0", fontWeight: 700, background: "#F4F6FA" },
  td: { padding: "12px 14px", fontSize: 13, borderBottom: "1px solid #E2E7F0" },
  empCell: { display: "flex", alignItems: "center", gap: 10 },
  av: { width: 32, height: 32, borderRadius: 8, background: "#1E3563", color: "#fff", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 700 },
  empName: { fontWeight: 600, color: "#0F1E3D" },
  empCode: { fontSize: 11, color: "#6B7793" },
};
