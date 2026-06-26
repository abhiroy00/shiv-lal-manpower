import React, { useEffect, useState, Component } from "react";
import { ActivityIndicator, Text, View, ScrollView, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Provider, useDispatch, useSelector } from "react-redux";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { store } from "./src/store/store";
import { setCredentials } from "./src/features/auth/authSlice";
import { getTokens } from "./src/services/storage";

import LoginScreen      from "./src/features/auth/LoginScreen";
import HomeScreen       from "./src/features/home/HomeScreen";
import AttendanceScreen from "./src/features/attendance/AttendanceScreen";
import HistoryScreen    from "./src/features/attendance/HistoryScreen";
import LeaveScreen      from "./src/features/leave/LeaveScreen";
import PayslipScreen    from "./src/features/payslip/PayslipScreen";
import ProfileScreen    from "./src/features/profile/ProfileScreen";

// ── Error Boundary: shows the real crash message instead of generic screen ───
class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <View style={EB.wrap}>
          <Text style={EB.title}>App Error (share this with developer)</Text>
          <ScrollView style={EB.scroll}>
            <Text style={EB.msg}>{String(this.state.error)}</Text>
            {this.state.error?.stack ? (
              <Text style={EB.stack}>{this.state.error.stack}</Text>
            ) : null}
          </ScrollView>
        </View>
      );
    }
    return this.props.children;
  }
}

const EB = StyleSheet.create({
  wrap:   { flex: 1, backgroundColor: "#0F1E3D", padding: 24, paddingTop: 60 },
  title:  { color: "#E8821E", fontWeight: "800", fontSize: 16, marginBottom: 16 },
  scroll: { flex: 1 },
  msg:    { color: "#fff", fontSize: 14, marginBottom: 12 },
  stack:  { color: "rgba(255,255,255,.5)", fontSize: 11, lineHeight: 18 },
});
// ─────────────────────────────────────────────────────────────────────────────

const Tab   = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TABS = [
  { name: "Home",       label: "Home",     icon: "home",          iconOut: "home-outline"          },
  { name: "Attendance", label: "Check In", icon: "camera",        iconOut: "camera-outline"        },
  { name: "History",    label: "History",  icon: "calendar",      iconOut: "calendar-outline"      },
  { name: "Leave",      label: "Leave",    icon: "briefcase",     iconOut: "briefcase-outline"     },
  { name: "Payslip",    label: "Payslip",  icon: "document-text", iconOut: "document-text-outline" },
  { name: "Profile",    label: "Profile",  icon: "person-circle", iconOut: "person-circle-outline" },
];

function MainTabs() {
  const insets = useSafeAreaInsets();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => {
        const tab = TABS.find((t) => t.name === route.name);
        return {
          headerShown: false,
          tabBarStyle: {
            backgroundColor: "#0F1E3D",
            borderTopWidth: 0,
            height: 62 + insets.bottom,
            paddingTop: 8,
            paddingBottom: 8 + insets.bottom,
            elevation: 20,
            shadowColor: "#000",
            shadowOpacity: 0.3,
            shadowRadius: 12,
          },
          tabBarActiveTintColor:   "#E8821E",
          tabBarInactiveTintColor: "#5A6A8A",
          tabBarLabelStyle: { fontSize: 10, fontWeight: "700", marginTop: 2 },
          tabBarLabel: tab?.label,
          tabBarIcon: ({ focused, color }) => (
            <Ionicons
              name={focused ? tab?.icon : tab?.iconOut}
              size={24}
              color={color}
            />
          ),
        };
      }}
    >
      {TABS.map((t) => (
        <Tab.Screen key={t.name} name={t.name} component={
          t.name === "Home"       ? HomeScreen
        : t.name === "Attendance" ? AttendanceScreen
        : t.name === "History"    ? HistoryScreen
        : t.name === "Leave"      ? LeaveScreen
        : t.name === "Payslip"    ? PayslipScreen
        :                           ProfileScreen
        } />
      ))}
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const token    = useSelector((s) => s.auth.accessToken);
  const dispatch = useDispatch();
  const [ready,  setReady] = useState(false);

  useEffect(() => {
    getTokens()
      .then(({ access, refresh }) => {
        if (access) dispatch(setCredentials({ accessToken: access, refreshToken: refresh }));
      })
      .finally(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0F1E3D", justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#E8821E" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: "fade" }}>
      {token ? (
        <Stack.Screen name="Main" component={MainTabs} />
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <Provider store={store}>
        <SafeAreaProvider>
          <StatusBar style="light" />
          <NavigationContainer>
            <RootNavigator />
          </NavigationContainer>
        </SafeAreaProvider>
      </Provider>
    </ErrorBoundary>
  );
}
