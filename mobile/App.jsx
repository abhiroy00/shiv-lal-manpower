import React, { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Provider, useDispatch, useSelector } from "react-redux";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { store } from "./src/store/store";
import { setCredentials } from "./src/features/auth/authSlice";
import { getTokens } from "./src/services/storage";

import LoginScreen     from "./src/features/auth/LoginScreen";
import HomeScreen      from "./src/features/home/HomeScreen";
import AttendanceScreen from "./src/features/attendance/AttendanceScreen";
import HistoryScreen   from "./src/features/attendance/HistoryScreen";
import LeaveScreen     from "./src/features/leave/LeaveScreen";
import PayslipScreen        from "./src/features/payslip/PayslipScreen";
import ProfileScreen        from "./src/features/profile/ProfileScreen";
import NotificationsScreen  from "./src/features/notifications/NotificationsScreen";

const Tab   = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TABS = [
  { name: "Home",       label: "Home",     icon: "home",         iconOut: "home-outline"         },
  { name: "Attendance", label: "Check In", icon: "camera",       iconOut: "camera-outline"       },
  { name: "History",    label: "History",  icon: "calendar",     iconOut: "calendar-outline"     },
  { name: "Leave",      label: "Leave",    icon: "umbrella",     iconOut: "umbrella-outline"     },
  { name: "Profile",    label: "Profile",  icon: "person-circle",iconOut: "person-circle-outline"},
];

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => {
        const tab = TABS.find((t) => t.name === route.name);
        return {
          headerShown: false,
          tabBarStyle: {
            backgroundColor: "#0F1E3D",
            borderTopWidth: 0,
            height: 62,
            paddingTop: 8,
            paddingBottom: 8,
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
        :                           ProfileScreen
        } />
      ))}
    </Tab.Navigator>
  );
}

function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main"     component={MainTabs} />
      <Stack.Screen name="Payslips" component={PayslipScreen} />
    </Stack.Navigator>
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
        <>
          <Stack.Screen name="Main"          component={MainTabs} />
          <Stack.Screen name="Payslips"      component={PayslipScreen} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} />
        </>
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </SafeAreaProvider>
    </Provider>
  );
}
