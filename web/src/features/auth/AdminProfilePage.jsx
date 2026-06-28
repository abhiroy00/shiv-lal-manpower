import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { setCredentials } from "./authSlice";

export default function AdminProfilePage() {
  const user        = useSelector((s) => s.auth.user);
  const accessToken = useSelector((s) => s.auth.accessToken);
  const dispatch    = useDispatch();

  const [email, setEmail]       = useState(user?.email || "");
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [saving, setSaving]     = useState(false);
  const [msg, setMsg]           = useState(null); // { type: "ok"|"err", text }

  useEffect(() => {
    setEmail(user?.email || "");
    setFullName(user?.full_name || "");
  }, [user]);

  const handleSave = async (e) => {
    e.preventDefault();
    setMsg(null);
    setSaving(true);
    try {
      const res = await fetch("/api/auth/me/", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ email: email.trim(), full_name: fullName.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.email?.[0] || err.detail || "Save failed.");
      }
      const updated = await res.json();
      // Update Redux so the topbar name refreshes immediately
      dispatch(setCredentials({ user: updated }));
      setMsg({ type: "ok", text: "Profile saved. You can now use Forgot Password with your mobile number." });
    } catch (err) {
      setMsg({ type: "err", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div style={S.pageHead}>
        <h1 style={S.h1}>My Profile</h1>
        <p style={S.sub}>Update your name and recovery email — required for Forgot Password.</p>
      </div>

      <div style={S.card}>
        <form onSubmit={handleSave}>
          <div style={S.row}>
            <div style={S.field}>
              <label style={S.label}>Full name</label>
              <input style={S.input} value={fullName}
                onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div style={S.field}>
              <label style={S.label}>Mobile (login ID)</label>
              <input style={{ ...S.input, background: "#F8F9FC", color: "#6B7793" }}
                value={user?.phone || ""} readOnly />
            </div>
          </div>

          <div style={S.field}>
            <label style={S.label}>Recovery email</label>
            <input style={S.input} type="email" value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com" />
            <div style={S.hint}>
              Used only for password reset emails. Not visible to employees.
            </div>
          </div>

          {msg && (
            <div style={{ ...S.alert, ...(msg.type === "ok" ? S.alertOk : S.alertErr) }}>
              {msg.text}
            </div>
          )}

          <button type="submit" style={S.btn} disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </button>
        </form>

        <div style={S.divider} />

        <div style={S.infoGrid}>
          <div style={S.infoCell}><div style={S.infoKey}>Role</div><div style={S.infoVal}>{user?.role}</div></div>
          <div style={S.infoCell}><div style={S.infoKey}>Email on file</div><div style={S.infoVal}>{user?.email || <span style={{ color: "#D2453F" }}>Not set — add one above</span>}</div></div>
        </div>
      </div>
    </div>
  );
}


const S = {
  pageHead: { marginBottom: 20 },
  h1:  { fontFamily: "Archivo", fontSize: 22, fontWeight: 700, color: "#0F1E3D" },
  sub: { fontSize: 13, color: "#6B7793", marginTop: 3 },
  card: { background: "#fff", border: "1px solid #E2E7F0", borderRadius: 14, padding: 28, maxWidth: 560 },
  row:  { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
  field: { marginBottom: 16 },
  label: { display: "block", fontSize: 12, fontWeight: 600, color: "#6B7793", marginBottom: 5 },
  input: { width: "100%", padding: "10px 12px", border: "1px solid #E2E7F0", borderRadius: 9, fontSize: 14, fontFamily: "inherit", boxSizing: "border-box" },
  hint:  { fontSize: 11.5, color: "#9AA6BF", marginTop: 4 },
  btn:   { padding: "10px 24px", background: "#E8821E", color: "#fff", border: 0, borderRadius: 9, fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" },
  alert: { padding: "10px 14px", borderRadius: 9, fontSize: 13, marginBottom: 14 },
  alertOk:  { background: "#E1F4EC", color: "#0D6E4A" },
  alertErr: { background: "#FBE6E5", color: "#D2453F" },
  divider: { borderTop: "1px solid #E2E7F0", margin: "20px 0" },
  infoGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  infoCell: { background: "#F8F9FC", borderRadius: 9, padding: "12px 14px" },
  infoKey:  { fontSize: 11, color: "#6B7793", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".4px", marginBottom: 3 },
  infoVal:  { fontSize: 14, fontWeight: 600, color: "#0F1E3D" },
};
