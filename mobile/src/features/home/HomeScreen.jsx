import React from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSelector } from "react-redux";
import { useMyTodayQuery } from "../attendance/attendanceApi";
import { useMyPayslipsQuery } from "../payslip/payslipApi";
import { useGetNotificationsQuery } from "../notifications/notificationApi";
import { colors } from "../../theme/colors";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const ACTIONS = [
  { icon: "camera",        iconColor: "#E8821E", bg: "#FEF0E3", label: "Check In / Out", screen: "Attendance" },
  { icon: "calendar",      iconColor: "#1E6CB5", bg: "#E3F0FE", label: "My History",     screen: "History"    },
  { icon: "document-text", iconColor: "#15966A", bg: "#E1F4EC", label: "My Payslips",    screen: "Payslips"   },
  { icon: "umbrella",      iconColor: "#7B1FA2", bg: "#EDE7F6", label: "Apply Leave",    screen: "Leave"      },
];

export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const user = useSelector((s) => s.auth.user);
  const { data: today, isLoading: todayLoading } = useMyTodayQuery();
  const { data: payslips } = useMyPayslipsQuery();
  const { data: notifData } = useGetNotificationsQuery(undefined, { pollingInterval: 60000 });
  const unreadCount = notifData?.unread || 0;

  const latestSlip = payslips?.[0];
  const hour       = new Date().getHours();
  const greeting   = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";
  const firstName  = (user?.full_name || "Employee").split(" ")[0];

  const isPresent  = today?.status === "present";
  const isLate     = today?.status === "late";
  const isCheckedIn = today?.checked_in;

  const statusColor = isPresent ? colors.green : isLate ? colors.saffron : isCheckedIn ? colors.muted : "#BCC3D0";
  const statusBg    = isPresent ? colors.greenSoft : isLate ? colors.saffronSoft : "#F0F2F8";
  const statusLabel = isCheckedIn
    ? (isPresent ? "Present" : isLate ? "Late" : "Under Review")
    : "Absent";
  const statusSub   = isCheckedIn
    ? (today.check_out_time
        ? `Completed · Out ${today.check_out_time.slice(0, 5)}`
        : `Checked in at ${today.check_in_time?.slice(0, 5)}`)
    : "Not marked yet";

  return (
    <ScrollView style={S.page} contentContainerStyle={{ paddingBottom: 32 }}>
      {/* Header */}
      <View style={[S.header, { paddingTop: (insets.top || 0) + 16 }]}>
        <View style={S.avatar}>
          <Text style={S.avatarTxt}>{firstName.slice(0, 2).toUpperCase()}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={S.greeting}>{greeting},</Text>
          <Text style={S.name}>{firstName}</Text>
        </View>
        {user?.employee_detail?.emp_code && (
          <View style={S.empBadge}>
            <Ionicons name="id-card-outline" size={13} color={colors.saffron} />
            <Text style={S.empCode}> {user.employee_detail.emp_code}</Text>
          </View>
        )}
        <TouchableOpacity
          style={S.bellBtn}
          onPress={() => navigation.navigate("Notifications")}
        >
          <Ionicons name="notifications-outline" size={22} color="#fff" />
          {unreadCount > 0 && (
            <View style={S.badge}>
              <Text style={S.badgeTxt}>{unreadCount > 9 ? "9+" : unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Attendance card */}
      <View style={S.attCard}>
        <Text style={S.cardLabel}>TODAY'S ATTENDANCE</Text>
        {todayLoading ? (
          <ActivityIndicator color={colors.saffron} style={{ marginVertical: 12 }} />
        ) : (
          <>
            <View style={S.statusRow}>
              <View style={[S.statusPill, { backgroundColor: statusBg }]}>
                <View style={[S.dot, { backgroundColor: statusColor }]} />
                <Text style={[S.statusTxt, { color: statusColor }]}>{statusLabel}</Text>
              </View>
              <Text style={S.statusSub}>{statusSub}</Text>
            </View>
            <View style={S.divider} />
            <View style={S.timeRow}>
              <View style={S.timeBox}>
                <Text style={S.timeLabel}>Check In</Text>
                <Text style={S.timeVal}>{today?.check_in_time?.slice(0, 5) || "--:--"}</Text>
              </View>
              <View style={S.timeSepar} />
              <View style={S.timeBox}>
                <Text style={S.timeLabel}>Check Out</Text>
                <Text style={S.timeVal}>{today?.check_out_time?.slice(0, 5) || "--:--"}</Text>
              </View>
            </View>
          </>
        )}
      </View>

      {/* Quick Actions */}
      <Text style={S.section}>QUICK ACTIONS</Text>
      <View style={S.actionsGrid}>
        {ACTIONS.map((a) => (
          <TouchableOpacity
            key={a.label}
            style={S.actionCard}
            activeOpacity={0.75}
            onPress={() => navigation.navigate(a.screen)}
          >
            <View style={[S.actionIconWrap, { backgroundColor: a.bg }]}>
              <Ionicons name={a.icon} size={26} color={a.iconColor} />
            </View>
            <Text style={S.actionLabel}>{a.label}</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.muted} style={S.actionArrow} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Latest payslip */}
      {latestSlip && (
        <>
          <Text style={S.section}>LATEST PAYSLIP</Text>
          <TouchableOpacity style={S.slipCard} activeOpacity={0.8} onPress={() => navigation.navigate("Payslips")}>
            <View style={S.slipLeft}>
              <Text style={S.slipMonth}>{MONTHS[latestSlip.month - 1]} {latestSlip.year}</Text>
              <View style={S.slipStatusBadge}>
                <Text style={S.slipStatus}>{latestSlip.run_status.toUpperCase()}</Text>
              </View>
              <Text style={S.slipMeta}>Present: {latestSlip.present_days}/{latestSlip.working_days} days</Text>
            </View>
            <View style={S.slipRight}>
              <Text style={S.slipAmount}>₹{Number(latestSlip.net_pay).toLocaleString("en-IN")}</Text>
              <View style={S.slipLinkRow}>
                <Text style={S.slipLink}>View details</Text>
                <Ionicons name="chevron-forward" size={13} color={colors.saffron} />
              </View>
            </View>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const S = StyleSheet.create({
  page:          { flex: 1, backgroundColor: "#F4F6FA" },

  header:        { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingBottom: 20, backgroundColor: colors.ink, gap: 14 },
  avatar:        { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.saffron, justifyContent: "center", alignItems: "center" },
  avatarTxt:     { color: "#fff", fontWeight: "800", fontSize: 17 },
  greeting:      { color: "rgba(255,255,255,.55)", fontSize: 12 },
  name:          { color: "#fff", fontSize: 20, fontWeight: "800" },
  empBadge:      { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,255,255,.1)", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: "rgba(255,255,255,.12)" },
  empCode:       { color: colors.saffron, fontSize: 12, fontWeight: "700" },
  bellBtn:       { padding: 8, position: "relative" },
  badge:         { position: "absolute", top: 4, right: 4, minWidth: 16, height: 16, borderRadius: 8,
                   backgroundColor: "#D2453F", alignItems: "center", justifyContent: "center",
                   paddingHorizontal: 3 },
  badgeTxt:      { color: "#fff", fontSize: 9, fontWeight: "800" },

  attCard:       { backgroundColor: "#fff", borderRadius: 16, marginHorizontal: 16, marginTop: 16, padding: 18, elevation: 3, shadowColor: "#000", shadowOpacity: 0.07, shadowRadius: 10 },
  cardLabel:     { fontSize: 11, fontWeight: "700", color: colors.muted, letterSpacing: 0.8, marginBottom: 14 },
  statusRow:     { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  statusPill:    { flexDirection: "row", alignItems: "center", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, gap: 6 },
  dot:           { width: 8, height: 8, borderRadius: 4 },
  statusTxt:     { fontSize: 14, fontWeight: "800" },
  statusSub:     { fontSize: 12, color: colors.muted, flex: 1 },
  divider:       { height: 1, backgroundColor: colors.line, marginBottom: 14 },
  timeRow:       { flexDirection: "row" },
  timeBox:       { flex: 1, alignItems: "center" },
  timeSepar:     { width: 1, backgroundColor: colors.line, marginVertical: 4 },
  timeLabel:     { fontSize: 11, color: colors.muted, marginBottom: 6 },
  timeVal:       { fontSize: 22, fontWeight: "800", color: colors.ink },

  section:       { fontSize: 11, fontWeight: "700", color: colors.muted, letterSpacing: 0.8, marginHorizontal: 16, marginTop: 22, marginBottom: 10 },

  actionsGrid:   { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 12, gap: 10 },
  actionCard:    { backgroundColor: "#fff", borderRadius: 16, padding: 16, width: "47%", elevation: 2, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 8, flexDirection: "column", gap: 10 },
  actionIconWrap:{ width: 50, height: 50, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  actionLabel:   { fontSize: 13, fontWeight: "700", color: colors.ink, flex: 1 },
  actionArrow:   { alignSelf: "flex-end" },

  slipCard:      { backgroundColor: colors.ink, borderRadius: 16, marginHorizontal: 16, padding: 18, flexDirection: "row", alignItems: "center", justifyContent: "space-between", elevation: 3, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 10 },
  slipLeft:      { gap: 6 },
  slipMonth:     { fontSize: 16, fontWeight: "800", color: "#fff" },
  slipStatusBadge:{ backgroundColor: colors.greenSoft, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, alignSelf: "flex-start" },
  slipStatus:    { fontSize: 10, fontWeight: "700", color: colors.green },
  slipMeta:      { fontSize: 12, color: "rgba(255,255,255,.5)" },
  slipRight:     { alignItems: "flex-end", gap: 6 },
  slipAmount:    { fontSize: 24, fontWeight: "800", color: colors.saffron },
  slipLinkRow:   { flexDirection: "row", alignItems: "center", gap: 2 },
  slipLink:      { fontSize: 12, color: colors.saffron, fontWeight: "600" },
});
