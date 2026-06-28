import { useRef, useState } from "react";
import {
  useGetMyDocumentsQuery,
  useUploadMyDocumentMutation,
  useDeleteMyDocumentMutation,
} from "../employees/employeesApi";

const DOC_TYPES = [
  { value: "aadhar", label: "Aadhar Card" },
  { value: "pan",    label: "PAN Card" },
  { value: "photo",  label: "Photo" },
  { value: "other",  label: "Other" },
];

const TYPE_META = {
  aadhar: { bg: "#E3F2FD", color: "#1565C0", icon: "🪪" },
  pan:    { bg: "#F3E5F5", color: "#6A1B9A", icon: "📋" },
  photo:  { bg: "#E8F5E9", color: "#2E7D32", icon: "🖼️" },
  other:  { bg: "#FFF8E1", color: "#E65100", icon: "📎" },
};

const MAX_BYTES = 25 * 1024 * 1024;

export default function EmployeeDocumentsPage() {
  const [docType, setDocType]       = useState("aadhar");
  const [fileName, setFileName]     = useState("");
  const [uploadError, setUploadError] = useState("");
  const fileRef = useRef();

  const { data: docs = [], isLoading } = useGetMyDocumentsQuery();
  const [upload, { isLoading: uploading }] = useUploadMyDocumentMutation();
  const [deleteDoc]                        = useDeleteMyDocumentMutation();

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    setFileName(f ? f.name : "");
    setUploadError("");
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    if (file.size > MAX_BYTES) {
      setUploadError("File too large. Maximum allowed size is 25 MB.");
      return;
    }
    setUploadError("");
    const fd = new FormData();
    fd.append("doc_type", docType);
    fd.append("file", file);
    try {
      await upload(fd).unwrap();
      fileRef.current.value = "";
      setFileName("");
    } catch (err) {
      setUploadError(err?.data?.detail || "Upload failed. Please try again.");
    }
  };

  const handleDelete = async (docId) => {
    if (!window.confirm("Delete this document? This cannot be undone.")) return;
    try {
      await deleteDoc(docId).unwrap();
    } catch {
      alert("Delete failed. Please try again.");
    }
  };

  return (
    <div>
      <div style={S.pageHead}>
        <h1 style={S.h1}>My Documents</h1>
        <p style={S.sub}>Upload and manage your personal documents · PDF only · Max 25 MB</p>
      </div>

      {/* Upload card */}
      <div style={S.card}>
        <div style={S.cardTitle}>Upload New Document</div>
        <form style={S.form} onSubmit={handleUpload}>
          <div style={S.row}>
            <div style={S.field}>
              <label style={S.label}>Document Type</label>
              <select style={S.select} value={docType} onChange={(e) => setDocType(e.target.value)}>
                {DOC_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div style={{ ...S.field, flex: 2 }}>
              <label style={S.label}>Select PDF File</label>
              <label style={S.filePicker}>
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/pdf"
                  style={{ display: "none" }}
                  onChange={handleFileChange}
                  required
                />
                <span style={S.filePickerIcon}>📂</span>
                <span style={{ color: fileName ? "#0F1E3D" : "#9AA6BF", fontSize: 13 }}>
                  {fileName || "Click to choose a PDF file…"}
                </span>
              </label>
            </div>

            <div style={S.field}>
              <label style={{ ...S.label, opacity: 0 }}>Action</label>
              <button type="submit" style={S.uploadBtn} disabled={uploading || !fileName}>
                {uploading ? "Uploading…" : "⬆ Upload"}
              </button>
            </div>
          </div>

          {uploadError && <div style={S.errorMsg}>⚠ {uploadError}</div>}
        </form>
      </div>

      {/* Documents list */}
      <div style={S.card}>
        <div style={S.cardTitle}>
          Uploaded Documents
          <span style={S.count}>{docs.length}</span>
        </div>

        {isLoading ? (
          <div style={S.empty}>Loading your documents…</div>
        ) : docs.length === 0 ? (
          <div style={S.empty}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>📂</div>
            <div>No documents uploaded yet.</div>
            <div style={{ fontSize: 12, color: "#9AA6BF", marginTop: 4 }}>
              Use the form above to upload your Aadhar, PAN, or other documents.
            </div>
          </div>
        ) : (
          <div style={S.grid}>
            {docs.map((doc) => {
              const meta = TYPE_META[doc.doc_type] || TYPE_META.other;
              const typeName = DOC_TYPES.find((t) => t.value === doc.doc_type)?.label || doc.doc_type;
              const rawName = doc.file?.split("/").pop() || "document.pdf";
              const uploadDate = new Date(doc.uploaded_at).toLocaleDateString("en-IN", {
                day: "numeric", month: "short", year: "numeric",
              });
              return (
                <div key={doc.id} style={S.docCard}>
                  <div style={S.docTop}>
                    <div style={{ ...S.iconBox, background: meta.bg, color: meta.color }}>
                      {meta.icon}
                    </div>
                    <div style={{ flex: 1, overflow: "hidden" }}>
                      <div style={{ ...S.badge, background: meta.bg, color: meta.color }}>
                        {typeName}
                      </div>
                      <div style={S.docName} title={rawName}>{rawName}</div>
                      <div style={S.docDate}>Uploaded {uploadDate}</div>
                    </div>
                  </div>
                  <div style={S.docActions}>
                    <a
                      href={doc.file}
                      target="_blank"
                      rel="noreferrer"
                      style={S.viewBtn}
                    >
                      👁 View
                    </a>
                    <button style={S.deleteBtn} onClick={() => handleDelete(doc.id)}>
                      🗑 Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const S = {
  pageHead:    { marginBottom: 20 },
  h1:          { fontFamily: "Archivo", fontSize: 22, fontWeight: 700, color: "#0F1E3D", margin: 0 },
  sub:         { fontSize: 13, color: "#6B7793", marginTop: 4 },
  card:        { background: "#fff", border: "1px solid #E2E7F0", borderRadius: 14, padding: "22px 24px", marginBottom: 20 },
  cardTitle:   { fontSize: 15, fontWeight: 700, color: "#0F1E3D", marginBottom: 18, display: "flex", alignItems: "center", gap: 8 },
  count:       { display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 22, height: 22, borderRadius: 11, background: "#E3EEF9", color: "#1565C0", fontSize: 11, fontWeight: 700, padding: "0 6px" },
  form:        {},
  row:         { display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" },
  field:       { display: "flex", flexDirection: "column", gap: 5, flex: 1, minWidth: 160 },
  label:       { fontSize: 11.5, fontWeight: 600, color: "#6B7793", textTransform: "uppercase", letterSpacing: ".4px" },
  select:      { padding: "10px 12px", borderRadius: 9, border: "1px solid #D1D9E8", fontSize: 13, background: "#F8F9FC", color: "#0F1E3D", cursor: "pointer", height: 40 },
  filePicker:  { display: "flex", alignItems: "center", gap: 8, padding: "0 12px", borderRadius: 9, border: "1px dashed #C0C9D9", background: "#F8F9FC", height: 40, cursor: "pointer", overflow: "hidden" },
  filePickerIcon: { fontSize: 16, flexShrink: 0 },
  uploadBtn:   { height: 40, padding: "0 20px", borderRadius: 9, border: 0, background: "#1E3563", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" },
  errorMsg:    { marginTop: 12, color: "#D2453F", fontSize: 13, fontWeight: 600 },
  empty:       { textAlign: "center", padding: "40px 20px", color: "#9AA6BF", fontSize: 14 },
  grid:        { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 },
  docCard:     { border: "1px solid #E2E7F0", borderRadius: 12, padding: "16px", background: "#F8F9FC" },
  docTop:      { display: "flex", gap: 12, marginBottom: 14 },
  iconBox:     { width: 42, height: 42, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 },
  badge:       { fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 20, display: "inline-block", marginBottom: 4 },
  docName:     { fontSize: 12.5, fontWeight: 600, color: "#0F1E3D", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  docDate:     { fontSize: 11.5, color: "#9AA6BF", marginTop: 2 },
  docActions:  { display: "flex", gap: 8 },
  viewBtn:     { flex: 1, padding: "7px 0", borderRadius: 8, background: "#1E3563", color: "#fff", fontWeight: 600, fontSize: 12, textAlign: "center", textDecoration: "none", display: "block" },
  deleteBtn:   { padding: "7px 12px", borderRadius: 8, border: "1px solid #F5C6C6", background: "#fff", color: "#D2453F", fontWeight: 600, fontSize: 12, cursor: "pointer" },
};
