import { useState } from "react";
import {
  useGetCandidatesQuery,
  useGetCandidateStatsQuery,
  useGetRequisitionsQuery,
  useCreateCandidateMutation,
  useUpdateCandidateMutation,
  useDeleteCandidateMutation,
  useMoveCandidateMutation,
  useCreateRequisitionMutation,
} from "./recruitmentApi";
import { useGetSitesQuery } from "../deployment/deploymentApi";

// ── Config ────────────────────────────────────────────────────
const STAGES = ["applied", "screened", "interview", "selected"];

const STAGE_CFG = {
  applied:   { label: "Applied",   color: "#6B7793", bg: "#F0F2F8", accent: "#E2E7F0", dot: "#9AA6BF" },
  screened:  { label: "Screened",  color: "#1565C0", bg: "#EBF3FC", accent: "#C5D4EE", dot: "#1565C0" },
  interview: { label: "Interview", color: "#C98A12", bg: "#FBF1DC", accent: "#F4DC9A", dot: "#E8821E" },
  selected:  { label: "Selected",  color: "#15966A", bg: "#E1F4EC", accent: "#A3D9C0", dot: "#15966A" },
  rejected:  { label: "Rejected",  color: "#D2453F", bg: "#FDECEA", accent: "#F5B0AD", dot: "#D2453F" },
};

const NEXT_STAGE = { applied: "screened", screened: "interview", interview: "selected" };
const PREV_STAGE = { screened: "applied", interview: "screened", selected: "interview" };

const DESIGNATIONS = [
  "Security Guard","Supervisor","Housekeeping","Driver","Data Entry Operator",
  "Peon","Electrician","Plumber","Watchman","Helper","Sweeper","Receptionist",
];

// ── Candidate form (modal) ────────────────────────────────────
function CandidateForm({ candidate, requisitions, onClose }) {
  const isEdit = !!candidate?.id;
  const [form, setForm] = useState({
    full_name:        candidate?.full_name        || "",
    phone:            candidate?.phone            || "",
    designation:      candidate?.designation      || "",
    experience_years: candidate?.experience_years || 0,
    notes:            candidate?.notes            || "",
    stage:            candidate?.stage            || "applied",
    requisition:      candidate?.requisition      || "",
  });
  const [errors, setErrors] = useState({});

  const [create, { isLoading: creating }] = useCreateCandidateMutation();
  const [update, { isLoading: updating }] = useUpdateCandidateMutation();
  const busy = creating || updating;

  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setErrors((e) => ({ ...e, [k]: "" })); };

  const validate = () => {
    const e = {};
    if (!form.full_name.trim())   e.full_name   = "Name required";
    if (!form.phone.trim())       e.phone       = "Phone required";
    if (!/^\d{10}$/.test(form.phone.trim())) e.phone = "Must be 10 digits";
    if (!form.designation.trim()) e.designation = "Designation required";
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    const payload = { ...form, requisition: form.requisition || null };
    try {
      if (isEdit) await update({ id: candidate.id, ...payload }).unwrap();
      else        await create(payload).unwrap();
      onClose();
    } catch (err) {
      setErrors({ submit: err?.data?.detail || "Save failed" });
    }
  };

  const F = (label, key, child) => (
    <div style={FS.field} key={key}>
      <label style={FS.label}>{label}</label>
      {child}
      {errors[key] && <div style={FS.err}>{errors[key]}</div>}
    </div>
  );

  return (
    <div style={FS.overlay} onClick={onClose}>
      <div style={FS.modal} onClick={(e) => e.stopPropagation()}>
        <div style={FS.head}>
          <span style={FS.title}>{isEdit ? "Edit Candidate" : "Add Candidate"}</span>
          <button style={FS.close} onClick={onClose}>✕</button>
        </div>
        <div style={FS.body}>
          {F("Full Name *", "full_name",
            <input style={{ ...FS.input, borderColor: errors.full_name ? "#D2453F" : "#E2E7F0" }}
              value={form.full_name} onChange={(e) => set("full_name", e.target.value)} />
          )}
          {F("Phone *", "phone",
            <input style={{ ...FS.input, borderColor: errors.phone ? "#D2453F" : "#E2E7F0" }}
              value={form.phone} onChange={(e) => set("phone", e.target.value)} maxLength={10} />
          )}
          {F("Designation *", "designation",
            <select style={{ ...FS.input, borderColor: errors.designation ? "#D2453F" : "#E2E7F0" }}
              value={form.designation} onChange={(e) => set("designation", e.target.value)}>
              <option value="">Select...</option>
              {DESIGNATIONS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          )}
          <div style={FS.row}>
            {F("Experience (years)", "experience_years",
              <input style={FS.input} type="number" min={0} max={40}
                value={form.experience_years} onChange={(e) => set("experience_years", +e.target.value)} />
            )}
            {F("Stage", "stage",
              <select style={FS.input} value={form.stage} onChange={(e) => set("stage", e.target.value)}>
                {Object.entries(STAGE_CFG).map(([v, c]) => (
                  <option key={v} value={v}>{c.label}</option>
                ))}
              </select>
            )}
          </div>
          {F("Requisition (optional)", "requisition",
            <select style={FS.input} value={form.requisition || ""} onChange={(e) => set("requisition", e.target.value)}>
              <option value="">None</option>
              {(requisitions || []).map((r) => (
                <option key={r.id} value={r.id}>{r.designation} – {r.site_name}</option>
              ))}
            </select>
          )}
          {F("Notes", "notes",
            <textarea style={{ ...FS.input, height: 72, resize: "vertical" }}
              value={form.notes} onChange={(e) => set("notes", e.target.value)} />
          )}
          {errors.submit && <div style={FS.err}>{errors.submit}</div>}
        </div>
        <div style={FS.foot}>
          <button style={FS.cancel} onClick={onClose}>Cancel</button>
          <button style={FS.save} onClick={handleSubmit} disabled={busy}>
            {busy ? "Saving..." : (isEdit ? "Update" : "Add Candidate")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Requisition form ──────────────────────────────────────────
function RequisitionForm({ sites, onClose }) {
  const [form, setForm] = useState({ site: "", designation: "", count_required: 1 });
  const [errors, setErrors] = useState({});
  const [create, { isLoading }] = useCreateRequisitionMutation();

  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setErrors((e) => ({ ...e, [k]: "" })); };

  const handleSubmit = async () => {
    const e = {};
    if (!form.site)             e.site        = "Site required";
    if (!form.designation)      e.designation = "Designation required";
    if (form.count_required < 1) e.count_required = "Must be at least 1";
    if (Object.keys(e).length) { setErrors(e); return; }
    try {
      await create(form).unwrap();
      onClose();
    } catch (err) {
      setErrors({ submit: err?.data?.detail || "Save failed" });
    }
  };

  const F = (label, key, child) => (
    <div style={FS.field} key={key}>
      <label style={FS.label}>{label}</label>
      {child}
      {errors[key] && <div style={FS.err}>{errors[key]}</div>}
    </div>
  );

  return (
    <div style={FS.overlay} onClick={onClose}>
      <div style={{ ...FS.modal, maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
        <div style={FS.head}>
          <span style={FS.title}>New Requisition</span>
          <button style={FS.close} onClick={onClose}>✕</button>
        </div>
        <div style={FS.body}>
          {F("Site *", "site",
            <select style={{ ...FS.input, borderColor: errors.site ? "#D2453F" : "#E2E7F0" }}
              value={form.site} onChange={(e) => set("site", e.target.value)}>
              <option value="">Select site...</option>
              {(sites || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}
          {F("Designation *", "designation",
            <select style={{ ...FS.input, borderColor: errors.designation ? "#D2453F" : "#E2E7F0" }}
              value={form.designation} onChange={(e) => set("designation", e.target.value)}>
              <option value="">Select...</option>
              {DESIGNATIONS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          )}
          {F("Vacancies *", "count_required",
            <input style={FS.input} type="number" min={1} value={form.count_required}
              onChange={(e) => set("count_required", +e.target.value)} />
          )}
          {errors.submit && <div style={FS.err}>{errors.submit}</div>}
        </div>
        <div style={FS.foot}>
          <button style={FS.cancel} onClick={onClose}>Cancel</button>
          <button style={FS.save} onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? "..." : "Create Requisition"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Candidate card ────────────────────────────────────────────
function CandidateCard({ candidate, onEdit, onDelete, onMove }) {
  const cfg = STAGE_CFG[candidate.stage] || STAGE_CFG.applied;
  const nextS = NEXT_STAGE[candidate.stage];
  const prevS = PREV_STAGE[candidate.stage];
  const nextCfg = nextS ? STAGE_CFG[nextS] : null;

  return (
    <div style={S.kcard}>
      <div style={S.kcardTop}>
        <div style={S.kcardName}>{candidate.full_name}</div>
        <div style={S.kcardActions}>
          <span style={S.kcardActionBtn} onClick={() => onEdit(candidate)} title="Edit">✏</span>
          <span style={{ ...S.kcardActionBtn, color: "#D2453F" }} onClick={() => onDelete(candidate.id)} title="Delete">✕</span>
        </div>
      </div>
      <div style={S.kcardRole}>{candidate.designation}</div>
      {candidate.requisition_label && (
        <div style={S.kcardReq}>{candidate.requisition_label}</div>
      )}
      <div style={S.kcardMeta}>
        {candidate.experience_years > 0 && (
          <span style={S.tag}>{candidate.experience_years} yr exp</span>
        )}
        {candidate.phone && (
          <span style={{ ...S.tag, background: "#EBF3FC", color: "#1565C0" }}>{candidate.phone}</span>
        )}
      </div>
      {candidate.notes && (
        <div style={S.kcardNotes}>{candidate.notes.slice(0, 70)}{candidate.notes.length > 70 ? "…" : ""}</div>
      )}
      <div style={S.kcardFoot}>
        {prevS && (
          <button style={S.moveBtn} onClick={() => onMove(candidate.id, prevS)}>
            ← {STAGE_CFG[prevS].label}
          </button>
        )}
        {candidate.stage !== "rejected" && (
          <button style={{ ...S.moveBtn, color: "#D2453F", marginLeft: "auto" }}
            onClick={() => onMove(candidate.id, "rejected")}>
            Reject
          </button>
        )}
        {nextCfg && (
          <button style={{ ...S.moveBtn, ...S.moveBtnNext, background: nextCfg.bg, color: nextCfg.color, borderColor: nextCfg.accent }}
            onClick={() => onMove(candidate.id, nextS)}>
            {nextCfg.label} →
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────
export default function RecruitmentPage() {
  const [showCandidateForm, setShowCandidateForm] = useState(false);
  const [showReqForm, setShowReqForm]             = useState(false);
  const [editCandidate, setEditCandidate]         = useState(null);
  const [showRejected, setShowRejected]           = useState(false);
  const [search, setSearch]                       = useState("");

  const { data: statsData }      = useGetCandidateStatsQuery();
  const { data: candidatesData, isLoading } = useGetCandidatesQuery(
    search ? { search } : undefined
  );
  const { data: reqData }        = useGetRequisitionsQuery();
  const { data: sitesData }      = useGetSitesQuery();

  const [moveCandidate]   = useMoveCandidateMutation();
  const [deleteCandidate] = useDeleteCandidateMutation();

  const candidates  = candidatesData?.results || candidatesData || [];
  const requisitions = reqData?.results || reqData || [];
  const sites       = sitesData?.results || sitesData || [];
  const stats       = statsData || {};

  const byStage = (stage) => candidates.filter((c) => c.stage === stage);

  const handleMove = async (id, stage) => {
    try { await moveCandidate({ id, stage }).unwrap(); }
    catch {}
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this candidate?")) return;
    try { await deleteCandidate(id).unwrap(); }
    catch {}
  };

  const handleEdit = (c) => { setEditCandidate(c); setShowCandidateForm(true); };
  const handleAddClose = () => { setShowCandidateForm(false); setEditCandidate(null); };

  return (
    <div>
      {/* Modals */}
      {showCandidateForm && (
        <CandidateForm candidate={editCandidate} requisitions={requisitions} onClose={handleAddClose} />
      )}
      {showReqForm && (
        <RequisitionForm sites={sites} onClose={() => setShowReqForm(false)} />
      )}

      {/* Header */}
      <div style={S.pageHead}>
        <div>
          <h1 style={S.h1}>Recruitment Pipeline</h1>
          <p style={S.sub}>Track candidates from application to deployment</p>
        </div>
        <div style={S.headActions}>
          <input style={S.search} placeholder="Search name / phone..." value={search}
            onChange={(e) => setSearch(e.target.value)} />
          <button style={S.btnOutline} onClick={() => setShowReqForm(true)}>+ Requisition</button>
          <button style={S.btnSolid} onClick={() => { setEditCandidate(null); setShowCandidateForm(true); }}>
            + Add Candidate
          </button>
        </div>
      </div>

      {/* Stats strip */}
      <div style={S.statsStrip}>
        {[
          ["Total", stats.total || 0, "#0F1E3D"],
          ...STAGES.map((s) => [STAGE_CFG[s].label, stats[s] || 0, STAGE_CFG[s].color]),
          ["Rejected", stats.rejected || 0, "#D2453F"],
        ].map(([label, count, color]) => (
          <div key={label} style={S.statPill}>
            <span style={{ ...S.statNum, color }}>{count}</span>
            <span style={S.statLabel}>{label}</span>
          </div>
        ))}
        <button
          style={{ ...S.btnOutline, marginLeft: "auto", fontSize: 12 }}
          onClick={() => setShowRejected((v) => !v)}
        >
          {showRejected ? "Hide Rejected" : "Show Rejected"}
        </button>
      </div>

      {/* Kanban board */}
      {isLoading ? (
        <div style={S.loading}>Loading pipeline...</div>
      ) : (
        <div style={{ ...S.kanban, gridTemplateColumns: showRejected ? "repeat(5,1fr)" : "repeat(4,1fr)" }}>
          {[...STAGES, ...(showRejected ? ["rejected"] : [])].map((stage) => {
            const cfg   = STAGE_CFG[stage];
            const cards = byStage(stage);
            return (
              <div key={stage} style={{ ...S.col, borderTop: `3px solid ${cfg.dot}` }}>
                <div style={S.colHead}>
                  <div style={S.colHeadLeft}>
                    <span style={{ ...S.colDot, background: cfg.dot }} />
                    <span style={{ color: cfg.color, fontWeight: 700 }}>{cfg.label}</span>
                  </div>
                  <span style={{ ...S.cnt, background: cfg.bg, color: cfg.color }}>
                    {cards.length}
                  </span>
                </div>

                {cards.length === 0 && (
                  <div style={S.emptyCol}>No candidates</div>
                )}

                {cards.map((c) => (
                  <CandidateCard
                    key={c.id}
                    candidate={c}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onMove={handleMove}
                  />
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* Requisitions sidebar — small list at bottom */}
      {requisitions.length > 0 && (
        <div style={S.reqSection}>
          <div style={S.reqTitle}>Open Requisitions</div>
          <div style={S.reqList}>
            {requisitions.filter((r) => r.is_open).map((r) => (
              <div key={r.id} style={S.reqCard}>
                <div style={S.reqName}>{r.designation}</div>
                <div style={S.reqSite}>{r.site_name} · {r.district}</div>
                <div style={S.reqCount}>
                  <span style={S.reqFilled}>{r.filled_count}</span>
                  <span style={S.reqTotal}>/{r.count_required} filled</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────
const S = {
  pageHead:    { display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 14 },
  h1:          { fontFamily: "Archivo", fontSize: 22, fontWeight: 700, color: "#0F1E3D" },
  sub:         { fontSize: 13, color: "#6B7793", marginTop: 3 },
  headActions: { display: "flex", gap: 9, alignItems: "center" },
  search:      { padding: "8px 12px", border: "1px solid #E2E7F0", borderRadius: 9, fontSize: 13, fontFamily: "inherit", background: "#fff", width: 200 },
  btnOutline:  { padding: "8px 14px", borderRadius: 9, border: "1px solid #E2E7F0", background: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" },
  btnSolid:    { padding: "8px 14px", borderRadius: 9, border: 0, background: "#E8821E", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" },

  statsStrip:  { display: "flex", alignItems: "center", gap: 6, background: "#fff", border: "1px solid #E2E7F0", borderRadius: 10, padding: "10px 16px", marginBottom: 14 },
  statPill:    { display: "flex", flexDirection: "column", alignItems: "center", padding: "0 10px", borderRight: "1px solid #E2E7F0" },
  statNum:     { fontFamily: "Archivo", fontSize: 18, fontWeight: 800 },
  statLabel:   { fontSize: 10.5, color: "#9AA6BF", fontWeight: 600, textTransform: "uppercase" },

  kanban:      { display: "grid", gap: 12, marginBottom: 18 },
  col:         { background: "#F8F9FC", border: "1px solid #E2E7F0", borderRadius: 12, padding: 11, minHeight: 120 },
  colHead:     { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  colHeadLeft: { display: "flex", alignItems: "center", gap: 7 },
  colDot:      { width: 8, height: 8, borderRadius: "50%", flexShrink: 0 },
  cnt:         { borderRadius: 30, fontSize: 11.5, fontWeight: 700, padding: "2px 9px" },
  emptyCol:    { fontSize: 12, color: "#9AA6BF", textAlign: "center", padding: "20px 0" },

  kcard:       { background: "#fff", border: "1px solid #E2E7F0", borderRadius: 10, padding: "10px 11px", marginBottom: 9, boxShadow: "0 1px 3px rgba(15,30,61,.04)" },
  kcardTop:    { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 6 },
  kcardName:   { fontSize: 13, fontWeight: 700, color: "#0F1E3D", lineHeight: 1.3 },
  kcardActions:{ display: "flex", gap: 6, flexShrink: 0 },
  kcardActionBtn: { fontSize: 12, cursor: "pointer", color: "#6B7793", padding: "1px 4px" },
  kcardRole:   { fontSize: 11.5, color: "#6B7793", marginTop: 2 },
  kcardReq:    { fontSize: 10.5, color: "#1565C0", background: "#EBF3FC", borderRadius: 5, padding: "2px 6px", display: "inline-block", marginTop: 4 },
  kcardMeta:   { display: "flex", gap: 5, marginTop: 7, flexWrap: "wrap" },
  kcardNotes:  { fontSize: 11, color: "#9AA6BF", marginTop: 6, fontStyle: "italic", lineHeight: 1.4 },
  kcardFoot:   { display: "flex", gap: 5, marginTop: 9, flexWrap: "wrap" },
  tag:         { fontSize: 10.5, fontWeight: 600, padding: "2px 7px", borderRadius: 5, background: "#F4F6FA", color: "#6B7793" },
  moveBtn:     { fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 6, border: "1px solid #E2E7F0", background: "#fff", cursor: "pointer", color: "#6B7793" },
  moveBtnNext: { marginLeft: "auto" },

  loading:     { textAlign: "center", padding: 40, color: "#9AA6BF", fontSize: 14 },

  reqSection:  { marginTop: 4 },
  reqTitle:    { fontSize: 13, fontWeight: 700, color: "#6B7793", textTransform: "uppercase", letterSpacing: ".5px", marginBottom: 9 },
  reqList:     { display: "flex", gap: 10, flexWrap: "wrap" },
  reqCard:     { background: "#fff", border: "1px solid #E2E7F0", borderRadius: 10, padding: "10px 14px", minWidth: 200 },
  reqName:     { fontSize: 13, fontWeight: 700, color: "#0F1E3D" },
  reqSite:     { fontSize: 11.5, color: "#6B7793", marginTop: 2 },
  reqCount:    { marginTop: 8 },
  reqFilled:   { fontSize: 16, fontWeight: 800, color: "#15966A", fontFamily: "Archivo" },
  reqTotal:    { fontSize: 12, color: "#9AA6BF", marginLeft: 2 },
};

// ── Form styles ───────────────────────────────────────────────
const FS = {
  overlay: { position: "fixed", inset: 0, background: "rgba(15,30,61,.45)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" },
  modal:   { background: "#fff", borderRadius: 16, width: "92%", maxWidth: 520, boxShadow: "0 20px 60px rgba(0,0,0,.25)", display: "flex", flexDirection: "column", maxHeight: "90vh", overflow: "hidden" },
  head:    { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #E2E7F0" },
  title:   { fontFamily: "Archivo", fontSize: 15, fontWeight: 700, color: "#0F1E3D" },
  close:   { background: "none", border: 0, fontSize: 18, cursor: "pointer", color: "#6B7793", padding: "0 4px" },
  body:    { padding: "18px 20px", overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 12 },
  foot:    { display: "flex", gap: 10, justifyContent: "flex-end", padding: "14px 20px", borderTop: "1px solid #E2E7F0" },
  field:   { display: "flex", flexDirection: "column", gap: 5 },
  label:   { fontSize: 12.5, fontWeight: 600, color: "#6B7793" },
  input:   { padding: "8px 11px", border: "1px solid #E2E7F0", borderRadius: 8, fontSize: 13, fontFamily: "inherit", background: "#fff", outline: "none", width: "100%", boxSizing: "border-box" },
  row:     { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  err:     { fontSize: 11.5, color: "#D2453F" },
  cancel:  { padding: "9px 16px", border: "1px solid #E2E7F0", borderRadius: 9, background: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" },
  save:    { padding: "9px 20px", border: 0, borderRadius: 9, background: "#E8821E", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" },
};
