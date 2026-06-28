import { useState } from "react";
import { useSelector } from "react-redux";
import {
  useGetAttendanceQuery,
  useGetTodaySummaryQuery,
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

// ── Main page ─────────────────────────────────────────────────
export default function AttendancePage() {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [lightbox, setLightbox] = useState(null);
  const [selected, setSelected] = useState([]);
  const [selfieMsg, setSelfieMsg] = useState(null);

  const role    = useSelector((s) => s.auth.user?.role);
  const isAdmin = role === "admin";

  const { data: summary }   = useGetTodaySummaryQuery();
  const { data, isLoading } = useGetAttendanceQuery({ date });
  const [deleteSelfies, { isLoading: deletingSelfies }] = useDeleteSelfiesMutation();

  const records = data?.results || [];

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
    { label: "Present Today", value: summary?.present      ?? "—" },
    { label: "Total Active",  value: summary?.total_active ?? "—" },
    { label: "Absent",        value: summary?.absent       ?? "—" },
  ];

  return (
    <div>
      <div style={S.pageHead}>
        <div>
          <h1 style={S.h1}>Attendance – GPS + Selfie Verified</h1>
          <p style={S.sub}>Every check-in is geo-tagged and face-verified</p>
        </div>
        <div style={S.actions}>
          <input type="date" style={S.datePicker} value={date}
            onChange={(e) => changeDate(e.target.value)} />
        </div>
      </div>

      {/* KPI strip */}
      <div style={S.kpiGrid}>
        {kpis.map((k) => (
          <div key={k.label} style={S.kpi}>
            <div style={S.kpiLabel}>{k.label}</div>
            <div style={S.kpiVal}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Daily Register */}
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

      {/* Selfie lightbox */}
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
  kpiGrid:    { display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 16 },
  kpi:        { background: "#fff", border: "1px solid #E2E7F0", borderRadius: 14, padding: 16 },
  kpiLabel:   { fontSize: 12, color: "#6B7793", fontWeight: 600 },
  kpiVal:     { fontFamily: "Archivo", fontSize: 27, fontWeight: 800, color: "#0F1E3D", marginTop: 6 },
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

const R = {
  resultOk:  { padding: "8px 12px", background: "#E1F4EC", color: "#15966A", borderRadius: 8, fontSize: 13, fontWeight: 600 },
  resultErr: { padding: "8px 12px", background: "#FDECEA", color: "#D2453F", borderRadius: 8, fontSize: 13, fontWeight: 600 },
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

