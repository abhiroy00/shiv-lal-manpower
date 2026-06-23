import React from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
} from "react-native";
import { useSelector } from "react-redux";
import { useMyTodayQuery } from "../attendance/attendanceApi";
import { useMyPayslipsQuery } from "../payslip/payslipApi";
import { colors } from "../../theme/colors";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function HomeScreen({ navigation }) {
  const user = useSelector((s) => s.auth.user);
  const { data: today, isLoading: todayLoading } = useMyTodayQuery();
  const { data: payslips } = useMyPayslipsQuery();

  const latestSlip  = payslips?.[0];
  const hour        = new Date().getHours();
  const greeting    = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";
  const firstName   = (user?.full_name || "Employee").split(" ")[0];

  const statusColor = today?.status === "present" ? colors.green
    : today?.status === "late" ? colors.saffron
    : today?.checked_in ? colors.muted : "#ccc";

  const statusLabel = today?.checked_in
    ? (today.check_out_time ? `Completed · Out ${today.check_out_time.slice(0,5)}` : `In at ${today.check_in_time?.slice(0,5)}`)
    : "Not marked";

  return (
    <ScrollView style={S.page} contentContainerStyle={{ paddingBottom: 32 }}>
      {/* Header */}
      <View style={S.header}>
        <View style={S.avatar}>
          <Text style={S.avatarTxt}>{firstName.slice(0, 2).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={S.greeting}>{greeting},</Text>
          <Text style={S.name}>{firstName}</Text>
        </View>
        {user?.employee && (
          <View style={S.empBadge}>
            <Text style={S.empCode}>{user.employee}</Text>
          </View>
        )}
      </View>

      {/* Today's status card */}
      <View style={S.card}>
        <Text style={S.cardLabel}>TODAY'S ATTENDANCE</Text>
        {todayLoading ? (
          <ActivityIndicator color={colors.saffron} />
        ) : (
          <View style={S.statusRow}>
            <View style={[S.dot, { backgroundColor: statusColor }]} />
            <Text style={[S.statusTxt, { color: statusColor }]}>
              {today?.checked_in
                ? (today.status === "present" ? "Present" : today.status === "late" ? "Late" : "Under Review")
                : "Absent"}
            </Text>
            <Text style={S.statusSub}>  {statusLabel}</Text>
          </View>
        )}
        <View style={S.timeRow}>
          <View style={S.timeBox}>
            <Text style={S.timeLabel}>Check In</Text>
            <Text style={S.timeVal}>{today?.check_in_time?.slice(0,5) || "--:--"}</Text>
          </View>
          <View style={[S.timeBox, { borderLeftWidth: 1, borderLeftColor: colors.line }]}>
            <Text style={S.timeLabel}>Check Out</Text>
            <Text style={S.timeVal}>{today?.check_out_time?.slice(0,5) || "--:--"}</Text>
          </View>
        </View>
      </View>

      {/* Quick actions */}
      <Text style={S.section}>QUICK ACTIONS</Text>
      <View style={S.actionsRow}>
        {[
          { icon: "📸", label: "Check In / Out", screen: "Attendance" },
          { icon: "📅", label: "My History",     screen: "History"    },
          { icon: "📄", label: "My Payslips",    screen: "Payslips"   },
          { icon: "🏖️",  label: "Apply Leave",   screen: "Leave"      },
        ].map((a) => (
          <TouchableOpacity key={a.label} style={S.action}
            onPress={() => navigation.navigate(a.screen)}>
            <Text style={S.actionIcon}>{a.icon}</Text>
            <Text style={S.actionLabel}>{a.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Latest payslip */}
      {latestSlip && (
        <>
          <Text style={S.section}>LATEST PAYSLIP</Text>
          <TouchableOpacity style={S.card} onPress={() => navigation.navigate("Payslips")}>
            <View style={S.slipRow}>
              <View>
                <Text style={S.slipMonth}>{MONTHS[latestSlip.month - 1]} {latestSlip.year}</Text>
                <Text style={S.slipStatus}>{latestSlip.run_status.toUpperCase()}</Text>
              </View>
              <Text style={S.slipAmount}>₹{Number(latestSlip.net_pay).toLocaleString("en-IN")}</Text>
            </View>
            <View style={S.slipMeta}>
              <Text style={S.slipMetaTxt}>Present: {latestSlip.present_days}/{latestSlip.working_days} days</Text>
              <Text style={S.slipLink}>View details →</Text>
            </View>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const S = StyleSheet.create({
  page:       { flex: 1, backgroundColor: "#F4F6FA" },
  header:     { flexDirection: "row", alignItems: "center", padding: 20, backgroundColor: colors.ink, gap: 12 },
  avatar:     { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.saffron, justifyContent: "center", alignItems: "center" },
  avatarTxt:  { color: "#fff", fontWeight: "800", fontSize: 16 },
  greeting:   { color: "rgba(255,255,255,.6)", fontSize: 12 },
  name:       { color: "#fff", fontSize: 18, fontWeight: "700" },
  empBadge:   { backgroundColor: "rgba(255,255,255,.15)", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  empCode:    { color: "#fff", fontSize: 12, fontWeight: "600" },
  card:       { backgroundColor: "#fff", borderRadius: 14, marginHorizontal: 16, marginTop: 14, padding: 16, shadowColor: "#000", shadowOpacity: .06, shadowRadius: 8, elevation: 2 },
  cardLabel:  { fontSize: 11, fontWeight: "700", color: colors.muted, letterSpacing: 0.5, marginBottom: 12 },
  statusRow:  { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  dot:        { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  statusTxt:  { fontSize: 16, fontWeight: "700" },
  statusSub:  { fontSize: 13, color: colors.muted },
  timeRow:    { flexDirection: "row" },
  timeBox:    { flex: 1, alignItems: "center" },
  timeLabel:  { fontSize: 11, color: colors.muted, marginBottom: 4 },
  timeVal:    { fontSize: 20, fontWeight: "800", color: colors.ink },
  section:    { fontSize: 11, fontWeight: "700", color: colors.muted, letterSpacing: 0.5, marginHorizontal: 16, marginTop: 20, marginBottom: 10 },
  actionsRow: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 12, gap: 10 },
  action:     { backgroundColor: "#fff", borderRadius: 14, padding: 16, alignItems: "center", width: "46%", shadowColor: "#000", shadowOpacity: .05, shadowRadius: 6, elevation: 2 },
  actionIcon: { fontSize: 28, marginBottom: 8 },
  actionLabel:{ fontSize: 13, fontWeight: "600", color: colors.ink, textAlign: "center" },
  slipRow:    { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  slipMonth:  { fontSize: 16, fontWeight: "700", color: colors.ink },
  slipStatus: { fontSize: 11, color: colors.green, fontWeight: "700", marginTop: 2 },
  slipAmount: { fontSize: 22, fontWeight: "800", color: colors.ink },
  slipMeta:   { flexDirection: "row", justifyContent: "space-between" },
  slipMetaTxt:{ fontSize: 12, color: colors.muted },
  slipLink:   { fontSize: 12, color: colors.saffron, fontWeight: "600" },
});
