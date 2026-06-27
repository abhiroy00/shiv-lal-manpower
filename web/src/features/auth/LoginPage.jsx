import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { useLoginMutation } from "./authApi";
import { setCredentials } from "./authSlice";
import { ShivLalLogoFull } from "../../components/ShivLalLogo";

export default function LoginPage() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [login, { isLoading, error }] = useLoginMutation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = await login({ phone, password }).unwrap();
      const meRes = await fetch("/api/auth/me/", {
        headers: { Authorization: `Bearer ${data.access}` },
      });
      const user = await meRes.json();
      dispatch(setCredentials({ accessToken: data.access, refreshToken: data.refresh, user }));
      navigate("/dashboard");
    } catch {}
  };

  return (
    <div style={styles.wrap}>
      <div style={styles.brand}>
        <ShivLalLogoFull width={160} />
        <div style={styles.eyebrow}>Manpower Operations Console</div>
        <h1 style={styles.h1}>Shiv Lal Manpower<br />Management Portal</h1>
        <p style={styles.tagline}>
          Centralized monitoring for government tender operations — attendance, payroll, compliance &amp; district-wise deployment.
        </p>
        <div style={styles.badges}>
          {["GPS + Selfie Attendance", "PF / ESI Compliant", "Tender-Ready MIS"].map((b) => (
            <span key={b} style={styles.badge}>{b}</span>
          ))}
        </div>
      </div>

      <div style={styles.card}>
        <h2 style={styles.cardH2}>Sign in to your console</h2>
        <p style={styles.sub}>Use your registered credentials to continue.</p>

        <div style={styles.roleTabs}>
          <button style={{ ...styles.roleBtn, ...styles.roleBtnOn }}>Admin / HR</button>
        </div>

        <form onSubmit={handleSubmit}>
          <label style={styles.label}>User ID / Mobile</label>
          <input
            style={styles.input}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone or email"
          />
          <label style={styles.label}>Password</label>
          <input
            style={styles.input}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
          />
          {error && <div style={styles.err}>Invalid credentials. Try again.</div>}
          <button type="submit" style={styles.submit} disabled={isLoading}>
            {isLoading ? "Signing in…" : "Sign in →"}
          </button>
        </form>
        <div style={styles.foot}>Shiv Lal Manpower Portal · Secure Login</div>
      </div>
    </div>
  );
}

const styles = {
  wrap: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "radial-gradient(1200px 600px at 80% -10%, rgba(232,130,30,.18), transparent 60%), #0F1E3D", padding: 24 },
  brand: { flex: 1.1, padding: "48px 44px", color: "#fff", maxWidth: 440 },
  eyebrow: { fontSize: 12, letterSpacing: ".18em", textTransform: "uppercase", color: "#E8821E", fontWeight: 700 },
  h1: { fontFamily: "Archivo", fontWeight: 800, fontSize: 34, lineHeight: 1.1, margin: "14px 0 10px" },
  tagline: { color: "#AEB9D4", fontSize: 14.5, maxWidth: 360 },
  badges: { display: "flex", gap: 10, flexWrap: "wrap", marginTop: 28 },
  badge: { fontSize: 11.5, color: "#cfd8ee", border: "1px solid rgba(255,255,255,.15)", padding: "7px 11px", borderRadius: 8, background: "rgba(255,255,255,.04)" },
  card: { background: "#fff", borderRadius: 18, padding: "46px 40px", width: 400, boxShadow: "0 30px 80px rgba(0,0,0,.45)" },
  cardH2: { fontFamily: "Archivo", fontSize: 22, fontWeight: 700, color: "#0F1E3D" },
  sub: { color: "#6B7793", fontSize: 13.5, margin: "6px 0 20px" },
  roleTabs: { display: "flex", background: "#F4F6FA", borderRadius: 10, padding: 4, marginBottom: 18 },
  roleBtn: { flex: 1, border: 0, background: "transparent", padding: 9, borderRadius: 8, fontWeight: 600, fontSize: 13, color: "#6B7793", cursor: "pointer" },
  roleBtnOn: { background: "#fff", color: "#0F1E3D", boxShadow: "0 1px 2px rgba(15,30,61,.06)" },
  label: { display: "block", fontSize: 12, fontWeight: 600, color: "#6B7793", marginBottom: 6, marginTop: 12 },
  input: { width: "100%", padding: "11px 13px", border: "1px solid #E2E7F0", borderRadius: 10, fontSize: 14, fontFamily: "inherit" },
  err: { color: "#D2453F", fontSize: 12.5, marginTop: 8 },
  submit: { width: "100%", marginTop: 16, padding: 13, border: 0, borderRadius: 10, background: "#E8821E", color: "#fff", fontWeight: 700, fontSize: 14.5, cursor: "pointer", fontFamily: "inherit" },
  foot: { marginTop: 18, fontSize: 12, color: "#9AA6BF", textAlign: "center" },
};
