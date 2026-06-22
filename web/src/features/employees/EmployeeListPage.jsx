import { useState } from "react";
import { useGetEmployeesQuery } from "./employeesApi";

const STATUS_COLORS = {
  active: { bg: "#E1F4EC", color: "#15966A" },
  on_leave: { bg: "#FBF1DC", color: "#C98A12" },
  inactive: { bg: "#FBE6E5", color: "#D2453F" },
};

export default function EmployeeListPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const { data, isLoading } = useGetEmployeesQuery({ search, status: status || undefined });

  const employees = data?.results || [];

  return (
    <div>
      <div style={S.pageHead}>
        <div>
          <h1 style={S.h1}>Employee Database</h1>
          <p style={S.sub}>Central record of all deployed manpower</p>
        </div>
        <div style={S.actions}>
          <button style={S.btn}>📥 Import Excel</button>
          <button style={S.btnSolid}>+ Add Employee</button>
        </div>
      </div>

      <div style={S.toolbar}>
        <input
          style={S.searchInput}
          placeholder="Search by name / ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select style={S.select} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="on_leave">On Leave</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div style={S.card}>
        <table style={S.table}>
          <thead>
            <tr>
              {["Employee", "Designation", "Site", "Phone", "Joined", "Status", ""].map((h) => (
                <th key={h} style={S.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={7} style={{ textAlign: "center", padding: 32, color: "#6B7793" }}>Loading…</td></tr>
            )}
            {employees.map((emp) => {
              const sc = STATUS_COLORS[emp.status] || STATUS_COLORS.inactive;
              return (
                <tr key={emp.id} style={S.tr}>
                  <td style={S.td}>
                    <div style={S.empCell}>
                      <div style={S.av}>{emp.full_name.slice(0, 2).toUpperCase()}</div>
                      <div>
                        <div style={S.empName}>{emp.full_name}</div>
                        <div style={S.empCode}>{emp.emp_code}</div>
                      </div>
                    </div>
                  </td>
                  <td style={S.td}>{emp.designation}</td>
                  <td style={S.td}>{emp.site_name || "—"}</td>
                  <td style={S.td}>{emp.phone}</td>
                  <td style={S.td}>{emp.date_joined}</td>
                  <td style={S.td}>
                    <span style={{ ...S.pill, background: sc.bg, color: sc.color }}>
                      {emp.status.replace("_", " ")}
                    </span>
                  </td>
                  <td style={S.td}><span style={S.link}>View</span></td>
                </tr>
              );
            })}
            {!isLoading && employees.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: "center", padding: 32, color: "#6B7793" }}>No employees found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {data?.count > 0 && (
        <div style={S.note}>Showing {employees.length} of {data.count} records</div>
      )}
    </div>
  );
}

const S = {
  pageHead: { display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 12 },
  h1: { fontFamily: "Archivo", fontSize: 22, fontWeight: 700, color: "#0F1E3D" },
  sub: { fontSize: 13, color: "#6B7793", marginTop: 3 },
  actions: { display: "flex", gap: 9 },
  btn: { padding: "9px 14px", borderRadius: 9, border: "1px solid #E2E7F0", background: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" },
  btnSolid: { padding: "9px 14px", borderRadius: 9, border: 0, background: "#E8821E", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" },
  toolbar: { display: "flex", gap: 9, marginBottom: 14, flexWrap: "wrap" },
  searchInput: { padding: "9px 12px", border: "1px solid #E2E7F0", borderRadius: 9, fontSize: 13, minWidth: 220, fontFamily: "inherit" },
  select: { padding: "9px 11px", border: "1px solid #E2E7F0", borderRadius: 9, fontSize: 13, fontFamily: "inherit", background: "#fff" },
  card: { background: "#fff", border: "1px solid #E2E7F0", borderRadius: 14, overflow: "auto" },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 680 },
  th: { fontSize: 11, textTransform: "uppercase", letterSpacing: ".05em", color: "#6B7793", textAlign: "left", padding: "11px 14px", borderBottom: "1px solid #E2E7F0", fontWeight: 700, background: "#F4F6FA" },
  tr: {},
  td: { padding: "12px 14px", fontSize: 13, borderBottom: "1px solid #E2E7F0", color: "#1B2540" },
  empCell: { display: "flex", alignItems: "center", gap: 10 },
  av: { width: 32, height: 32, borderRadius: 8, background: "#1E3563", color: "#fff", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 },
  empName: { fontWeight: 600, color: "#0F1E3D" },
  empCode: { fontSize: 11, color: "#6B7793" },
  pill: { display: "inline-flex", alignItems: "center", padding: "4px 10px", borderRadius: 30, fontSize: 11.5, fontWeight: 600 },
  link: { color: "#E8821E", fontWeight: 600, cursor: "pointer", fontSize: 12.5 },
  note: { fontSize: 12, color: "#8a5310", background: "#FCEFDD", border: "1px solid #f2d9b8", borderRadius: 10, padding: "11px 14px", marginTop: 14 },
};
