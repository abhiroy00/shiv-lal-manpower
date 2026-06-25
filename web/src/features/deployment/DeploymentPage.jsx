import { useState } from "react";
import {
  useGetSitesQuery,
  useGetSiteSummaryQuery,
  useGetSiteEmployeesQuery,
  useGetStatesQuery,
  useCreateStateMutation,
  useGetDistrictsQuery,
  useCreateDistrictMutation,
  useTransferEmployeeMutation,
  useBulkTransferMutation,
  useCreateSiteMutation,
  useUpdateSiteMutation,
} from "./deploymentApi";

// ── helpers ───────────────────────────────────────────────────
function fillColor(pct) {
  if (pct >= 90) return { bar: "#15966A", badge: "#E1F4EC", text: "#15966A", label: "Full" };
  if (pct >= 60) return { bar: "#E8821E", badge: "#FBF1DC", text: "#C98A12", label: "Partial" };
  return      { bar: "#D2453F", badge: "#FDECEA", text: "#D2453F", label: "Critical" };
}

// ── Inline creator (reusable) ─────────────────────────────────
function InlineCreate({ placeholder, onCreate, busy }) {
  const [val, setVal] = useState("");
  return (
    <div style={F.inlineRow}>
      <input style={F.inlineInput} placeholder={placeholder}
        value={val} onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && val.trim() && onCreate(val.trim(), () => setVal(""))} />
      <button style={{ ...F.inlineBtn, opacity: !val.trim() || busy ? .5 : 1 }}
        disabled={!val.trim() || busy}
        onClick={() => onCreate(val.trim(), () => setVal(""))}>
        {busy ? "..." : "Create"}
      </button>
    </div>
  );
}

// ── Site form modal (create / edit) ──────────────────────────
const BLANK_SITE = { name: "", address: "", lat: "", lng: "", geofence_radius: 200, sanctioned_strength: 0, is_active: true };

function SiteFormModal({ site, onClose }) {
  const isEdit = !!site;

  // Step 1 — State (site serializer now includes district_state_id)
  const [stateId,      setStateId]      = useState(isEdit ? String(site.district_state_id ?? "") : "");
  const [showNewState, setShowNewState] = useState(false);

  // Step 2 — District
  const [districtId,      setDistrictId]      = useState(isEdit ? String(site.district) : "");
  const [showNewDistrict, setShowNewDistrict] = useState(false);

  // Step 3 — Site fields
  const [form, setForm] = useState(
    isEdit
      ? { name: site.name, address: site.address || "",
          lat: site.lat ?? "", lng: site.lng ?? "",
          geofence_radius: site.geofence_radius,
          sanctioned_strength: site.sanctioned_strength,
          is_active: site.is_active }
      : { ...BLANK_SITE }
  );
  const [err, setErr] = useState("");

  const { data: statesRaw }    = useGetStatesQuery();
  const { data: districtsRaw } = useGetDistrictsQuery(stateId || undefined);

  const states    = statesRaw?.results    || statesRaw    || [];
  const districts = districtsRaw?.results || districtsRaw || [];

  const [createState,    { isLoading: creatingState }]    = useCreateStateMutation();
  const [createDistrict, { isLoading: creatingDistrict }] = useCreateDistrictMutation();
  const [createSite,     { isLoading: creatingSite }]     = useCreateSiteMutation();
  const [updateSite,     { isLoading: updatingSite }]     = useUpdateSiteMutation();
  const saveBusy = creatingSite || updatingSite;

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleAddState = async (name, reset) => {
    try {
      const res = await createState({ name }).unwrap();
      setStateId(String(res.id));
      setDistrictId("");
      setShowNewState(false);
      reset();
    } catch (e) {
      setErr(e?.data?.name?.[0] || "Could not create state.");
    }
  };

  const handleAddDistrict = async (name, reset) => {
    if (!stateId) return setErr("Select a state first.");
    try {
      const res = await createDistrict({ name, state: stateId }).unwrap();
      setDistrictId(String(res.id));
      setShowNewDistrict(false);
      reset();
    } catch (e) {
      setErr(e?.data?.name?.[0] || "Could not create district.");
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) return setErr("Site name is required.");
    if (!districtId)       return setErr("District is required.");
    setErr("");
    const body = {
      ...form,
      district: districtId,
      lat: form.lat !== "" ? form.lat : null,
      lng: form.lng !== "" ? form.lng : null,
    };
    try {
      if (isEdit) await updateSite({ id: site.id, ...body }).unwrap();
      else        await createSite(body).unwrap();
      onClose();
    } catch (e) {
      setErr(JSON.stringify(e?.data || "Save failed"));
    }
  };

  const selectedState    = states.find((s) => String(s.id) === String(stateId));
  const selectedDistrict = districts.find((d) => String(d.id) === String(districtId));

  return (
    <div style={F.overlay} onClick={onClose}>
      <div style={F.box} onClick={(e) => e.stopPropagation()}>
        <div style={F.head}>
          <span style={F.title}>{isEdit ? "Edit Site" : "Create New Site"}</span>
          <button style={F.close} onClick={onClose}>✕</button>
        </div>
        <div style={F.body}>
          {err && <div style={F.err}>{err}</div>}

          {/* ── Step 1: State ───────────────────────── */}
          <div style={F.stepHead}>
            <span style={F.stepNum}>1</span>
            <span style={F.stepLabel}>State</span>
            {selectedState && <span style={F.stepDone}>{selectedState.name} ✓</span>}
          </div>
          <div style={F.fieldRow}>
            <select style={{ ...F.input, flex: 1 }} value={stateId}
              onChange={(e) => { setStateId(e.target.value); setDistrictId(""); setShowNewDistrict(false); }}>
              <option value="">Select state...</option>
              {states.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <button style={F.addBtn} onClick={() => setShowNewState((v) => !v)}>
              {showNewState ? "Cancel" : "+ New"}
            </button>
          </div>
          {showNewState && (
            <InlineCreate placeholder="State name (e.g. Uttar Pradesh)"
              onCreate={handleAddState} busy={creatingState} />
          )}

          {/* ── Step 2: District ────────────────────── */}
          <div style={{ ...F.stepHead, opacity: stateId ? 1 : .45, marginTop: 16 }}>
            <span style={F.stepNum}>2</span>
            <span style={F.stepLabel}>District</span>
            {selectedDistrict && <span style={F.stepDone}>{selectedDistrict.name} ✓</span>}
          </div>
          <div style={F.fieldRow}>
            <select style={{ ...F.input, flex: 1 }} value={districtId} disabled={!stateId}
              onChange={(e) => setDistrictId(e.target.value)}>
              <option value="">{stateId ? "Select district..." : "Select a state first"}</option>
              {districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <button style={{ ...F.addBtn, opacity: stateId ? 1 : .4 }}
              disabled={!stateId} onClick={() => setShowNewDistrict((v) => !v)}>
              {showNewDistrict ? "Cancel" : "+ New"}
            </button>
          </div>
          {showNewDistrict && (
            <InlineCreate placeholder={`District in ${selectedState?.name || "selected state"}...`}
              onCreate={handleAddDistrict} busy={creatingDistrict} />
          )}

          {/* ── Step 3: Site details ────────────────── */}
          <div style={{ ...F.stepHead, opacity: districtId ? 1 : .45, marginTop: 16 }}>
            <span style={F.stepNum}>3</span>
            <span style={F.stepLabel}>Site Details</span>
          </div>

          <label style={F.label}>Site Name *</label>
          <input style={F.input} value={form.name} disabled={!districtId}
            onChange={(e) => set("name", e.target.value)}
            placeholder="e.g. Main Gate Security Post" />

          <label style={F.label}>Address</label>
          <textarea style={{ ...F.input, height: 52, resize: "vertical" }} value={form.address}
            onChange={(e) => set("address", e.target.value)}
            placeholder="Full postal address (optional)" />

          <div style={F.hint2}>
            Geofence: employees within the radius are auto-marked Present/Late.
            Leave lat/lng blank → every check-in goes to <strong>Under Review</strong>.
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 8 }}>
            <div>
              <label style={F.label}>Latitude</label>
              <input style={F.input} type="number" step="0.0000001" value={form.lat}
                onChange={(e) => set("lat", e.target.value)} placeholder="28.8368" />
            </div>
            <div>
              <label style={F.label}>Longitude</label>
              <input style={F.input} type="number" step="0.0000001" value={form.lng}
                onChange={(e) => set("lng", e.target.value)} placeholder="77.1084" />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 8 }}>
            <div>
              <label style={F.label}>Geofence Radius (m)</label>
              <input style={F.input} type="number" min="50" value={form.geofence_radius}
                onChange={(e) => set("geofence_radius", Number(e.target.value))} />
            </div>
            <div>
              <label style={F.label}>Sanctioned Strength</label>
              <input style={F.input} type="number" min="0" value={form.sanctioned_strength}
                onChange={(e) => set("sanctioned_strength", Number(e.target.value))} />
            </div>
          </div>

          <label style={{ ...F.label, display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
            <input type="checkbox" checked={form.is_active}
              onChange={(e) => set("is_active", e.target.checked)} />
            Active Site
          </label>

          <button style={{ ...F.btn, opacity: saveBusy || !districtId ? .5 : 1, marginTop: 18 }}
            onClick={handleSave} disabled={saveBusy || !districtId}>
            {saveBusy ? "Saving..." : isEdit ? "Save Changes" : "Create Site"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Transfer modal ────────────────────────────────────────────
function TransferModal({ employee, sites, currentSiteId, onClose }) {
  const [targetSite, setTargetSite] = useState("");
  const [transfer, { isLoading }]   = useTransferEmployeeMutation();
  const [done, setDone]             = useState(false);

  const handleTransfer = async () => {
    if (!targetSite) return;
    await transfer({ employeeId: employee.id, siteId: targetSite });
    setDone(true);
    setTimeout(onClose, 1200);
  };

  const otherSites = (sites || []).filter((s) => s.id !== currentSiteId);

  return (
    <div style={M.overlay} onClick={onClose}>
      <div style={M.box} onClick={(e) => e.stopPropagation()}>
        <div style={M.head}>
          <span style={M.title}>Transfer Employee</span>
          <button style={M.close} onClick={onClose}>✕</button>
        </div>
        <div style={M.body}>
          <div style={M.empRow}>
            <div style={M.av}>{(employee.full_name || "?").slice(0, 2).toUpperCase()}</div>
            <div>
              <div style={M.empName}>{employee.full_name}</div>
              <div style={M.empMeta}>{employee.emp_code} · {employee.designation}</div>
            </div>
          </div>
          {done ? (
            <div style={M.success}>Transferred successfully!</div>
          ) : (
            <>
              <label style={M.label}>Transfer to Site</label>
              <select style={M.sel} value={targetSite} onChange={(e) => setTargetSite(e.target.value)}>
                <option value="">Select target site...</option>
                {otherSites.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.district_name})</option>
                ))}
              </select>
              <button style={{ ...M.btn, opacity: !targetSite ? .5 : 1 }}
                onClick={handleTransfer} disabled={!targetSite || isLoading}>
                {isLoading ? "Transferring..." : "Confirm Transfer"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Site employees panel ──────────────────────────────────────
function SitePanel({ site, sites, onClose }) {
  const { data: empsData, isLoading } = useGetSiteEmployeesQuery(site.id);
  const [transferEmp, setTransferEmp] = useState(null);
  const [search, setSearch]           = useState("");
  const [selected, setSelected]       = useState([]);
  const [bulkSite, setBulkSite]       = useState("");
  const [bulkTransfer, { isLoading: bulkBusy }] = useBulkTransferMutation();
  const [bulkDone, setBulkDone]       = useState(false);

  const emps = (empsData || []).filter((e) =>
    !search || e.full_name.toLowerCase().includes(search.toLowerCase()) ||
    e.designation.toLowerCase().includes(search.toLowerCase())
  );

  const fc = fillColor(site.fill_pct);

  const toggleSelect = (id) =>
    setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);

  const handleBulk = async () => {
    if (!bulkSite || !selected.length) return;
    await bulkTransfer({ employeeIds: selected, siteId: bulkSite });
    setBulkDone(true);
    setSelected([]);
    setTimeout(() => setBulkDone(false), 2000);
  };

  const otherSites = (sites || []).filter((s) => s.id !== site.id);

  return (
    <div style={P.wrap}>
      {transferEmp && (
        <TransferModal
          employee={transferEmp}
          sites={sites}
          currentSiteId={site.id}
          onClose={() => setTransferEmp(null)}
        />
      )}

      {/* Panel header */}
      <div style={P.head}>
        <div>
          <div style={P.siteName}>{site.name}</div>
          <div style={P.siteMeta}>{site.district_name} · {site.state_name}</div>
        </div>
        <button style={P.close} onClick={onClose}>✕</button>
      </div>

      {/* Strength cards */}
      <div style={P.kpiRow}>
        {[
          ["Sanctioned", site.sanctioned_strength, "#1E3563"],
          ["Deployed",   site.deployed_count,       "#15966A"],
          ["Present Today", site.present_today,     "#E8821E"],
          ["Vacancy",    site.vacancy,               site.vacancy > 0 ? "#D2453F" : "#9AA6BF"],
        ].map(([label, val, color]) => (
          <div key={label} style={P.kpi}>
            <div style={{ ...P.kpiVal, color }}>{val ?? "—"}</div>
            <div style={P.kpiLabel}>{label}</div>
          </div>
        ))}
      </div>

      {/* Fill rate bar */}
      <div style={P.fillBar}>
        <div style={{ ...P.fillFill, width: Math.min(site.fill_pct, 100) + "%", background: fc.bar }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{ fontSize: 11, color: "#9AA6BF" }}>Fill Rate</span>
        <span style={{ ...P.badge, background: fc.badge, color: fc.text }}>{fc.label} · {site.fill_pct}%</span>
      </div>

      {/* Bulk transfer bar */}
      {selected.length > 0 && (
        <div style={P.bulkBar}>
          <span style={P.bulkCount}>{selected.length} selected</span>
          <select style={P.bulkSel} value={bulkSite} onChange={(e) => setBulkSite(e.target.value)}>
            <option value="">Move to site...</option>
            {otherSites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <button style={P.bulkBtn} onClick={handleBulk} disabled={!bulkSite || bulkBusy}>
            {bulkBusy ? "..." : bulkDone ? "Done!" : "Transfer"}
          </button>
          <button style={P.bulkCancel} onClick={() => setSelected([])}>Cancel</button>
        </div>
      )}

      {/* Search */}
      <input style={P.search} placeholder="Search employees..."
        value={search} onChange={(e) => setSearch(e.target.value)} />

      {/* Employee list */}
      <div style={P.empList}>
        {isLoading && <div style={P.dim}>Loading...</div>}
        {!isLoading && emps.length === 0 && <div style={P.dim}>No employees found</div>}
        {emps.map((emp) => (
          <div key={emp.id} style={{ ...P.empRow, background: selected.includes(emp.id) ? "#EEF3FB" : "#fff" }}>
            <input type="checkbox" checked={selected.includes(emp.id)}
              onChange={() => toggleSelect(emp.id)} style={{ marginRight: 10, cursor: "pointer" }} />
            <div style={P.av}>{(emp.full_name || "?").slice(0, 2).toUpperCase()}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={P.empName}>{emp.full_name}</div>
              <div style={P.empMeta}>{emp.emp_code} · {emp.designation}</div>
            </div>
            <button style={P.transferBtn} onClick={() => setTransferEmp(emp)}>Transfer</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────
export default function DeploymentPage() {
  const [selectedSite, setSelectedSite] = useState(null);
  const [stateFilter, setStateFilter]   = useState("");
  const [search, setSearch]             = useState("");
  const [siteForm, setSiteForm]         = useState(null); // null=closed, true=new, site=edit

  const { data: sitesData, isLoading } = useGetSitesQuery();
  const { data: summary }              = useGetSiteSummaryQuery();

  const allSites = sitesData?.results || sitesData || [];
  const states   = [...new Set(allSites.map((s) => s.state_name))].sort();

  const sites = allSites.filter((s) => {
    const matchState  = !stateFilter || s.state_name === stateFilter;
    const matchSearch = !search || s.name.toLowerCase().includes(search.toLowerCase()) ||
                        s.district_name.toLowerCase().includes(search.toLowerCase());
    return matchState && matchSearch;
  });

  return (
    <div style={S.page}>
      {siteForm && (
        <SiteFormModal
          site={siteForm === true ? null : siteForm}
          onClose={() => setSiteForm(null)}
        />
      )}

      {/* Left — site table */}
      <div style={{ flex: selectedSite ? "1 1 55%" : "1 1 100%", minWidth: 0, transition: "flex .2s" }}>
        {/* Header */}
        <div style={{ ...S.pageHead, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <h1 style={S.h1}>Deployment Management</h1>
            <p style={S.sub}>Site-wise manpower strength · click a site to manage employees</p>
          </div>
          <button style={S.newBtn} onClick={() => setSiteForm(true)}>+ New Site</button>
        </div>

        {/* KPI strip */}
        {summary && (
          <div style={S.kpiStrip}>
            {[
              ["Sanctioned",  summary.total_sanctioned, "#1E3563"],
              ["Deployed",    summary.total_deployed,   "#15966A"],
              ["Present Today",summary.total_present,   "#E8821E"],
              ["Vacancy",     summary.total_vacancy,    summary.total_vacancy > 5 ? "#D2453F" : "#9AA6BF"],
              ["Fill Rate",   summary.fill_pct + "%",   "#1E3563"],
              ["Att Rate",    summary.att_pct + "%",    "#15966A"],
            ].map(([label, val, color]) => (
              <div key={label} style={S.kpi}>
                <div style={{ ...S.kpiVal, color }}>{val}</div>
                <div style={S.kpiLabel}>{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div style={S.filters}>
          <input style={S.search} placeholder="Search site / district..."
            value={search} onChange={(e) => setSearch(e.target.value)} />
          <select style={S.sel} value={stateFilter} onChange={(e) => setStateFilter(e.target.value)}>
            <option value="">All States</option>
            {states.map((st) => <option key={st}>{st}</option>)}
          </select>
          <span style={S.count}>{sites.length} sites</span>
        </div>

        {/* Table */}
        <div style={S.tableWrap}>
          <table style={S.table}>
            <thead>
              <tr>
                {["Site", "District", "State", "Sanctioned", "Deployed", "Present Today", "Vacancy", "Fill %", "Health", ""].map((h) => (
                  <th key={h} style={S.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={10} style={S.tdCenter}>Loading sites...</td></tr>
              )}
              {sites.map((site, idx) => {
                const fc      = fillColor(site.fill_pct);
                const active  = selectedSite?.id === site.id;
                return (
                  <tr key={site.id}
                    style={{ background: active ? "#EEF3FB" : idx % 2 === 0 ? "#fff" : "#F8F9FC", cursor: "pointer" }}
                    onClick={() => setSelectedSite(active ? null : site)}>
                    <td style={{ ...S.td, fontWeight: 600, color: "#0F1E3D" }}>{site.name}</td>
                    <td style={S.td}>{site.district_name}</td>
                    <td style={S.td}>{site.state_name}</td>
                    <td style={{ ...S.td, textAlign: "center" }}>{site.sanctioned_strength}</td>
                    <td style={{ ...S.td, textAlign: "center", fontWeight: 600, color: "#15966A" }}>{site.deployed_count}</td>
                    <td style={{ ...S.td, textAlign: "center", color: "#E8821E", fontWeight: 600 }}>{site.present_today}</td>
                    <td style={{ ...S.td, textAlign: "center", color: site.vacancy > 0 ? "#D2453F" : "#9AA6BF" }}>{site.vacancy}</td>
                    <td style={{ ...S.td, textAlign: "center" }}>
                      <div style={S.bar}>
                        <div style={{ ...S.barFill, width: Math.min(site.fill_pct, 100) + "%", background: fc.bar }} />
                      </div>
                    </td>
                    <td style={S.td}>
                      <span style={{ ...S.badge, background: fc.badge, color: fc.text }}>
                        {fc.label} · {site.fill_pct}%
                      </span>
                    </td>
                    <td style={{ ...S.td, display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={S.detailLink}>
                        {active ? "Close ✕" : "Details →"}
                      </span>
                      <button style={S.editBtn}
                        onClick={(e) => { e.stopPropagation(); setSiteForm(site); }}>
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!isLoading && sites.length === 0 && (
                <tr><td colSpan={10} style={S.tdCenter}>No sites found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Right — site detail panel */}
      {selectedSite && (
        <div style={S.panel}>
          <SitePanel
            site={selectedSite}
            sites={allSites}
            onClose={() => setSelectedSite(null)}
          />
        </div>
      )}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────
const S = {
  page:      { display: "flex", gap: 16, minWidth: 0 },
  pageHead:  { marginBottom: 14 },
  h1:        { fontFamily: "Archivo", fontSize: 22, fontWeight: 700, color: "#0F1E3D" },
  sub:       { fontSize: 13, color: "#6B7793", marginTop: 3 },
  kpiStrip:  { display: "flex", gap: 0, background: "#fff", border: "1px solid #E2E7F0", borderRadius: 12, marginBottom: 14, overflow: "hidden" },
  kpi:       { flex: 1, padding: "13px 16px", borderRight: "1px solid #E2E7F0", textAlign: "center" },
  kpiVal:    { fontFamily: "Archivo", fontSize: 20, fontWeight: 800 },
  kpiLabel:  { fontSize: 10.5, color: "#9AA6BF", fontWeight: 600, textTransform: "uppercase", marginTop: 2 },
  filters:   { display: "flex", gap: 9, marginBottom: 11, alignItems: "center" },
  search:    { padding: "8px 12px", border: "1px solid #E2E7F0", borderRadius: 9, fontSize: 13, fontFamily: "inherit", background: "#fff", flex: 1 },
  sel:       { padding: "8px 10px", border: "1px solid #E2E7F0", borderRadius: 9, fontSize: 13, fontFamily: "inherit", background: "#fff" },
  count:     { fontSize: 12, color: "#9AA6BF" },
  tableWrap: { background: "#fff", border: "1px solid #E2E7F0", borderRadius: 14, overflow: "auto" },
  table:     { width: "100%", borderCollapse: "collapse", minWidth: 780 },
  th:        { fontSize: 11, textTransform: "uppercase", color: "#6B7793", textAlign: "left", padding: "10px 13px", borderBottom: "1px solid #E2E7F0", fontWeight: 700, background: "#F4F6FA", whiteSpace: "nowrap" },
  td:        { padding: "11px 13px", fontSize: 13, borderBottom: "1px solid #E2E7F0", color: "#1B2540" },
  tdCenter:  { textAlign: "center", padding: 40, color: "#9AA6BF" },
  bar:       { height: 7, background: "#F0F2F8", borderRadius: 4, overflow: "hidden", width: 80 },
  barFill:   { height: "100%", borderRadius: 4 },
  badge:     { display: "inline-flex", padding: "3px 9px", borderRadius: 20, fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" },
  detailLink:{ fontSize: 12, color: "#1E3563", fontWeight: 600, cursor: "pointer" },
  panel:     { width: 360, flexShrink: 0, background: "#fff", border: "1px solid #E2E7F0", borderRadius: 14, overflow: "hidden", display: "flex", flexDirection: "column", maxHeight: "calc(100vh - 120px)", position: "sticky", top: 0 },
  newBtn:    { padding: "8px 16px", background: "#1E3563", color: "#fff", border: 0, borderRadius: 9, fontWeight: 700, fontSize: 13, cursor: "pointer", flexShrink: 0 },
  editBtn:   { padding: "3px 10px", border: "1px solid #E2E7F0", borderRadius: 7, background: "#fff", fontSize: 11.5, fontWeight: 600, color: "#E8821E", cursor: "pointer", flexShrink: 0 },
};

const P = {
  wrap:      { display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" },
  head:      { display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "16px 16px 12px", borderBottom: "1px solid #E2E7F0", background: "#0F1E3D" },
  siteName:  { fontFamily: "Archivo", fontSize: 15, fontWeight: 700, color: "#fff" },
  siteMeta:  { fontSize: 12, color: "rgba(255,255,255,.6)", marginTop: 3 },
  close:     { background: "none", border: 0, color: "rgba(255,255,255,.7)", fontSize: 18, cursor: "pointer" },
  kpiRow:    { display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 0, padding: "12px 16px", borderBottom: "1px solid #E2E7F0" },
  kpi:       { textAlign: "center" },
  kpiVal:    { fontFamily: "Archivo", fontSize: 18, fontWeight: 800 },
  kpiLabel:  { fontSize: 10, color: "#9AA6BF", fontWeight: 600 },
  fillBar:   { height: 8, background: "#F0F2F8", margin: "0 16px 4px", borderRadius: 4, overflow: "hidden" },
  fillFill:  { height: "100%", borderRadius: 4, transition: "width .3s" },
  badge:     { display: "inline-flex", padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 600 },
  bulkBar:   { display: "flex", gap: 6, alignItems: "center", padding: "8px 16px", background: "#EEF3FB", borderBottom: "1px solid #C5D4EE" },
  bulkCount: { fontSize: 12, fontWeight: 700, color: "#1E3563", flexShrink: 0 },
  bulkSel:   { flex: 1, padding: "5px 8px", border: "1px solid #E2E7F0", borderRadius: 7, fontSize: 12, fontFamily: "inherit" },
  bulkBtn:   { padding: "5px 12px", border: 0, borderRadius: 7, background: "#1E3563", color: "#fff", fontWeight: 600, fontSize: 12, cursor: "pointer", flexShrink: 0 },
  bulkCancel:{ padding: "5px 10px", border: "1px solid #E2E7F0", borderRadius: 7, background: "#fff", fontSize: 12, cursor: "pointer", flexShrink: 0 },
  search:    { margin: "10px 16px 6px", padding: "7px 11px", border: "1px solid #E2E7F0", borderRadius: 8, fontSize: 13, fontFamily: "inherit" },
  empList:   { overflowY: "auto", flex: 1, padding: "0 16px 12px" },
  dim:       { textAlign: "center", padding: 24, color: "#9AA6BF", fontSize: 13 },
  empRow:    { display: "flex", alignItems: "center", padding: "9px 10px", borderBottom: "1px solid #F0F2F8", borderRadius: 8, marginBottom: 2 },
  av:        { width: 32, height: 32, borderRadius: 8, background: "#1E3563", color: "#fff", display: "grid", placeItems: "center", fontSize: 10, fontWeight: 700, flexShrink: 0, marginRight: 10 },
  empName:   { fontSize: 13, fontWeight: 600, color: "#0F1E3D" },
  empMeta:   { fontSize: 11, color: "#9AA6BF" },
  transferBtn:{ padding: "4px 10px", border: "1px solid #E2E7F0", borderRadius: 7, background: "#fff", fontSize: 11.5, fontWeight: 600, color: "#1E3563", cursor: "pointer", flexShrink: 0, marginLeft: "auto" },
};

const M = {
  overlay: { position: "fixed", inset: 0, background: "rgba(15,30,61,.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" },
  box:     { background: "#fff", borderRadius: 14, width: 380, boxShadow: "0 20px 60px rgba(0,0,0,.25)" },
  head:    { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #E2E7F0" },
  title:   { fontFamily: "Archivo", fontSize: 15, fontWeight: 700, color: "#0F1E3D" },
  close:   { background: "none", border: 0, fontSize: 18, cursor: "pointer", color: "#6B7793" },
  body:    { padding: 20 },
  empRow:  { display: "flex", alignItems: "center", gap: 12, marginBottom: 18, padding: 12, background: "#F8F9FC", borderRadius: 10 },
  av:      { width: 40, height: 40, borderRadius: 10, background: "#1E3563", color: "#fff", display: "grid", placeItems: "center", fontSize: 12, fontWeight: 700, flexShrink: 0 },
  empName: { fontSize: 14, fontWeight: 700, color: "#0F1E3D" },
  empMeta: { fontSize: 12, color: "#9AA6BF", marginTop: 2 },
  label:   { display: "block", fontSize: 12, fontWeight: 600, color: "#6B7793", marginBottom: 7 },
  sel:     { width: "100%", padding: "10px 12px", border: "1px solid #E2E7F0", borderRadius: 9, fontSize: 13, fontFamily: "inherit", marginBottom: 14, boxSizing: "border-box" },
  btn:     { width: "100%", padding: 12, border: 0, borderRadius: 9, background: "#E8821E", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" },
  success: { textAlign: "center", padding: "20px 0", color: "#15966A", fontWeight: 700, fontSize: 15 },
};

const F = {
  overlay:    { position: "fixed", inset: 0, background: "rgba(15,30,61,.5)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" },
  box:        { background: "#fff", borderRadius: 14, width: 480, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,.3)" },
  head:       { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid #E2E7F0", position: "sticky", top: 0, background: "#fff" },
  title:      { fontFamily: "Archivo", fontSize: 15, fontWeight: 700, color: "#0F1E3D" },
  close:      { background: "none", border: 0, fontSize: 18, cursor: "pointer", color: "#6B7793" },
  body:       { padding: 20 },
  stepHead:   { display: "flex", alignItems: "center", gap: 8, marginBottom: 6 },
  stepNum:    { width: 22, height: 22, borderRadius: "50%", background: "#1E3563", color: "#fff", fontSize: 11, fontWeight: 800, display: "grid", placeItems: "center", flexShrink: 0 },
  stepLabel:  { fontSize: 13, fontWeight: 700, color: "#0F1E3D" },
  stepDone:   { fontSize: 12, color: "#15966A", fontWeight: 600, marginLeft: "auto" },
  fieldRow:   { display: "flex", gap: 8, alignItems: "center" },
  addBtn:     { padding: "8px 12px", border: "1px solid #1E3563", borderRadius: 8, background: "#fff", color: "#1E3563", fontWeight: 700, fontSize: 12, cursor: "pointer", flexShrink: 0, whiteSpace: "nowrap" },
  inlineRow:  { display: "flex", gap: 8, marginTop: 6, padding: "10px 12px", background: "#F4F6FA", borderRadius: 8 },
  inlineInput:{ flex: 1, padding: "7px 10px", border: "1px solid #E2E7F0", borderRadius: 7, fontSize: 13, fontFamily: "inherit" },
  inlineBtn:  { padding: "7px 14px", border: 0, borderRadius: 7, background: "#15966A", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer", flexShrink: 0 },
  label:      { display: "block", fontSize: 12, fontWeight: 600, color: "#6B7793", marginBottom: 6, marginTop: 10 },
  input:      { width: "100%", padding: "9px 12px", border: "1px solid #E2E7F0", borderRadius: 9, fontSize: 13, fontFamily: "inherit", boxSizing: "border-box" },
  hint2:      { fontSize: 11.5, color: "#9AA6BF", marginTop: 8, lineHeight: 1.5, padding: "8px 10px", background: "#FFFBE6", borderRadius: 7, borderLeft: "3px solid #E8821E" },
  err:        { background: "#FDECEA", color: "#D2453F", borderRadius: 8, padding: "8px 12px", fontSize: 13, marginBottom: 12 },
  btn:        { width: "100%", padding: 12, border: 0, borderRadius: 9, background: "#1E3563", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" },
};
