import { useState, lazy, Suspense } from "react";
import { useSelector } from "react-redux";
import { useGetAttendanceRegisterQuery } from "./attendanceApi";
import { useGetSitesQuery } from "../deployment/deploymentApi";
const AttendanceMapView = lazy(() => import("./AttendanceMapView"));

const TODAY   = new Date();
const MONTHS  = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const CODE_STYLE = {
  P: { color: "#15966A", fontWeight: 700 },
  L: { color: "#C98A12", fontWeight: 700 },
  R: { color: "#7B1FA2", fontWeight: 700 },
  A: { color: "#D2453F", fontWeight: 700 },
  S: { color: "#9AA6BF", fontWeight: 600 },
};

export default function AttendanceRegisterPage() {
  const [month, setMonth]   = useState(TODAY.getMonth() + 1);
  const [year, setYear]     = useState(TODAY.getFullYear());
  const [site, setSite]     = useState("");
  const [search, setSearch] = useState("");
  const [exporting, setExporting] = useState(false);
  const [viewMode, setViewMode]   = useState("register"); // "register" | "map"

  const accessToken = useSelector((s) => s.auth.accessToken);
  const { data: sitesData } = useGetSitesQuery({});
  const sites = sitesData?.results || [];

  const { data, isLoading, isFetching } = useGetAttendanceRegisterQuery(
    { month, year, site: site || undefined, search: search || undefined },
    { skip: false }
  );

  const employees    = data?.employees    || [];
  const daysInMonth  = data?.days_in_month || 30;
  const sundaysSet   = new Set(data?.sundays || []);

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams({ month, year });
      if (site) params.set("site", site);
      const res = await fetch(`/api/attendance/register/export/?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `attendance_${year}_${String(month).padStart(2,"0")}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const loading = isLoading || isFetching;

  return (
    <div>
      {/* Header */}
      <div style={S.pageHead}>
        <div>
          <h1 style={S.h1}>Attendance Register</h1>
          <p style={S.sub}>Monthly attendance matrix — employee × day</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={S.viewToggle}>
            <button
              style={{ ...S.toggleBtn, ...(viewMode === "register" ? S.toggleActive : {}) }}
              onClick={() => setViewMode("register")}>
              📋 Register
            </button>
            <button
              style={{ ...S.toggleBtn, ...(viewMode === "map" ? S.toggleActive : {}) }}
              onClick={() => setViewMode("map")}>
              🗺️ Map View
            </button>
          </div>
          {viewMode === "register" && (
            <button style={S.exportBtn} onClick={handleExport} disabled={exporting || loading}>
              {exporting ? "Exporting…" : "📥 Export Excel"}
            </button>
          )}
        </div>
      </div>

      {/* Map View */}
      {viewMode === "map" && (
        <Suspense fallback={<div style={{ padding: 40, textAlign: "center", color: "#9AA6BF" }}>Loading map...</div>}>
          <AttendanceMapView />
        </Suspense>
      )}

      {/* Filters — register only */}
      {viewMode === "register" && <></> /* fallthrough to register below */}
      {viewMode !== "map" && (
      <>
      {/* Filters */}
      <div style={S.filters}>
        <select style={S.sel} value={month} onChange={(e) => setMonth(Number(e.target.value))}>
          {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
        </select>
        <select style={S.sel} value={year} onChange={(e) => setYear(Number(e.target.value))}>
          {[2024, 2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <select style={S.sel} value={site} onChange={(e) => setSite(e.target.value)}>
          <option value="">All Sites</option>
          {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <input
          style={S.search}
          placeholder="Search employee…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {loading && <span style={S.loadingBadge}>Loading…</span>}
      </div>

      {/* Summary pills */}
      {data && (
        <div style={S.summaryRow}>
          {[
            { label: "Employees",    val: employees.length,                            color: "#1E3563" },
            { label: "Working Days", val: daysInMonth - sundaysSet.size,               color: "#6B7793" },
            { label: "Avg Present",  val: employees.length ? Math.round(employees.reduce((s,e)=>s+e.present,0)/employees.length) : 0, color: "#15966A" },
            { label: "Avg Absent",   val: employees.length ? Math.round(employees.reduce((s,e)=>s+e.absent,0)/employees.length)  : 0, color: "#D2453F" },
          ].map(({ label, val, color }) => (
            <div key={label} style={S.pill}>
              <div style={{ ...S.pillVal, color }}>{val}</div>
              <div style={S.pillLabel}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Legend */}
      <div style={S.legend}>
        {[["P","Present"],["L","Late"],["R","Under Review"],["A","Absent"],["S","Sunday"]].map(([c,l]) => (
          <span key={c} style={{ ...S.legendItem, ...CODE_STYLE[c] }}>
            {c} = {l}
          </span>
        ))}
      </div>

      {/* Matrix table */}
      <div style={S.tableWrap}>
        {loading ? (
          <div style={S.centerMsg}>Loading attendance data…</div>
        ) : employees.length === 0 ? (
          <div style={S.centerMsg}>No data found for selected filters.</div>
        ) : (
          <table style={S.table}>
            <thead>
              <tr>
                <th style={{ ...S.thFixed, width: 32 }}>#</th>
                <th style={{ ...S.thFixed, minWidth: 90 }}>Code</th>
                <th style={{ ...S.thFixed, minWidth: 160 }}>Name</th>
                <th style={{ ...S.thFixed, minWidth: 120 }}>Designation</th>
                {days.map((d) => (
                  <th key={d} style={{
                    ...S.thDay,
                    ...(sundaysSet.has(d) ? S.thSunday : {}),
                  }}>
                    {d}
                  </th>
                ))}
                <th style={S.thTot}>P</th>
                <th style={S.thTot}>L</th>
                <th style={S.thTot}>A</th>
                <th style={{ ...S.thTot, background: "#E3E8F4" }}>W/D</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp, idx) => (
                <tr key={emp.id} style={idx % 2 === 1 ? S.rowAlt : {}}>
                  <td style={{ ...S.tdFixed, color: "#9AA6BF", fontSize: 11 }}>{idx + 1}</td>
                  <td style={{ ...S.tdFixed, fontWeight: 600, color: "#1E3563", fontSize: 11 }}>{emp.emp_code}</td>
                  <td style={{ ...S.tdFixed, fontWeight: 600, fontSize: 12 }}>{emp.full_name}</td>
                  <td style={{ ...S.tdFixed, color: "#6B7793", fontSize: 11 }}>{emp.designation}</td>
                  {days.map((d) => {
                    const code = emp.days[d] || "A";
                    return (
                      <td key={d} style={{
                        ...S.tdDay,
                        ...(sundaysSet.has(d) ? S.tdSunday : {}),
                        ...CODE_STYLE[code],
                      }}>
                        {code}
                      </td>
                    );
                  })}
                  <td style={{ ...S.tdTot, ...CODE_STYLE.P }}>{emp.present}</td>
                  <td style={{ ...S.tdTot, ...CODE_STYLE.L }}>{emp.late}</td>
                  <td style={{ ...S.tdTot, ...CODE_STYLE.A }}>{emp.absent}</td>
                  <td style={{ ...S.tdTot, color: "#1E3563", fontWeight: 700 }}>{emp.working_days}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      </>
      )}
    </div>
  );
}

const S = {
  pageHead:   { display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 },
  h1:         { fontFamily: "Archivo", fontSize: 22, fontWeight: 700, color: "#0F1E3D" },
  sub:        { fontSize: 13, color: "#6B7793", marginTop: 3 },
  exportBtn:  { padding: "9px 16px", borderRadius: 9, border: 0, background: "#1E3563", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" },
  viewToggle: { display: "flex", border: "1px solid #E2E7F0", borderRadius: 9, overflow: "hidden" },
  toggleBtn:  { padding: "8px 14px", border: 0, background: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", color: "#6B7793" },
  toggleActive:{ background: "#1E3563", color: "#fff" },
  filters:    { display: "flex", gap: 9, marginBottom: 12, flexWrap: "wrap", alignItems: "center" },
  sel:        { padding: "8px 11px", border: "1px solid #E2E7F0", borderRadius: 9, fontSize: 13, fontFamily: "inherit", background: "#fff" },
  search:     { padding: "8px 12px", border: "1px solid #E2E7F0", borderRadius: 9, fontSize: 13, minWidth: 180, fontFamily: "inherit" },
  loadingBadge: { fontSize: 12, color: "#6B7793", padding: "6px 10px", background: "#F4F6FA", borderRadius: 8 },
  summaryRow: { display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" },
  pill:       { background: "#fff", border: "1px solid #E2E7F0", borderRadius: 10, padding: "10px 18px", textAlign: "center" },
  pillVal:    { fontSize: 22, fontWeight: 700, lineHeight: 1.1 },
  pillLabel:  { fontSize: 11, color: "#6B7793", marginTop: 3 },
  legend:     { display: "flex", gap: 14, marginBottom: 10, flexWrap: "wrap" },
  legendItem: { fontSize: 12 },
  tableWrap:  { background: "#fff", border: "1px solid #E2E7F0", borderRadius: 14, overflow: "auto", maxHeight: "calc(100vh - 320px)" },
  table:      { borderCollapse: "collapse", fontSize: 12 },
  centerMsg:  { textAlign: "center", padding: 48, color: "#6B7793" },

  thFixed: {
    position: "sticky", left: 0, top: 0, zIndex: 3,
    background: "#1E3563", color: "#fff", fontWeight: 700, fontSize: 11,
    padding: "10px 10px", textAlign: "left", borderRight: "1px solid #2E4A80",
    borderBottom: "2px solid #E2E7F0", whiteSpace: "nowrap",
  },
  thDay: {
    position: "sticky", top: 0, zIndex: 2,
    background: "#1E3563", color: "#fff", fontWeight: 700, fontSize: 11,
    padding: "10px 4px", textAlign: "center", minWidth: 26,
    borderRight: "1px solid #2E4A80", borderBottom: "2px solid #E2E7F0",
  },
  thSunday: { background: "#C0392B" },
  thTot: {
    position: "sticky", top: 0, zIndex: 2,
    background: "#0F1E3D", color: "#fff", fontWeight: 700, fontSize: 11,
    padding: "10px 8px", textAlign: "center", minWidth: 34,
    borderLeft: "2px solid #E2E7F0", borderBottom: "2px solid #E2E7F0",
  },

  tdFixed: {
    position: "sticky", left: 0, zIndex: 1,
    background: "#fff", padding: "7px 10px",
    borderRight: "1px solid #E2E7F0", borderBottom: "1px solid #E2E7F0",
    whiteSpace: "nowrap",
  },
  tdDay: {
    padding: "7px 4px", textAlign: "center",
    borderRight: "1px solid #F0F3F9", borderBottom: "1px solid #E2E7F0",
    fontSize: 11,
  },
  tdSunday: { background: "#FBE6E5" },
  tdTot: {
    padding: "7px 8px", textAlign: "center", fontWeight: 700,
    borderLeft: "2px solid #E2E7F0", borderBottom: "1px solid #E2E7F0",
    fontSize: 12,
  },
  rowAlt: { background: "#F8F9FC" },
};
