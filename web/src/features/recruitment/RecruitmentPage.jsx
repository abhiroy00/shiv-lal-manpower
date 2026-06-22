const STAGES = ["applied", "screened", "interview", "selected"];
const STAGE_LABELS = { applied: "Applied", screened: "Screened", interview: "Interview", selected: "Selected" };

const SAMPLE = [
  { id: 1, full_name: "Rohit Verma", designation: "Security Guard", stage: "applied", tags: ["5 yr exp", "Ex-Army"] },
  { id: 2, full_name: "Kavita Singh", designation: "Housekeeping", stage: "applied", tags: ["2 yr exp"] },
  { id: 3, full_name: "Sanjay Mishra", designation: "Supervisor", stage: "screened", tags: ["Docs ✓"] },
  { id: 4, full_name: "Reena Devi", designation: "Housekeeping", stage: "screened", tags: ["Verified"] },
  { id: 5, full_name: "Arun Pandey", designation: "Data Entry", stage: "interview", tags: ["Tomorrow 11 AM"] },
  { id: 6, full_name: "Praveen Joshi", designation: "Driver", stage: "selected", tags: ["Onboarding"] },
];

export default function RecruitmentPage() {
  return (
    <div>
      <div style={S.pageHead}>
        <div>
          <h1 style={S.h1}>Recruitment Module</h1>
          <p style={S.sub}>Pipeline for new manpower hiring against tender requirements</p>
        </div>
        <div style={S.actions}>
          <button style={S.btn}>+ New Requisition</button>
          <button style={S.btnSolid}>+ Add Candidate</button>
        </div>
      </div>

      <div style={S.kanban}>
        {STAGES.map((stage) => {
          const cards = SAMPLE.filter((c) => c.stage === stage);
          return (
            <div key={stage} style={S.col}>
              <div style={S.colHead}>
                <span>{STAGE_LABELS[stage]}</span>
                <span style={S.cnt}>{cards.length}</span>
              </div>
              {cards.map((c) => (
                <div key={c.id} style={S.kcard}>
                  <div style={S.kcardName}>{c.full_name}</div>
                  <div style={S.kcardRole}>{c.designation}</div>
                  <div style={S.tags}>
                    {c.tags.map((t) => <span key={t} style={S.tag}>{t}</span>)}
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const S = {
  pageHead: { display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 18 },
  h1: { fontFamily: "Archivo", fontSize: 22, fontWeight: 700, color: "#0F1E3D" },
  sub: { fontSize: 13, color: "#6B7793", marginTop: 3 },
  actions: { display: "flex", gap: 9 },
  btn: { padding: "9px 14px", borderRadius: 9, border: "1px solid #E2E7F0", background: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" },
  btnSolid: { padding: "9px 14px", borderRadius: 9, border: 0, background: "#E8821E", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" },
  kanban: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 13 },
  col: { background: "#F4F6FA", border: "1px solid #E2E7F0", borderRadius: 12, padding: 11 },
  colHead: { display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12.5, fontWeight: 700, color: "#0F1E3D", marginBottom: 10 },
  cnt: { background: "#fff", border: "1px solid #E2E7F0", borderRadius: 30, fontSize: 11, padding: "1px 8px", color: "#6B7793" },
  kcard: { background: "#fff", border: "1px solid #E2E7F0", borderRadius: 10, padding: 11, marginBottom: 9 },
  kcardName: { fontSize: 13, fontWeight: 600, color: "#0F1E3D" },
  kcardRole: { fontSize: 11.5, color: "#6B7793", marginTop: 2 },
  tags: { display: "flex", gap: 6, marginTop: 9, flexWrap: "wrap" },
  tag: { fontSize: 10.5, fontWeight: 600, padding: "3px 7px", borderRadius: 6, background: "#FCEFDD", color: "#B25E0A" },
};
