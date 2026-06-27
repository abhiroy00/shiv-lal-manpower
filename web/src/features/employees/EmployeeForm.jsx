import { useState, useEffect } from "react";
import {
  useCreateEmployeeMutation,
  useUpdateEmployeeMutation,
  useResetEmployeePasswordMutation,
  useGetEmployeeDocumentsQuery,
  useUploadEmployeeDocumentMutation,
  useDeleteEmployeeDocumentMutation,
} from "./employeesApi";
import { useGetSitesQuery, useGetStatesQuery, useGetDistrictsQuery } from "../deployment/deploymentApi";
import {
  useGetSalaryStructureQuery,
  useUpsertSalaryStructureMutation,
} from "../payroll/payrollApi";

const DESIGNATIONS = [
  "Security Guard", "Housekeeping", "Driver",
  "Data Entry Operator", "Site Supervisor", "Other",
];

const STD_DESIGNATIONS = DESIGNATIONS.filter((d) => d !== "Other");

const DOC_TYPE_LABELS = {
  aadhar: "Aadhar",
  pan: "PAN",
  photo: "Photo",
  other: "Other / Combined",
};

const TABS = ["Basic Info", "Deployment", "Compliance & ID", "Banking", "Salary", "Documents"];
const LAST_FORM_TAB = 4; // Salary index

const TODAY = new Date().toISOString().split("T")[0];

const EMPTY = {
  emp_code: "", full_name: "", phone: "", designation: "",
  status: "active", date_joined: "", date_of_birth: "", address: "",
  site: "", uan: "", esic_no: "", aadhar: "", pan: "",
  bank_account: "", ifsc: "", tds: "",
};

export default function EmployeeForm({ employee, onClose, initialTab = 0 }) {
  const isEdit = Boolean(employee?.id);

  const [tab, setTab] = useState(initialTab);
  const [form, setForm] = useState(EMPTY);
  const [customDesig, setCustomDesig] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState("");
  const [errors, setErrors] = useState({});
  const [credentials, setCredentials] = useState(null);

  const [salary, setSalary] = useState({ basic: "", hra: "", da: "", other_allowances: "" });

  // Document upload
  const [docType, setDocType] = useState("other");
  const [docFile, setDocFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState("");
  // Queue for create mode (uploaded after employee is created)
  const [pendingDocs, setPendingDocs] = useState([]);

  const { data: sitesData } = useGetSitesQuery({});
  const sites = sitesData?.results || [];

  const { data: statesData } = useGetStatesQuery();
  const states = statesData?.results || statesData || [];

  const { data: districtsData } = useGetDistrictsQuery(selectedState || undefined);
  const districts = districtsData?.results || districtsData || [];

  const filteredSites = selectedDistrict
    ? sites.filter((s) => String(s.district) === String(selectedDistrict))
    : selectedState
      ? sites.filter((s) => String(s.district_state_id) === String(selectedState))
      : sites;

  const { data: salaryData } = useGetSalaryStructureQuery(employee?.id, { skip: !isEdit || !employee?.id });
  const { data: docs = [] } = useGetEmployeeDocumentsQuery(employee?.id, { skip: !isEdit || !employee?.id });

  const [createEmployee, { isLoading: creating }] = useCreateEmployeeMutation();
  const [updateEmployee, { isLoading: updating }] = useUpdateEmployeeMutation();
  const [resetPassword, { isLoading: resetting }] = useResetEmployeePasswordMutation();
  const [upsertSalary] = useUpsertSalaryStructureMutation();
  const [uploadDoc] = useUploadEmployeeDocumentMutation();
  const [deleteDoc] = useDeleteEmployeeDocumentMutation();
  const saving = creating || updating;

  useEffect(() => {
    if (isEdit) {
      const rawDesig = employee.designation || "";
      const isStandard = STD_DESIGNATIONS.includes(rawDesig);
      setForm({
        emp_code:      employee.emp_code      || "",
        full_name:     employee.full_name     || "",
        phone:         employee.phone         || "",
        designation:   isStandard ? rawDesig : "Other",
        status:        employee.status        || "active",
        date_joined:   employee.date_joined   || "",
        date_of_birth: employee.date_of_birth || "",
        address:       employee.address       || "",
        site:          employee.site          || "",
        uan:           employee.uan           || "",
        esic_no:       employee.esic_no       || "",
        aadhar:        employee.aadhar        || "",
        pan:           employee.pan           || "",
        bank_account:  employee.bank_account  || "",
        ifsc:          employee.ifsc          || "",
        tds:           employee.tds           || "",
      });
      setCustomDesig(isStandard ? "" : (rawDesig === "Other" ? "" : rawDesig));
    } else {
      setForm(EMPTY);
      setCustomDesig("");
    }
    setErrors({});
    setCredentials(null);
    setSalary({ basic: "", hra: "", da: "", other_allowances: "" });
    setDocFile(null);
    setUploadErr("");
    setPendingDocs([]);
    setSelectedState("");
    setSelectedDistrict("");
    setTab(0);
  }, [employee]);

  // Pre-populate state/district when editing (needs sites to be loaded)
  useEffect(() => {
    if (!isEdit || !form.site || !sites.length) return;
    const empSite = sites.find((s) => s.id === form.site || s.id === Number(form.site));
    if (empSite) {
      setSelectedState(String(empSite.district_state_id || ""));
      setSelectedDistrict(String(empSite.district || ""));
    }
  }, [isEdit, form.site, sites]);

  useEffect(() => {
    if (salaryData) {
      const s = salaryData?.results?.[0] ?? salaryData?.[0];
      if (s) {
        setSalary({
          basic:            String(s.basic),
          hra:              String(s.hra),
          da:               String(s.da),
          other_allowances: String(s.other_allowances),
        });
      }
    }
  }, [salaryData]);

  const set    = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const setSal = (field) => (e) => setSalary((s) => ({ ...s, [field]: e.target.value }));

  const validate = () => {
    const e = {};
    if (!form.emp_code.trim())  e.emp_code    = "Required";
    if (!form.full_name.trim()) e.full_name   = "Required";
    if (!form.phone.trim())     e.phone       = "Required";
    if (!form.designation)      e.designation = "Required";
    if (form.designation === "Other" && !customDesig.trim()) e.designation = "Enter a designation name";
    if (!form.date_joined)      e.date_joined = "Required";
    if (form.phone && !/^\d{10}$/.test(form.phone))                    e.phone  = "Enter valid 10-digit mobile";
    if (form.aadhar && !/^\d{12}$/.test(form.aadhar))                  e.aadhar = "Aadhar must be 12 digits";
    if (form.pan && !/^[A-Z]{5}\d{4}[A-Z]$/.test(form.pan))           e.pan    = "Invalid PAN format";
    if (form.ifsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(form.ifsc))       e.ifsc   = "Invalid IFSC format";
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      if (["emp_code","full_name","phone","designation","date_joined"].some(f => e[f])) setTab(0);
      else if (["aadhar","pan"].some(f => e[f]))                                         setTab(2);
      else if (["ifsc"].some(f => e[f]))                                                 setTab(3);
      return;
    }

    const payload = {
      ...form,
      designation:   form.designation === "Other" ? customDesig.trim() : form.designation,
      site:          form.site          || null,
      date_of_birth: form.date_of_birth || null,
    };

    try {
      let empId;
      let newCredentials = null;
      if (isEdit) {
        await updateEmployee({ id: employee.id, ...payload }).unwrap();
        empId = employee.id;
      } else {
        const result = await createEmployee(payload).unwrap();
        empId = result.id;
        if (result.credentials) {
          newCredentials = result.credentials;
        }
        // Upload queued documents BEFORE showing the credentials modal
        for (const pd of pendingDocs) {
          const fd = new FormData();
          fd.append("doc_type", pd.docType);
          fd.append("file", pd.file);
          try { await uploadDoc({ id: empId, formData: fd }).unwrap(); }
          catch { /* individual doc failure — non-fatal */ }
        }
        setPendingDocs([]);
        // Now show credentials modal (after docs are uploaded)
        if (newCredentials) {
          setCredentials(newCredentials);
        }
      }

      if (salary.basic && Number(salary.basic) > 0) {
        await upsertSalary({
          employee:         empId,
          basic:            Number(salary.basic),
          hra:              Number(salary.hra)              || 0,
          da:               Number(salary.da)               || 0,
          other_allowances: Number(salary.other_allowances) || 0,
        });
      }

      if (!newCredentials) onClose();
    } catch (err) {
      if (err?.data) {
        const mapped = {};
        Object.entries(err.data).forEach(([k, v]) => {
          mapped[k] = Array.isArray(v) ? v[0] : v;
        });
        setErrors(mapped);
      }
    }
  };

  const handleResetPassword = async () => {
    try {
      const result = await resetPassword(employee.id).unwrap();
      setCredentials({ phone: result.phone, default_password: result.default_password });
    } catch { /* ignore */ }
  };

  const MAX_DOC_SIZE = 20 * 1024 * 1024; // 20 MB

  // Edit mode: upload immediately
  const handleUploadDoc = async () => {
    if (!docFile) { setUploadErr("Please select a file."); return; }
    if (docFile.size > MAX_DOC_SIZE) { setUploadErr("File too large. Maximum allowed size is 20 MB."); return; }
    setUploadErr("");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("doc_type", docType);
      fd.append("file", docFile);
      await uploadDoc({ id: employee.id, formData: fd }).unwrap();
      setDocFile(null);
      const inp = document.getElementById("doc-file-input");
      if (inp) inp.value = "";
    } catch {
      setUploadErr("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  // Create mode: add to queue
  const handleQueueDoc = () => {
    if (!docFile) { setUploadErr("Please select a file."); return; }
    if (docFile.size > MAX_DOC_SIZE) { setUploadErr("File too large. Maximum allowed size is 20 MB."); return; }
    setUploadErr("");
    setPendingDocs((p) => [...p, { docType, file: docFile }]);
    setDocFile(null);
    const inp = document.getElementById("doc-file-input");
    if (inp) inp.value = "";
  };

  const handleDeleteDoc = async (docId) => {
    if (!window.confirm("Delete this document?")) return;
    try { await deleteDoc({ empId: employee.id, docId }).unwrap(); } catch { /* ignore */ }
  };

  const inputStyle = (field) => ({
    ...S.input,
    ...(errors[field] ? { borderColor: "#D2453F", background: "#FBE6E5" } : {}),
  });

  return (
    <>
      <div style={S.backdrop} onClick={credentials ? undefined : onClose} />

      {/* Credentials modal */}
      {credentials && (
        <div style={S.modalWrap}>
          <div style={S.modal}>
            <div style={S.modalIcon}>🔐</div>
            <div style={S.modalTitle}>Login Credentials Created</div>
            <div style={S.modalSub}>Share these with the employee for mobile app access.</div>
            <div style={S.credBox}>
              <CredRow label="Phone (Login ID)" value={credentials.phone} />
              <CredRow label="Default Password" value={credentials.default_password} />
            </div>
            <div style={S.modalNote}>
              The employee should change their password after first login.
            </div>
            <button style={S.modalBtn} onClick={onClose}>Done</button>
          </div>
        </div>
      )}

      {/* Drawer */}
      <div style={S.drawer}>
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
                {i === 5 && pendingDocs.length > 0 && !isEdit && (
                  <span style={S.docBadge}>{pendingDocs.length}</span>
                )}
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
                  {form.designation === "Other" && (
                    <input
                      style={{ ...S.input, marginTop: 8 }}
                      value={customDesig}
                      onChange={(e) => { setCustomDesig(e.target.value); setErrors((er) => ({ ...er, designation: undefined })); }}
                      placeholder="Enter designation name (e.g. Electrician)"
                      autoFocus
                    />
                  )}
                </Field>
              </div>

              <div style={S.row2}>
                <Field label="Date of Joining *" error={errors.date_joined}>
                  <input type="date" style={{ ...inputStyle("date_joined"), ...S.dateInput }}
                    value={form.date_joined} onChange={set("date_joined")} max={TODAY} />
                </Field>
                <Field label="Date of Birth">
                  <input type="date" style={{ ...S.input, ...S.dateInput }}
                    value={form.date_of_birth} onChange={set("date_of_birth")}
                    max={TODAY} min="1950-01-01" />
                </Field>
              </div>

              <Field label="Address">
                <textarea style={{ ...S.input, height: 72, resize: "vertical" }}
                  value={form.address} onChange={set("address")} placeholder="Full residential address" />
              </Field>

              {isEdit && employee?.has_login && (
                <div style={S.pwdStatusBox}>
                  <span style={S.pwdStatusIcon}>{employee.password_changed_at ? "🔒" : "⚠️"}</span>
                  <div>
                    <div style={S.pwdStatusTitle}>
                      {employee.password_changed_at ? "Custom password set" : "Using default password"}
                    </div>
                    <div style={S.pwdStatusSub}>
                      {employee.password_changed_at
                        ? `Changed on ${new Date(employee.password_changed_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`
                        : `Default is the phone number: ${employee.phone}`}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Tab 1: Deployment ── */}
          {tab === 1 && (
            <div style={S.section}>
              <Field label="State">
                <select
                  style={S.input}
                  value={selectedState}
                  onChange={(e) => {
                    setSelectedState(e.target.value);
                    setSelectedDistrict("");
                    setForm((f) => ({ ...f, site: "" }));
                  }}
                >
                  <option value="">— All States —</option>
                  {states.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="District">
                <select
                  style={S.input}
                  value={selectedDistrict}
                  onChange={(e) => {
                    setSelectedDistrict(e.target.value);
                    setForm((f) => ({ ...f, site: "" }));
                  }}
                  disabled={!selectedState}
                >
                  <option value="">— All Districts —</option>
                  {districts.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Assigned Site / Office">
                <select
                  style={S.input}
                  value={form.site}
                  onChange={set("site")}
                >
                  <option value="">— Not assigned —</option>
                  {filteredSites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.district_name}, {s.state_name})
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
                  <input style={inputStyle("pan")} value={form.pan}
                    onChange={(e) => setForm((f) => ({ ...f, pan: e.target.value.toUpperCase() }))}
                    placeholder="ABCDE1234F" maxLength={10} />
                </Field>
              </div>
              <Field label="TDS (Monthly Deduction / Declaration)" error={errors.tds}>
                <input style={inputStyle("tds")} value={form.tds} onChange={set("tds")}
                  placeholder="e.g. ₹500/month · 10% · Exempt – Form 15G filed" maxLength={30} />
              </Field>
              <div style={S.infoBox}>
                <b>EPF:</b> UAN is the 12-digit Universal Account Number. &nbsp;
                <b>ESIC:</b> 10-digit insurance number. &nbsp;
                <b>TDS:</b> Monthly tax deduction or declaration reference.
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
                <input style={inputStyle("ifsc")} value={form.ifsc}
                  onChange={(e) => setForm((f) => ({ ...f, ifsc: e.target.value.toUpperCase() }))}
                  placeholder="e.g. SBIN0001234" maxLength={11} />
              </Field>
              <div style={S.infoBox}>
                Bank details are used for salary disbursement via NEFT/bank advice file.
              </div>
            </div>
          )}

          {/* ── Tab 4: Salary ── */}
          {tab === 4 && (
            <div style={S.section}>
              <div style={S.salaryNote}>
                Set the employee's monthly salary components. Leave blank if not applicable.
              </div>
              <Field label="Basic Salary (₹) *">
                <input style={S.input} type="number" min="0" value={salary.basic}
                  onChange={setSal("basic")} placeholder="e.g. 15000" />
              </Field>
              <div style={S.row2}>
                <Field label="HRA (₹)">
                  <input style={S.input} type="number" min="0" value={salary.hra}
                    onChange={setSal("hra")} placeholder="0" />
                </Field>
                <Field label="DA (₹)">
                  <input style={S.input} type="number" min="0" value={salary.da}
                    onChange={setSal("da")} placeholder="0" />
                </Field>
              </div>
              <Field label="Other Allowances (₹)">
                <input style={S.input} type="number" min="0" value={salary.other_allowances}
                  onChange={setSal("other_allowances")} placeholder="0" />
              </Field>
              {salary.basic && (
                <div style={S.grossPreview}>
                  <span style={S.grossLabel}>Monthly Gross</span>
                  <span style={S.grossVal}>
                    ₹{(
                      (Number(salary.basic) || 0) +
                      (Number(salary.hra) || 0) +
                      (Number(salary.da) || 0) +
                      (Number(salary.other_allowances) || 0)
                    ).toLocaleString("en-IN")}
                  </span>
                </div>
              )}
              <div style={S.infoBox}>
                <b>PF:</b> 12% of gross · <b>ESI:</b> 0.75% of gross (if gross ≤ ₹21,000).
              </div>
            </div>
          )}

          {/* ── Tab 5: Documents ── */}
          {tab === 5 && (
            <div style={S.section}>
              {/* Upload / Queue card */}
              <div style={S.docUploadCard}>
                <div style={S.docCardTitle}>
                  {isEdit ? "Upload Document" : "Attach Documents (optional)"}
                </div>
                {!isEdit && (
                  <div style={S.docQueueNote}>
                    Files added here will be uploaded automatically when you save the employee.
                  </div>
                )}
                <Field label="Document Type">
                  <select style={S.input} value={docType} onChange={(e) => setDocType(e.target.value)}>
                    <option value="aadhar">Aadhar</option>
                    <option value="pan">PAN</option>
                    <option value="photo">Photo</option>
                    <option value="other">Other / Combined PDF</option>
                  </select>
                </Field>
                <Field label="File (PDF or Image · max 20 MB)">
                  <input
                    id="doc-file-input"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    style={S.fileInput}
                    onChange={(e) => {
                      const f = e.target.files[0] || null;
                      setDocFile(f);
                      if (f && f.size > 20 * 1024 * 1024) {
                        setUploadErr(`File too large (${(f.size / 1024 / 1024).toFixed(1)} MB). Maximum allowed size is 20 MB.`);
                      } else {
                        setUploadErr("");
                      }
                    }}
                  />
                </Field>
                {uploadErr && <div style={S.errMsg}>{uploadErr}</div>}
                <button
                  style={{ ...S.uploadBtn, ...(!docFile ? S.uploadBtnDisabled : {}) }}
                  onClick={isEdit ? handleUploadDoc : handleQueueDoc}
                  disabled={uploading || !docFile}
                >
                  {isEdit
                    ? (uploading ? "Uploading…" : "Upload Document")
                    : "Add to List"}
                </button>
              </div>

              {/* Document list */}
              {isEdit ? (
                <>
                  <div style={S.docListHeader}>
                    <span style={S.docListTitle}>Uploaded Documents</span>
                    <span style={S.docCount}>{docs.length} file{docs.length !== 1 ? "s" : ""}</span>
                  </div>
                  {docs.length === 0 ? (
                    <div style={S.docEmpty}>No documents uploaded yet.</div>
                  ) : (
                    docs.map((doc) => (
                      <div key={doc.id} style={S.docItem}>
                        <div style={S.docItemLeft}>
                          <div style={S.docIconWrap}>{doc.file?.endsWith(".pdf") ? "📄" : "🖼️"}</div>
                          <div>
                            <div style={S.docTypeLabel}>{DOC_TYPE_LABELS[doc.doc_type] || doc.doc_type}</div>
                            <div style={S.docDate}>
                              {new Date(doc.uploaded_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                            </div>
                          </div>
                        </div>
                        <div style={S.docItemRight}>
                          <a href={doc.file} target="_blank" rel="noopener noreferrer" style={S.docViewBtn}>View</a>
                          <button style={S.docDeleteBtn} onClick={() => handleDeleteDoc(doc.id)}>Delete</button>
                        </div>
                      </div>
                    ))
                  )}
                </>
              ) : (
                <>
                  <div style={S.docListHeader}>
                    <span style={S.docListTitle}>Queued Documents</span>
                    <span style={S.docCount}>{pendingDocs.length} file{pendingDocs.length !== 1 ? "s" : ""}</span>
                  </div>
                  {pendingDocs.length === 0 ? (
                    <div style={S.docEmpty}>No documents queued yet. Add files above.</div>
                  ) : (
                    pendingDocs.map((pd, i) => (
                      <div key={i} style={S.docItem}>
                        <div style={S.docItemLeft}>
                          <div style={S.docIconWrap}>{pd.file.name.endsWith(".pdf") ? "📄" : "🖼️"}</div>
                          <div>
                            <div style={S.docTypeLabel}>{DOC_TYPE_LABELS[pd.docType]}</div>
                            <div style={S.docDate}>{pd.file.name}</div>
                          </div>
                        </div>
                        <button
                          style={S.docDeleteBtn}
                          onClick={() => setPendingDocs((p) => p.filter((_, j) => j !== i))}
                        >
                          Remove
                        </button>
                      </div>
                    ))
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={S.footer}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button style={S.cancelBtn} onClick={onClose} disabled={saving}>Cancel</button>
            {isEdit && employee?.has_login && (
              <button style={S.resetBtn} onClick={handleResetPassword} disabled={resetting}>
                {resetting ? "Resetting…" : "Reset Password"}
              </button>
            )}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {tab > 0 && (
              <button style={S.prevBtn} onClick={() => setTab(tab - 1)} disabled={saving}>← Previous</button>
            )}
            {/* Tabs 0-3: Next */}
            {tab < LAST_FORM_TAB && (
              <button style={S.nextBtn} onClick={() => setTab(tab + 1)}>Next →</button>
            )}
            {/* Salary tab: Save + Documents shortcut */}
            {tab === LAST_FORM_TAB && (
              <>
                <button style={S.saveBtn} onClick={handleSubmit} disabled={saving}>
                  {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Employee"}
                </button>
                <button style={S.nextBtn} onClick={() => setTab(5)}>Documents →</button>
              </>
            )}
            {/* Documents tab: Done (create mode also shows Save if docs are queued) */}
            {tab === 5 && (
              isEdit
                ? <button style={S.cancelBtn} onClick={onClose}>Done</button>
                : <button style={S.saveBtn} onClick={handleSubmit} disabled={saving}>
                    {saving ? "Saving…" : pendingDocs.length > 0 ? `Add Employee + ${pendingDocs.length} Doc${pendingDocs.length > 1 ? "s" : ""}` : "Add Employee"}
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

function CredRow({ label, value }) {
  return (
    <div style={S.credRow}>
      <span style={S.credLabel}>{label}</span>
      <span style={S.credValue}>{value}</span>
    </div>
  );
}

const S = {
  backdrop: { position: "fixed", inset: 0, background: "rgba(15,30,61,.45)", zIndex: 100 },
  drawer: {
    position: "fixed", top: 0, right: 0, bottom: 0, width: 480,
    background: "#fff", zIndex: 101, display: "flex", flexDirection: "column",
    boxShadow: "-8px 0 40px rgba(15,30,61,.18)", animation: "slideIn .25s ease",
  },
  drawerHead: {
    padding: "20px 22px", borderBottom: "1px solid #E2E7F0",
    display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexShrink: 0,
  },
  drawerTitle: { fontFamily: "Archivo", fontSize: 18, fontWeight: 700, color: "#0F1E3D" },
  drawerSub:   { fontSize: 12.5, color: "#6B7793", marginTop: 3 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 8, border: "1px solid #E2E7F0",
    background: "#fff", cursor: "pointer", fontSize: 14, color: "#6B7793",
    display: "grid", placeItems: "center",
  },
  tabs: { display: "flex", borderBottom: "1px solid #E2E7F0", flexShrink: 0, overflowX: "auto" },
  tab: {
    padding: "12px 13px", border: 0, background: "transparent",
    fontSize: 12.5, fontWeight: 600, color: "#6B7793", cursor: "pointer",
    borderBottom: "2px solid transparent", whiteSpace: "nowrap", position: "relative",
  },
  tabOn:  { color: "#0F1E3D", borderBottomColor: "#E8821E" },
  tabErr: { color: "#D2453F" },
  docBadge: {
    display: "inline-block", marginLeft: 5, background: "#E8821E", color: "#fff",
    borderRadius: 10, fontSize: 10, fontWeight: 700, padding: "1px 6px",
  },
  body:    { flex: 1, overflowY: "auto", padding: "20px 22px" },
  section: {},
  row2:    { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  label:   { display: "block", fontSize: 12, fontWeight: 600, color: "#6B7793", marginBottom: 6 },
  input: {
    width: "100%", padding: "10px 12px", border: "1px solid #E2E7F0",
    borderRadius: 9, fontSize: 13.5, fontFamily: "inherit", background: "#fff",
    boxSizing: "border-box",
  },
  errMsg:    { fontSize: 11.5, color: "#D2453F", marginTop: 4 },
  dateInput: { colorScheme: "light", cursor: "pointer" },
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
  resetBtn: {
    padding: "9px 14px", borderRadius: 9, border: "1px solid #1E3563",
    background: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", color: "#1E3563",
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
  salaryNote: {
    fontSize: 13, color: "#6B7793", background: "#F4F6FA",
    borderRadius: 10, padding: "10px 14px", marginBottom: 16,
  },
  grossPreview: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    background: "#1E3563", borderRadius: 10, padding: "12px 16px", marginBottom: 12,
  },
  grossLabel: { fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,.7)" },
  grossVal:   { fontSize: 18, fontWeight: 800, color: "#fff", fontFamily: "Archivo" },
  pwdStatusBox: {
    display: "flex", alignItems: "flex-start", gap: 10, marginTop: 14,
    background: "#F4F6FA", border: "1px solid #E2E7F0", borderRadius: 10, padding: "12px 14px",
  },
  pwdStatusIcon:  { fontSize: 18, flexShrink: 0 },
  pwdStatusTitle: { fontSize: 12.5, fontWeight: 700, color: "#0F1E3D" },
  pwdStatusSub:   { fontSize: 11.5, color: "#6B7793", marginTop: 2 },
  // Documents
  docUploadCard: {
    background: "#F4F6FA", border: "1px solid #E2E7F0", borderRadius: 12,
    padding: "16px 18px", marginBottom: 20,
  },
  docCardTitle: { fontSize: 13, fontWeight: 700, color: "#0F1E3D", marginBottom: 10 },
  docQueueNote: {
    fontSize: 12, color: "#8a5310", background: "#FCEFDD",
    border: "1px solid #f2d9b8", borderRadius: 8, padding: "8px 12px", marginBottom: 12,
  },
  fileInput: {
    width: "100%", padding: "8px 0", fontSize: 13, fontFamily: "inherit",
    color: "#0F1E3D", cursor: "pointer", boxSizing: "border-box",
  },
  uploadBtn: {
    marginTop: 6, padding: "9px 18px", borderRadius: 9, border: 0,
    background: "#1E3563", color: "#fff", fontSize: 13, fontWeight: 600,
    cursor: "pointer", width: "100%",
  },
  uploadBtnDisabled: { background: "#B0B9CE", cursor: "not-allowed" },
  docListHeader: {
    display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10,
  },
  docListTitle: { fontSize: 12, fontWeight: 700, color: "#6B7793", textTransform: "uppercase", letterSpacing: ".08em" },
  docCount:     { fontSize: 12, color: "#9AA6BF" },
  docEmpty: {
    fontSize: 13, color: "#9AA6BF", textAlign: "center", padding: "28px 16px",
    background: "#F4F6FA", borderRadius: 10, border: "1px dashed #D0D7E5",
  },
  docItem: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "12px 14px", borderRadius: 10, border: "1px solid #E2E7F0",
    marginBottom: 8, background: "#fff",
  },
  docItemLeft:  { display: "flex", alignItems: "center", gap: 12 },
  docIconWrap:  { fontSize: 24, flexShrink: 0 },
  docTypeLabel: { fontSize: 13, fontWeight: 700, color: "#0F1E3D" },
  docDate:      { fontSize: 11.5, color: "#9AA6BF", marginTop: 2 },
  docItemRight: { display: "flex", gap: 8, alignItems: "center" },
  docViewBtn: {
    padding: "6px 12px", borderRadius: 7, background: "#E8F0FE",
    color: "#1E3563", fontSize: 12, fontWeight: 600, textDecoration: "none",
    border: "1px solid #C5D3F0",
  },
  docDeleteBtn: {
    padding: "6px 10px", borderRadius: 7, border: "1px solid #F5C6C4",
    background: "#FBE6E5", color: "#D2453F", fontSize: 12, fontWeight: 600, cursor: "pointer",
  },
  // Credentials modal
  modalWrap: {
    position: "fixed", inset: 0, zIndex: 200,
    display: "flex", alignItems: "center", justifyContent: "center",
    background: "rgba(15,30,61,.55)",
  },
  modal: {
    background: "#fff", borderRadius: 16, padding: "32px 28px", width: 360,
    boxShadow: "0 20px 60px rgba(15,30,61,.25)", textAlign: "center",
  },
  modalIcon:  { fontSize: 40, marginBottom: 12 },
  modalTitle: { fontFamily: "Archivo", fontSize: 18, fontWeight: 700, color: "#0F1E3D", marginBottom: 6 },
  modalSub:   { fontSize: 13, color: "#6B7793", marginBottom: 20 },
  credBox: {
    background: "#F4F6FA", borderRadius: 10, padding: "14px 16px",
    marginBottom: 16, textAlign: "left",
  },
  credRow:   { display: "flex", justifyContent: "space-between", padding: "6px 0" },
  credLabel: { fontSize: 12, fontWeight: 600, color: "#6B7793" },
  credValue: { fontSize: 14, fontWeight: 700, color: "#0F1E3D", fontFamily: "monospace" },
  modalNote: {
    fontSize: 12, color: "#8a5310", background: "#FCEFDD",
    borderRadius: 8, padding: "8px 12px", marginBottom: 20,
  },
  modalBtn: {
    padding: "10px 32px", borderRadius: 9, border: 0,
    background: "#E8821E", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer",
  },
};
