import { useState, useRef } from "react";
import { useSelector } from "react-redux";
import { useGetEmployeesQuery, useDeleteEmployeeMutation, useImportEmployeesMutation } from "./employeesApi";
import EmployeeForm from "./EmployeeForm";

const STATUS_COLORS = {
  active:   { bg: "#E1F4EC", color: "#15966A" },
  on_leave: { bg: "#FBF1DC", color: "#C98A12" },
  inactive: { bg: "#FBE6E5", color: "#D2453F" },
};

const PAGE_SIZE = 20;

export default function EmployeeListPage() {
  const [search, setSearch]             = useState("");
  const [status, setStatus]             = useState("");
  const [page, setPage]                 = useState(1);
  const [formEmployee, setFormEmployee] = useState(null); // null=closed, {}=add, obj=edit
  const [formTab, setFormTab]           = useState(0);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [importResult, setImportResult]       = useState(null);
  const importFileRef = useRef(null);
  const [selectedIds, setSelectedIds]   = useState([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);

  const { data, isLoading } = useGetEmployeesQuery({
    search, status: status || undefined, page, page_size: PAGE_SIZE,
  });

  const employees  = data?.results || [];
  const totalPages = data?.count ? Math.ceil(data.count / PAGE_SIZE) : 1;

  const [deleteEmployee, { isLoading: deleting }] = useDeleteEmployeeMutation();
  const [importEmployees, { isLoading: importing }] = useImportEmployeesMutation();

  const accessToken = useSelector((s) => s.auth.accessToken);
  const [exporting, setExporting] = useState(false);

  const handleDelete = async (id) => {
    try {
      await deleteEmployee(id).unwrap();
      setConfirmDeleteId(null);
    } catch {
      alert("Failed to delete employee. Please try again.");
      setConfirmDeleteId(null);
    }
  };

  const openAdd      = ()         => { setFormTab(0); setFormEmployee({}); };
  const openEdit     = (emp)      => { setFormTab(0); setFormEmployee(emp); };
  const openEditDocs = (e, emp)   => { e.stopPropagation(); setFormTab(5); setFormEmployee(emp); };
  const closeForm    = ()         => setFormEmployee(null);

  const handleExport = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (status) params.set("status", status);

      const res = await fetch(`/api/employees/export/?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `employees_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const handleSearch = (e) => { setSearch(e.target.value); setPage(1); setSelectedIds([]); };
  const handleStatus = (e) => { setStatus(e.target.value); setPage(1); setSelectedIds([]); };

  const allSelected = employees.length > 0 && employees.every((e) => selectedIds.includes(e.id));
  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? [] : employees.map((e) => e.id));
  };
  const toggleSelect = (id) => {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    try {
      await Promise.all(selectedIds.map((id) => deleteEmployee(id).unwrap().catch(() => {})));
      setSelectedIds([]);
      setConfirmBulkDelete(false);
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleImportFile = async (e) => {
    const file = e.target.files[0];
    e.target.value = "";   // reset so same file can be re-selected
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await importEmployees(fd).unwrap();
      setImportResult(res);
    } catch (err) {
      setImportResult({ error: err?.data?.detail || "Import failed. Please check the file format." });
    }
  };

  const handleDownloadTemplate = async () => {
    const res = await fetch("/api/employees/import-template/", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) { alert("Failed to download template."); return; }
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = "employee_import_template.xlsx"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <style>{`@keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>

      <div>
        <div style={S.pageHead}>
          <div>
            <h1 style={S.h1}>Employee Database</h1>
            <p style={S.sub}>Central record of all deployed manpower</p>
          </div>
          <div style={S.actions}>
            <button style={S.btn} onClick={handleDownloadTemplate} title="Download blank template">
              📋 Template
            </button>
            <button style={S.btn} onClick={() => importFileRef.current?.click()} disabled={importing}>
              {importing ? "Importing…" : "📤 Import Excel"}
            </button>
            <input ref={importFileRef} type="file" accept=".xlsx" style={{ display: "none" }}
              onChange={handleImportFile} />
            <button style={S.btn} onClick={handleExport} disabled={exporting}>
              {exporting ? "Exporting…" : "📥 Export Excel"}
            </button>
            <button style={S.btnSolid} onClick={openAdd}>+ Add Employee</button>
          </div>
        </div>

        <div style={S.toolbar}>
          <input
            style={S.searchInput}
            placeholder="Search by name / ID…"
            value={search}
            onChange={handleSearch}
          />
          <select style={S.select} value={status} onChange={handleStatus}>
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="on_leave">On Leave</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {selectedIds.length > 0 && (
          <div style={S.bulkBar}>
            <span style={S.bulkInfo}>{selectedIds.length} employee{selectedIds.length > 1 ? "s" : ""} selected</span>
            <button style={S.bulkDeleteBtn} onClick={() => setConfirmBulkDelete(true)}>
              🗑 Delete Selected
            </button>
            <button style={S.bulkClearBtn} onClick={() => setSelectedIds([])}>Clear</button>
          </div>
        )}

        <div style={S.card}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={{ ...S.th, width: 40 }}>
                  <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
                </th>
                {["Employee", "Designation", "Site", "Phone", "Joined", "Status", "Documents", ""].map((h) => (
                  <th key={h} style={S.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={9} style={S.empty}>Loading…</td></tr>
              )}
              {employees.map((emp) => {
                const sc = STATUS_COLORS[emp.status] || STATUS_COLORS.inactive;
                return (
                  <tr key={emp.id} style={S.tr} onClick={() => openEdit(emp)}>
                    <td style={S.td} onClick={(e) => { e.stopPropagation(); toggleSelect(emp.id); }}>
                      <input type="checkbox" checked={selectedIds.includes(emp.id)} onChange={() => toggleSelect(emp.id)} />
                    </td>
                    <td style={S.td}>
                      <div style={S.empCell}>
                        <div style={S.av}>{emp.full_name.slice(0, 2).toUpperCase()}</div>
                        <div>
                          <div style={S.empName}>{emp.full_name}</div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={S.empCode}>{emp.emp_code}</span>
                            {emp.has_login && (
                              <span style={S.loginBadge}>🔐 App</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={S.td}>{emp.designation}</td>
                    <td style={S.td}>{emp.site_name || "—"}</td>
                    <td style={S.td}>{emp.phone}</td>
                    <td style={S.td}>{emp.date_joined}</td>
                    <td style={S.td}>
                      <span style={{ ...S.pill, background: sc.bg, color: sc.color }}>
                        {emp.status.replace("_", " ")}
                      </span>
                    </td>
                    <td style={S.td} onClick={(e) => openEditDocs(e, emp)}>
                      {emp.doc_count > 0 ? (
                        <span style={S.docsBadge}>📄 {emp.doc_count}</span>
                      ) : (
                        <span style={S.docsUpload}>+ Upload</span>
                      )}
                    </td>
                    <td style={S.td} onClick={(e) => e.stopPropagation()}>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <button style={S.actionBtn} onClick={() => openEdit(emp)}>Edit</button>
                        {confirmDeleteId === emp.id ? (
                          <>
                            <button
                              style={{ ...S.actionBtn, ...S.deleteBtnConfirm }}
                              onClick={() => handleDelete(emp.id)}
                              disabled={deleting}
                            >
                              {deleting ? "…" : "Confirm"}
                            </button>
                            <button
                              style={{ ...S.actionBtn, color: "#6B7793" }}
                              onClick={() => setConfirmDeleteId(null)}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <button
                            style={{ ...S.actionBtn, ...S.deleteBtn }}
                            onClick={() => setConfirmDeleteId(emp.id)}
                          >
                            🗑
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!isLoading && employees.length === 0 && (
                <tr><td colSpan={9} style={S.empty}>No employees found</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {data?.count > 0 && (
          <div style={S.pagination}>
            <span style={S.pgInfo}>
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, data.count)} of {data.count}
            </span>
            <div style={S.pgButtons}>
              <button style={S.pgBtn} disabled={page === 1} onClick={() => setPage(page - 1)}>← Prev</button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let p = page <= 3 ? i + 1
                      : page >= totalPages - 2 ? totalPages - 4 + i
                      : page - 2 + i;
                p = Math.max(1, Math.min(totalPages, p));
                return (
                  <button
                    key={p}
                    style={{ ...S.pgBtn, ...(p === page ? S.pgBtnOn : {}) }}
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </button>
                );
              })}
              <button style={S.pgBtn} disabled={page === totalPages} onClick={() => setPage(page + 1)}>Next →</button>
            </div>
          </div>
        )}
      </div>

      {formEmployee !== null && (
        <EmployeeForm
          key={`${formEmployee?.id || "new"}-${formTab}`}
          employee={formEmployee}
          onClose={closeForm}
          initialTab={formTab}
        />
      )}

      {/* Bulk delete confirm modal */}
      {confirmBulkDelete && (
        <div style={S.overlay} onClick={() => setConfirmBulkDelete(false)}>
          <div style={S.modal} onClick={(e) => e.stopPropagation()}>
            <div style={S.modalTitle}>Delete {selectedIds.length} Employees?</div>
            <div style={{ fontSize: 13.5, color: "#6B7793", marginBottom: 20 }}>
              This action cannot be undone. All data for the selected employees will be permanently deleted.
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button style={S.btn} onClick={() => setConfirmBulkDelete(false)}>Cancel</button>
              <button
                style={{ ...S.btnSolid, background: "#D2453F" }}
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
              >
                {bulkDeleting ? "Deleting…" : `Delete ${selectedIds.length} Employees`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Import result modal */}
      {importResult && (
        <div style={S.overlay} onClick={() => setImportResult(null)}>
          <div style={S.modal} onClick={(e) => e.stopPropagation()}>
            {importResult.error ? (
              <>
                <div style={S.modalTitle}>Import Failed</div>
                <div style={{ ...S.resultBadge, background: "#FDECEA", color: "#D2453F" }}>
                  {importResult.error}
                </div>
              </>
            ) : (
              <>
                <div style={S.modalTitle}>Import Complete</div>
                <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                  <div style={{ ...S.resultBadge, background: "#E1F4EC", color: "#15966A" }}>
                    ✓ {importResult.created} employee{importResult.created !== 1 ? "s" : ""} created
                  </div>
                  {importResult.skipped > 0 && (
                    <div style={{ ...S.resultBadge, background: "#FBE6E5", color: "#D2453F" }}>
                      ✕ {importResult.skipped} skipped
                    </div>
                  )}
                </div>
                {importResult.errors?.length > 0 && (
                  <div style={S.errorList}>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, color: "#D2453F" }}>
                      Row errors:
                    </div>
                    {importResult.errors.map((e, i) => (
                      <div key={i} style={S.errorRow}>
                        <span style={{ fontWeight: 600 }}>Row {e.row} – {e.name}:</span> {e.error}
                      </div>
                    ))}
                  </div>
                )}
                {importResult.warnings?.length > 0 && (
                  <div style={{ ...S.errorList, borderColor: "#F5A623", marginTop: 10 }}>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, color: "#B97309" }}>
                      ⚠ Field warnings (employees were still created):
                    </div>
                    {importResult.warnings.map((w, i) => (
                      <div key={i} style={{ ...S.errorRow, color: "#8A5500" }}>
                        <span style={{ fontWeight: 600 }}>Row {w.row} – {w.name}:</span> {w.warnings.join(" | ")}
                      </div>
                    ))}
                  </div>
                )}
                {importResult.created === 0 && importResult.skipped === 0 && (
                  <div style={{ color: "#9AA6BF", fontSize: 13 }}>No data rows found in the file.</div>
                )}
              </>
            )}
            <div style={{ marginTop: 20, textAlign: "right" }}>
              <button style={S.btnSolid} onClick={() => setImportResult(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const S = {
  pageHead: { display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 12 },
  h1: { fontFamily: "Archivo", fontSize: 22, fontWeight: 700, color: "#0F1E3D" },
  sub: { fontSize: 13, color: "#6B7793", marginTop: 3 },
  actions: { display: "flex", gap: 9 },
  btn: { padding: "9px 14px", borderRadius: 9, border: "1px solid #E2E7F0", background: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" },
  btnSolid: { padding: "9px 14px", borderRadius: 9, border: 0, background: "#E8821E", color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" },
  toolbar: { display: "flex", gap: 9, marginBottom: 14, flexWrap: "wrap" },
  searchInput: { padding: "9px 12px", border: "1px solid #E2E7F0", borderRadius: 9, fontSize: 13, minWidth: 220, fontFamily: "inherit" },
  select: { padding: "9px 11px", border: "1px solid #E2E7F0", borderRadius: 9, fontSize: 13, fontFamily: "inherit", background: "#fff" },
  card: { background: "#fff", border: "1px solid #E2E7F0", borderRadius: 14, overflow: "auto" },
  table: { width: "100%", borderCollapse: "collapse", minWidth: 680 },
  th: { fontSize: 11, textTransform: "uppercase", letterSpacing: ".05em", color: "#6B7793", textAlign: "left", padding: "11px 14px", borderBottom: "1px solid #E2E7F0", fontWeight: 700, background: "#F4F6FA" },
  tr: { cursor: "pointer" },
  td: { padding: "12px 14px", fontSize: 13, borderBottom: "1px solid #E2E7F0", color: "#1B2540" },
  empCell: { display: "flex", alignItems: "center", gap: 10 },
  av: { width: 32, height: 32, borderRadius: 8, background: "#1E3563", color: "#fff", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 },
  empName: { fontWeight: 600, color: "#0F1E3D" },
  empCode: { fontSize: 11, color: "#6B7793" },
  pill: { display: "inline-flex", alignItems: "center", padding: "4px 10px", borderRadius: 30, fontSize: 11.5, fontWeight: 600 },
  link: { color: "#E8821E", fontWeight: 600, cursor: "pointer", fontSize: 12.5 },
  actionBtn: { padding: "4px 10px", borderRadius: 7, border: "1px solid #E2E7F0", background: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", color: "#E8821E", fontFamily: "inherit" },
  deleteBtn: { color: "#D2453F", border: "1px solid #f5c6c4" },
  deleteBtnConfirm: { color: "#fff", background: "#D2453F", border: "1px solid #D2453F" },
  loginBadge: { fontSize: 10, fontWeight: 700, color: "#1E3563", background: "#D9E3F7", borderRadius: 4, padding: "1px 5px" },
  docsBadge:  { display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 700, color: "#1E3563", background: "#D9E3F7", borderRadius: 6, padding: "3px 9px", cursor: "pointer" },
  docsUpload: { fontSize: 12, fontWeight: 600, color: "#9AA6BF", cursor: "pointer", textDecoration: "underline dotted" },
  empty:       { textAlign: "center", padding: 32, color: "#6B7793" },
  overlay:     { position: "fixed", inset: 0, background: "rgba(15,30,61,.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" },
  modal:       { background: "#fff", borderRadius: 16, padding: 28, width: "min(520px, 95vw)", maxHeight: "80vh", overflowY: "auto", boxShadow: "0 12px 40px rgba(0,0,0,.22)" },
  modalTitle:  { fontFamily: "Archivo", fontSize: 18, fontWeight: 800, color: "#0F1E3D", marginBottom: 16 },
  resultBadge: { display: "inline-flex", alignItems: "center", padding: "8px 14px", borderRadius: 9, fontWeight: 700, fontSize: 14 },
  errorList:   { background: "#FFF8F7", border: "1px solid #F5C6C4", borderRadius: 9, padding: "10px 14px", maxHeight: 240, overflowY: "auto" },
  errorRow:    { fontSize: 12.5, color: "#8B2020", padding: "4px 0", borderBottom: "1px solid #FADBD8" },
  bulkBar: { display: "flex", alignItems: "center", gap: 10, background: "#1E3563", borderRadius: 10, padding: "10px 16px", marginBottom: 10 },
  bulkInfo: { fontSize: 13, fontWeight: 600, color: "#fff", flex: 1 },
  bulkDeleteBtn: { padding: "7px 14px", borderRadius: 8, border: 0, background: "#D2453F", color: "#fff", fontSize: 12.5, fontWeight: 700, cursor: "pointer" },
  bulkClearBtn:  { padding: "7px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,.3)", background: "transparent", color: "#fff", fontSize: 12.5, fontWeight: 600, cursor: "pointer" },
  pagination: { display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14, flexWrap: "wrap", gap: 8 },
  pgInfo: { fontSize: 12.5, color: "#6B7793" },
  pgButtons: { display: "flex", gap: 4 },
  pgBtn: { padding: "7px 12px", borderRadius: 8, border: "1px solid #E2E7F0", background: "#fff", fontSize: 13, cursor: "pointer", fontFamily: "inherit", color: "#1B2540" },
  pgBtnOn: { background: "#E8821E", color: "#fff", border: "1px solid #E8821E", fontWeight: 700 },
};
