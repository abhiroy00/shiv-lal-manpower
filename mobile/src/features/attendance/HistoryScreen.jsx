import React, { useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMyAttendanceQuery } from "./attendanceApi";
import { colors } from "../../theme/colors";

const MONTHS = ["January","February","March","April","May","June",
                "July","August","September","October","November","December"];
const DAYS   = ["Su","Mo","Tu","We","Th","Fr","Sa"];

const CODE_COLOR = {
  P:  { bg: "#E1F4EC", text: "#15966A" },
  L:  { bg: "#FBF1DC", text: "#C98A12" },
  R:  { bg: "#EDE7F6", text: "#7B1FA2" },
  A:  { bg: "#FBE6E5", text: "#C0392B" },
  S:  { bg: "#F0F2F8", text: "#9AA6BF" },
  LE: { bg: "#E8F4FF", text: "#1E6CB5" },
  "": { bg: "#F0F2F8", text: "#ddd" },
};

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const today  = new Date();
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);

  const { data, isLoading } = useMyAttendanceQuery({ year, month });

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  // Build calendar grid (starting from Sunday)
  const buildGrid = () => {
    if (!data) return [];
    const firstDay = new Date(year, month - 1, 1).getDay(); // 0=Sun
    const grid = Array(firstDay).fill(null); // empty slots
    data.days.forEach(d => grid.push(d));
    return grid;
  };
  const grid = buildGrid();

  return (
    <ScrollView style={S.page} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Month navigator */}
      <View style={[S.nav, { paddingTop: (insets.top || 0) + 10 }]}>
        <TouchableOpacity style={S.navBtn} onPress={prevMonth} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={S.navTitle}>{MONTHS[month - 1]} {year}</Text>
        <TouchableOpacity style={S.navBtn} onPress={nextMonth} activeOpacity={0.7}>
          <Ionicons name="chevron-forward" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.saffron} style={{ marginTop: 40 }} />
      ) : (
        <>
          {/* Summary strip */}
          {data?.summary && (
            <View style={S.strip}>
              {[
                ["P", "Present",  data.summary.present,      "#15966A"],
                ["L", "Late",     data.summary.late,         "#C98A12"],
                ["A", "Absent",   data.summary.absent,       "#C0392B"],
                ["LE","Leave",    data.summary.leave,        "#1E6CB5"],
              ].map(([code, label, val, color]) => (
                <View key={code} style={S.stripItem}>
                  <Text style={[S.stripVal, { color }]}>{val}</Text>
                  <Text style={S.stripLabel}>{label}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Day-of-week header */}
          <View style={S.calWrap}>
            <View style={S.weekRow}>
              {DAYS.map(d => (
                <View key={d} style={S.dayHead}>
                  <Text style={S.dayHeadTxt}>{d}</Text>
                </View>
              ))}
            </View>

            {/* Calendar grid */}
            {chunkArray(grid, 7).map((week, wi) => (
              <View key={wi} style={S.weekRow}>
                {week.map((cell, ci) => {
                  if (!cell) return <View key={ci} style={S.dayCell} />;
                  const c = CODE_COLOR[cell.code] || CODE_COLOR[""];
                  const isToday = cell.day === today.getDate() &&
                    month === today.getMonth() + 1 && year === today.getFullYear();
                  return (
                    <View key={ci} style={[S.dayCell, isToday && S.todayCell]}>
                      <Text style={[S.dayNum, isToday && { color: colors.saffron }]}>{cell.day}</Text>
                      {cell.code ? (
                        <View style={[S.codeBadge, { backgroundColor: c.bg }]}>
                          <Text style={[S.codeText, { color: c.text }]}>{cell.code}</Text>
                        </View>
                      ) : <View style={S.codeBadge} />}
                    </View>
                  );
                })}
                {/* Fill remaining cells */}
                {week.length < 7 && Array(7 - week.length).fill(null).map((_, i) => (
                  <View key={"empty" + i} style={S.dayCell} />
                ))}
              </View>
            ))}
          </View>

          {/* Legend */}
          <View style={S.legend}>
            {[
              ["P", "Present", "#15966A"],
              ["L", "Late",    "#C98A12"],
              ["A", "Absent",  "#C0392B"],
              ["LE","Leave",   "#1E6CB5"],
              ["S", "Sunday",  "#9AA6BF"],
            ].map(([code, label, color]) => (
              <View key={code} style={S.legendItem}>
                <View style={[S.legendDot, { backgroundColor: CODE_COLOR[code]?.bg || "#eee" }]}>
                  <Text style={[S.legendCode, { color }]}>{code}</Text>
                </View>
                <Text style={S.legendLabel}>{label}</Text>
              </View>
            ))}
          </View>

          {/* Detail list — check-in/out times */}
          {data?.days?.filter(d => d.check_in_time).map(d => (
            <View key={d.day} style={S.detailRow}>
              <Text style={S.detailDay}>{d.day} {MONTHS[month-1].slice(0,3)}</Text>
              <View style={S.detailTimes}>
                <Text style={S.detailTime}>In: {d.check_in_time?.slice(0,5)}</Text>
                {d.check_out_time && (
                  <Text style={S.detailTime}>Out: {d.check_out_time?.slice(0,5)}</Text>
                )}
              </View>
              <View style={[S.codeBadge, { backgroundColor: CODE_COLOR[d.code]?.bg }]}>
                <Text style={[S.codeText, { color: CODE_COLOR[d.code]?.text }]}>{d.code}</Text>
              </View>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

function chunkArray(arr, size) {
  const result = [];
  for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size));
  return result;
}

const S = StyleSheet.create({
  page:        { flex: 1, backgroundColor: "#F4F6FA" },
  nav:         { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, backgroundColor: colors.ink },
  navBtn:      { padding: 8, backgroundColor: "rgba(255,255,255,.1)", borderRadius: 10 },
  navTitle:    { color: "#fff", fontSize: 17, fontWeight: "700" },
  strip:       { flexDirection: "row", backgroundColor: "#fff", marginHorizontal: 16, marginTop: 16, borderRadius: 14, overflow: "hidden" },
  stripItem:   { flex: 1, alignItems: "center", paddingVertical: 14 },
  stripVal:    { fontSize: 22, fontWeight: "800" },
  stripLabel:  { fontSize: 10, color: colors.muted, marginTop: 3, fontWeight: "600" },
  calWrap:     { backgroundColor: "#fff", marginHorizontal: 16, marginTop: 14, borderRadius: 14, padding: 10 },
  weekRow:     { flexDirection: "row" },
  dayHead:     { flex: 1, alignItems: "center", paddingVertical: 8 },
  dayHeadTxt:  { fontSize: 11, fontWeight: "700", color: colors.muted },
  dayCell:     { flex: 1, alignItems: "center", paddingVertical: 5 },
  todayCell:   { borderRadius: 10, borderWidth: 1.5, borderColor: colors.saffron },
  dayNum:      { fontSize: 12, fontWeight: "600", color: colors.ink, marginBottom: 3 },
  codeBadge:   { borderRadius: 10, paddingHorizontal: 5, paddingVertical: 2, minWidth: 24, alignItems: "center" },
  codeText:    { fontSize: 10, fontWeight: "700" },
  legend:      { flexDirection: "row", flexWrap: "wrap", marginHorizontal: 16, marginTop: 14, backgroundColor: "#fff", borderRadius: 14, padding: 12, gap: 10 },
  legendItem:  { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot:   { borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  legendCode:  { fontSize: 10, fontWeight: "800" },
  legendLabel: { fontSize: 12, color: colors.muted },
  detailRow:   { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", marginHorizontal: 16, marginTop: 6, borderRadius: 12, padding: 14 },
  detailDay:   { fontSize: 14, fontWeight: "700", color: colors.ink, width: 60 },
  detailTimes: { flex: 1 },
  detailTime:  { fontSize: 12, color: colors.muted },
});
