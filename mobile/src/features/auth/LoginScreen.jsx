import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useDispatch } from "react-redux";
import { setCredentials } from "./authSlice";
import { saveTokens } from "../../services/storage";
import { colors } from "../../theme/colors";

const API_URL = "http://10.0.2.2:8000/api";

export default function LoginScreen() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();

  const handleLogin = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/token/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: phone, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Login failed");

      const meRes = await fetch(`${API_URL}/auth/me/`, {
        headers: { Authorization: `Bearer ${data.access}` },
      });
      const user = await meRes.json();

      await saveTokens(data.access, data.refresh);
      dispatch(setCredentials({ accessToken: data.access, refreshToken: data.refresh, user }));
    } catch (e) {
      Alert.alert("Login Failed", e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>SL</Text>
        <Text style={styles.title}>Shiv Lal Manpower</Text>
        <Text style={styles.subtitle}>Employee Portal</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Mobile / User ID</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="Enter mobile number"
          keyboardType="phone-pad"
          autoCapitalize="none"
        />
        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Enter password"
          secureTextEntry
        />
        <TouchableOpacity style={styles.btn} onPress={handleLogin} disabled={loading}>
          <Text style={styles.btnText}>{loading ? "Signing in…" : "Sign In →"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.ink, justifyContent: "center", padding: 24 },
  header: { alignItems: "center", marginBottom: 40 },
  logo: { width: 64, height: 64, borderRadius: 16, backgroundColor: colors.saffron, textAlign: "center", lineHeight: 64, fontSize: 24, fontWeight: "800", color: "#fff", overflow: "hidden" },
  title: { fontSize: 24, fontWeight: "800", color: "#fff", marginTop: 16 },
  subtitle: { fontSize: 14, color: colors.muted2, marginTop: 4 },
  form: { backgroundColor: "#fff", borderRadius: 16, padding: 24 },
  label: { fontSize: 12, fontWeight: "700", color: colors.muted, marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 12, fontSize: 14, fontFamily: "System" },
  btn: { backgroundColor: colors.saffron, borderRadius: 12, padding: 16, alignItems: "center", marginTop: 20 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
