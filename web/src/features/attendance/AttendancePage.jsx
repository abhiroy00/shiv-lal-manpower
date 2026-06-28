import { useState } from "react";
import { useSelector } from "react-redux";
import {
  useGetAttendanceQuery,
  useGetTodaySummaryQuery,
  useGetPendingReviewsQuery,
  useApproveAttendanceMutation,
  useRejectAttendanceMutation,
  useBulkApproveAttendanceMutation,
  useDeleteSelfiesMutation,
} from "./attendanceApi";

const STATUS_COLORS = {
  present: { bg: "#E1F4EC", color: "#15966A" },
  late:    { bg: "#FBF1DC", color: "#C98A12" },
  review:  { bg: "#EEF3FB", color: "#1E3563" },
  absent:  { bg: "#FBE6E5", color: "#D2453F" },
};

// ── Selfie thumbnail ──────────────────────────────────────────
function SelfieThumb({ url, onClick, size = 40 }) {
  if (!url) {
    return (
      <div style={{ ...PHOTO.placeholder, width: size, height: size }} title="No selfie captured">
        <span style={{ fontSize: size * 0.4 }}>👤</span>
      </div>
    );
  }
  return (
    <img
      src={url}
      alt="Check-in selfie"
      onClick={onClick}
      title="Click to enlarge"
      style={{ ...PHOTO.thumb, width: size, height: size }}
    />
  );
}

// ── Full-image lightbox ───────────────────────────────────────
function SelfieLightbox({ record, onClose }) {
  if (!record) return null;
  return (
    <div style={PHOTO.backdrop} onClick={onClose}>
      <div style={PHOTO.box} onClick={(e) => e.stopPropagation()}>
        <button style={PHOTO.close} onClick={onClose}>✕</button>
        {record.selfie_url ? (
          <img src={record.selfie_url} alt="Check-in selfie" style={PHOTO.fullImg} />
        ) : (
          <div style={PHOTO.noImg}>👤<div style={{ fontSize: 14, marginTop: 8 }}>No selfie captured</div></div>
        )}
        <div style={PHOTO.info}>
          <div style={PHOTO.infoName}>
            {record.employee_name}
            <span style={{ color: "#9AA6BF", fontWeight: 500 }}> · {record.emp_code}</span>
          </div>
          <div style={PHOTO.infoMeta}>
            <span><b>Date</b> {record.date}</span>
            <span><b>Check-in</b> {record.check_in_time?.slice(0, 5) || "—"}</span>
            <span><b>Check-out</b> {record.check_out_time?.slice(0, 5) || "—"}</span>
            <span><b>Geofence</b> {record.geofence_ok ? "✓ Inside" : "✗ Outside"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Under Review panel ────────────────────────────────────────
function ReviewPanel({ onViewSelfie }) {
  const { data, isLoading, refetch } = useGetPendingReviewsQuery();
  const [approve]      = useApproveAttendanceMutation();
  const [reject]       = useRejectAttendanceMutation();
  const [bulkApprove]  = useBulkApproveAttendanceMutation();
  const [notes,  setNotes]  = useState({});
  const [busy,   setBusy]   = useState({});
  const [result, setResult] = useState({});
  const [bulkBusy,   setBulkBusy]   = useState(false);
  const [bulkResult, setBulkResult] = useState(null);

  const records = data?.results || data || [];

  const handleBulkApprove = async () => {
    if (!window.confirm(`Approve all ${records.length} pending record(s)? This cannot be undone.`)) return;
    setBulkBusy(true);
    setBulkResult(null);
    try {
      const res = await bulkApprove().unwrap();
      setBulkResult({ ok: true, msg: `✓ ${res.approved} record(s) approved successfully.` });
      refetch();
    } catch (e) {
      setBulkResult({ ok: false, msg: e?.data?.detail || "Bulk approve failed." });
    } finally {
      setBulkBusy(false);
    }
  };

  const handleApprove = async (id) => {
    setBusy((b) => ({ ...b, [id]: true }));
    setResult((r) => ({ ...r, [id]: null }));
    try {
      await approve({ id, note: notes[id] || "" }).unwrap();
      setResult((r) => ({ ...r, [id]: "approved" }));
      refetch();
    } catch (e) {
      const msg = e?.data?.detail || e?.error || "Approve failed — check your role (admin/hr required).";
      setResult((r) => ({ ...r, [id]: msg }));
    } finally {
      setBusy((b) => ({ ...b, [id]: false }));
    }
  };

  const handleReject = async (id) => {
    setBusy((b) => ({ ...b, [id]: true }));
    setResult((r) => ({ ...r, [id]: null }));
    try {
      await reject({ id, note: notes[id] || "" }).unwrap();
      setResult((r) => ({ ...r, [id]: "rejected" }));
      refetch();
    } catch (e) {
      const msg = e?.data?.detail || e?.error || "Reject failed — check your role (admin/hr required).";
      setResult((r) => ({ ...r, [id]: msg }));
    } finally {
      setBusy((b) => ({ ...b, [id]: false }));
    }
  };

  return (
    <div>
      {/* Approve All bar */}
      {records.length > 0 && (
        <div style={R.bulkBar}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#0F1E3D" }}>
            {records.length} record{records.length !== 1 ? "s" : ""} pending review
          </span>
          <button
            style={{ ...R.approveBtn, opacity: bulkBusy ? .6 : 1, fontSize: 14, padding: "9px 22px" }}
            disabled={bulkBusy}
            onClick={handleBulkApprove}
          >
            {bulkBusy ? "Approving…" : `✓ Approve All (${records.length})`}
          </button>
        </div>
      )}
      {bulkResult && (
        <div style={bulkResult.ok ? R.resultOk : R.resultErr}>{bulkResult.msg}</div>
      )}

      {/* Info banner */}
      <div style={R.banner}>
        <span style={R.bannerIcon}>⏱</span>
        <span>
          Auto-determine on Approve: check-in <strong>≤ 09:30</strong> → <span style={{ color: "#15966A", fontWeight: 700 }}>Present</span>
          {" · "}check-in <strong>&gt; 09:30</strong> → <span style={{ color: "#C98A12", fontWeight: 700 }}>Late</span>
          {" · "}Reject always → <span style={{ color: "#D2453F", fontWeight: 700 }}>Absent</span>
          <span style={{ color: "#9AA6BF" }}> (threshold set in Django settings: LATE_THRESHOLD)</span>
        </span>
      </div>

      {isLoading && <div style={R.empty}>Loading…</div>}
      {!isLoading && records.length === 0 && (
        <div style={R.empty}>
          <div style={R.emptyIcon}>✓</div>
          No pending reviews — all attendance is resolved.
        </div>
      )}

      {records.map((r) => (
        <div key={r.id} style={R.card}>
          <div style={R.cardTop}>
            {/* Employee */}
            <div style={S.empCell}>
              <SelfieThumb url={r.selfie_url} size={48} onClick={() => onViewSelfie?.(r)} />
              <div>
                <div style={S.empName}>{r.employee_name}</div>
                <div style={S.empCode}>{r.emp_code}</div>
              </div>
            </div>

            {/* Meta */}
            <div style={R.meta}>
              <div style={R.metaItem}><span style={R.metaLabel}>Date</span> {r.date}</div>
              <div style={R.metaItem}>
                <span style={R.metaLabel}>Check-in</span>
                <strong style={{ color: r.check_in_time && r.check_in_time > "09:30" ? "#C98A12" : "#0F1E3D" }}>
                  {r.check_in_time?.slice(0, 5) || "—"}
                </strong>
              </div>
              <div style={R.metaItem}>
                <span style={R.metaLabel}>Site</span> {r.site_name || "—"}
              </div>
              <div style={R.metaItem}>
                <span style={R.metaLabel}>GPS</span>
                {r.lat && r.lng
                  ? <a href={`https://maps.google.com/?q=${r.lat},${r.lng}`} target="_blank" rel="noreferrer" style={R.mapLink}>
                      {parseFloat(r.lat).toFixed(4)}°, {parseFloat(r.lng).toFixed(4)}°
                    </a>
                  : "—"}
              </div>
              <div style={R.metaItem}>
                <span style={R.metaLabel}>Geofence</span>
                <span style={{ color: r.geofence_ok ? "#15966A" : "#D2453F", fontWeight: 600 }}>
                  {r.geofence_ok ? "✓ Inside" : "✗ Outside"}
                </span>
              </div>
            </div>
          </div>

          {/* Result feedback */}
          {result[r.id] === "approved" && (
            <div style={R.resultOk}>✓ Approved — status updated to Present or Late based on check-in time.</div>
          )}
          {result[r.id] === "rejected" && (
            <div style={R.resultOk}>✓ Rejected — marked Absent.</div>
          )}
          {result[r.id] && result[r.id] !== "approved" && result[r.id] !== "rejected" && (
            <div style={R.resultErr}>{result[r.id]}</div>
          )}

          {/* Note + action row */}
          {!result[r.id] && (
            <div style={R.actionRow}>
              <input style={R.noteInput} placeholder="Optional note (reason for override)…"
                value={notes[r.id] || ""}
                onChange={(e) => setNotes((n) => ({ ...n, [r.id]: e.target.value }))} />
              <button style={{ ...R.approveBtn, opacity: busy[r.id] ? .6 : 1 }}
                disabled={busy[r.id]} onClick={() => handleApprove(r.id)}>
                {busy[r.id] ? "Working…" : "✓ Approve"}
              </button>
              <button style={{ ...R.rejectBtn, opacity: busy[r.id] ? .6 : 1 }}
                disabled={busy[r.id]} onClick={() => handleReject(r.id)}>
                {busy[r.id] ? "Working…" : "✕ Reject"}
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────
export default function AttendancePage() {
  const [tab,  setTab]  = useState("register");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [lightbox, setLightbox] = useState(null);   // record whose selfie is open
  const [selected, setSelected] = useState([]);      // selected attendance ids (for selfie delete)
  const [selfieMsg, setSelfieMsg] = useState(null);  // { ok, msg }

  const role    = useSelector((s) => s.auth.user?.role);
  const isAdmin = role === "admin";

  const { data: summary }              = useGetTodaySummaryQuery();
  const { data: reviewData }           = useGetPendingReviewsQuery();
  const { data, isLoading }            = useGetAttendanceQuery({ date });
  const [deleteSelfies, { isLoading: deletingSelfies }] = useDeleteSelfiesMutation();

  const records       = data?.results || [];
  const reviewCount   = (reviewData?.results || reviewData || []).length;

  const selfieIds    = records.filter((r) => r.selfie_url).map((r) => r.id);
  const selfieCount  = selfieIds.length;
  const allSelected  = selfieCount > 0 && selfieIds.every((id) => selected.includes(id));

  const changeDate = (v) => { setDate(v); setSelected([]); setSelfieMsg(null); };

  const toggleOne = (id) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const toggleAll = () => setSelected(allSelected ? [] : selfieIds);

  const handleDeleteSelected = async () => {
    if (!selected.length) return;
    if (!window.confirm(
      `Delete ${selected.length} selfie image(s)?\n\nThe attendance records are kept — only the photos are removed. This cannot be undone.`
    )) return;
    setSelfieMsg(null);
    try {
      const res = await deleteSelfies({ ids: selected }).unwrap();
      setSelected([]);
      setSelfieMsg({ ok: true, msg: `✓ Deleted ${res.deleted} selfie image(s).` });
    } catch (e) {
      setSelfieMsg({ ok: false, msg: e?.data?.detail || "Delete failed — admin role required." });
    }
  };

  const handleDeleteAllForDate = async () => {
    if (!window.confirm(
      `Delete ALL ${selfieCount} selfie image(s) captured on ${date}?\n\nAttendance records are kept — only the photos are removed. This cannot be undone.`
    )) return;
    setSelfieMsg(null);
    try {
      const res = await deleteSelfies({ date }).unwrap();
      setSelected([]);
      setSelfieMsg({ ok: true, msg: `✓ Deleted ${res.deleted} selfie image(s) for ${date}.` });
    } catch (e) {
      setSelfieMsg({ ok: false, msg: e?.data?.detail || "Delete failed — admin role required." });
    }
  };

  const colCount = isAdmin ? 9 : 8;

  const kpis = [
    { label: "Present Today",  value: summary?.present      ?? "—" },
    { label: "Total Active",   value: summary?.total_active ?? "—" },
    { label: "Absent",         value: summary?.absent       ?? "—" },
    { label: "Under Review",   value: summary?.under_review ?? "—", alert: (summary?.under_review ?? 0) > 0 },
  ];

  return (
    <div>
      <div style={S.pageHead}>
        <div>
          <h1 style={S.h1}>Attendance – GPS + Selfie Verified</h1>
          <p style={S.sub}>Every check-in is geo-tagged and face-verified</p>
        </div>
        {tab === "register" && (
          <div style={S.actions}>
            <input type="date" style={S.datePicker} value={date}
              onChange={(e) => changeDate(e.target.value)} />
          </div>
        )}
      </div>

      {/* KPI strip */}
      <div style={S.kpiGrid}>
        {kpis.map((k) => (
          <div key={k.label}
            style={{ ...S.kpi, borderColor: k.alert ? "#E8821E" : "#E2E7F0", cursor: k.alert ? "pointer" : "default" }}
            onClick={k.alert ? () => setTab("review") : undefined}
            title={k.alert ? "Click to see pending reviews" : undefined}
            role={k.alert ? "button" : undefined}>
            <div style={S.kpiLabel}>{k.label}</div>
            <div style={{ ...S.kpiVal, color: k.alert ? "#E8821E" : "#0F1E3D" }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={S.tabBar}>
        {[
          { key: "register", label: "Daily Register" },
          { key: "review",   label: `Under Review${reviewCount > 0 ? ` (${reviewCount})` : ""}`, badge: reviewCount > 0 },
        ].map(({ key, label, badge }) => (
          <button key={key} style={{ ...S.tab, ...(tab === key ? S.tabActive : {}), ...(badge ? S.tabBadge : {}) }}
            onClick={() => setTab(key)}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab: Daily Register ── */}
      {tab === "register" && (
        <div style={S.card}>
          <div style={S.cardH}>
            <h3 style={S.cardTitle}>Attendance Register – {date}</h3>
          </div>

          {/* Admin: bulk selfie management */}
          {isAdmin && (
            <div style={DEL.bar}>
              <span style={DEL.info}>
                <span style={{ fontWeight: 700, color: "#0F1E3D" }}>{selfieCount}</span> selfie
                {selfieCount !== 1 ? "s" : ""} on this date
                {selected.length > 0 && (
                  <span style={{ color: "#D2453F", fontWeight: 700 }}> · {selected.length} selected</span>
                )}
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  style={{ ...DEL.delBtn, opacity: selected.length && !deletingSelfies ? 1 : .5 }}
                  disabled={!selected.length || deletingSelfies}
                  onClick={handleDeleteSelected}
                >
                  🗑 Delete Selected{selected.length ? ` (${selected.length})` : ""}
                </button>
                <button
                  style={{ ...DEL.delAllBtn, opacity: selfieCount && !deletingSelfies ? 1 : .5 }}
                  disabled={!selfieCount || deletingSelfies}
                  onClick={handleDeleteAllForDate}
                >
                  Delete All for {date}
                </button>
              </div>
            </div>
          )}
          {selfieMsg && (
            <div style={{ margin: "0 18px 12px", ...(selfieMsg.ok ? R.resultOk : R.resultErr) }}>
              {selfieMsg.msg}
            </div>
          )}

          <table style={S.table}>
            <thead>
              <tr>
                {isAdmin && (
                  <th style={{ ...S.th, width: 38 }}>
                    <input type="checkbox" checked={allSelected} onChange={toggleAll}
                      disabled={selfieCount === 0} title="Select all selfies on this date" />
                  </th>
                )}
                {["Employee", "Selfie", "Site", "Check-in", "Check-out", "GPS", "Geofence", "Status"].map((h) => (
                  <th key={h} style={S.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={colCount} style={{ textAlign: "center", padding: 32, color: "#6B7793" }}>Loading…</td></tr>
              )}
              {records.map((r) => {
                const sc = STATUS_COLORS[r.status] || STATUS_COLORS.absent;
                return (
                  <tr key={r.id} style={selected.includes(r.id) ? { background: "#FBE6E5" } : undefined}>
                    {isAdmin && (
                      <td style={S.td}>
                        <input type="checkbox"
                          checked={selected.includes(r.id)}
                          disabled={!r.selfie_url}
                          onChange={() => toggleOne(r.id)}
                          title={r.selfie_url ? "Select selfie for deletion" : "No selfie on this record"} />
                      </td>
                    )}
                    <td style={S.td}>
                      <div style={S.empCell}>
                        <div style={S.av}>{r.employee_name?.slice(0, 2).toUpperCase()}</div>
                        <div>
                          <div style={S.empName}>{r.employee_name}</div>
                          <div style={S.empCode}>{r.emp_code}</div>
                        </div>
                      </div>
                    </td>
                    <td style={S.td}>
                      <SelfieThumb url={r.selfie_url} onClick={() => setLightbox(r)} />
                    </td>
                    <td style={S.td}>{r.site_name || "—"}</td>
                    <td style={S.td}>{r.check_in_time?.slice(0, 5) || "—"}</td>
                    <td style={S.td}>{r.check_out_time?.slice(0, 5) || "—"}</td>
                    <td style={S.td}>
                      {r.lat && r.lng
                        ? <a href={`https://maps.google.com/?q=${r.lat},${r.lng}`} target="_blank" rel="noreferrer" style={{ color: "#1E3563", fontSize: 12 }}>
                            {parseFloat(r.lat).toFixed(4)}°
                          </a>
                        : "—"}
                    </td>
                    <td style={S.td}>
                      <span style={{ ...S.pill, background: r.geofence_ok ? "#E1F4EC" : "#FBE6E5", color: r.geofence_ok ? "#15966A" : "#D2453F" }}>
                        {r.geofence_ok ? "✓ OK" : "⚠ Outside"}
                      </span>
                    </td>
                    <td style={S.td}>
                      <span style={{ ...S.pill, background: sc.bg, color: sc.color }}>
                        {r.status === "review" ? "Under Review" : r.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {!isLoading && records.length === 0 && (
                <tr><td colSpan={colCount} style={{ textAlign: "center", padding: 32, color: "#6B7793" }}>No records for {date}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Tab: Under Review ── */}
      {tab === "review" && <ReviewPanel onViewSelfie={setLightbox} />}

      {/* Selfie lightbox (shared by both tabs) */}
      <SelfieLightbox record={lightbox} onClose={() => setLightbox(null)} />
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────
const S = {
  pageHead:   { display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 12 },
  h1:         { fontFamily: "Archivo", fontSize: 22, fontWeight: 700, color: "#0F1E3D" },
  sub:        { fontSize: 13, color: "#6B7793", marginTop: 3 },
  actions:    { display: "flex", gap: 9 },
  datePicker: { padding: "9px 12px", border: "1px solid #E2E7F0", borderRadius: 9, fontSize: 13, fontFamily: "inherit" },
  kpiGrid:    { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginBottom: 16 },
  kpi:        { background: "#fff", border: "1px solid #E2E7F0", borderRadius: 14, padding: 16 },
  kpiLabel:   { fontSize: 12, color: "#6B7793", fontWeight: 600 },
  kpiVal:     { fontFamily: "Archivo", fontSize: 27, fontWeight: 800, color: "#0F1E3D", marginTop: 6 },
  tabBar:     { display: "flex", gap: 4, marginBottom: 14, borderBottom: "2px solid #E2E7F0", paddingBottom: 0 },
  tab:        { padding: "9px 18px", border: 0, borderBottom: "2px solid transparent", background: "none", fontSize: 13.5, fontWeight: 600, color: "#6B7793", cursor: "pointer", marginBottom: -2 },
  tabActive:  { color: "#1E3563", borderBottomColor: "#1E3563" },
  tabBadge:   { color: "#E8821E" },
  card:       { background: "#fff", border: "1px solid #E2E7F0", borderRadius: 14, overflow: "auto" },
  cardH:      { padding: "15px 18px", borderBottom: "1px solid #E2E7F0" },
  cardTitle:  { fontSize: 14.5, fontWeight: 700, color: "#0F1E3D" },
  table:      { width: "100%", borderCollapse: "collapse", minWidth: 700 },
  th:         { fontSize: 11, textTransform: "uppercase", color: "#6B7793", textAlign: "left", padding: "11px 14px", borderBottom: "1px solid #E2E7F0", fontWeight: 700, background: "#F4F6FA" },
  td:         { padding: "12px 14px", fontSize: 13, borderBottom: "1px solid #E2E7F0" },
  empCell:    { display: "flex", alignItems: "center", gap: 10 },
  av:         { width: 32, height: 32, borderRadius: 8, background: "#1E3563", color: "#fff", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 },
  empName:    { fontWeight: 600, color: "#0F1E3D" },
  empCode:    { fontSize: 11, color: "#6B7793" },
  pill:       { display: "inline-flex", padding: "4px 10px", borderRadius: 30, fontSize: 11.5, fontWeight: 600 },
};

const DEL = {
  bar: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    gap: 10, flexWrap: "wrap", padding: "10px 18px",
    background: "#FCF4F3", borderBottom: "1px solid #F2D9D7",
  },
  info: { fontSize: 13, color: "#6B7793" },
  delBtn: {
    padding: "7px 14px", border: "1px solid #E8B4B0", borderRadius: 8,
    background: "#FBE6E5", color: "#D2453F", fontWeight: 700, fontSize: 12.5,
    cursor: "pointer",
  },
  delAllBtn: {
    padding: "7px 14px", border: 0, borderRadius: 8,
    background: "#D2453F", color: "#fff", fontWeight: 700, fontSize: 12.5,
    cursor: "pointer",
  },
};

const PHOTO = {
  thumb: {
    borderRadius: 8, objectFit: "cover", cursor: "pointer",
    border: "1px solid #E2E7F0", background: "#F4F6FA", display: "block",
  },
  placeholder: {
    borderRadius: 8, border: "1px dashed #D0D7E5", background: "#F4F6FA",
    display: "grid", placeItems: "center", color: "#9AA6BF",
  },
  backdrop: {
    position: "fixed", inset: 0, background: "rgba(15,30,61,.72)", zIndex: 300,
    display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
  },
  box: {
    background: "#fff", borderRadius: 16, overflow: "hidden", position: "relative",
    maxWidth: 460, width: "100%", boxShadow: "0 24px 70px rgba(15,30,61,.4)",
  },
  close: {
    position: "absolute", top: 12, right: 12, width: 34, height: 34, borderRadius: "50%",
    border: 0, background: "rgba(0,0,0,.45)", color: "#fff", fontSize: 16, cursor: "pointer",
    display: "grid", placeItems: "center", zIndex: 2,
  },
  fullImg: { width: "100%", maxHeight: "70vh", objectFit: "contain", display: "block", background: "#0F1E3D" },
  noImg: {
    width: "100%", height: 300, display: "grid", placeItems: "center",
    fontSize: 64, color: "#C4CCDA", background: "#F4F6FA", textAlign: "center",
  },
  info: { padding: "14px 18px", borderTop: "1px solid #E2E7F0" },
  infoName: { fontSize: 15, fontWeight: 700, color: "#0F1E3D", marginBottom: 8 },
  infoMeta: { display: "flex", flexWrap: "wrap", gap: "6px 18px", fontSize: 12.5, color: "#6B7793" },
};

const R = {
  bulkBar:    { display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff", border: "1px solid #E2E7F0", borderRadius: 10, padding: "12px 16px", marginBottom: 12, flexWrap: "wrap", gap: 10 },
  banner:     { display: "flex", alignItems: "flex-start", gap: 10, background: "#FFFBE6", border: "1px solid #F5D78E", borderRadius: 10, padding: "11px 14px", marginBottom: 16, fontSize: 13, color: "#5A4000", lineHeight: 1.6 },
  bannerIcon: { fontSize: 18, flexShrink: 0, marginTop: 1 },
  empty:      { textAlign: "center", padding: "60px 20px", color: "#9AA6BF", fontSize: 15 },
  emptyIcon:  { fontSize: 40, marginBottom: 10, color: "#15966A" },
  card:       { background: "#fff", border: "1px solid #E2E7F0", borderRadius: 12, padding: 16, marginBottom: 10 },
  cardTop:    { display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap", marginBottom: 12 },
  meta:       { display: "flex", flexWrap: "wrap", gap: "6px 20px", flex: 1 },
  metaItem:   { display: "flex", flexDirection: "column", minWidth: 90 },
  metaLabel:  { fontSize: 10.5, color: "#9AA6BF", fontWeight: 700, textTransform: "uppercase", marginBottom: 2 },
  mapLink:    { color: "#1E3563", fontSize: 12, fontWeight: 600 },
  actionRow:  { display: "flex", gap: 8, alignItems: "center", paddingTop: 10, borderTop: "1px solid #F0F2F8" },
  noteInput:  { flex: 1, padding: "7px 11px", border: "1px solid #E2E7F0", borderRadius: 8, fontSize: 12, fontFamily: "inherit" },
  approveBtn: { padding: "7px 16px", border: 0, borderRadius: 8, background: "#15966A", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", flexShrink: 0 },
  rejectBtn:  { padding: "7px 16px", border: 0, borderRadius: 8, background: "#D2453F", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", flexShrink: 0 },
  resultOk:   { padding: "8px 12px", background: "#E1F4EC", color: "#15966A", borderRadius: 8, fontSize: 13, fontWeight: 600, marginTop: 8 },
  resultErr:  { padding: "8px 12px", background: "#FDECEA", color: "#D2453F", borderRadius: 8, fontSize: 13, fontWeight: 600, marginTop: 8 },
};
