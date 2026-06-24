import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDispatch } from "react-redux";
import { setCredentials } from "./authSlice";
import { saveTokens } from "../../services/storage";
import { API_URL } from "../../api/baseApi";
import { colors } from "../../theme/colors";

export default function LoginScreen() {
  const insets   = useSafeAreaInsets();
  const dispatch = useDispatch();
  const [phone,    setPhone]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);

  const handleLogin = async () => {
    if (!phone.trim() || !password.trim()) {
      Alert.alert("Error", "Phone aur password zaroori hain");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/token/`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ phone, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || JSON.stringify(data));

      const meRes  = await fetch(`${API_URL}/auth/me/`, {
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
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.ink }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={[S.scroll, { paddingTop: (insets.top || 0) + 24, paddingBottom: (insets.bottom || 0) + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Brand */}
        <View style={S.brand}>
          <View style={S.logoWrap}>
            <View style={S.logo}>
              <Text style={S.logoTxt}>SL</Text>
            </View>
            <View style={S.logoDot} />
          </View>
          <Text style={S.appName}>Shiv Lal Manpower</Text>
          <Text style={S.tagline}>Employee Management Portal</Text>

          <View style={S.badges}>
            {["GPS Attendance", "PF / ESI", "Payslips"].map((b) => (
              <View key={b} style={S.badge}>
                <Text style={S.badgeTxt}>{b}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Form card */}
        <View style={S.card}>
          <Text style={S.cardTitle}>Sign in to your account</Text>
          <Text style={S.cardSub}>Use your registered mobile number</Text>

          <Text style={S.label}>Mobile Number</Text>
          <TextInput
            style={S.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="10-digit mobile number"
            placeholderTextColor="#B0BAD0"
            keyboardType="phone-pad"
            maxLength={10}
            autoComplete="tel"
          />

          <Text style={S.label}>Password</Text>
          <TextInput
            style={S.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Enter password"
            placeholderTextColor="#B0BAD0"
            secureTextEntry
            autoComplete="password"
          />

          <TouchableOpacity style={[S.btn, loading && S.btnDisabled]} onPress={handleLogin} disabled={loading}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={S.btnTxt}>Sign In  →</Text>
            }
          </TouchableOpacity>

          <Text style={S.hint}>Contact your HR to reset your password</Text>
        </View>

        <Text style={S.footer}>Shiv Lal Manpower Services · Secure Portal</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const S = StyleSheet.create({
  scroll:    { flexGrow: 1, paddingHorizontal: 24 },
  brand:     { alignItems: "center", marginBottom: 28 },
  logoWrap:  { position: "relative", marginBottom: 16 },
  logo:      { width: 72, height: 72, borderRadius: 20, backgroundColor: colors.saffron, justifyContent: "center", alignItems: "center" },
  logoTxt:   { color: "#fff", fontSize: 28, fontWeight: "900", letterSpacing: 1 },
  logoDot:   { position: "absolute", bottom: -2, right: -2, width: 20, height: 20, borderRadius: 10, backgroundColor: colors.green, borderWidth: 2, borderColor: colors.ink },
  appName:   { fontSize: 22, fontWeight: "800", color: "#fff", letterSpacing: 0.3 },
  tagline:   { fontSize: 13, color: colors.muted2, marginTop: 4, marginBottom: 16 },
  badges:    { flexDirection: "row", gap: 8 },
  badge:     { borderWidth: 1, borderColor: "rgba(255,255,255,.15)", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, backgroundColor: "rgba(255,255,255,.06)" },
  badgeTxt:  { color: colors.muted2, fontSize: 11, fontWeight: "600" },

  card:      { backgroundColor: "#fff", borderRadius: 24, padding: 28, shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 24, elevation: 10 },
  cardTitle: { fontSize: 18, fontWeight: "800", color: colors.ink, marginBottom: 4 },
  cardSub:   { fontSize: 13, color: colors.muted, marginBottom: 24 },
  label:     { fontSize: 12, fontWeight: "700", color: colors.muted, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 },
  input:     { borderWidth: 1.5, borderColor: colors.line, borderRadius: 14, padding: 14, fontSize: 15, color: colors.ink, backgroundColor: "#FAFBFF", marginBottom: 16 },
  btn:       { backgroundColor: colors.saffron, borderRadius: 14, paddingVertical: 16, alignItems: "center", marginTop: 4, shadowColor: colors.saffron, shadowOpacity: 0.4, shadowRadius: 10, elevation: 4 },
  btnDisabled:{ opacity: 0.7 },
  btnTxt:    { color: "#fff", fontWeight: "800", fontSize: 16 },
  hint:      { textAlign: "center", color: colors.muted, fontSize: 12, marginTop: 16 },
  footer:    { textAlign: "center", color: "rgba(255,255,255,.2)", fontSize: 11, marginTop: 20 },
});
