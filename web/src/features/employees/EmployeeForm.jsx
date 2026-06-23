import { useState, useEffect } from "react";
import { useCreateEmployeeMutation, useUpdateEmployeeMutation } from "./employeesApi";
import { useGetSitesQuery } from "../deployment/deploymentApi";

const DESIGNATIONS = [
  "Security Guard", "Housekeeping", "Driver",
  "Data Entry Operator", "Site Supervisor", "Other",
];

const TABS = ["Basic Info", "Deployment", "Compliance & ID", "Banking"];

const EMPTY = {
  emp_code: "", full_name: "", phone: "", designation: "",
  status: "active", date_joined: "", date_of_birth: "", address: "",
  site: "", uan: "", esic_no: "", aadhar: "", pan: "",
  bank_account: "", ifsc: "",
};

export default function EmployeeForm({ employee, onClose }) {
  const isEdit = Boolean(employee?.id);
  const [tab, setTab] = useState(0);
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});

  const { data: sitesData } = useGetSitesQuery({});
  const sites = sitesData?.results || [];

  const [createEmployee, { isLoading: creating }] = useCreateEmployeeMutation();
  const [updateEmployee, { isLoading: updating }] = useUpdateEmployeeMutation();
  const saving = creating || updating;

  // Pre-fill when editing
  useEffect(() => {
    if (isEdit) {
      setForm({
        emp_code:     employee.emp_code     || "",
        full_name:    employee.full_name    || "",
        phone:        employee.phone        || "",
        designation:  employee.designation  || "",
        status:       employee.status       || "active",
        date_joined:  employee.date_joined  || "",
        date_of_birth: employee.date_of_birth || "",
        address:      employee.address      || "",
        site:         employee.site         || "",
        uan:          employee.uan          || "",
        esic_no:      employee.esic_no      || "",
        aadhar:       employee.aadhar       || "",
        pan:          employee.pan          || "",
        bank_account: employee.bank_account || "",
        ifsc:         employee.ifsc         || "",
      });
    } else {
      setForm(EMPTY);
    }
    setErrors({});
    setTab(0);
  }, [employee]);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const validate = () => {
    const e = {};
    if (!form.emp_code.trim())   e.emp_code   = "Required";
    if (!form.full_name.trim())  e.full_name  = "Required";
    if (!form.phone.trim())      e.phone      = "Required";
    if (!form.designation)       e.designation = "Required";
    if (!form.date_joined)       e.date_joined = "Required";
    if (form.phone && !/^\d{10}$/.test(form.phone)) e.phone = "Enter valid 10-digit mobile";
    if (form.aadhar && !/^\d{12}$/.test(form.aadhar)) e.aadhar = "Aadhar must be 12 digits";
    if (form.pan && !/^[A-Z]{5}\d{4}[A-Z]$/.test(form.pan)) e.pan = "Invalid PAN format";
    if (form.ifsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(form.ifsc)) e.ifsc = "Invalid IFSC format";
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      // jump to first tab with error
      const basicFields = ["emp_code", "full_name", "phone", "designation", "date_joined"];
      const compFields  = ["aadhar", "pan"];
      const bankFields  = ["ifsc"];
      if (basicFields.some((f) => e[f]))      setTab(0);
      else if (compFields.some((f) => e[f]))  setTab(2);
      else if (bankFields.some((f) => e[f]))  setTab(3);
      return;
    }

    const payload = { ...form, site: form.site || null };
    try {
      if (isEdit) {
        await updateEmployee({ id: employee.id, ...payload }).unwrap();
      } else {
        await createEmployee(payload).unwrap();
      }
      onClose();
    } catch (err) {
      // Map backend field errors
      if (err?.data) {
        const mapped = {};
        Object.entries(err.data).forEach(([k, v]) => {
          mapped[k] = Array.isArray(v) ? v[0] : v;
        });
        setErrors(mapped);
      }
    }
  };

  const inputStyle = (field) => ({
    ...S.input,
    ...(errors[field] ? { borderColor: "#D2453F", background: "#FBE6E5" } : {}),
  });

  return (
    <>
      {/* Backdrop */}
      <div style={S.backdrop} onClick={onClose} />

      {/* Drawer */}
      <div style={S.drawer}>
        {/* Header */}
        <div style={S.drawerHead}>
          <div>
            <div style={S.drawerTitle}>{isEdit ? "Edit Employee" : "Add New Employee"}</div>
            <div style={S.drawerSub}>
              {isEdit ? `${employee.emp_code} · ${employee.full_name}` : "Fill in employee details below"}
            </div>
          </div>
          <button style={S.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Tabs */}
        <div style={S.tabs}>
          {TABS.map((t, i) => {
            const hasErr = (
              (i === 0 && ["emp_code","full_name","phone","designation","date_joined"].some(f => errors[f])) ||
              (i === 2 && ["aadhar","pan"].some(f => errors[f])) ||
              (i === 3 && ["ifsc"].some(f => errors[f]))
            );
            return (
              <button
                key={t}
                style={{ ...S.tab, ...(tab === i ? S.tabOn : {}), ...(hasErr ? S.tabErr : {}) }}
                onClick={() => setTab(i)}
              >
                {hasErr && <span style={{ color: "#D2453F", marginRight: 4 }}>!</span>}
                {t}
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div style={S.body}>

          {/* ── Tab 0: Basic Info ── */}
          {tab === 0 && (
            <div style={S.section}>
              <div style={S.row2}>
                <Field label="Employee Code *" error={errors.emp_code}>
                  <input style={inputStyle("emp_code")} value={form.emp_code} onChange={set("emp_code")}
                    placeholder="EMP-1001" disabled={isEdit} />
                </Field>
                <Field label="Status">
                  <select style={S.input} value={form.status} onChange={set("status")}>
                    <option value="active">Active</option>
                    <option value="on_leave">On Leave</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </Field>
              </div>

              <Field label="Full Name *" error={errors.full_name}>
                <input style={inputStyle("full_name")} value={form.full_name} onChange={set("full_name")}
                  placeholder="e.g. Ramesh Kumar" />
              </Field>

              <div style={S.row2}>
                <Field label="Mobile Number *" error={errors.phone}>
                  <input style={inputStyle("phone")} value={form.phone} onChange={set("phone")}
                    placeholder="10-digit number" maxLength={10} />
                </Field>
                <Field label="Designation *" error={errors.designation}>
                  <select style={inputStyle("designation")} value={form.designation} onChange={set("designation")}>
                    <option value="">Select designation</option>
                    {DESIGNATIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </Field>
              </div>

              <div style={S.row2}>
                <Field label="Date of Joining *" error={errors.date_joined}>
                  <input type="date" style={inputStyle("date_joined")} value={form.date_joined} onChange={set("date_joined")} />
                </Field>
                <Field label="Date of Birth">
                  <input type="date" style={S.input} value={form.date_of_birth} onChange={set("date_of_birth")} />
                </Field>
              </div>

              <Field label="Address">
                <textarea style={{ ...S.input, height: 72, resize: "vertical" }}
                  value={form.address} onChange={set("address")} placeholder="Full residential address" />
              </Field>
            </div>
          )}

          {/* ── Tab 1: Deployment ── */}
          {tab === 1 && (
            <div style={S.section}>
              <Field label="Assigned Site">
                <select style={S.input} value={form.site} onChange={set("site")}>
                  <option value="">— Not assigned —</option>
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}  ({s.district_name})
                    </option>
                  ))}
                </select>
              </Field>
              <div style={S.infoBox}>
                <b>Note:</b> The employee will be required to check in within the assigned site's
                geofence radius for GPS attendance verification.
              </div>
            </div>
          )}

          {/* ── Tab 2: Compliance & ID ── */}
          {tab === 2 && (
            <div style={S.section}>
              <div style={S.row2}>
                <Field label="UAN (EPF)" error={errors.uan}>
                  <input style={inputStyle("uan")} value={form.uan} onChange={set("uan")}
                    placeholder="12-digit UAN" maxLength={12} />
                </Field>
                <Field label="ESIC Number" error={errors.esic_no}>
                  <input style={inputStyle("esic_no")} value={form.esic_no} onChange={set("esic_no")}
                    placeholder="ESIC number" />
                </Field>
              </div>
              <div style={S.row2}>
                <Field label="Aadhar Number" error={errors.aadhar}>
                  <input style={inputStyle("aadhar")} value={form.aadhar} onChange={set("aadhar")}
                    placeholder="12-digit Aadhar" maxLength={12} />
                </Field>
                <Field label="PAN Number" error={errors.pan}>
                  <input style={inputStyle("pan")} value={form.pan.toUpperCase()} onChange={set("pan")}
                    placeholder="ABCDE1234F" maxLength={10} />
                </Field>
              </div>
            </div>
          )}

          {/* ── Tab 3: Banking ── */}
          {tab === 3 && (
            <div style={S.section}>
              <Field label="Bank Account Number" error={errors.bank_account}>
                <input style={inputStyle("bank_account")} value={form.bank_account} onChange={set("bank_account")}
                  placeholder="Account number" />
              </Field>
              <Field label="IFSC Code" error={errors.ifsc}>
                <input style={inputStyle("ifsc")} value={form.ifsc.toUpperCase()} onChange={set("ifsc")}
                  placeholder="e.g. SBIN0001234" maxLength={11} />
              </Field>
              <div style={S.infoBox}>
                Bank details are used for salary disbursement via NEFT/bank advice file.
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={S.footer}>
          <button style={S.cancelBtn} onClick={onClose} disabled={saving}>Cancel</button>
          <div style={{ display: "flex", gap: 8 }}>
            {tab > 0 && (
              <button style={S.prevBtn} onClick={() => setTab(tab - 1)} disabled={saving}>← Previous</button>
            )}
            {tab < TABS.length - 1 ? (
              <button style={S.nextBtn} onClick={() => setTab(tab + 1)}>Next →</button>
            ) : (
              <button style={S.saveBtn} onClick={handleSubmit} disabled={saving}>
                {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Employee"}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function Field({ label, error, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={S.label}>{label}</label>
      {children}
      {error && <div style={S.errMsg}>{error}</div>}
    </div>
  );
}

const S = {
  backdrop: {
    position: "fixed", inset: 0, background: "rgba(15,30,61,.45)", zIndex: 100,
  },
  drawer: {
    position: "fixed", top: 0, right: 0, bottom: 0, width: 480,
    background: "#fff", zIndex: 101, display: "flex", flexDirection: "column",
    boxShadow: "-8px 0 40px rgba(15,30,61,.18)",
    animation: "slideIn .25s ease",
  },
  drawerHead: {
    padding: "20px 22px", borderBottom: "1px solid #E2E7F0",
    display: "flex", justifyContent: "space-between", alignItems: "flex-start",
    flexShrink: 0,
  },
  drawerTitle: { fontFamily: "Archivo", fontSize: 18, fontWeight: 700, color: "#0F1E3D" },
  drawerSub:   { fontSize: 12.5, color: "#6B7793", marginTop: 3 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 8, border: "1px solid #E2E7F0",
    background: "#fff", cursor: "pointer", fontSize: 14, color: "#6B7793",
    display: "grid", placeItems: "center",
  },
  tabs: {
    display: "flex", borderBottom: "1px solid #E2E7F0", flexShrink: 0,
    overflowX: "auto",
  },
  tab: {
    padding: "12px 16px", border: 0, background: "transparent",
    fontSize: 13, fontWeight: 600, color: "#6B7793", cursor: "pointer",
    borderBottom: "2px solid transparent", whiteSpace: "nowrap",
  },
  tabOn:  { color: "#0F1E3D", borderBottomColor: "#E8821E" },
  tabErr: { color: "#D2453F" },
  body: { flex: 1, overflowY: "auto", padding: "20px 22px" },
  section: {},
  row2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  label: { display: "block", fontSize: 12, fontWeight: 600, color: "#6B7793", marginBottom: 6 },
  input: {
    width: "100%", padding: "10px 12px", border: "1px solid #E2E7F0",
    borderRadius: 9, fontSize: 13.5, fontFamily: "inherit", background: "#fff",
    boxSizing: "border-box",
  },
  errMsg: { fontSize: 11.5, color: "#D2453F", marginTop: 4 },
  infoBox: {
    fontSize: 12.5, color: "#8a5310", background: "#FCEFDD",
    border: "1px solid #f2d9b8", borderRadius: 10, padding: "11px 14px", marginTop: 8,
  },
  footer: {
    padding: "16px 22px", borderTop: "1px solid #E2E7F0",
    display: "flex", justifyContent: "space-between", alignItems: "center",
    flexShrink: 0, background: "#fff",
  },
  cancelBtn: {
    padding: "9px 16px", borderRadius: 9, border: "1px solid #E2E7F0",
    background: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", color: "#6B7793",
  },
  prevBtn: {
    padding: "9px 16px", borderRadius: 9, border: "1px solid #E2E7F0",
    background: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
  },
  nextBtn: {
    padding: "9px 18px", borderRadius: 9, border: 0,
    background: "#1E3563", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
  },
  saveBtn: {
    padding: "9px 20px", borderRadius: 9, border: 0,
    background: "#E8821E", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer",
  },
};
