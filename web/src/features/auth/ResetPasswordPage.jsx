import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useConfirmPasswordResetMutation } from "./authApi";

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const uid = params.get("uid") || "";
  const token = params.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [confirmReset, { isLoading }] = useConfirmPasswordResetMutation();
  const navigate = useNavigate();

  const linkValid = uid && token;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    try {
      await confirmReset({ uid, token, new_password: password }).unwrap();
      setDone(true);
    } catch (err) {
      const data = err?.data || {};
      setError(
        data.token?.[0] || data.uid?.[0] || data.new_password?.[0] || data.detail ||
        "Could not reset password. The link may have expired — request a new one."
      );
    }
  };

  return (
    <div style={S.wrap}>
      <div style={S.card}>
        <div style={S.logoCircle}>
          <img src="/shivlal_logo.jpeg" alt="M/S Shiv Lal" style={S.logoImg} />
        </div>

        {!linkValid ? (
          <>
            <h2 style={S.h2}>Invalid link</h2>
            <p style={S.sub}>
              This password reset link is incomplete or malformed. Please request a new one.
            </p>
            <button style={S.submit} onClick={() => navigate("/forgot-password")}>
              Request a new link
            </button>
          </>
        ) : done ? (
          <>
            <h2 style={S.h2}>Password reset ✓</h2>
            <p style={S.sub}>Your password has been updated. You can now sign in with it.</p>
            <button style={S.submit} onClick={() => navigate("/login")}>
              Go to sign in →
            </button>
          </>
        ) : (
          <>
            <h2 style={S.h2}>Set a new password</h2>
            <p style={S.sub}>Choose a strong password you haven&apos;t used before.</p>
            <form onSubmit={handleSubmit}>
              <label style={S.label}>New password</label>
              <input
                style={S.input}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                autoFocus
              />
              <label style={S.label}>Confirm new password</label>
              <input
                style={S.input}
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Re-enter password"
              />
              {error && <div style={S.err}>{error}</div>}
              <button type="submit" style={S.submit} disabled={isLoading}>
                {isLoading ? "Resetting…" : "Reset password →"}
              </button>
            </form>
            <button style={S.linkBtn} onClick={() => navigate("/login")}>
              ← Back to sign in
            </button>
          </>
        )}
      </div>
    </div>
  );
}

const S = {
  wrap: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "radial-gradient(1200px 600px at 80% -10%, rgba(232,130,30,.18), transparent 60%), #0F1E3D", padding: 24 },
  card: { background: "#fff", borderRadius: 18, padding: "40px 36px", width: 410, boxShadow: "0 30px 80px rgba(0,0,0,.45)", textAlign: "center" },
  logoCircle: { width: 96, height: 96, borderRadius: "50%", overflow: "hidden", margin: "0 auto 18px", border: "3px solid #D4AF37", boxShadow: "0 0 0 6px rgba(212,175,55,0.2)", backgroundColor: "#B71C1C" },
  logoImg: { width: "100%", height: "100%", objectFit: "contain" },
  h2: { fontFamily: "Archivo", fontSize: 22, fontWeight: 700, color: "#0F1E3D" },
  sub: { color: "#6B7793", fontSize: 13.5, margin: "8px 0 20px", lineHeight: 1.55 },
  label: { display: "block", fontSize: 12, fontWeight: 600, color: "#6B7793", marginBottom: 6, marginTop: 12, textAlign: "left" },
  input: { width: "100%", padding: "11px 13px", border: "1px solid #E2E7F0", borderRadius: 10, fontSize: 14, fontFamily: "inherit", boxSizing: "border-box" },
  err: { color: "#D2453F", fontSize: 12.5, marginTop: 10, textAlign: "left" },
  submit: { width: "100%", marginTop: 16, padding: 13, border: 0, borderRadius: 10, background: "#E8821E", color: "#fff", fontWeight: 700, fontSize: 14.5, cursor: "pointer", fontFamily: "inherit" },
  linkBtn: { width: "100%", marginTop: 12, padding: 8, border: 0, background: "transparent", color: "#1E3563", fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "inherit" },
};
