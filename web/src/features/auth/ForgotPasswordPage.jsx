import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRequestPasswordResetMutation } from "./authApi";

export default function ForgotPasswordPage() {
  const [phone, setPhone] = useState("");
  const [sent, setSent] = useState(false);
  const [apiError, setApiError] = useState("");
  const [requestReset, { isLoading }] = useRequestPasswordResetMutation();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError("");
    try {
      await requestReset({ phone: phone.trim() }).unwrap();
      setSent(true);
    } catch (err) {
      const msg = err?.data?.detail;
      if (msg && msg.toLowerCase().includes("no email")) {
        setApiError(msg);
      } else {
        setSent(true); // generic success to avoid phone enumeration
      }
    }
  };

  return (
    <div style={S.wrap}>
      <div style={S.card}>
        <div style={S.logoCircle}>
          <img src="/shivlal_logo.jpeg" alt="M/S Shiv Lal" style={S.logoImg} />
        </div>

        {sent ? (
          <>
            <h2 style={S.h2}>Check your email</h2>
            <p style={S.sub}>
              If <strong>{phone}</strong> is registered as an admin account with an email on
              file, we&apos;ve sent a password reset link. It expires in 2 hours.
            </p>
            <div style={S.note}>
              Didn&apos;t get it? Check spam, or ask your administrator to add an email address
              to your account.
            </div>
            <button style={S.submit} onClick={() => navigate("/login")}>
              Back to sign in
            </button>
            <button style={S.linkBtn} onClick={() => { setSent(false); setPhone(""); }}>
              Try a different number
            </button>
          </>
        ) : (
          <>
            <h2 style={S.h2}>Forgot password?</h2>
            <p style={S.sub}>
              Enter your registered mobile number. If it belongs to an admin account with
              an email on file, we&apos;ll send a reset link there.
            </p>
            <form onSubmit={handleSubmit}>
              <label style={S.label}>Registered mobile number</label>
              <input
                style={S.input}
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                placeholder="10-digit mobile number"
                maxLength={15}
                required
                autoFocus
              />
              {apiError && <div style={S.err}>{apiError}</div>}
              <button type="submit" style={S.submit} disabled={isLoading || phone.trim().length < 10}>
                {isLoading ? "Sending…" : "Send reset link →"}
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
  label: { display: "block", fontSize: 12, fontWeight: 600, color: "#6B7793", marginBottom: 6, textAlign: "left" },
  input: { width: "100%", padding: "11px 13px", border: "1px solid #E2E7F0", borderRadius: 10, fontSize: 14, fontFamily: "inherit", boxSizing: "border-box" },
  err: { color: "#D2453F", fontSize: 12.5, marginTop: 8, textAlign: "left" },
  submit: { width: "100%", marginTop: 16, padding: 13, border: 0, borderRadius: 10, background: "#E8821E", color: "#fff", fontWeight: 700, fontSize: 14.5, cursor: "pointer", fontFamily: "inherit" },
  linkBtn: { width: "100%", marginTop: 12, padding: 8, border: 0, background: "transparent", color: "#1E3563", fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "inherit" },
  note: { fontSize: 12.5, color: "#8a5310", background: "#FCEFDD", border: "1px solid #f2d9b8", borderRadius: 10, padding: "11px 14px", margin: "4px 0 8px", textAlign: "left", lineHeight: 1.5 },
};
