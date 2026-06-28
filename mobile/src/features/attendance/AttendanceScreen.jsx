import React, { useState, useRef } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, Alert,
  ActivityIndicator, ScrollView, Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import { getCurrentPosition } from "../../services/location";
import { useMyTodayQuery, useCheckOutMutation } from "./attendanceApi";
import { colors } from "../../theme/colors";
import { useSelector } from "react-redux";
import { API_URL } from "../../api/baseApi";

export default function AttendanceScreen() {
  const insets = useSafeAreaInsets();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [showCamera,  setShowCamera]  = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [location,    setLocation]    = useState(null);
  const cameraRef = useRef(null);
  const token = useSelector((s) => s.auth.accessToken);

  const { data: today, isLoading: todayLoading, refetch } = useMyTodayQuery();
  const [checkOut, { isLoading: outLoading }] = useCheckOutMutation();
  const [confirmCheckout, setConfirmCheckout] = useState(false);

  const handleCheckIn = async () => {
    if (!cameraPermission?.granted) await requestCameraPermission();
    setShowCamera(true);
  };

  const captureAndSubmit = async () => {
    setLoading(true);
    setShowCamera(false);
    try {
      const pos = await getCurrentPosition();
      const { latitude: lat, longitude: lng } = pos.coords;
      setLocation({ lat, lng });

      let selfieUri = null;
      if (cameraRef.current) {
        const photo = await cameraRef.current.takePictureAsync({ quality: 0.6 });
        selfieUri = photo.uri;
      }

      const formData = new FormData();
      formData.append("lat", lat.toString());
      formData.append("lng", lng.toString());
      if (selfieUri) {
        if (Platform.OS === "web") {
          // On web the {uri,name,type} object isn't a real file — convert the
          // blob/data URI to an actual Blob so the backend receives the image.
          const blob = await (await fetch(selfieUri)).blob();
          formData.append("selfie", blob, "selfie.jpg");
        } else {
          formData.append("selfie", { uri: selfieUri, name: "selfie.jpg", type: "image/jpeg" });
        }
      }

      const res = await fetch(`${API_URL}/attendance/check-in/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Check-in failed");
      Alert.alert("Checked In", `Status: ${data.status}`);
      refetch();
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  const performCheckOut = async () => {
    setConfirmCheckout(false);
    try {
      await checkOut().unwrap();
      refetch();
      Alert.alert("Checked Out", "Your check-out time has been recorded.");
    } catch (e) {
      const msg = e?.data?.detail ?? e?.error ?? "Check-out failed. Check your connection.";
      Alert.alert("Error", msg);
    }
  };

  const handleCheckOut = () => {
    if (Platform.OS === "web") {
      // window.confirm() can be silently suppressed by browsers — use inline confirm instead
      setConfirmCheckout(true);
    } else {
      Alert.alert("Check Out", "Confirm check-out for today?", [
        { text: "Cancel", style: "cancel" },
        { text: "Confirm", onPress: performCheckOut },
      ]);
    }
  };

  if (showCamera) {
    return (
      <View style={{ flex: 1 }}>
        <CameraView ref={cameraRef} style={{ flex: 1 }} facing="front">
          <View style={cam.overlay}>
            <View style={cam.faceCircle} />
            <Text style={cam.hint}>Position your face inside the circle</Text>
            <TouchableOpacity style={cam.captureBtn} onPress={captureAndSubmit}>
              <Text style={cam.captureTxt}>📸 Capture & Submit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={cam.cancelBtn} onPress={() => setShowCamera(false)}>
              <Text style={cam.cancelTxt}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </CameraView>
      </View>
    );
  }

  const isCheckedIn  = today?.checked_in;
  const isCheckedOut = !!today?.check_out_time;
  const statusColor  = today?.status === "present" ? colors.green
    : today?.status === "late" ? colors.saffron : colors.muted;

  return (
    <ScrollView style={S.page} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Status card */}
      <View style={[S.statusCard, { marginTop: (insets.top || 0) + 8 }]}>
        <Text style={S.cardTitle}>TODAY'S STATUS</Text>
        {todayLoading ? (
          <ActivityIndicator color={colors.saffron} style={{ marginVertical: 20 }} />
        ) : (
          <View>
            <View style={[S.statusBadge, { backgroundColor: isCheckedIn ? colors.greenSoft : "#F0F2F8" }]}>
              <View style={[S.dot, { backgroundColor: isCheckedIn ? colors.green : colors.muted }]} />
              <Text style={[S.statusText, { color: isCheckedIn ? colors.green : colors.muted }]}>
                {isCheckedIn
                  ? (isCheckedOut ? "Shift Completed" : "Currently In")
                  : "Not Checked In"}
              </Text>
            </View>
            <View style={S.timeGrid}>
              {[
                ["Check In",  today?.check_in_time,  "log-in-outline"],
                ["Check Out", today?.check_out_time, "log-out-outline"],
              ].map(([label, val, ico]) => (
                <View key={label} style={S.timeCell}>
                  <View style={S.timeCellHeader}>
                    <Ionicons name={ico} size={13} color={colors.muted} />
                    <Text style={S.timeCellLabel}> {label}</Text>
                  </View>
                  <Text style={S.timeCellVal}>{val?.slice(0, 5) || "--:--"}</Text>
                </View>
              ))}
            </View>
            {isCheckedIn && (
              <View style={S.attStatusRow}>
                <View style={[S.dot, { backgroundColor: statusColor }]} />
                <Text style={[S.attStatus, { color: statusColor }]}>
                  {today.status === "present" ? "Present" : today.status === "late" ? "Late" : "Under Review"}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* GPS location card */}
      {location && (
        <View style={S.locationCard}>
          <View style={S.locationTitleRow}>
            <Ionicons name="location" size={14} color={colors.saffron} />
            <Text style={S.locationTitle}> CHECK-IN LOCATION</Text>
          </View>
          <View style={S.coordRow}>
            <View style={S.coordItem}>
              <Text style={S.coordLabel}>Latitude</Text>
              <Text style={S.coordValue}>{location.lat.toFixed(6)}°</Text>
            </View>
            <View style={S.coordDivider} />
            <View style={S.coordItem}>
              <Text style={S.coordLabel}>Longitude</Text>
              <Text style={S.coordValue}>{location.lng.toFixed(6)}°</Text>
            </View>
          </View>
          <Text style={S.locationNote}>
            {today?.geofence_ok === true ? "Within geofence" : "Location recorded successfully"}
          </Text>
        </View>
      )}

      {/* Action button */}
      <View style={S.btnArea}>
        {loading ? (
          <View style={[S.btn, { backgroundColor: colors.muted }]}>
            <ActivityIndicator color="#fff" />
            <Text style={S.btnText}>  Submitting...</Text>
          </View>
        ) : !isCheckedIn ? (
          <TouchableOpacity style={S.btn} onPress={handleCheckIn} activeOpacity={0.8}>
            <Ionicons name="camera" size={20} color="#fff" />
            <Text style={S.btnText}>  Capture & Check In</Text>
          </TouchableOpacity>
        ) : !isCheckedOut ? (
          confirmCheckout ? (
            <View style={S.confirmBox}>
              <Text style={S.confirmText}>Confirm check-out for today?</Text>
              <View style={S.confirmRow}>
                <TouchableOpacity style={[S.confirmBtn, { backgroundColor: colors.ink }]}
                  onPress={performCheckOut} disabled={outLoading}>
                  <Text style={S.confirmBtnText}>
                    {outLoading ? "Checking out..." : "Yes, Check Out"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity style={[S.confirmBtn, { backgroundColor: colors.muted }]}
                  onPress={() => setConfirmCheckout(false)}>
                  <Text style={S.confirmBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity style={[S.btn, { backgroundColor: colors.ink }]}
              onPress={handleCheckOut} disabled={outLoading} activeOpacity={0.8}>
              <Ionicons name="log-out-outline" size={20} color="#fff" />
              <Text style={S.btnText}>  Check Out</Text>
            </TouchableOpacity>
          )
        ) : (
          <View style={[S.btn, { backgroundColor: colors.green }]}>
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={S.btnText}>  Shift Complete</Text>
          </View>
        )}
      </View>

      {/* Instructions */}
      <View style={S.infoCard}>
        <Text style={S.infoTitle}>How it works</Text>
        {[
          ["camera-outline",      "Tap Check In to open camera"],
          ["person-outline",      "Take a selfie (front camera)"],
          ["location-outline",    "GPS location auto-captured"],
          ["checkmark-circle-outline", "Attendance marked instantly"],
          ["log-out-outline",     "Tap Check Out at end of shift"],
        ].map(([icon, text]) => (
          <View key={text} style={S.infoRow}>
            <View style={S.infoIconWrap}>
              <Ionicons name={icon} size={18} color={colors.saffron} />
            </View>
            <Text style={S.infoText}>{text}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const cam = StyleSheet.create({
  overlay:    { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,.4)" },
  faceCircle: { width: 200, height: 200, borderRadius: 100, borderWidth: 3, borderColor: "rgba(255,255,255,.9)", borderStyle: "dashed" },
  hint:       { color: "#fff", marginTop: 24, fontSize: 15, textAlign: "center", paddingHorizontal: 30 },
  captureBtn: { marginTop: 32, backgroundColor: colors.saffron, borderRadius: 14, paddingVertical: 16, paddingHorizontal: 36 },
  captureTxt: { color: "#fff", fontWeight: "700", fontSize: 16 },
  cancelBtn:  { marginTop: 14, paddingVertical: 10, paddingHorizontal: 30 },
  cancelTxt:  { color: "rgba(255,255,255,.7)", fontSize: 14 },
});

const S = StyleSheet.create({
  page:           { flex: 1, backgroundColor: "#F4F6FA" },
  statusCard:     { backgroundColor: "#fff", margin: 16, borderRadius: 16, padding: 20, elevation: 3, shadowColor: "#000", shadowOpacity: 0.07, shadowRadius: 10 },
  cardTitle:      { fontSize: 11, fontWeight: "700", color: colors.muted, letterSpacing: 0.8, marginBottom: 16 },
  statusBadge:    { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, marginBottom: 16, gap: 6 },
  statusText:     { fontWeight: "700", fontSize: 14 },
  dot:            { width: 8, height: 8, borderRadius: 4 },
  timeGrid:       { flexDirection: "row", marginBottom: 12, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 14 },
  timeCell:       { flex: 1, alignItems: "center" },
  timeCellHeader: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  timeCellLabel:  { fontSize: 11, color: colors.muted },
  timeCellVal:    { fontSize: 28, fontWeight: "800", color: colors.ink },
  attStatusRow:   { flexDirection: "row", alignItems: "center", gap: 6 },
  attStatus:      { fontSize: 13, fontWeight: "600" },
  locationCard:   { backgroundColor: "#fff", marginHorizontal: 16, marginBottom: 8, borderRadius: 14, padding: 16, elevation: 2 },
  locationTitleRow:{ flexDirection: "row", alignItems: "center", marginBottom: 12 },
  locationTitle:  { fontSize: 11, fontWeight: "700", color: colors.muted, letterSpacing: 0.5 },
  coordRow:       { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  coordItem:      { flex: 1, alignItems: "center" },
  coordLabel:     { fontSize: 11, color: colors.muted, marginBottom: 4 },
  coordValue:     { fontSize: 16, fontWeight: "700", color: colors.ink },
  coordDivider:   { width: 1, height: 40, backgroundColor: colors.line },
  locationNote:   { fontSize: 12, color: colors.green, textAlign: "center" },
  btnArea:        { padding: 16 },
  btn:            { backgroundColor: colors.saffron, borderRadius: 14, padding: 18, flexDirection: "row", alignItems: "center", justifyContent: "center", elevation: 4, shadowColor: colors.saffron, shadowOpacity: 0.35, shadowRadius: 10 },
  btnText:        { color: "#fff", fontWeight: "700", fontSize: 16 },
  confirmBox:     { backgroundColor: "#fff", borderRadius: 14, padding: 20, elevation: 3, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 10 },
  confirmText:    { fontSize: 15, fontWeight: "600", color: colors.ink, textAlign: "center", marginBottom: 16 },
  confirmRow:     { flexDirection: "row", gap: 10 },
  confirmBtn:     { flex: 1, borderRadius: 12, padding: 14, alignItems: "center" },
  confirmBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  infoCard:       { backgroundColor: "#fff", margin: 16, borderRadius: 14, padding: 16 },
  infoTitle:      { fontSize: 13, fontWeight: "700", color: colors.ink, marginBottom: 12 },
  infoRow:        { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line, gap: 12 },
  infoIconWrap:   { width: 34, height: 34, borderRadius: 10, backgroundColor: colors.saffronSoft, justifyContent: "center", alignItems: "center" },
  infoText:       { fontSize: 14, color: colors.muted },
});
