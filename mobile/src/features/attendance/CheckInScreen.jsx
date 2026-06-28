import React, { useState, useRef } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, ScrollView, Platform,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { useSelector } from "react-redux";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getCurrentPosition } from "../../services/location";
import { useMyTodayQuery, useCheckOutMutation } from "./attendanceApi";
import { API_URL } from "../../api/baseApi";
import { colors } from "../../theme/colors";

function fmt12(timeStr) {
  if (!timeStr) return "—";
  const [h, m] = timeStr.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

// ── Camera capture screen ─────────────────────────────────────────────────────

function CameraCapture({ onCapture, onCancel, loading }) {
  const cameraRef = useRef(null);

  const handleCapture = async () => {
    if (!cameraRef.current) return;
    const photo = await cameraRef.current.takePictureAsync({ quality: 0.6 });
    onCapture(photo.uri);
  };

  return (
    <View style={{ flex: 1 }}>
      <CameraView ref={cameraRef} style={{ flex: 1 }} facing="front">
        <View style={cam.overlay}>
          <View style={cam.ovalFrame} />
          <Text style={cam.hint}>Align your face within the frame</Text>
          {loading ? (
            <ActivityIndicator color={colors.saffron} size="large" style={{ marginTop: 32 }} />
          ) : (
            <View style={cam.btnRow}>
              <TouchableOpacity style={cam.cancelBtn} onPress={onCancel}>
                <Ionicons name="close" size={22} color="#fff" />
                <Text style={cam.cancelTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={cam.captureBtn} onPress={handleCapture}>
                <Ionicons name="camera" size={22} color="#0F1E3D" />
                <Text style={cam.captureTxt}>Capture</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </CameraView>
    </View>
  );
}

// ── Status card ───────────────────────────────────────────────────────────────

function StatusRow({ icon, label, value, valueColor }) {
  return (
    <View style={sc.row}>
      <View style={sc.iconWrap}>
        <Ionicons name={icon} size={18} color={colors.saffron} />
      </View>
      <Text style={sc.label}>{label}</Text>
      <Text style={[sc.value, valueColor && { color: valueColor }]}>{value}</Text>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function CheckInScreen() {
  const insets = useSafeAreaInsets();
  const token  = useSelector((s) => s.auth.accessToken);

  const [showCamera, setShowCamera]   = useState(false);
  const [submitting, setSubmitting]   = useState(false);

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  const { data: today, isLoading, refetch } = useMyTodayQuery(undefined, {
    pollingInterval: 30000,
  });

  const [checkOut, { isLoading: checkingOut }] = useCheckOutMutation();

  const checkedIn  = today?.checked_in;
  const checkedOut = !!today?.check_out_time;

  // ── Check-in flow ────────────────────────────────────────────────────────

  const handleOpenCamera = async () => {
    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) {
        Alert.alert("Camera Permission", "Camera access is required for check-in.");
        return;
      }
    }
    setShowCamera(true);
  };

  const handleCapture = async (selfieUri) => {
    setSubmitting(true);
    try {
      const pos = await getCurrentPosition();
      const { latitude: lat, longitude: lng } = pos.coords;

      const form = new FormData();
      form.append("lat", String(lat));
      form.append("lng", String(lng));
      if (Platform.OS === "web") {
        // On web the {uri,name,type} object isn't a real file — convert the
        // blob/data URI to an actual Blob so the backend receives the image.
        const blob = await (await fetch(selfieUri)).blob();
        form.append("selfie", blob, "selfie.jpg");
      } else {
        form.append("selfie", { uri: selfieUri, name: "selfie.jpg", type: "image/jpeg" });
      }

      const res  = await fetch(`${API_URL}/attendance/check-in/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Check-in failed");

      setShowCamera(false);
      await refetch();
      Alert.alert("Checked In ✅", `Status: ${data.status}\nTime: ${fmt12(String(data.check_in_time || ""))}`);
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelCamera = () => {
    setShowCamera(false);
    setSubmitting(false);
  };

  // ── Check-out flow ───────────────────────────────────────────────────────

  const handleCheckOut = () => {
    Alert.alert(
      "Confirm Check-Out",
      "Mark your check-out for today?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Check Out",
          onPress: async () => {
            try {
              await checkOut().unwrap();
              await refetch();
              Alert.alert("Checked Out ✅", "Your check-out has been recorded.");
            } catch (e) {
              Alert.alert("Error", e?.data?.detail || "Check-out failed.");
            }
          },
        },
      ]
    );
  };

  // ── Camera mode ──────────────────────────────────────────────────────────

  if (showCamera) {
    return (
      <CameraCapture
        onCapture={handleCapture}
        onCancel={handleCancelCamera}
        loading={submitting}
      />
    );
  }

  // ── Determine action to show ─────────────────────────────────────────────

  const today_date = new Date().toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  let statusColor = colors.muted;
  let statusLabel = "Not Marked";
  let statusIcon  = "ellipse-outline";

  if (checkedIn && checkedOut) {
    statusColor = colors.green;
    statusLabel = "Shift Complete";
    statusIcon  = "checkmark-circle";
  } else if (checkedIn) {
    statusColor = "#1E6CB5";
    statusLabel = today?.status === "late" ? "Late" : "Present";
    statusIcon  = "radio-button-on";
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "#F4F6FA" }}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      {/* Header */}
      <View style={[S.header, { paddingTop: insets.top + 12 }]}>
        <Text style={S.headerTitle}>Attendance</Text>
        <Text style={S.headerDate}>{today_date}</Text>
      </View>

      {/* Status card */}
      <View style={S.card}>
        {isLoading ? (
          <ActivityIndicator color={colors.saffron} style={{ padding: 24 }} />
        ) : (
          <>
            <View style={S.statusBanner}>
              <Ionicons name={statusIcon} size={22} color={statusColor} />
              <Text style={[S.statusText, { color: statusColor }]}>{statusLabel}</Text>
            </View>

            <StatusRow icon="log-in-outline"  label="Check In"  value={fmt12(today?.check_in_time)} />
            <StatusRow icon="log-out-outline" label="Check Out" value={fmt12(today?.check_out_time)} />
            {today?.geofence_ok !== undefined && (
              <StatusRow
                icon="location-outline"
                label="Geofence"
                value={today.geofence_ok ? "Within site" : "Outside site"}
                valueColor={today.geofence_ok ? colors.green : "#D2453F"}
              />
            )}
          </>
        )}
      </View>

      {/* Primary action */}
      <View style={S.actionArea}>
        {!checkedIn && (
          <>
            <View style={S.illustrationBox}>
              <Ionicons name="camera-outline" size={64} color="rgba(255,255,255,.35)" />
              <Text style={S.illustrationText}>Selfie + GPS required</Text>
            </View>
            <TouchableOpacity
              style={S.primaryBtn}
              onPress={handleOpenCamera}
              disabled={submitting}
            >
              <Ionicons name="camera" size={22} color="#fff" style={{ marginRight: 10 }} />
              <Text style={S.primaryBtnText}>Check In Now</Text>
            </TouchableOpacity>
          </>
        )}

        {checkedIn && !checkedOut && (
          <>
            <View style={S.checkedInBox}>
              <Ionicons name="checkmark-circle" size={56} color={colors.green} />
              <Text style={S.checkedInText}>You're checked in</Text>
              <Text style={S.checkedInSub}>Checked in at {fmt12(today?.check_in_time)}</Text>
            </View>
            <TouchableOpacity
              style={S.outBtn}
              onPress={handleCheckOut}
              disabled={checkingOut}
            >
              {checkingOut ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="log-out-outline" size={22} color="#fff" style={{ marginRight: 10 }} />
                  <Text style={S.primaryBtnText}>Check Out</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        )}

        {checkedIn && checkedOut && (
          <View style={S.doneBox}>
            <Ionicons name="trophy-outline" size={56} color={colors.saffron} />
            <Text style={S.doneTitle}>Shift Complete!</Text>
            <Text style={S.doneSub}>
              {fmt12(today?.check_in_time)} → {fmt12(today?.check_out_time)}
            </Text>
          </View>
        )}
      </View>

      {/* Info strip */}
      <View style={S.infoStrip}>
        <View style={S.infoItem}>
          <Ionicons name="time-outline" size={18} color={colors.muted} />
          <Text style={S.infoLabel}>Shift</Text>
          <Text style={S.infoVal}>8 AM – 8 PM</Text>
        </View>
        <View style={S.infoDivider} />
        <View style={S.infoItem}>
          <Ionicons name="refresh-outline" size={18} color={colors.muted} />
          <TouchableOpacity onPress={refetch}>
            <Text style={[S.infoVal, { color: colors.saffron }]}>Refresh</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  header:        { backgroundColor: "#0F1E3D", paddingHorizontal: 20, paddingBottom: 18 },
  headerTitle:   { color: "#fff", fontSize: 22, fontWeight: "800" },
  headerDate:    { color: "rgba(255,255,255,.55)", fontSize: 12, marginTop: 3 },

  card:          { margin: 16, backgroundColor: "#fff", borderRadius: 16, padding: 16,
                   elevation: 3, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 8 },
  statusBanner:  { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14,
                   paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: "#F0F2F8" },
  statusText:    { fontSize: 16, fontWeight: "700" },

  actionArea:    { marginHorizontal: 16, marginBottom: 12 },

  illustrationBox: { backgroundColor: "#0F1E3D", borderRadius: 18, height: 160, alignItems: "center",
                     justifyContent: "center", marginBottom: 14 },
  illustrationText:{ color: "rgba(255,255,255,.5)", fontSize: 13, marginTop: 8 },

  primaryBtn:    { backgroundColor: colors.saffron, borderRadius: 14, flexDirection: "row",
                   alignItems: "center", justifyContent: "center", paddingVertical: 16 },
  primaryBtnText:{ color: "#fff", fontSize: 16, fontWeight: "800" },

  outBtn:        { backgroundColor: "#1E6CB5", borderRadius: 14, flexDirection: "row",
                   alignItems: "center", justifyContent: "center", paddingVertical: 16 },

  checkedInBox:  { backgroundColor: "#E1F4EC", borderRadius: 18, padding: 28, alignItems: "center",
                   marginBottom: 14 },
  checkedInText: { fontSize: 18, fontWeight: "800", color: "#0F1E3D", marginTop: 10 },
  checkedInSub:  { fontSize: 13, color: colors.muted, marginTop: 4 },

  doneBox:       { backgroundColor: "#FEF3E8", borderRadius: 18, padding: 28, alignItems: "center" },
  doneTitle:     { fontSize: 18, fontWeight: "800", color: "#0F1E3D", marginTop: 10 },
  doneSub:       { fontSize: 14, color: colors.muted, marginTop: 4 },

  infoStrip:     { flexDirection: "row", alignItems: "center", backgroundColor: "#fff",
                   marginHorizontal: 16, borderRadius: 14, padding: 16,
                   elevation: 1, shadowColor: "#000", shadowOpacity: 0.04 },
  infoItem:      { flex: 1, alignItems: "center", gap: 4 },
  infoLabel:     { fontSize: 11, color: colors.muted, fontWeight: "600" },
  infoVal:       { fontSize: 13, fontWeight: "700", color: "#0F1E3D" },
  infoDivider:   { width: 1, height: 36, backgroundColor: "#F0F2F8" },
});

const sc = StyleSheet.create({
  row:      { flexDirection: "row", alignItems: "center", paddingVertical: 10,
              borderBottomWidth: 1, borderBottomColor: "#F0F2F8" },
  iconWrap: { width: 30, alignItems: "center", marginRight: 6 },
  label:    { flex: 1, fontSize: 13, color: colors.muted },
  value:    { fontSize: 13, fontWeight: "700", color: "#0F1E3D" },
});

const cam = StyleSheet.create({
  overlay:    { flex: 1, backgroundColor: "rgba(0,0,0,.45)",
                alignItems: "center", justifyContent: "center" },
  ovalFrame:  { width: 200, height: 240, borderRadius: 100, borderWidth: 2,
                borderColor: "rgba(255,255,255,.85)", borderStyle: "dashed" },
  hint:       { color: "#fff", fontSize: 14, marginTop: 20, textAlign: "center", paddingHorizontal: 32 },
  btnRow:     { flexDirection: "row", gap: 16, marginTop: 36 },
  cancelBtn:  { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(255,255,255,.2)",
                borderRadius: 12, paddingHorizontal: 20, paddingVertical: 14 },
  cancelTxt:  { color: "#fff", fontWeight: "700", fontSize: 15 },
  captureBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.saffron,
                borderRadius: 12, paddingHorizontal: 24, paddingVertical: 14 },
  captureTxt: { color: "#0F1E3D", fontWeight: "800", fontSize: 15 },
});
