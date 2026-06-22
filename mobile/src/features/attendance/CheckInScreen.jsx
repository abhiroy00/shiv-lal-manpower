import React, { useState, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { getCurrentPosition } from "../../services/location";
import { colors } from "../../theme/colors";
import { useSelector } from "react-redux";

const API_URL = "http://10.0.2.2:8000/api";

export default function CheckInScreen() {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const cameraRef = useRef(null);
  const token = useSelector((s) => s.auth.accessToken);

  const handleCheckIn = async () => {
    if (!cameraPermission?.granted) {
      await requestCameraPermission();
    }
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
        formData.append("selfie", { uri: selfieUri, name: "selfie.jpg", type: "image/jpeg" });
      }

      const res = await fetch(`${API_URL}/attendance/check-in/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Check-in failed");
      setDone(true);
      Alert.alert("✅ Checked In", `Status: ${data.status}`);
    } catch (e) {
      Alert.alert("Error", e.message);
    } finally {
      setLoading(false);
    }
  };

  if (showCamera) {
    return (
      <View style={{ flex: 1 }}>
        <CameraView ref={cameraRef} style={{ flex: 1 }} facing="front">
          <View style={cam.overlay}>
            <View style={cam.faceCircle} />
            <Text style={cam.hint}>Position face inside the circle</Text>
            <TouchableOpacity style={cam.captureBtn} onPress={captureAndSubmit}>
              <Text style={cam.captureTxt}>📸 Capture & Submit</Text>
            </TouchableOpacity>
          </View>
        </CameraView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.appName}>Shiv Lal Manpower</Text>
      </View>

      <View style={styles.camBox}>
        <View style={styles.faceCircle} />
        {location && (
          <View style={styles.gpsBadge}>
            <Text style={styles.gpsText}>📍 GPS Verified · {location.lat.toFixed(4)}°N</Text>
          </View>
        )}
      </View>

      <View style={styles.body}>
        <Text style={styles.hint}>
          {done
            ? "✅ Attendance marked successfully!"
            : "Tap the button below to capture your selfie and GPS location."}
        </Text>

        {!done && (
          <TouchableOpacity style={styles.btn} onPress={handleCheckIn} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>📸 Capture & Check In</Text>
            )}
          </TouchableOpacity>
        )}

        <View style={styles.infoRow}>
          <Text style={styles.infoKey}>Today's status</Text>
          <Text style={[styles.infoVal, { color: done ? colors.green : colors.muted }]}>
            {done ? "Present ✓" : "Not marked"}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoKey}>Shift</Text>
          <Text style={styles.infoVal}>8 AM – 8 PM</Text>
        </View>
      </View>
    </View>
  );
}

const cam = StyleSheet.create({
  overlay: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,.3)" },
  faceCircle: { width: 180, height: 180, borderRadius: 90, borderWidth: 2, borderColor: "rgba(255,255,255,.8)", borderStyle: "dashed" },
  hint: { color: "#fff", marginTop: 20, fontSize: 14 },
  captureBtn: { marginTop: 32, backgroundColor: colors.saffron, borderRadius: 12, paddingVertical: 16, paddingHorizontal: 32 },
  captureTxt: { color: "#fff", fontWeight: "700", fontSize: 15 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  topBar: { backgroundColor: colors.ink, paddingHorizontal: 18, paddingVertical: 14 },
  appName: { color: "#fff", fontSize: 15, fontWeight: "700" },
  camBox: { margin: 16, borderRadius: 16, backgroundColor: colors.panel, height: 230, justifyContent: "center", alignItems: "center" },
  faceCircle: { width: 120, height: 120, borderRadius: 60, borderWidth: 2, borderColor: "rgba(255,255,255,.5)", borderStyle: "dashed" },
  gpsBadge: { position: "absolute", bottom: 10, left: 10, right: 10, backgroundColor: "rgba(0,0,0,.4)", borderRadius: 9, padding: 8 },
  gpsText: { color: "#dfe6f5", fontSize: 11 },
  body: { padding: 16 },
  hint: { fontSize: 13, color: colors.muted, marginBottom: 16 },
  btn: { backgroundColor: colors.saffron, borderRadius: 12, padding: 16, alignItems: "center", marginBottom: 12 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
  infoKey: { fontSize: 13, color: colors.muted },
  infoVal: { fontSize: 13, fontWeight: "600", color: colors.ink },
});
