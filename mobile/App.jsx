import React from "react";
console.error("=== APP LOADED BUILD v2 ===");
import { Provider, useSelector } from "react-redux";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Text } from "react-native";
import { StatusBar } from "expo-status-bar";
import { store } from "./src/store/store";
import { colors } from "./src/theme/colors";

import LoginScreen      from "./src/features/auth/LoginScreen";
import HomeScreen       from "./src/features/home/HomeScreen";
import AttendanceScreen from "./src/features/attendance/AttendanceScreen";
import HistoryScreen    from "./src/features/attendance/HistoryScreen";
import PayslipScreen    from "./src/features/payslip/PayslipScreen";
import LeaveScreen      from "./src/features/leave/LeaveScreen";
import ProfileScreen    from "./src/features/profile/ProfileScreen";

// Register RTK Query endpoint slices
import "./src/features/attendance/attendanceApi";
import "./src/features/payslip/payslipApi";
import "./src/features/leave/leaveApi";

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

const TABS = [
  { name: "Home",       component: HomeScreen,       icon: "🏠", title: "Home",             headerTitle: "Shiv Lal Manpower" },
  { name: "Attendance", component: AttendanceScreen, icon: "📸", title: "Check In / Out"    },
  { name: "History",    component: HistoryScreen,    icon: "📅", title: "Attendance History" },
  { name: "Payslips",   component: PayslipScreen,    icon: "💰", title: "My Payslips",      headerShown: false },
  { name: "Leave",      component: LeaveScreen,      icon: "🏖️", title: "Leave",            headerShown: false },
  { name: "Profile",    component: ProfileScreen,    icon: "👤", title: "My Profile"        },
];

function AppTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor:   colors.saffron,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle:             { backgroundColor: "#fff", borderTopColor: "#E2E7F0", height: 60, paddingBottom: 5 },
        tabBarLabelStyle:        { fontSize: 10, fontWeight: "600" },
        headerStyle:             { backgroundColor: colors.ink },
        headerTintColor:         "#fff",
        headerTitleStyle:        { fontWeight: "700" },
      }}
    >
      {TABS.map((t) => (
        <Tab.Screen
          key={t.name}
          name={t.name}
          component={t.component}
          options={{
            title:        t.title,
            headerTitle:  t.headerTitle || t.title,
            headerShown:  t.headerShown !== false,
            tabBarIcon:   ({ color }) => (
              <Text style={{ fontSize: 20, color }}>{t.icon}</Text>
            ),
          }}
        />
      ))}
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const token = useSelector((s) => s.auth.accessToken);
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!token ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : (
        <Stack.Screen name="App" component={AppTabs} />
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <NavigationContainer>
        <StatusBar style="light" />
        <RootNavigator />
      </NavigationContainer>
    </Provider>
  );
}
