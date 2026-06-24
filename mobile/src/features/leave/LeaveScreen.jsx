import React, { useState, useRef } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, Alert, ActivityIndicator, RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import {
  useMyLeavesQuery,
  useLeaveBalanceQuery,
  useApplyLeaveMutation,
  useCancelLeaveMutation,
} from "./leaveApi";
import { colors } from "../../theme/colors";

// ─── constants ────────────────────────────────────────────────────────────────

const LEAVE_TYPES = [
  { value: "cl",     label: "Casual",  full: "Casual Leave",  color: "#1E6CB5", bg: "#E8F4FF" },
  { value: "sl",     label: "Sick",    full: "Sick Leave",    color: "#C0392B", bg: "#FBE6E5" },
  { value: "el",     label: "Earned",  full: "Earned Leave",  color: "#15966A", bg: "#E1F4EC" },
  { value: "unpaid", label: "Unpaid",  full: "Unpaid Leave",  color: "#7B1FA2", bg: "#EDE7F6" },
];

const STATUS_CONFIG = {
  pending:  { label: "Pending",  color: "#C98A12", bg: "#FBF1DC", icon: "time-outline" },
  approved: { label: "Approved", color: "#15966A", bg: "#E1F4EC", icon: "checkmark-circle-outline" },
  rejected: { label: "Rejected", color: "#C0392B", bg: "#FBE6E5", icon: "close-circle-outline" },
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatDate(val) {
  if (!val) return "";
  try {
    return new Date(val).toLocaleDateString("en-IN", {
      day: "numeric", month: "short", year: "numeric",
    });
  } catch { return val; }
}

function calcDays(from, to) {
  if (!from || !to) return 0;
  const f = new Date(from), t = new Date(to);
  if (isNaN(f) || isNaN(t) || f > t) return 0;
  return Math.round((t - f) / 86400000) + 1;
}

function isoDate(dd, mm, yyyy) {
  if (!dd || !mm || !yyyy || yyyy.length < 4) return "";
  return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
}

// ─── DateInput: three fields DD / MM / YYYY with auto-advance ─────────────────

function DateInput({ label, value, onChange }) {
  const [dd, setDd] = useState(value ? value.slice(8, 10) : "");
  const [mm, setMm] = useState(value ? value.slice(5, 7)  : "");
  const [yy, setYy] = useState(value ? value.slice(0, 4)  : "");
  const mmRef = useRef(null);
  const yyRef = useRef(null);

  const emit = (d, m, y) => {
    const iso = isoDate(d, m, y);
    if (iso) onChange(iso);
  };

  return (
    <View style={DI.wrap}>
      <Text style={DI.label}>{label}</Text>
      <View style={DI.row}>
        <TextInput
          style={DI.seg}
          value={dd}
          placeholder="DD"
          placeholderTextColor="#B0BAD0"
          keyboardType="numeric"
          maxLength={2}
          onChangeText={(v) => { setDd(v); emit(v, mm, yy); if (v.length === 2) mmRef.current?.focus(); }}
        />
        <Text style={DI.sep}>/</Text>
        <TextInput
          ref={mmRef}
          style={DI.seg}
          value={mm}
          placeholder="MM"
          placeholderTextColor="#B0BAD0"
          keyboardType="numeric"
          maxLength={2}
          onChangeText={(v) => { setMm(v); emit(dd, v, yy); if (v.length === 2) yyRef.current?.focus(); }}
        />
        <Text style={DI.sep}>/</Text>
        <TextInput
          ref={yyRef}
          style={[DI.seg, DI.segYear]}
          value={yy}
          placeholder="YYYY"
          placeholderTextColor="#B0BAD0"
          keyboardType="numeric"
          maxLength={4}
          onChangeText={(v) => { setYy(v); emit(dd, mm, v); }}
        />
      </View>
    </View>
  );
}

// ─── BalanceCard ──────────────────────────────────────────────────────────────

function BalanceCard({ balance, year }) {
  if (!balance) return null;
  const items = [
    { key: "cl",     label: "Casual",  ...LEAVE_TYPES[0] },
    { key: "sl",     label: "Sick",    ...LEAVE_TYPES[1] },
    { key: "el",     label: "Earned",  ...LEAVE_TYPES[2] },
    { key: "unpaid", label: "Unpaid",  ...LEAVE_TYPES[3] },
  ];
  return (
    <View style={B.card}>
      <View style={B.header}>
        <Ionicons name="stats-chart-outline" size={14} color={colors.saffron} />
        <Text style={B.title}>  LEAVE BALANCE {year}</Text>
      </View>
      <View style={B.grid}>
        {items.map(({ key, label, color, bg }) => {
          const info = balance[key] || {};
          return (
            <View key={key} style={[B.item, { backgroundColor: bg }]}>
              <Text style={[B.used, { color }]}>{info.used ?? 0}</Text>
              <Text style={[B.limit, { color }]}>
                {info.limit != null ? `/ ${info.limit}` : "used"}
              </Text>
              <Text style={B.itemLabel}>{label}</Text>
              {info.pending > 0 && (
                <View style={B.pendingBadge}>
                  <Text style={B.pendingTxt}>{info.pending}d pending</Text>
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ─── ApplyForm ────────────────────────────────────────────────────────────────

function ApplyForm({ balance, onSuccess }) {
  const [leaveType, setLeaveType] = useState("cl");
  const [fromDate,  setFromDate]  = useState("");
  const [toDate,    setToDate]    = useState("");
  const [reason,    setReason]    = useState("");
  const [applyLeave, { isLoading }] = useApplyLeaveMutation();

  const days = calcDays(fromDate, toDate);

  const handleSubmit = async () => {
    if (!fromDate || !toDate || !reason.trim()) {
      Alert.alert("Missing Fields", "Please fill all fields before submitting.");
      return;
    }
    if (fromDate > toDate) {
      Alert.alert("Invalid Dates", "From date cannot be after to date.");
      return;
    }
    const limit = balance?.[leaveType]?.limit;
    const used  = balance?.[leaveType]?.used ?? 0;
    if (limit != null && used + days > limit) {
      Alert.alert(
        "Insufficient Balance",
        `You have used ${used} of ${limit} ${leaveType.toUpperCase()} days this year. Applying for ${days} more would exceed the limit.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Apply Anyway", onPress: () => submitLeave() },
        ],
      );
      return;
    }
    submitLeave();
  };

  const submitLeave = async () => {
    try {
      await applyLeave({ leave_type: leaveType, from_date: fromDate, to_date: toDate, reason }).unwrap();
      Alert.alert("Applied!", "Your leave request has been submitted for HR approval.");
      setFromDate(""); setToDate(""); setReason(""); setLeaveType("cl");
      onSuccess?.();
    } catch (e) {
      Alert.alert("Error", e.data?.detail || JSON.stringify(e.data) || "Failed to apply.");
    }
  };

  const selected = LEAVE_TYPES.find((t) => t.value === leaveType);

  return (
    <View style={F.card}>
      <Text style={F.heading}>Apply for Leave</Text>

      {/* Leave type */}
      <Text style={F.fieldLabel}>Leave Type</Text>
      <View style={F.typeRow}>
        {LEAVE_TYPES.map((t) => {
          const active = leaveType === t.value;
          return (
            <TouchableOpacity
              key={t.value}
              style={[F.typeBtn, active && { backgroundColor: t.color, borderColor: t.color }]}
              onPress={() => setLeaveType(t.value)}
              activeOpacity={0.8}
            >
              <Text style={[F.typeTxt, active && { color: "#fff" }]}>{t.label}</Text>
              {balance?.[t.value]?.limit != null && (
                <Text style={[F.typeBalance, active && { color: "rgba(255,255,255,.7)" }]}>
                  {balance[t.value].used}/{balance[t.value].limit}d
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Dates */}
      <DateInput label="From Date" value={fromDate} onChange={setFromDate} />
      <DateInput label="To Date"   value={toDate}   onChange={setToDate} />

      {/* Days badge */}
      {days > 0 && (
        <View style={[F.daysBadge, { backgroundColor: selected?.bg }]}>
          <Ionicons name="calendar-outline" size={14} color={selected?.color} />
          <Text style={[F.daysTxt, { color: selected?.color }]}>
            {" "}{days} day{days > 1 ? "s" : ""} of {selected?.full}
          </Text>
        </View>
      )}

      {/* Reason */}
      <Text style={F.fieldLabel}>Reason</Text>
      <TextInput
        style={F.reason}
        value={reason}
        onChangeText={setReason}
        placeholder="Describe the reason for your leave..."
        placeholderTextColor="#B0BAD0"
        multiline
        numberOfLines={3}
        textAlignVertical="top"
      />

      <TouchableOpacity
        style={[F.submitBtn, (!fromDate || !toDate || !reason.trim()) && F.submitDisabled]}
        onPress={handleSubmit}
        disabled={isLoading}
        activeOpacity={0.8}
      >
        {isLoading
          ? <ActivityIndicator color="#fff" />
          : <>
              <Ionicons name="paper-plane-outline" size={16} color="#fff" />
              <Text style={F.submitTxt}>  Submit Request</Text>
            </>}
      </TouchableOpacity>
    </View>
  );
}

// ─── LeaveCard ────────────────────────────────────────────────────────────────

function LeaveCard({ leave, onCancel }) {
  const sc  = STATUS_CONFIG[leave.status] || STATUS_CONFIG.pending;
  const lt  = LEAVE_TYPES.find((t) => t.value === leave.leave_type) || LEAVE_TYPES[0];
  const days = leave.days || calcDays(leave.from_date, leave.to_date);

  return (
    <View style={LC.card}>
      {/* Top row: type badge + status */}
      <View style={LC.topRow}>
        <View style={[LC.typeBadge, { backgroundColor: lt.bg }]}>
          <Text style={[LC.typeCode, { color: lt.color }]}>{lt.full}</Text>
        </View>
        <View style={[LC.statusBadge, { backgroundColor: sc.bg }]}>
          <Ionicons name={sc.icon} size={12} color={sc.color} />
          <Text style={[LC.statusTxt, { color: sc.color }]}> {sc.label}</Text>
        </View>
      </View>

      {/* Date range + days */}
      <View style={LC.dateRow}>
        <Ionicons name="calendar-outline" size={14} color={colors.muted} />
        <Text style={LC.dateText}>
          {" "}{formatDate(leave.from_date)} → {formatDate(leave.to_date)}
        </Text>
        <View style={LC.daysBadge}>
          <Text style={LC.daysNum}>{days}d</Text>
        </View>
      </View>

      {/* Reason */}
      <Text style={LC.reason} numberOfLines={2}>{leave.reason}</Text>

      {/* Review note (rejected) */}
      {leave.status === "rejected" && leave.review_note ? (
        <View style={LC.noteBox}>
          <Ionicons name="information-circle-outline" size={14} color="#C0392B" />
          <Text style={LC.noteTxt}> {leave.review_note}</Text>
        </View>
      ) : null}

      {/* Reviewer */}
      {leave.reviewer_name && leave.status !== "pending" && (
        <Text style={LC.reviewer}>
          {leave.status === "approved" ? "Approved" : "Reviewed"} by {leave.reviewer_name}
        </Text>
      )}

      {/* Cancel button for pending */}
      {leave.status === "pending" && (
        <TouchableOpacity style={LC.cancelBtn} onPress={() => onCancel(leave)} activeOpacity={0.8}>
          <Ionicons name="close-outline" size={14} color="#C0392B" />
          <Text style={LC.cancelTxt}> Cancel Request</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────

export default function LeaveScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const [tab, setTab] = useState("apply");

  const { data: leaves,  isLoading: leavesLoading, refetch, isFetching } = useMyLeavesQuery();
  const { data: balData, isLoading: balLoading }  = useLeaveBalanceQuery();
  const [cancelLeave] = useCancelLeaveMutation();

  const leaveList = leaves?.results || leaves || [];

  const handleCancel = (leave) => {
    Alert.alert(
      "Cancel Request",
      `Cancel your ${LEAVE_TYPES.find(t => t.value === leave.leave_type)?.full || "leave"} request from ${formatDate(leave.from_date)}?`,
      [
        { text: "No",  style: "cancel" },
        {
          text: "Yes, Cancel",
          style: "destructive",
          onPress: async () => {
            try {
              await cancelLeave(leave.id).unwrap();
              Alert.alert("Cancelled", "Your leave request has been cancelled.");
            } catch (e) {
              Alert.alert("Error", e.data?.detail || "Failed to cancel.");
            }
          },
        },
      ],
    );
  };

  return (
    <View style={S.page}>
      {/* Tab bar */}
      <View style={[S.tabs, { paddingTop: insets.top || 0 }]}>
        {[
          ["apply",   "Apply Leave",  "add-circle-outline"],
          ["history", "My Requests",  "list-outline"],
        ].map(([key, label, icon]) => (
          <TouchableOpacity
            key={key}
            style={[S.tab, tab === key && S.tabActive]}
            onPress={() => setTab(key)}
            activeOpacity={0.8}
          >
            <Ionicons
              name={icon}
              size={16}
              color={tab === key ? "#fff" : "rgba(255,255,255,.45)"}
            />
            <Text style={[S.tabTxt, tab === key && S.tabTxtActive]}> {label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={[S.scrollContent, { paddingBottom: tabBarHeight + 16 }]}
        refreshControl={
          tab === "history"
            ? <RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.saffron} />
            : undefined
        }
      >
        {tab === "apply" ? (
          <>
            {balLoading
              ? <ActivityIndicator color={colors.saffron} style={{ marginTop: 20 }} />
              : <BalanceCard balance={balData?.balance} year={balData?.year} />
            }
            <ApplyForm
              balance={balData?.balance}
              onSuccess={() => { setTab("history"); refetch(); }}
            />
          </>
        ) : (
          <>
            {leavesLoading && (
              <ActivityIndicator color={colors.saffron} style={{ marginTop: 40 }} />
            )}
            {!leavesLoading && leaveList.length === 0 && (
              <View style={S.empty}>
                <Ionicons name="umbrella-outline" size={52} color={colors.line} />
                <Text style={S.emptyTitle}>No leave requests yet</Text>
                <Text style={S.emptySub}>Requests you apply will appear here</Text>
              </View>
            )}
            {leaveList.map((leave) => (
              <LeaveCard key={leave.id} leave={leave} onCancel={handleCancel} />
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  page:        { flex: 1, backgroundColor: "#F4F6FA" },
  tabs:        { flexDirection: "row", backgroundColor: colors.ink },
  tab:         { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 14 },
  tabActive:   { borderBottomWidth: 2.5, borderBottomColor: colors.saffron },
  tabTxt:      { color: "rgba(255,255,255,.45)", fontSize: 13, fontWeight: "700" },
  tabTxtActive:{ color: "#fff" },
  scrollContent:{ padding: 16 },
  empty:       { alignItems: "center", paddingTop: 60, gap: 8 },
  emptyTitle:  { fontSize: 16, fontWeight: "700", color: colors.ink },
  emptySub:    { fontSize: 13, color: colors.muted },
});

const B = StyleSheet.create({
  card:        { backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 14, elevation: 2, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8 },
  header:      { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  title:       { fontSize: 11, fontWeight: "700", color: colors.muted, letterSpacing: 0.8 },
  grid:        { flexDirection: "row", gap: 8 },
  item:        { flex: 1, borderRadius: 12, padding: 10, alignItems: "center", gap: 2 },
  used:        { fontSize: 20, fontWeight: "800" },
  limit:       { fontSize: 11, fontWeight: "600" },
  itemLabel:   { fontSize: 10, color: colors.muted, fontWeight: "600", marginTop: 2 },
  pendingBadge:{ backgroundColor: "rgba(0,0,0,.08)", borderRadius: 6, paddingHorizontal: 4, paddingVertical: 2, marginTop: 3 },
  pendingTxt:  { fontSize: 9, color: colors.muted, fontWeight: "600" },
});

const F = StyleSheet.create({
  card:         { backgroundColor: "#fff", borderRadius: 16, padding: 20, elevation: 2, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8 },
  heading:      { fontSize: 17, fontWeight: "800", color: colors.ink, marginBottom: 16 },
  fieldLabel:   { fontSize: 12, fontWeight: "700", color: colors.muted, marginBottom: 8, letterSpacing: 0.5 },
  typeRow:      { flexDirection: "row", gap: 8, marginBottom: 18, flexWrap: "wrap" },
  typeBtn:      { borderWidth: 1.5, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, alignItems: "center" },
  typeTxt:      { fontSize: 13, color: colors.ink, fontWeight: "700" },
  typeBalance:  { fontSize: 10, color: colors.muted, marginTop: 2 },
  daysBadge:    { flexDirection: "row", alignItems: "center", borderRadius: 10, padding: 10, marginBottom: 16 },
  daysTxt:      { fontSize: 13, fontWeight: "700" },
  reason:       { borderWidth: 1.5, borderColor: colors.line, borderRadius: 12, padding: 14, fontSize: 14, color: colors.ink, minHeight: 90, marginBottom: 16, backgroundColor: "#FAFBFF" },
  submitBtn:    { backgroundColor: colors.saffron, borderRadius: 12, padding: 16, alignItems: "center", flexDirection: "row", justifyContent: "center", elevation: 3, shadowColor: colors.saffron, shadowOpacity: 0.35, shadowRadius: 8 },
  submitDisabled:{ opacity: 0.5 },
  submitTxt:    { color: "#fff", fontWeight: "700", fontSize: 16 },
});

const DI = StyleSheet.create({
  wrap:    { marginBottom: 12 },
  label:   { fontSize: 12, fontWeight: "700", color: colors.muted, marginBottom: 6, letterSpacing: 0.4 },
  row:     { flexDirection: "row", alignItems: "center", borderWidth: 1.5, borderColor: colors.line, borderRadius: 12, backgroundColor: "#FAFBFF", paddingHorizontal: 8 },
  seg:     { flex: 2, paddingVertical: 14, paddingHorizontal: 2, fontSize: 17, color: colors.ink, textAlign: "center", fontWeight: "600" },
  segYear: { flex: 3 },
  sep:     { color: colors.muted, fontSize: 20, fontWeight: "300", paddingHorizontal: 2 },
});

const LC = StyleSheet.create({
  card:        { backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 10, elevation: 2, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8 },
  topRow:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  typeBadge:   { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  typeCode:    { fontSize: 12, fontWeight: "700" },
  statusBadge: { flexDirection: "row", alignItems: "center", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  statusTxt:   { fontSize: 11, fontWeight: "700" },
  dateRow:     { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  dateText:    { fontSize: 13, color: colors.ink, fontWeight: "600", flex: 1 },
  daysBadge:   { backgroundColor: "#F0F2F8", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  daysNum:     { fontSize: 12, fontWeight: "700", color: colors.muted },
  reason:      { fontSize: 13, color: colors.muted, lineHeight: 18, marginBottom: 6 },
  noteBox:     { flexDirection: "row", alignItems: "flex-start", backgroundColor: "#FBE6E5", borderRadius: 8, padding: 10, marginBottom: 8, gap: 4 },
  noteTxt:     { fontSize: 12, color: "#C0392B", flex: 1, lineHeight: 17 },
  reviewer:    { fontSize: 11, color: colors.muted, marginBottom: 6 },
  cancelBtn:   { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", backgroundColor: "#FBE6E5", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7, marginTop: 4 },
  cancelTxt:   { fontSize: 13, fontWeight: "700", color: "#C0392B" },
});
