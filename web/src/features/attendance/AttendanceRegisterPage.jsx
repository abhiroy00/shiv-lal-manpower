import { useState, lazy, Suspense, useCallback } from "react";
import { useSelector } from "react-redux";
import { useGetAttendanceRegisterQuery, useMarkAttendanceMutation, useBulkFillAttendanceMutation } from "./attendanceApi";
import { useGetSitesQuery } from "../deployment/deploymentApi";
const AttendanceMapView = lazy(() => import("./AttendanceMapView"));

const TODAY  = new Date();
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

// Click cycles through: A → P → L → A
const CYCLE = { A: "P", P: "L", L: "A" };

const CODE_STYLE = {
  P: { color: "#15966A", fontWeight: 700 },
  L: { color: "#C98A12", fontWeight: 700 },
  R: { color: "#7B1FA2", fontWeight: 700 },
  A: { color: "#D2453F", fontWeight: 700 },
  S: { color: "#9AA6BF", fontWeight: 600 },
};

function pad(n) { return String(n).padStart(2, "0"); }

export default function AttendanceRegisterPage() {
  const [month, setMonth]   = useState(TODAY.getMonth() + 1);
  const [year, setYear]     = useState(TODAY.getFullYear());
  const [site, setSite]     = useState("");
  const [search, setSearch] = useState("");
  const [exporting, setExporting]     = useState(false);
  const [viewMode, setViewMode]       = useState("register");
  // Optimistic overrides: { "empId-day": "P"|"L"|"A" }
  const [overrides, setOverrides]     = useState({});
  // Pending save indicator: Set of "empId-day"
  const [pending, setPending]         = useState(new Set());

  const accessToken = useSelector((s) => s.auth.accessToken);
  const { data: sitesData } = useGetSitesQuery({});
  const sites = sitesData?.results || [];

  const { data, isLoading, isFetching, refetch } = useGetAttendanceRegisterQuery(
    { month, year, site: site || undefined, search: search || undefined },
  );

  // Clear overrides when filters change
  const changeMonth = (v) => { setMonth(Number(v)); setOverrides({}); };
  const changeYear  = (v) => { setYear(Number(v));  setOverrides({}); };
  const changeSite  = (v) => { setSite(v);           setOverrides({}); };

  const employees   = data?.employees    || [];
  const daysInMonth = data?.days_in_month || 30;
  const sundaysSet  = new Set(data?.sundays || []);
  const days        = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const [markAttendance] = useMarkAttendanceMutation();
  const [bulkFill, { isLoading: bulkFilling }] = useBulkFillAttendanceMutation();

  // Bulk fill modal state
  const [showBulkFill, setShowBulkFill] = useState(false);
  const [bulkFrom,     setBulkFrom]     = useState("");
  const [bulkTo,       setBulkTo]       = useState("");
  const [bulkStatus,   setBulkStatus]   = useState("present");
  const [bulkScope,    setBulkScope]    = useState("all"); // "all" | "filter"
  const [bulkOverwrite,setBulkOverwrite]= useState(true);
  const [bulkResult,   setBulkResult]   = useState(null);

  const PRESETS = [
    { label: "1 M",  months: 1 },
    { label: "4 M",  months: 4 },
    { label: "6 M",  months: 6 },
    { label: "1 Y",  months: 12 },
    { label: "2 Y",  months: 24 },
    { label: "6 Y",  months: 72 },
  ];

  const applyPreset = (months) => {
    const end   = new Date(year, month - 1 + 1, 0); // last day of selected month
    const start = new Date(year, month - 1 - (months - 1), 1); // first day, N months back
    const fmt   = (d) => d.toISOString().split("T")[0];
    setBulkFrom(fmt(start));
    setBulkTo(fmt(end));
  };

  const countWorkingDays = (from, to) => {
    if (!from || !to) return 0;
    let count = 0, cur = new Date(from);
    const end = new Date(to);
    while (cur <= end) {
      if (cur.getDay() !== 0) count++;
      cur.setDate(cur.getDate() + 1);
    }
    return count;
  };

  const handleBulkFill = async () => {
    const empIds = bulkScope === "filter" ? employees.map((e) => e.id) : [];
    try {
      const res = await bulkFill({
        from_date:    bulkFrom,
        to_date:      bulkTo,
        status:       bulkStatus,
        employee_ids: empIds,
        overwrite:    bulkOverwrite,
      }).unwrap();
      setBulkResult({ ok: true, ...res });
      refetch();
    } catch (e) {
      setBulkResult({ ok: false, msg: e?.data?.detail || "Bulk fill failed." });
    }
  };

  const openBulkFill = () => {
    // Default to current viewed month
    const fmt = (d) => d.toISOString().split("T")[0];
    setBulkFrom(fmt(new Date(year, month - 1, 1)));
    setBulkTo(fmt(new Date(year, month, 0)));
    setBulkStatus("present");
    setBulkScope("all");
    setBulkOverwrite(true);
    setBulkResult(null);
    setShowBulkFill(true);
  };

  const handleQuickPresent = async () => {
    const monthName = MONTHS[month - 1];
    const wdCount = countWorkingDays(
      `${year}-${pad(month)}-01`,
      new Date(year, month, 0).toISOString().split("T")[0],
    );
    const confirmed = window.confirm(
      `Mark ALL active employees as Present for every working day in ${monthName} ${year}?\n\n` +
      `(${wdCount} working days — Sundays excluded)\n\nThis will overwrite any existing records for that period.`
    );
    if (!confirmed) return;
    try {
      const res = await bulkFill({
        from_date:    `${year}-${pad(month)}-01`,
        to_date:      new Date(year, month, 0).toISOString().split("T")[0],
        status:       "present",
        employee_ids: [],   // all active
        overwrite:    true,
      }).unwrap();
      refetch();
      alert(`✓ Done! ${res.created} records created (${res.employees} employees × ${res.days} working days).`);
    } catch (e) {
      alert(e?.data?.detail || "Failed. Please try again.");
    }
  };

  const workingDaysEstimate = countWorkingDays(bulkFrom, bulkTo);
  const empCountEstimate    = bulkScope === "filter" ? employees.length : "all active";

  const handleCellClick = useCallback(async (empId, day, currentCode) => {
    if (currentCode === "S" || currentCode === "R") return; // not editable
    const key      = `${empId}-${day}`;
    const nextCode = CYCLE[currentCode] ?? "P";
    const dateStr  = `${year}-${pad(month)}-${pad(day)}`;

    // Optimistic update
    setOverrides((prev) => ({ ...prev, [key]: nextCode }));
    setPending((prev) => new Set(prev).add(key));

    try {
      await markAttendance({
        employee_id: empId,
        date:        dateStr,
        status:      nextCode === "A" ? "absent" : nextCode === "P" ? "present" : "late",
      }).unwrap();
    } catch {
      // Revert on error
      setOverrides((prev) => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
    } finally {
      setPending((prev) => {
        const copy = new Set(prev);
        copy.delete(key);
        return copy;
      });
    }
  }, [year, month, markAttendance]);

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
      a.href = url;
      a.download = `attendance_${year}_${pad(month)}.xlsx`;
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
          <p style={S.sub}>Click any cell to toggle P / L / A &nbsp;·&nbsp; Sunday cells are locked</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={S.viewToggle}>
            <button style={{ ...S.toggleBtn, ...(viewMode === "register" ? S.toggleActive : {}) }}
              onClick={() => setViewMode("register")}>
              📋 Register
            </button>
            <button style={{ ...S.toggleBtn, ...(viewMode === "map" ? S.toggleActive : {}) }}
              onClick={() => setViewMode("map")}>
              🗺️ Map View
            </button>
          </div>
          {viewMode === "register" && (
            <>
              <button style={S.quickPresentBtn} onClick={handleQuickPresent} disabled={bulkFilling || loading}
                title={`Mark all employees Present for ${MONTHS[month - 1]} ${year} in one click`}>
                {bulkFilling ? "Filling…" : `✓ All Present — ${MONTHS[month - 1]}`}
              </button>
              <button style={S.bulkFillBtn} onClick={openBulkFill}>
                ✏️ Bulk Fill
              </button>
              <button style={S.exportBtn} onClick={handleExport} disabled={exporting || loading}>
                {exporting ? "Exporting…" : "📥 Export Excel"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Map View */}
      {viewMode === "map" && (
        <Suspense fallback={<div style={{ padding: 40, textAlign: "center", color: "#9AA6BF" }}>Loading map...</div>}>
          <AttendanceMapView />
        </Suspense>
      )}

      {/* ── Bulk Fill Modal ── */}
      {showBulkFill && (
        <div style={BF.overlay} onClick={() => !bulkFilling && setShowBulkFill(false)}>
          <div style={BF.modal} onClick={(e) => e.stopPropagation()}>
            <div style={BF.header}>
              <div style={BF.title}>Bulk Fill Attendance</div>
              <button style={BF.closeBtn} onClick={() => setShowBulkFill(false)}>✕</button>
            </div>

            {!bulkResult ? (
              <>
                {/* Period presets */}
                <div style={BF.section}>
                  <div style={BF.label}>Period Preset</div>
                  <div style={BF.presetRow}>
                    {PRESETS.map(({ label, months }) => (
                      <button key={label} style={BF.presetBtn}
                        onClick={() => applyPreset(months)}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom date range */}
                <div style={BF.section}>
                  <div style={BF.label}>Custom Date Range</div>
                  <div style={BF.dateRow}>
                    <div style={BF.dateField}>
                      <span style={BF.dateLabel}>From</span>
                      <input type="date" style={BF.dateInput} value={bulkFrom}
                        onChange={(e) => setBulkFrom(e.target.value)} />
                    </div>
                    <div style={BF.dateField}>
                      <span style={BF.dateLabel}>To</span>
                      <input type="date" style={BF.dateInput} value={bulkTo}
                        onChange={(e) => setBulkTo(e.target.value)} />
                    </div>
                  </div>
                </div>

                {/* Status */}
                <div style={BF.section}>
                  <div style={BF.label}>Mark As</div>
                  <div style={BF.radioRow}>
                    {[
                      { val: "present", label: "Present", color: "#15966A" },
                      { val: "late",    label: "Late",    color: "#C98A12" },
                      { val: "absent",  label: "Absent (clears records)", color: "#D2453F" },
                    ].map(({ val, label, color }) => (
                      <label key={val} style={BF.radioLabel}>
                        <input type="radio" name="bulkStatus" value={val}
                          checked={bulkStatus === val}
                          onChange={() => setBulkStatus(val)} />
                        <span style={{ color, fontWeight: 700, marginLeft: 6 }}>{label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Employees scope */}
                <div style={BF.section}>
                  <div style={BF.label}>Apply To</div>
                  <div style={BF.radioRow}>
                    <label style={BF.radioLabel}>
                      <input type="radio" name="bulkScope" value="all"
                        checked={bulkScope === "all"}
                        onChange={() => setBulkScope("all")} />
                      <span style={{ marginLeft: 6 }}>All active employees</span>
                    </label>
                    <label style={BF.radioLabel}>
                      <input type="radio" name="bulkScope" value="filter"
                        checked={bulkScope === "filter"}
                        onChange={() => setBulkScope("filter")} />
                      <span style={{ marginLeft: 6 }}>
                        Current view only ({employees.length} employees{site ? " · filtered site" : ""})
                      </span>
                    </label>
                  </div>
                </div>

                {/* Overwrite toggle */}
                {bulkStatus !== "absent" && (
                  <div style={BF.section}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                      <input type="checkbox" checked={bulkOverwrite}
                        onChange={(e) => setBulkOverwrite(e.target.checked)} />
                      <span style={{ fontSize: 13, color: "#0F1E3D" }}>
                        Overwrite existing attendance records
                      </span>
                      <span style={{ fontSize: 11.5, color: "#9AA6BF" }}>
                        (uncheck to only fill empty days)
                      </span>
                    </label>
                  </div>
                )}

                {/* Preview */}
                {bulkFrom && bulkTo && (
                  <div style={BF.preview}>
                    <span style={BF.previewIcon}>📊</span>
                    <span>
                      <strong>{workingDaysEstimate}</strong> working days ×{" "}
                      <strong>{empCountEstimate}</strong> employees
                      {bulkStatus === "absent"
                        ? " → existing records will be deleted"
                        : bulkOverwrite
                          ? " → all days will be set to " + bulkStatus
                          : " → only empty days will be filled"}
                    </span>
                  </div>
                )}

                {/* Actions */}
                <div style={BF.footer}>
                  <button style={BF.cancelBtn} onClick={() => setShowBulkFill(false)}>
                    Cancel
                  </button>
                  <button
                    style={{ ...BF.applyBtn, opacity: (!bulkFrom || !bulkTo || bulkFilling) ? .6 : 1 }}
                    disabled={!bulkFrom || !bulkTo || bulkFilling}
                    onClick={handleBulkFill}
                  >
                    {bulkFilling ? "Processing…" : "Apply Bulk Fill"}
                  </button>
                </div>
              </>
            ) : (
              /* Result screen */
              <div style={{ padding: "20px 24px" }}>
                {bulkResult.ok ? (
                  <>
                    <div style={BF.resultOk}>✓ Bulk fill complete</div>
                    <div style={BF.resultGrid}>
                      {bulkResult.created > 0 && <div style={BF.resultItem}><strong>{bulkResult.created}</strong> records created</div>}
                      {bulkResult.skipped > 0 && <div style={BF.resultItem}><strong>{bulkResult.skipped}</strong> skipped (already existed)</div>}
                      {bulkResult.deleted > 0 && <div style={BF.resultItem}><strong>{bulkResult.deleted}</strong> records deleted</div>}
                      <div style={BF.resultItem}><strong>{bulkResult.days}</strong> working days processed</div>
                      <div style={BF.resultItem}><strong>{bulkResult.employees}</strong> employees processed</div>
                    </div>
                  </>
                ) : (
                  <div style={BF.resultErr}>{bulkResult.msg}</div>
                )}
                <div style={BF.footer}>
                  <button style={BF.cancelBtn} onClick={() => { setBulkResult(null); }}>
                    Fill Again
                  </button>
                  <button style={BF.applyBtn} onClick={() => setShowBulkFill(false)}>
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {viewMode !== "map" && (
        <>
          {/* Filters */}
          <div style={S.filters}>
            <select style={S.sel} value={month} onChange={(e) => changeMonth(e.target.value)}>
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
            <select style={S.sel} value={year} onChange={(e) => changeYear(e.target.value)}>
              {[2024, 2025, 2026, 2027].map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <select style={S.sel} value={site} onChange={(e) => changeSite(e.target.value)}>
              <option value="">All Sites</option>
              {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <input style={S.search} placeholder="Search employee…" value={search}
              onChange={(e) => setSearch(e.target.value)} />
            {loading && <span style={S.loadingBadge}>Loading…</span>}
            {pending.size > 0 && <span style={S.savingBadge}>Saving {pending.size}…</span>}
          </div>

          {/* Summary pills */}
          {data && (
            <div style={S.summaryRow}>
              {[
                { label: "Employees",    val: employees.length,                            color: "#1E3563" },
                { label: "Working Days", val: daysInMonth - sundaysSet.size,               color: "#6B7793" },
                { label: "Avg Present",  val: employees.length ? Math.round(employees.reduce((s,e) => s + e.present, 0) / employees.length) : 0, color: "#15966A" },
                { label: "Avg Absent",   val: employees.length ? Math.round(employees.reduce((s,e) => s + e.absent,  0) / employees.length) : 0, color: "#D2453F" },
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
            {[["P","Present (click A)"],["L","Late (click P)"],["A","Absent (click L)"],["S","Sunday (locked)"],["R","Review (locked)"]].map(([c,l]) => (
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
                      <th key={d} style={{ ...S.thDay, ...(sundaysSet.has(d) ? S.thSunday : {}) }}>
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
                  {employees.map((emp, idx) => {
                    // Compute totals factoring in overrides
                    let present = 0, late = 0, absent = 0;
                    days.forEach((d) => {
                      const key  = `${emp.id}-${d}`;
                      const code = overrides[key] ?? emp.days[d] ?? "A";
                      if      (code === "P") present++;
                      else if (code === "L") late++;
                      else if (code === "A" && !sundaysSet.has(d)) absent++;
                    });

                    return (
                      <tr key={emp.id} style={idx % 2 === 1 ? S.rowAlt : {}}>
                        <td style={{ ...S.tdFixed, color: "#9AA6BF", fontSize: 11 }}>{idx + 1}</td>
                        <td style={{ ...S.tdFixed, fontWeight: 600, color: "#1E3563", fontSize: 11 }}>{emp.emp_code}</td>
                        <td style={{ ...S.tdFixed, fontWeight: 600, fontSize: 12 }}>{emp.full_name}</td>
                        <td style={{ ...S.tdFixed, color: "#6B7793", fontSize: 11 }}>{emp.designation}</td>
                        {days.map((d) => {
                          const key        = `${emp.id}-${d}`;
                          const code       = overrides[key] ?? emp.days[d] ?? "A";
                          const isSunday   = sundaysSet.has(d);
                          const isReview   = code === "R";
                          const isSaving   = pending.has(key);
                          const clickable  = !isSunday && !isReview;
                          return (
                            <td key={d}
                              onClick={clickable ? () => handleCellClick(emp.id, d, code) : undefined}
                              style={{
                                ...S.tdDay,
                                ...(isSunday ? S.tdSunday : {}),
                                ...CODE_STYLE[code],
                                ...(clickable ? S.tdClickable : {}),
                                ...(isSaving  ? S.tdSaving   : {}),
                              }}>
                              {isSaving ? "·" : code}
                            </td>
                          );
                        })}
                        <td style={{ ...S.tdTot, ...CODE_STYLE.P }}>{present}</td>
                        <td style={{ ...S.tdTot, ...CODE_STYLE.L }}>{late}</td>
                        <td style={{ ...S.tdTot, ...CODE_STYLE.A }}>{absent}</td>
                        <td style={{ ...S.tdTot, color: "#1E3563", fontWeight: 700 }}>{emp.working_days}</td>
                      </tr>
                    );
                  })}
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
  pageHead:    { display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 },
  h1:          { fontFamily: "Archivo", fontSize: 22, fontWeight: 700, color: "#0F1E3D" },
  sub:         { fontSize: 13, color: "#6B7793", marginTop: 3 },
  exportBtn:       { padding: "9px 16px", borderRadius: 9, border: 0, background: "#1E3563", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" },
  bulkFillBtn:     { padding: "9px 16px", borderRadius: 9, border: "1px solid #E2E7F0", background: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer", color: "#1E3563" },
  quickPresentBtn: { padding: "9px 16px", borderRadius: 9, border: 0, background: "#15966A", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" },
  viewToggle:  { display: "flex", border: "1px solid #E2E7F0", borderRadius: 9, overflow: "hidden" },
  toggleBtn:   { padding: "8px 14px", border: 0, background: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", color: "#6B7793" },
  toggleActive:{ background: "#1E3563", color: "#fff" },
  filters:     { display: "flex", gap: 9, marginBottom: 12, flexWrap: "wrap", alignItems: "center" },
  sel:         { padding: "8px 11px", border: "1px solid #E2E7F0", borderRadius: 9, fontSize: 13, fontFamily: "inherit", background: "#fff" },
  search:      { padding: "8px 12px", border: "1px solid #E2E7F0", borderRadius: 9, fontSize: 13, minWidth: 180, fontFamily: "inherit" },
  loadingBadge:{ fontSize: 12, color: "#6B7793", padding: "6px 10px", background: "#F4F6FA", borderRadius: 8 },
  savingBadge: { fontSize: 12, color: "#E8821E", padding: "6px 10px", background: "#FDF3E7", borderRadius: 8, fontWeight: 600 },
  summaryRow:  { display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" },
  pill:        { background: "#fff", border: "1px solid #E2E7F0", borderRadius: 10, padding: "10px 18px", textAlign: "center" },
  pillVal:     { fontSize: 22, fontWeight: 700, lineHeight: 1.1 },
  pillLabel:   { fontSize: 11, color: "#6B7793", marginTop: 3 },
  legend:      { display: "flex", gap: 14, marginBottom: 10, flexWrap: "wrap" },
  legendItem:  { fontSize: 12 },
  tableWrap:   { background: "#fff", border: "1px solid #E2E7F0", borderRadius: 14, overflow: "auto", maxHeight: "calc(100vh - 320px)" },
  table:       { borderCollapse: "collapse", fontSize: 12 },
  centerMsg:   { textAlign: "center", padding: 48, color: "#6B7793" },

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
  tdSunday:   { background: "#FBE6E5" },
  tdClickable:{ cursor: "pointer", userSelect: "none" },
  tdSaving:   { opacity: 0.5, cursor: "wait" },
  tdTot: {
    padding: "7px 8px", textAlign: "center", fontWeight: 700,
    borderLeft: "2px solid #E2E7F0", borderBottom: "1px solid #E2E7F0",
    fontSize: 12,
  },
  rowAlt: { background: "#F8F9FC" },
};

const BF = {
  overlay:     { position: "fixed", inset: 0, background: "rgba(15,30,61,.5)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" },
  modal:       { background: "#fff", borderRadius: 16, width: "min(560px, 96vw)", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 16px 48px rgba(0,0,0,.22)" },
  header:      { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px 0", borderBottom: "1px solid #E2E7F0", paddingBottom: 14 },
  title:       { fontFamily: "Archivo", fontSize: 18, fontWeight: 800, color: "#0F1E3D" },
  closeBtn:    { width: 30, height: 30, borderRadius: 8, border: "1px solid #E2E7F0", background: "#fff", fontSize: 14, cursor: "pointer", color: "#6B7793", display: "grid", placeItems: "center" },
  section:     { padding: "14px 24px 0" },
  label:       { fontSize: 11, fontWeight: 700, color: "#6B7793", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 8 },
  presetRow:   { display: "flex", gap: 8, flexWrap: "wrap" },
  presetBtn:   { padding: "7px 16px", borderRadius: 8, border: "1px solid #1E3563", background: "#EEF2FB", color: "#1E3563", fontWeight: 700, fontSize: 13, cursor: "pointer" },
  dateRow:     { display: "flex", gap: 14 },
  dateField:   { display: "flex", flexDirection: "column", gap: 4, flex: 1 },
  dateLabel:   { fontSize: 11, color: "#9AA6BF", fontWeight: 600 },
  dateInput:   { padding: "9px 11px", border: "1px solid #E2E7F0", borderRadius: 9, fontSize: 13, fontFamily: "inherit", colorScheme: "light" },
  radioRow:    { display: "flex", flexDirection: "column", gap: 8 },
  radioLabel:  { display: "flex", alignItems: "center", fontSize: 13, cursor: "pointer", color: "#0F1E3D" },
  preview:     { margin: "16px 24px 0", display: "flex", gap: 10, alignItems: "flex-start", background: "#FFFBE6", border: "1px solid #F5D78E", borderRadius: 10, padding: "11px 14px", fontSize: 13, color: "#5A4000" },
  previewIcon: { fontSize: 18, flexShrink: 0 },
  footer:      { display: "flex", justifyContent: "flex-end", gap: 10, padding: "20px 24px" },
  cancelBtn:   { padding: "9px 18px", borderRadius: 9, border: "1px solid #E2E7F0", background: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", color: "#6B7793" },
  applyBtn:    { padding: "9px 22px", borderRadius: 9, border: 0, background: "#E8821E", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" },
  resultOk:    { fontSize: 15, fontWeight: 700, color: "#15966A", marginBottom: 14 },
  resultErr:   { background: "#FDECEA", color: "#D2453F", borderRadius: 9, padding: "12px 14px", fontSize: 13, fontWeight: 600 },
  resultGrid:  { display: "flex", flexDirection: "column", gap: 8 },
  resultItem:  { fontSize: 13.5, color: "#0F1E3D", padding: "6px 0", borderBottom: "1px solid #F0F2F8" },
};
