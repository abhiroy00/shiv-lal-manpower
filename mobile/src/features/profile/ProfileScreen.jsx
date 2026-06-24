import React, { useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert,
  Modal, TextInput, ActivityIndicator, Image, RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSelector, useDispatch } from "react-redux";
import { logout } from "../auth/authSlice";
import { clearTokens } from "../../services/storage";
import { baseApi } from "../../api/baseApi";
import { colors } from "../../theme/colors";
import {
  useGetMeQuery,
  useUpdateProfileMutation,
  useChangePasswordMutation,
} from "./profileApi";

// ─── helpers ──────────────────────────────────────────────────────────────────

function maskString(val, show = 4) {
  if (!val) return "—";
  if (val.length <= show) return val;
  return "•".repeat(Math.max(val.length - show, 4)) + val.slice(-show);
}

function formatDate(val) {
  if (!val) return "—";
  try {
    return new Date(val).toLocaleDateString("en-IN", {
      day: "numeric", month: "short", year: "numeric",
    });
  } catch {
    return val;
  }
}

// ─── sub-components ───────────────────────────────────────────────────────────

function SectionCard({ icon, title, children }) {
  return (
    <View style={S.card}>
      <View style={S.cardHeader}>
        <View style={S.cardIconWrap}>
          <Ionicons name={icon} size={14} color={colors.saffron} />
        </View>
        <Text style={S.cardTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function InfoRow({ label, value, last }) {
  return (
    <View style={[S.row, last && S.rowLast]}>
      <Text style={S.rowLabel}>{label}</Text>
      <Text style={S.rowValue}>{value || "—"}</Text>
    </View>
  );
}

function MaskedRow({ label, value, revealed, onToggle, last }) {
  return (
    <View style={[S.row, last && S.rowLast]}>
      <Text style={S.rowLabel}>{label}</Text>
      <View style={S.maskedRight}>
        <Text style={S.rowValue}>{revealed ? (value || "—") : maskString(value)}</Text>
        {value ? (
          <TouchableOpacity onPress={onToggle} style={S.eyeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name={revealed ? "eye-off-outline" : "eye-outline"} size={16} color={colors.muted} />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

// ─── Change Password Modal ─────────────────────────────────────────────────────

function ChangePasswordModal({ visible, onClose }) {
  const [oldPwd, setOldPwd]   = useState("");
  const [newPwd, setNewPwd]   = useState("");
  const [confPwd, setConfPwd] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [changePassword, { isLoading }] = useChangePasswordMutation();

  const reset = () => { setOldPwd(""); setNewPwd(""); setConfPwd(""); setShowOld(false); setShowNew(false); };

  const handleSubmit = async () => {
    if (!oldPwd || !newPwd || !confPwd) {
      Alert.alert("Missing fields", "Please fill all fields.");
      return;
    }
    if (newPwd.length < 8) {
      Alert.alert("Too short", "New password must be at least 8 characters.");
      return;
    }
    if (newPwd !== confPwd) {
      Alert.alert("Mismatch", "New passwords do not match.");
      return;
    }
    try {
      await changePassword({ old_password: oldPwd, new_password: newPwd }).unwrap();
      Alert.alert("Password Changed", "Your password has been updated successfully.");
      reset();
      onClose();
    } catch (e) {
      Alert.alert("Error", e.data?.detail || e.data?.old_password?.[0] || "Failed to change password.");
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={M.backdrop}>
        <View style={M.sheet}>
          <View style={M.handle} />
          <Text style={M.title}>Change Password</Text>
          <Text style={M.subtitle}>Choose a strong password (min. 8 characters)</Text>

          {[
            ["Current Password", oldPwd, setOldPwd, showOld, () => setShowOld(v => !v)],
            ["New Password",     newPwd, setNewPwd, showNew, () => setShowNew(v => !v)],
            ["Confirm New",      confPwd, setConfPwd, showNew, () => {}],
          ].map(([label, val, setter, show, toggle], i) => (
            <View key={label} style={M.fieldWrap}>
              <Text style={M.label}>{label}</Text>
              <View style={M.inputRow}>
                <TextInput
                  style={M.input}
                  value={val}
                  onChangeText={setter}
                  secureTextEntry={!show}
                  placeholder="••••••••"
                  placeholderTextColor="#B0BAD0"
                  autoComplete={i === 0 ? "password" : "new-password"}
                />
                {i < 2 && (
                  <TouchableOpacity onPress={toggle} style={M.eyeBtn}>
                    <Ionicons name={show ? "eye-off-outline" : "eye-outline"} size={18} color={colors.muted} />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}

          <TouchableOpacity style={M.submitBtn} onPress={handleSubmit} disabled={isLoading} activeOpacity={0.8}>
            {isLoading
              ? <ActivityIndicator color="#fff" />
              : <Text style={M.submitTxt}>Update Password</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={M.cancelBtn} onPress={() => { reset(); onClose(); }}>
            <Text style={M.cancelTxt}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Edit Email Modal ──────────────────────────────────────────────────────────

function EditEmailModal({ visible, currentEmail, onClose }) {
  const [email, setEmail] = useState(currentEmail || "");
  const [updateProfile, { isLoading }] = useUpdateProfileMutation();

  const handleSave = async () => {
    const trimmed = email.trim();
    if (!trimmed.includes("@")) {
      Alert.alert("Invalid email", "Please enter a valid email address.");
      return;
    }
    try {
      await updateProfile({ email: trimmed }).unwrap();
      Alert.alert("Saved", "Email updated successfully.");
      onClose();
    } catch (e) {
      Alert.alert("Error", e.data?.email?.[0] || e.data?.detail || "Failed to update email.");
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={M.backdrop}>
        <View style={[M.sheet, { paddingBottom: 32 }]}>
          <View style={M.handle} />
          <Text style={M.title}>Edit Email</Text>
          <Text style={M.subtitle}>This email is used for payslip delivery</Text>
          <View style={M.fieldWrap}>
            <Text style={M.label}>Email Address</Text>
            <TextInput
              style={[M.input, { flex: 0 }]}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor="#B0BAD0"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </View>
          <TouchableOpacity style={M.submitBtn} onPress={handleSave} disabled={isLoading} activeOpacity={0.8}>
            {isLoading
              ? <ActivityIndicator color="#fff" />
              : <Text style={M.submitTxt}>Save Email</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={M.cancelBtn} onPress={onClose}>
            <Text style={M.cancelTxt}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const insets   = useSafeAreaInsets();
  const authUser = useSelector((s) => s.auth.user);
  const dispatch = useDispatch();

  const { data: profile, isLoading, error, refetch, isFetching } = useGetMeQuery();
  const user = profile || authUser;
  const emp  = user?.employee_detail || null;

  const [revealed, setRevealed] = useState({ uan: false, esic: false, pan: false, aadhar: false, account: false });
  const [showPwdModal,   setShowPwdModal]   = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);

  const toggle = (key) => setRevealed((prev) => ({ ...prev, [key]: !prev[key] }));

  const initials = (user?.full_name || "?")
    .split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  const handleLogout = () =>
    Alert.alert("Logout", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await clearTokens();
          dispatch(baseApi.util.resetApiState());
          dispatch(logout());
        },
      },
    ]);

  // Block only when we truly have no data yet (app restart path, no authUser in Redux).
  if (isLoading && !user) {
    return (
      <View style={{ flex: 1, backgroundColor: "#F4F6FA", justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={colors.saffron} />
      </View>
    );
  }

  // Network error and no cached data — offer a retry.
  if (error && !user) {
    return (
      <View style={{ flex: 1, backgroundColor: "#F4F6FA", justifyContent: "center", alignItems: "center", padding: 32 }}>
        <Ionicons name="cloud-offline-outline" size={48} color={colors.muted} />
        <Text style={{ color: colors.muted, fontSize: 15, marginTop: 12, marginBottom: 20, textAlign: "center" }}>
          Could not load profile. Check your connection.
        </Text>
        <TouchableOpacity onPress={refetch} style={{ backgroundColor: colors.saffron, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 }}>
          <Text style={{ color: "#fff", fontWeight: "700" }}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={S.page}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.saffron} />
        }
      >
        {/* ── Hero ── */}
        <View style={[S.hero, { paddingTop: (insets.top || 0) + 24 }]}>
          {emp?.photo ? (
            <Image source={{ uri: emp.photo }} style={S.photo} />
          ) : (
            <View style={S.avatar}>
              <Text style={S.avatarTxt}>{initials}</Text>
            </View>
          )}
          <Text style={S.name}>{user?.full_name}</Text>
          <View style={S.roleRow}>
            <View style={S.roleBadge}>
              <Text style={S.roleText}>{(user?.role || "employee").toUpperCase()}</Text>
            </View>
            {emp?.emp_code && (
              <View style={S.codeChip}>
                <Ionicons name="id-card-outline" size={12} color={colors.saffron} />
                <Text style={S.codeTxt}> {emp.emp_code}</Text>
              </View>
            )}
          </View>
          {emp?.designation && (
            <Text style={S.designation}>{emp.designation}</Text>
          )}
          {emp?.site_name && (
            <View style={S.siteRow}>
              <Ionicons name="location-outline" size={13} color="rgba(255,255,255,.5)" />
              <Text style={S.siteText}> {emp.site_name}{emp.district_name ? `, ${emp.district_name}` : ""}</Text>
            </View>
          )}
        </View>

        {/* ── Work Details ── */}
        <SectionCard icon="briefcase-outline" title="WORK DETAILS">
          <InfoRow label="Designation" value={emp?.designation} />
          <InfoRow label="Site"        value={emp?.site_name} />
          <InfoRow label="District"    value={emp?.district_name} />
          <InfoRow label="State"       value={emp?.state_name} />
          <InfoRow label="Date Joined" value={formatDate(emp?.date_joined)} />
          <InfoRow label="Date of Birth" value={formatDate(emp?.date_of_birth)} />
          <InfoRow label="Status"      value={emp?.status ? emp.status.charAt(0).toUpperCase() + emp.status.slice(1) : null} last />
        </SectionCard>

        {/* ── Statutory ── */}
        <SectionCard icon="shield-checkmark-outline" title="STATUTORY DETAILS">
          <MaskedRow label="UAN"     value={emp?.uan}     revealed={revealed.uan}    onToggle={() => toggle("uan")} />
          <MaskedRow label="ESIC"    value={emp?.esic_no} revealed={revealed.esic}   onToggle={() => toggle("esic")} />
          <MaskedRow label="PAN"     value={emp?.pan}     revealed={revealed.pan}    onToggle={() => toggle("pan")} />
          <MaskedRow label="Aadhar"  value={emp?.aadhar}  revealed={revealed.aadhar} onToggle={() => toggle("aadhar")} last />
        </SectionCard>

        {/* ── Bank ── */}
        <SectionCard icon="card-outline" title="BANK DETAILS">
          <MaskedRow label="Account No." value={emp?.bank_account} revealed={revealed.account} onToggle={() => toggle("account")} />
          <InfoRow   label="IFSC"        value={emp?.ifsc} last />
        </SectionCard>

        {/* ── Contact ── */}
        <SectionCard icon="call-outline" title="CONTACT">
          <InfoRow label="Phone" value={user?.phone} />
          <View style={[S.row, S.rowLast]}>
            <Text style={S.rowLabel}>Email</Text>
            <View style={S.emailRight}>
              <Text style={[S.rowValue, !user?.email && { color: colors.muted }]} numberOfLines={1}>
                {user?.email || "Not set"}
              </Text>
              <TouchableOpacity onPress={() => setShowEmailModal(true)} style={S.editBtn}>
                <Ionicons name="pencil-outline" size={14} color={colors.saffron} />
              </TouchableOpacity>
            </View>
          </View>
          {emp?.address ? (
            <View style={[S.row, S.rowLast, { marginTop: 6 }]}>
              <Text style={S.rowLabel}>Address</Text>
              <Text style={[S.rowValue, S.addressVal]}>{emp.address}</Text>
            </View>
          ) : null}
        </SectionCard>

        {/* ── Security ── */}
        <SectionCard icon="lock-closed-outline" title="SECURITY">
          <TouchableOpacity style={S.actionRow} onPress={() => setShowPwdModal(true)} activeOpacity={0.7}>
            <View style={S.actionLeft}>
              <View style={[S.actionIconBg, { backgroundColor: "#EDE7F6" }]}>
                <Ionicons name="key-outline" size={18} color="#7B1FA2" />
              </View>
              <Text style={S.actionLabel}>Change Password</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </TouchableOpacity>
        </SectionCard>

        {/* ── Logout ── */}
        <TouchableOpacity style={S.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={18} color="#C0392B" />
          <Text style={S.logoutTxt}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>

      <ChangePasswordModal visible={showPwdModal}   onClose={() => setShowPwdModal(false)} />
      <EditEmailModal      visible={showEmailModal}  currentEmail={user?.email} onClose={() => setShowEmailModal(false)} />
    </>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  page:        { flex: 1, backgroundColor: "#F4F6FA" },

  hero:        { backgroundColor: colors.ink, alignItems: "center", paddingBottom: 28, paddingHorizontal: 20 },
  photo:       { width: 80, height: 80, borderRadius: 40, marginBottom: 12, borderWidth: 3, borderColor: colors.saffron },
  avatar:      { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.saffron, justifyContent: "center", alignItems: "center", marginBottom: 12 },
  avatarTxt:   { color: "#fff", fontWeight: "800", fontSize: 28 },
  name:        { color: "#fff", fontSize: 22, fontWeight: "800", marginBottom: 8 },
  roleRow:     { flexDirection: "row", gap: 8, marginBottom: 6 },
  roleBadge:   { backgroundColor: "rgba(255,255,255,.12)", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  roleText:    { color: "rgba(255,255,255,.7)", fontSize: 11, fontWeight: "700", letterSpacing: 0.8 },
  codeChip:    { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(232,130,30,.18)", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: "rgba(232,130,30,.35)" },
  codeTxt:     { color: colors.saffron, fontSize: 11, fontWeight: "700" },
  designation: { color: "rgba(255,255,255,.55)", fontSize: 13, marginTop: 2 },
  siteRow:     { flexDirection: "row", alignItems: "center", marginTop: 6 },
  siteText:    { color: "rgba(255,255,255,.45)", fontSize: 12 },

  card:        { backgroundColor: "#fff", marginHorizontal: 16, marginTop: 14, borderRadius: 16, padding: 16, elevation: 2, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8 },
  cardHeader:  { flexDirection: "row", alignItems: "center", marginBottom: 14, gap: 8 },
  cardIconWrap:{ width: 24, height: 24, borderRadius: 6, backgroundColor: colors.saffronSoft, justifyContent: "center", alignItems: "center" },
  cardTitle:   { fontSize: 11, fontWeight: "700", color: colors.muted, letterSpacing: 0.8 },

  row:         { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.line },
  rowLast:     { borderBottomWidth: 0 },
  rowLabel:    { fontSize: 13, color: colors.muted, flex: 1 },
  rowValue:    { fontSize: 13, fontWeight: "600", color: colors.ink, flex: 2, textAlign: "right" },
  addressVal:  { flex: 2, textAlign: "right", flexWrap: "wrap" },

  maskedRight: { flexDirection: "row", alignItems: "center", gap: 6, flex: 2, justifyContent: "flex-end" },
  eyeBtn:      { padding: 2 },

  emailRight:  { flexDirection: "row", alignItems: "center", gap: 8, flex: 2, justifyContent: "flex-end" },
  editBtn:     { backgroundColor: colors.saffronSoft, borderRadius: 8, padding: 5 },

  actionRow:   { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 4 },
  actionLeft:  { flexDirection: "row", alignItems: "center", gap: 12 },
  actionIconBg:{ width: 38, height: 38, borderRadius: 10, justifyContent: "center", alignItems: "center" },
  actionLabel: { fontSize: 14, fontWeight: "600", color: colors.ink },

  logoutBtn:   { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, margin: 16, marginTop: 20, backgroundColor: "#FBE6E5", borderRadius: 14, padding: 16 },
  logoutTxt:   { color: "#C0392B", fontWeight: "700", fontSize: 16 },
});

const M = StyleSheet.create({
  backdrop:   { flex: 1, backgroundColor: "rgba(0,0,0,.5)", justifyContent: "flex-end" },
  sheet:      { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  handle:     { width: 40, height: 4, backgroundColor: colors.line, borderRadius: 2, alignSelf: "center", marginBottom: 20 },
  title:      { fontSize: 18, fontWeight: "800", color: colors.ink, marginBottom: 4 },
  subtitle:   { fontSize: 13, color: colors.muted, marginBottom: 20 },
  fieldWrap:  { marginBottom: 14 },
  label:      { fontSize: 12, fontWeight: "700", color: colors.muted, marginBottom: 8, letterSpacing: 0.5 },
  inputRow:   { flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderColor: colors.line, borderRadius: 12, backgroundColor: "#FAFBFF" },
  input:      { flex: 1, padding: 14, fontSize: 15, color: colors.ink },
  eyeBtn:     { padding: 14 },
  submitBtn:  { backgroundColor: colors.saffron, borderRadius: 12, padding: 16, alignItems: "center", marginTop: 4, elevation: 3, shadowColor: colors.saffron, shadowOpacity: 0.4, shadowRadius: 8 },
  submitTxt:  { color: "#fff", fontWeight: "700", fontSize: 16 },
  cancelBtn:  { padding: 14, alignItems: "center", marginTop: 4 },
  cancelTxt:  { color: colors.muted, fontSize: 14, fontWeight: "600" },
});
