import React, { useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, Alert, ActivityIndicator,
} from "react-native";
import { useMyLeavesQuery, useApplyLeaveMutation } from "./leaveApi";
import { colors } from "../../theme/colors";

const LEAVE_TYPES = [
  { value: "cl",     label: "Casual Leave"  },
  { value: "sl",     label: "Sick Leave"    },
  { value: "el",     label: "Earned Leave"  },
  { value: "unpaid", label: "Unpaid Leave"  },
];

const STATUS_COLOR = {
  pending:  { bg: "#FBF1DC", text: "#C98A12" },
  approved: { bg: "#E1F4EC", text: "#15966A" },
  rejected: { bg: "#FBE6E5", text: "#C0392B" },
};

function formatDate(val) {
  return val ? new Date(val).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";
}

// Simple date input helper (YYYY-MM-DD)
function DateInput({ label, value, onChange }) {
  return (
    <View style={FI.wrap}>
      <Text style={FI.label}>{label}</Text>
      <TextInput
        style={FI.input}
        value={value}
        onChangeText={onChange}
        placeholder="YYYY-MM-DD"
        keyboardType="numeric"
        maxLength={10}
      />
    </View>
  );
}

function ApplyForm({ onSuccess }) {
  const [leaveType, setLeaveType] = useState("cl");
  const [fromDate,  setFromDate]  = useState("");
  const [toDate,    setToDate]    = useState("");
  const [reason,    setReason]    = useState("");
  const [applyLeave, { isLoading }] = useApplyLeaveMutation();

  const handleSubmit = async () => {
    if (!fromDate || !toDate || !reason.trim()) {
      Alert.alert("Missing Fields", "Please fill all fields before submitting.");
      return;
    }
    if (fromDate > toDate) {
      Alert.alert("Invalid Dates", "From date cannot be after to date.");
      return;
    }
    try {
      await applyLeave({ leave_type: leaveType, from_date: fromDate, to_date: toDate, reason }).unwrap();
      Alert.alert("Applied!", "Your leave request has been submitted for approval.");
      setFromDate(""); setToDate(""); setReason(""); setLeaveType("cl");
      onSuccess?.();
    } catch (e) {
      Alert.alert("Error", e.data?.detail || JSON.stringify(e.data) || "Failed to apply");
    }
  };

  const days = fromDate && toDate && fromDate <= toDate
    ? (new Date(toDate) - new Date(fromDate)) / 86400000 + 1 : 0;

  return (
    <View style={F.card}>
      <Text style={F.heading}>Apply for Leave</Text>

      <Text style={F.fieldLabel}>Leave Type</Text>
      <View style={F.typeRow}>
        {LEAVE_TYPES.map((t) => (
          <TouchableOpacity key={t.value}
            style={[F.typeBtn, leaveType === t.value && F.typeBtnActive]}
            onPress={() => setLeaveType(t.value)}>
            <Text style={[F.typeBtnTxt, leaveType === t.value && F.typeBtnTxtActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <DateInput label="From Date" value={fromDate} onChange={setFromDate} />
      <DateInput label="To Date"   value={toDate}   onChange={setToDate}   />

      {days > 0 && (
        <View style={F.daysBadge}>
          <Text style={F.daysTxt}>{days} day{days > 1 ? "s" : ""}</Text>
        </View>
      )}

      <View style={FI.wrap}>
        <Text style={FI.label}>Reason</Text>
        <TextInput
          style={[FI.input, { height: 80, textAlignVertical: "top" }]}
          value={reason}
          onChangeText={setReason}
          placeholder="State reason for leave..."
          multiline
          numberOfLines={3}
        />
      </View>

      <TouchableOpacity style={[F.submitBtn, isLoading && { opacity: .7 }]}
        onPress={handleSubmit} disabled={isLoading}>
        {isLoading
          ? <ActivityIndicator color="#fff" />
          : <Text style={F.submitTxt}>Submit Request</Text>}
      </TouchableOpacity>
    </View>
  );
}

function LeaveCard({ leave }) {
  const sc = STATUS_COLOR[leave.status] || STATUS_COLOR.pending;
  const days = leave.days || (
    (new Date(leave.to_date) - new Date(leave.from_date)) / 86400000 + 1
  );
  const typeLabelMap = { cl: "Casual", sl: "Sick", el: "Earned", unpaid: "Unpaid" };

  return (
    <View style={L.card}>
      <View style={L.left}>
        <View style={L.typeBadge}>
          <Text style={L.typeCode}>{leave.leave_type.toUpperCase()}</Text>
        </View>
        <Text style={L.days}>{days}d</Text>
      </View>
      <View style={L.mid}>
        <Text style={L.typeLabel}>{typeLabelMap[leave.leave_type] || leave.leave_type} Leave</Text>
        <Text style={L.dateRange}>
          {formatDate(leave.from_date)} → {formatDate(leave.to_date)}
        </Text>
        <Text style={L.reason} numberOfLines={1}>{leave.reason}</Text>
      </View>
      <View style={[L.statusBadge, { backgroundColor: sc.bg }]}>
        <Text style={[L.statusTxt, { color: sc.text }]}>{leave.status}</Text>
      </View>
    </View>
  );
}

export default function LeaveScreen() {
  const [tab, setTab] = useState("apply"); // "apply" | "history"
  const { data: leaves, isLoading, refetch } = useMyLeavesQuery();

  return (
    <View style={S.page}>
      {/* Tab bar */}
      <View style={S.tabs}>
        {[["apply", "Apply Leave"], ["history", "My Requests"]].map(([key, label]) => (
          <TouchableOpacity key={key} style={[S.tab, tab === key && S.tabActive]}
            onPress={() => setTab(key)}>
            <Text style={[S.tabTxt, tab === key && S.tabTxtActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {tab === "apply" ? (
          <ApplyForm onSuccess={() => { setTab("history"); refetch(); }} />
        ) : (
          <>
            {isLoading && <ActivityIndicator color={colors.saffron} style={{ marginTop: 40 }} />}
            {!isLoading && (!leaves?.results?.length && !leaves?.length) && (
              <View style={S.empty}>
                <Text style={S.emptyIcon}>🏖️</Text>
                <Text style={S.emptyTxt}>No leave requests yet</Text>
              </View>
            )}
            {(leaves?.results || leaves || []).map((leave) => (
              <LeaveCard key={leave.id} leave={leave} />
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const S = StyleSheet.create({
  page:       { flex: 1, backgroundColor: "#F4F6FA" },
  tabs:       { flexDirection: "row", backgroundColor: colors.ink },
  tab:        { flex: 1, paddingVertical: 14, alignItems: "center" },
  tabActive:  { borderBottomWidth: 2, borderBottomColor: colors.saffron },
  tabTxt:     { color: "rgba(255,255,255,.5)", fontSize: 14, fontWeight: "600" },
  tabTxtActive:{ color: "#fff" },
  empty:      { alignItems: "center", paddingTop: 60 },
  emptyIcon:  { fontSize: 48, marginBottom: 16 },
  emptyTxt:   { fontSize: 15, color: colors.muted },
});

const F = StyleSheet.create({
  card:       { backgroundColor: "#fff", borderRadius: 16, padding: 20 },
  heading:    { fontSize: 17, fontWeight: "800", color: colors.ink, marginBottom: 16 },
  fieldLabel: { fontSize: 12, fontWeight: "700", color: colors.muted, marginBottom: 8 },
  typeRow:    { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  typeBtn:    { borderWidth: 1.5, borderColor: colors.line, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7 },
  typeBtnActive:{ borderColor: colors.ink, backgroundColor: colors.ink },
  typeBtnTxt: { fontSize: 13, color: colors.muted, fontWeight: "600" },
  typeBtnTxtActive:{ color: "#fff" },
  daysBadge:  { backgroundColor: "#E1F4EC", borderRadius: 10, padding: 10, alignItems: "center", marginBottom: 12 },
  daysTxt:    { color: colors.green, fontWeight: "700", fontSize: 14 },
  submitBtn:  { backgroundColor: colors.saffron, borderRadius: 12, padding: 16, alignItems: "center", marginTop: 8 },
  submitTxt:  { color: "#fff", fontWeight: "700", fontSize: 16 },
});

const FI = StyleSheet.create({
  wrap:  { marginBottom: 14 },
  label: { fontSize: 12, fontWeight: "700", color: colors.muted, marginBottom: 6 },
  input: { borderWidth: 1.5, borderColor: colors.line, borderRadius: 10, padding: 12, fontSize: 14, fontFamily: "System" },
});

const L = StyleSheet.create({
  card:       { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 14, padding: 14, marginBottom: 10, elevation: 1 },
  left:       { alignItems: "center", marginRight: 14 },
  typeBadge:  { backgroundColor: colors.ink, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, marginBottom: 4 },
  typeCode:   { color: colors.saffron, fontSize: 12, fontWeight: "800" },
  days:       { fontSize: 12, color: colors.muted, fontWeight: "600" },
  mid:        { flex: 1 },
  typeLabel:  { fontSize: 14, fontWeight: "700", color: colors.ink },
  dateRange:  { fontSize: 12, color: colors.muted, marginTop: 2 },
  reason:     { fontSize: 12, color: colors.muted, marginTop: 2 },
  statusBadge:{ borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  statusTxt:  { fontSize: 11, fontWeight: "700" },
});
