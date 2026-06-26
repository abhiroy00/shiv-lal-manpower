import React, { useCallback, useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { useSelector } from "react-redux";
import { useMyTodayQuery } from "../attendance/attendanceApi";
import { colors } from "../../theme/colors";

const ACTIONS = [
  { icon: "camera",    iconColor: "#E8821E", bg: "#FEF0E3", label: "Check In / Out", screen: "Attendance" },
  { icon: "calendar",  iconColor: "#1E6CB5", bg: "#E3F0FE", label: "My History",     screen: "History"    },
  { icon: "umbrella",  iconColor: "#7B1FA2", bg: "#EDE7F6", label: "Apply Leave",    screen: "Leave"      },
];

export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const user = useSelector((s) => s.auth.user);
  const { data: today, isLoading: todayLoading, isFetching, refetch } = useMyTodayQuery();
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const hour      = new Date().getHours();
  const greeting  = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";
  const firstName = (user?.full_name || "Employee").split(" ")[0];

  const isPresent   = today?.status === "present";
  const isLate      = today?.status === "late";
  const isCheckedIn = today?.checked_in;

  const statusColor = isPresent ? colors.green : isLate ? colors.saffron : isCheckedIn ? colors.muted : "#BCC3D0";
  const statusBg    = isPresent ? colors.greenSoft : isLate ? colors.saffronSoft : "#F0F2F8";
  const statusLabel = isCheckedIn
    ? (isPresent ? "Present" : isLate ? "Late" : "Under Review")
    : "Absent";
  const statusSub = isCheckedIn
    ? (today.check_out_time
        ? `Completed · Out ${today.check_out_time.slice(0, 5)}`
        : `Checked in at ${today.check_in_time?.slice(0, 5)}`)
    : "Not marked yet";

  return (
    <ScrollView
      style={S.page}
      contentContainerStyle={{ paddingBottom: 32 }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing || isFetching}
          onRefresh={onRefresh}
          colors={[colors.saffron]}
          tintColor={colors.saffron}
        />
      }
    >
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
});
