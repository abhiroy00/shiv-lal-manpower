import React from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert,
} from "react-native";
import { useSelector, useDispatch } from "react-redux";
import { logout } from "../auth/authSlice";
import { clearTokens } from "../../services/storage";
import { colors } from "../../theme/colors";

function maskString(val, show = 4) {
  if (!val || val.length <= show) return val || "—";
  return "•".repeat(val.length - show) + val.slice(-show);
}

function InfoRow({ label, value, masked }) {
  return (
    <View style={S.infoRow}>
      <Text style={S.infoLabel}>{label}</Text>
      <Text style={S.infoVal}>{masked ? maskString(value) : (value || "—")}</Text>
    </View>
  );
}

export default function ProfileScreen() {
  const user     = useSelector((s) => s.auth.user);
  const emp      = user?.employee_detail || null;
  const dispatch = useDispatch();

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await clearTokens();
          dispatch(logout());
        },
      },
    ]);
  };

  const initials = (user?.full_name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <ScrollView style={S.page} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Avatar block */}
      <View style={S.heroBlock}>
        <View style={S.avatar}>
          <Text style={S.avatarTxt}>{initials}</Text>
        </View>
        <Text style={S.name}>{user?.full_name}</Text>
        <Text style={S.role}>{user?.role?.toUpperCase()}</Text>
        {emp?.emp_code && (
          <View style={S.codeBadge}>
            <Text style={S.codeTxt}>{emp.emp_code}</Text>
          </View>
        )}
      </View>

      {/* Work info */}
      <View style={S.card}>
        <Text style={S.cardTitle}>WORK DETAILS</Text>
        <InfoRow label="Designation"  value={emp?.designation} />
        <InfoRow label="Site"         value={emp?.site_name} />
        <InfoRow label="Date Joined"  value={emp?.date_joined} />
        <InfoRow label="Status"       value={emp?.status} />
      </View>

      {/* Statutory info */}
      <View style={S.card}>
        <Text style={S.cardTitle}>STATUTORY DETAILS</Text>
        <InfoRow label="UAN"   value={emp?.uan}   masked />
        <InfoRow label="ESIC"  value={emp?.esic_no} masked />
        <InfoRow label="PAN"   value={emp?.pan}   masked />
      </View>

      {/* Bank info */}
      <View style={S.card}>
        <Text style={S.cardTitle}>BANK DETAILS</Text>
        <InfoRow label="Account No." value={emp?.bank_account} masked />
        <InfoRow label="IFSC"        value={emp?.ifsc}  />
      </View>

      {/* Contact */}
      <View style={S.card}>
        <Text style={S.cardTitle}>CONTACT</Text>
        <InfoRow label="Phone"   value={user?.phone} />
        <InfoRow label="Address" value={emp?.address} />
      </View>

      {/* Logout */}
      <TouchableOpacity style={S.logoutBtn} onPress={handleLogout}>
        <Text style={S.logoutTxt}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const S = StyleSheet.create({
  page:       { flex: 1, backgroundColor: "#F4F6FA" },
  heroBlock:  { backgroundColor: colors.ink, alignItems: "center", paddingTop: 32, paddingBottom: 28 },
  avatar:     { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.saffron, justifyContent: "center", alignItems: "center", marginBottom: 12 },
  avatarTxt:  { color: "#fff", fontWeight: "800", fontSize: 26 },
  name:       { color: "#fff", fontSize: 20, fontWeight: "800" },
  role:       { color: "rgba(255,255,255,.5)", fontSize: 12, fontWeight: "600", marginTop: 3, letterSpacing: 1 },
  codeBadge:  { backgroundColor: "rgba(255,255,255,.15)", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 5, marginTop: 10 },
  codeTxt:    { color: colors.saffron, fontSize: 13, fontWeight: "700" },
  card:       { backgroundColor: "#fff", marginHorizontal: 16, marginTop: 14, borderRadius: 14, padding: 16, elevation: 1 },
  cardTitle:  { fontSize: 11, fontWeight: "700", color: colors.muted, letterSpacing: 0.5, marginBottom: 12 },
  infoRow:    { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F0F2F8" },
  infoLabel:  { fontSize: 13, color: colors.muted },
  infoVal:    { fontSize: 13, fontWeight: "600", color: colors.ink, flex: 1, textAlign: "right" },
  logoutBtn:  { margin: 16, marginTop: 20, backgroundColor: "#FBE6E5", borderRadius: 14, padding: 16, alignItems: "center" },
  logoutTxt:  { color: "#C0392B", fontWeight: "700", fontSize: 16 },
});
