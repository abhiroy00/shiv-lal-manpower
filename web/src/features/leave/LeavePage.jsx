import { useState } from "react";
import { useSelector } from "react-redux";
import { useGetLeavesQuery, useApproveLeaveMutation, useRejectLeaveMutation } from "./leaveApi";

const LEAVE_TYPES = {
  cl:     { label: "Casual",  color: "#1565C0", bg: "#E3EEF9" },
  sl:     { label: "Sick",    color: "#C0392B", bg: "#FBE6E5" },
  el:     { label: "Earned",  color: "#15966A", bg: "#E1F4EC" },
  unpaid: { label: "Unpaid",  color: "#7B1FA2", bg: "#EDE7F6" },
};

const STATUS_CFG = {
  pending:  { label: "Pending",  color: "#C98A12", bg: "#FBF1DC" },
  approved: { label: "Approved", color: "#15966A", bg: "#E1F4EC" },
  rejected: { label: "Rejected", color: "#C0392B", bg: "#FBE6E5" },
};

function fmt(val) {
  if (!val) return "—";
  return new Date(val).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function calcDays(from, to) {
  if (!from || !to) return "—";
  return Math.round((new Date(to) - new Date(from)) / 86400000) + 1;
}

// ── Action modal ──────────────────────────────────────────────────────────────

function ActionModal({ leave, action, onClose }) {
  const [note, setNote] = useState("");
  const [approveLeave, { isLoading: approving }] = useApproveLeaveMutation();
  const [rejectLeave,  { isLoading: rejecting }] = useRejectLeaveMutation();
  const isLoading = approving || rejecting;
  const lt = LEAVE_TYPES[leave?.leave_type] || LEAVE_TYPES.cl;

  const handleSubmit = async () => {
    try {
      if (action === "approve") await approveLeave({ id: leave.id, note }).unwrap();
      else                       await rejectLeave({ id: leave.id, note }).unwrap();
      onClose(true);
    } catch (e) {
      alert(e?.data?.detail || "Action failed");
    }
  };

  if (!leave) return null;

  return (
    <div style={M.backdrop} onClick={() => onClose(false)}>
      <div style={M.modal} onClick={(e) => e.stopPropagation()}>
        <div style={M.head}>
          <div style={M.headTitle}>
            {action === "approve" ? "✅ Approve Leave" : "❌ Reject Leave"}
          </div>
          <button style={M.close} onClick={() => onClose(false)}>✕</button>
        </div>

        {/* Leave info */}
        <div style={M.infoRow}>
          <div style={M.infoCell}>
            <div style={M.infoKey}>Employee</div>
            <div style={M.infoVal}>{leave.employee_name || "—"}</div>
            <div style={M.infoSub}>{leave.emp_code}</div>
          </div>
          <div style={M.infoCell}>
            <div style={M.infoKey}>Leave Type</div>
            <span style={{ ...M.typeBadge, background: lt.bg, color: lt.color }}>
              {lt.label} Leave
            </span>
          </div>
          <div style={M.infoCell}>
            <div style={M.infoKey}>Duration</div>
            <div style={M.infoVal}>{calcDays(leave.from_date, leave.to_date)} days</div>
            <div style={M.infoSub}>{fmt(leave.from_date)} → {fmt(leave.to_date)}</div>
          </div>
        </div>

        <div style={M.reasonBox}>
          <div style={M.infoKey}>Reason</div>
          <div style={M.reasonTxt}>{leave.reason}</div>
        </div>

        <div style={M.field}>
          <label style={M.label}>
            {action === "approve" ? "Approval note (optional)" : "Reason for rejection *"}
          </label>
          <textarea
            style={M.textarea}
            rows={3}
            placeholder={action === "approve" ? "Any message for the employee…" : "Please provide a reason…"}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <div style={M.footer}>
          <button style={M.cancelBtn} onClick={() => onClose(false)}>Cancel</button>
          <button
            style={{ ...M.actionBtn, background: action === "approve" ? "#15966A" : "#D2453F" }}
            onClick={handleSubmit}
            disabled={isLoading || (action === "reject" && !note.trim())}
          >
            {isLoading ? "..." : action === "approve" ? "Approve Leave" : "Reject Leave"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function LeavePage() {
  const user    = useSelector((s) => s.auth.user);
  const isAdmin = user && ["admin", "hr"].includes(user.role);

  const [statusFilter,   setStatusFilter]   = useState(isAdmin ? "pending" : "");
  const [typeFilter,     setTypeFilter]     = useState("");
  const [search,         setSearch]         = useState("");
  const [modal,          setModal]          = useState(null); // { leave, action }
  const [toast,          setToast]          = useState(null);
  const [approvingAll,   setApprovingAll]   = useState(false);

  const [approveLeave] = useApproveLeaveMutation();

  const { data: raw, isLoading, refetch } = useGetLeavesQuery(
    { status: statusFilter || undefined },
    { pollingInterval: 30000 }
  );
  const allLeaves = raw?.results || raw || [];

  const leaves = allLeaves.filter((l) => {
    if (typeFilter && l.leave_type !== typeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!l.employee_name?.toLowerCase().includes(q) &&
          !l.emp_code?.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  // Summary counts across all leaves (not filtered)
  const counts = allLeaves.reduce(
    (acc, l) => { acc[l.status] = (acc[l.status] || 0) + 1; return acc; },
    { pending: 0, approved: 0, rejected: 0 }
  );

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const handleModalClose = (success) => {
    setModal(null);
    if (success) {
      showToast(modal.action === "approve" ? "Leave approved successfully." : "Leave rejected.");
    }
  };

  const handleApproveAll = async () => {
    const pendingLeaves = allLeaves.filter((l) => l.status === "pending");
    if (pendingLeaves.length === 0) return;
    if (!window.confirm(`Approve all ${pendingLeaves.length} pending leave request(s)?`)) return;
    setApprovingAll(true);
    try {
      await Promise.all(pendingLeaves.map((l) => approveLeave({ id: l.id, note: "" }).unwrap()));
      showToast(`${pendingLeaves.length} leave(s) approved successfully.`);
    } catch (e) {
      showToast(e?.data?.detail || "Some approvals failed.", false);
    } finally {
      setApprovingAll(false);
    }
  };

  const kpis = [
    { label: "Pending",  value: counts.pending,  color: "#C98A12", bg: "#FBF1DC", filter: "pending"  },
    { label: "Approved", value: counts.approved, color: "#15966A", bg: "#E1F4EC", filter: "approved" },
    { label: "Rejected", value: counts.rejected, color: "#C0392B", bg: "#FBE6E5", filter: "rejected" },
    { label: "Showing",  value: leaves.length,   color: "#1E3563", bg: "#EEF3FB", filter: ""         },
  ];

  return (
    <div>
      {toast && (
        <div style={{ ...S.toast, background: toast.ok ? "#15966A" : "#D2453F" }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={S.pageHead}>
        <div>
          <h1 style={S.h1}>{isAdmin ? "Leave Management" : "My Leave Requests"}</h1>
          <p style={S.sub}>{isAdmin ? "Review and action employee leave requests from the mobile app" : "View your leave history submitted via the mobile app"}</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {isAdmin && counts.pending > 0 && (
            <button
              style={S.approveAllBtn}
              onClick={handleApproveAll}
              disabled={approvingAll}
            >
              {approvingAll ? "Approving…" : `✅ Approve All Pending (${counts.pending})`}
            </button>
          )}
          <button style={S.refreshBtn} onClick={refetch}>↻ Refresh</button>
        </div>
      </div>

      {/* KPI strip */}
      <div style={S.kpiRow}>
        {kpis.map((k) => (
          <div
            key={k.label}
            style={{ ...S.kpiCard, ...(statusFilter === k.filter && k.filter !== "" ? { border: `2px solid ${k.color}` } : {}) }}
            onClick={() => k.filter !== "" && setStatusFilter(k.filter === statusFilter ? "" : k.filter)}
          >
            <div style={{ ...S.kpiDot, background: k.bg }}>
              <span style={{ color: k.color, fontFamily: "Archivo", fontWeight: 800, fontSize: 22 }}>{k.value}</span>
            </div>
            <div>
              <div style={{ ...S.kpiLabel, color: k.color }}>{k.label}</div>
              {k.filter !== "" && <div style={S.kpiHint}>click to filter</div>}
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={S.filters}>
        <select style={S.select} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <select style={S.select} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="">All leave types</option>
          <option value="cl">Casual Leave</option>
          <option value="sl">Sick Leave</option>
          <option value="el">Earned Leave</option>
          <option value="unpaid">Unpaid Leave</option>
        </select>
        {isAdmin && (
          <input
            style={S.search}
            placeholder="Search by employee name or code…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        )}
      </div>

      {/* Table */}
      <div style={S.card}>
        {isLoading ? (
          <div style={S.empty}>Loading leave requests…</div>
        ) : leaves.length === 0 ? (
          <div style={S.empty}>
            No leave requests found
            {statusFilter && ` with status "${statusFilter}"`}.
          </div>
        ) : (
          <table style={S.table}>
            <thead>
              <tr>
                {[
                  ...(isAdmin ? ["Employee"] : []),
                  "Leave Type", "From", "To", "Days", "Reason", "Applied On", "Status",
                  ...(isAdmin ? ["Actions"] : []),
                ].map((h) => (
                  <th key={h} style={S.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {leaves.map((leave, i) => {
                const sc = STATUS_CFG[leave.status] || STATUS_CFG.pending;
                const lt = LEAVE_TYPES[leave.leave_type] || LEAVE_TYPES.cl;
                const days = calcDays(leave.from_date, leave.to_date);
                return (
                  <tr key={leave.id} style={{ background: i % 2 === 0 ? "#fff" : "#FAFBFD" }}>
                    {isAdmin && (
                      <td style={S.td}>
                        <div style={S.empCell}>
                          <div style={S.av}>
                            {(leave.employee_name || "?").slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div style={S.empName}>{leave.employee_name || "—"}</div>
                            <div style={S.empCode}>{leave.emp_code}</div>
                          </div>
                        </div>
                      </td>
                    )}
                    <td style={S.td}>
                      <span style={{ ...S.typePill, background: lt.bg, color: lt.color }}>
                        {lt.label}
                      </span>
                    </td>
                    <td style={S.td}>{fmt(leave.from_date)}</td>
                    <td style={S.td}>{fmt(leave.to_date)}</td>
                    <td style={{ ...S.td, textAlign: "center", fontWeight: 700 }}>{days}</td>
                    <td style={{ ...S.td, maxWidth: 220 }}>
                      <div style={S.reasonCell} title={leave.reason}>{leave.reason}</div>
                      {leave.review_note && (
                        <div style={S.noteCell}>Note: {leave.review_note}</div>
                      )}
                    </td>
                    <td style={{ ...S.td, whiteSpace: "nowrap" }}>
                      {fmt(leave.created_at?.slice(0, 10))}
                    </td>
                    <td style={S.td}>
                      <span style={{ ...S.statusPill, background: sc.bg, color: sc.color }}>
                        {sc.label}
                      </span>
                      {leave.reviewer_name && (
                        <div style={S.reviewerNote}>by {leave.reviewer_name}</div>
                      )}
                    </td>
                    {isAdmin && (
                      <td style={S.td}>
                        {leave.status === "pending" ? (
                          <div style={S.actionBtns}>
                            <button
                              style={S.approveBtn}
                              onClick={() => setModal({ leave, action: "approve" })}
                            >
                              Approve
                            </button>
                            <button
                              style={S.rejectBtn}
                              onClick={() => setModal({ leave, action: "reject" })}
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span style={S.dim}>—</span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {modal && (
        <ActionModal
          leave={modal.leave}
          action={modal.action}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const S = {
  toast:       { position: "fixed", top: 20, right: 24, zIndex: 300, color: "#fff", fontWeight: 600, fontSize: 13.5, padding: "12px 20px", borderRadius: 10, boxShadow: "0 4px 20px rgba(0,0,0,.18)" },
  pageHead:    { display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 16 },
  h1:          { fontFamily: "Archivo", fontSize: 22, fontWeight: 700, color: "#0F1E3D" },
  sub:         { fontSize: 13, color: "#6B7793", marginTop: 3 },
  refreshBtn:      { padding: "9px 16px", border: "1px solid #E2E7F0", borderRadius: 9, background: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", color: "#0F1E3D" },
  approveAllBtn:   { padding: "9px 18px", border: 0, borderRadius: 9, background: "#15966A", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" },

  kpiRow:      { display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" },
  kpiCard:     { flex: "1 1 160px", background: "#fff", border: "1px solid #E2E7F0", borderRadius: 14, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", transition: "border .15s" },
  kpiDot:      { width: 52, height: 52, borderRadius: 12, display: "grid", placeItems: "center", flexShrink: 0 },
  kpiLabel:    { fontSize: 13, fontWeight: 700 },
  kpiHint:     { fontSize: 11, color: "#9AA6BF", marginTop: 2 },

  filters:     { display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" },
  select:      { padding: "9px 12px", border: "1px solid #E2E7F0", borderRadius: 9, fontSize: 13, color: "#0F1E3D", background: "#fff", minWidth: 160 },
  search:      { flex: 1, minWidth: 200, padding: "9px 14px", border: "1px solid #E2E7F0", borderRadius: 9, fontSize: 13 },

  card:        { background: "#fff", border: "1px solid #E2E7F0", borderRadius: 14, overflow: "auto" },
  table:       { width: "100%", borderCollapse: "collapse", minWidth: 860 },
  th:          { padding: "11px 14px", fontSize: 11, fontWeight: 700, color: "#6B7793", textTransform: "uppercase", letterSpacing: ".4px", textAlign: "left", background: "#F8F9FC", borderBottom: "1px solid #E2E7F0", whiteSpace: "nowrap" },
  td:          { padding: "12px 14px", fontSize: 13, color: "#1B2540", borderBottom: "1px solid #F0F2F8", verticalAlign: "top" },

  empCell:     { display: "flex", alignItems: "center", gap: 9 },
  av:          { width: 30, height: 30, borderRadius: 8, background: "#1E3563", color: "#fff", display: "grid", placeItems: "center", fontSize: 10, fontWeight: 700, flexShrink: 0 },
  empName:     { fontWeight: 600, color: "#0F1E3D" },
  empCode:     { fontSize: 11, color: "#6B7793" },

  typePill:    { display: "inline-flex", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700 },
  statusPill:  { display: "inline-flex", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700 },
  reviewerNote:{ fontSize: 11, color: "#9AA6BF", marginTop: 3 },

  reasonCell:  { color: "#1B2540", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 },
  noteCell:    { fontSize: 11, color: "#C0392B", marginTop: 4, fontStyle: "italic" },

  actionBtns:  { display: "flex", gap: 6, flexWrap: "wrap" },
  approveBtn:  { padding: "5px 12px", border: 0, borderRadius: 8, background: "#15966A", color: "#fff", fontWeight: 600, fontSize: 12, cursor: "pointer" },
  rejectBtn:   { padding: "5px 12px", border: "1px solid #E2E7F0", borderRadius: 8, background: "#fff", color: "#C0392B", fontWeight: 600, fontSize: 12, cursor: "pointer" },
  dim:         { color: "#C8D0DF", fontSize: 13 },
  empty:       { padding: 48, textAlign: "center", color: "#9AA6BF", fontSize: 14 },
};

const M = {
  backdrop:    { position: "fixed", inset: 0, background: "rgba(15,30,61,.5)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 },
  modal:       { background: "#fff", borderRadius: 18, width: "100%", maxWidth: 520, boxShadow: "0 20px 60px rgba(0,0,0,.25)", overflow: "hidden" },
  head:        { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 22px", borderBottom: "1px solid #E2E7F0" },
  headTitle:   { fontFamily: "Archivo", fontSize: 17, fontWeight: 700, color: "#0F1E3D" },
  close:       { background: "none", border: 0, fontSize: 18, color: "#6B7793", cursor: "pointer", lineHeight: 1 },
  infoRow:     { display: "flex", gap: 0, borderBottom: "1px solid #F0F2F8" },
  infoCell:    { flex: 1, padding: "14px 18px", borderRight: "1px solid #F0F2F8" },
  infoKey:     { fontSize: 11, fontWeight: 700, color: "#9AA6BF", textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 6 },
  infoVal:     { fontSize: 14, fontWeight: 700, color: "#0F1E3D" },
  infoSub:     { fontSize: 11, color: "#6B7793", marginTop: 2 },
  typeBadge:   { display: "inline-flex", padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700 },
  reasonBox:   { padding: "14px 22px", borderBottom: "1px solid #F0F2F8" },
  reasonTxt:   { fontSize: 13, color: "#1B2540", marginTop: 6, lineHeight: 1.5 },
  field:       { padding: "16px 22px" },
  label:       { display: "block", fontSize: 12, fontWeight: 700, color: "#6B7793", marginBottom: 8, textTransform: "uppercase", letterSpacing: ".4px" },
  textarea:    { width: "100%", padding: "10px 14px", border: "1.5px solid #E2E7F0", borderRadius: 10, fontSize: 13, resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" },
  footer:      { display: "flex", justifyContent: "flex-end", gap: 10, padding: "14px 22px", borderTop: "1px solid #E2E7F0", background: "#F8F9FC" },
  cancelBtn:   { padding: "10px 18px", border: "1px solid #E2E7F0", borderRadius: 9, background: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" },
  actionBtn:   { padding: "10px 22px", border: 0, borderRadius: 9, color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" },
};
