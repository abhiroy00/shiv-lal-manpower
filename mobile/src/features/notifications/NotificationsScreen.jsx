import React from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator, RefreshControl,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useGetNotificationsQuery,
  useMarkReadMutation,
  useMarkAllReadMutation,
} from "./notificationApi";
import { colors } from "../../theme/colors";

const TYPE_CFG = {
  leave:      { icon: "umbrella-outline",    color: "#7B1FA2", bg: "#EDE7F6" },
  payslip:    { icon: "cash-outline",        color: "#15966A", bg: "#E1F4EC" },
  attendance: { icon: "calendar-outline",    color: "#1E6CB5", bg: "#E3EEF9" },
  general:    { icon: "notifications-outline",color: "#C98A12", bg: "#FBF1DC" },
};

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60)   return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function NotificationsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { data, isLoading, refetch, isFetching } = useGetNotificationsQuery(undefined, {
    pollingInterval: 30000,
  });

  const [markRead]    = useMarkReadMutation();
  const [markAllRead] = useMarkAllReadMutation();

  const notifications = data?.results || [];
  const unread        = data?.unread  || 0;

  const handleTap = async (notif) => {
    if (!notif.is_read) {
      await markRead(notif.id);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#F4F6FA" }}>
      {/* Header */}
      <View style={[S.header, { paddingTop: insets.top + 12 }]}>
        <View style={S.headerLeft}>
          <TouchableOpacity style={S.backBtn} onPress={() => navigation?.goBack()}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View>
            <Text style={S.headerTitle}>Notifications</Text>
            {unread > 0 && (
              <Text style={S.headerSub}>{unread} unread</Text>
            )}
          </View>
        </View>
        {unread > 0 && (
          <TouchableOpacity style={S.readAllBtn} onPress={markAllRead}>
            <Text style={S.readAllTxt}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.saffron} style={{ marginTop: 60 }} />
      ) : notifications.length === 0 ? (
        <View style={S.emptyBox}>
          <Ionicons name="notifications-off-outline" size={64} color="#C8D0DF" />
          <Text style={S.emptyTitle}>No notifications</Text>
          <Text style={S.emptySub}>You're all caught up!</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 40, paddingTop: 8 }}
          refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.saffron} />}
        >
          {notifications.map((notif) => {
            const cfg = TYPE_CFG[notif.notif_type] || TYPE_CFG.general;
            return (
              <TouchableOpacity
                key={notif.id}
                style={[S.card, !notif.is_read && S.cardUnread]}
                onPress={() => handleTap(notif)}
                activeOpacity={0.8}
              >
                <View style={[S.iconBox, { backgroundColor: cfg.bg }]}>
                  <Ionicons name={cfg.icon} size={22} color={cfg.color} />
                </View>
                <View style={S.content}>
                  <View style={S.titleRow}>
                    <Text style={[S.title, !notif.is_read && S.titleUnread]} numberOfLines={1}>
                      {notif.title}
                    </Text>
                    {!notif.is_read && <View style={S.dot} />}
                  </View>
                  <Text style={S.body} numberOfLines={2}>{notif.body}</Text>
                  <Text style={S.time}>{timeAgo(notif.created_at)}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const S = StyleSheet.create({
  header:      { backgroundColor: "#0F1E3D", paddingHorizontal: 16, paddingBottom: 16,
                 flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerLeft:  { flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn:     { padding: 6, borderRadius: 10, backgroundColor: "rgba(255,255,255,.1)" },
  headerTitle: { color: "#fff", fontSize: 20, fontWeight: "800" },
  headerSub:   { color: "rgba(255,255,255,.55)", fontSize: 12, marginTop: 2 },
  readAllBtn:  { paddingHorizontal: 12, paddingVertical: 7, backgroundColor: "rgba(255,255,255,.12)",
                 borderRadius: 10 },
  readAllTxt:  { color: colors.saffron, fontSize: 12, fontWeight: "700" },

  emptyBox:    { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  emptyTitle:  { fontSize: 18, fontWeight: "700", color: "#0F1E3D" },
  emptySub:    { fontSize: 14, color: colors.muted },

  card:        { flexDirection: "row", gap: 12, backgroundColor: "#fff", marginHorizontal: 16,
                 marginTop: 8, borderRadius: 14, padding: 14,
                 elevation: 1, shadowColor: "#000", shadowOpacity: 0.05, shadowRadius: 4 },
  cardUnread:  { borderLeftWidth: 3, borderLeftColor: colors.saffron },

  iconBox:     { width: 44, height: 44, borderRadius: 12, alignItems: "center",
                 justifyContent: "center", flexShrink: 0 },
  content:     { flex: 1 },
  titleRow:    { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  title:       { flex: 1, fontSize: 14, fontWeight: "600", color: "#0F1E3D" },
  titleUnread: { fontWeight: "800" },
  dot:         { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.saffron },
  body:        { fontSize: 13, color: colors.muted, lineHeight: 18 },
  time:        { fontSize: 11, color: "#9AA6BF", marginTop: 6 },
});
