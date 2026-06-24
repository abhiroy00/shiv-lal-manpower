import React, { useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Alert,
} from "react-native";
import { useSelector } from "react-redux";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { useMyPayslipsQuery } from "./payslipApi";
import { colors } from "../../theme/colors";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function fmt(val) {
  return "₹" + Number(val).toLocaleString("en-IN", { minimumFractionDigits: 0 });
}

function SlipDetail({ slip, onClose }) {
  const accessToken = useSelector((s) => s.auth.accessToken);
  const [downloading, setDownloading] = useState(false);
  const gross = Number(slip.basic) + Number(slip.hra) + Number(slip.da) + Number(slip.other_allowances);
  const totalDed = Number(slip.pf_employee) + Number(slip.esi_employee) + Number(slip.other_deductions);

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      const filename = `payslip_${slip.month}_${slip.year}.pdf`;
      const fileUri  = FileSystem.documentDirectory + filename;

      const result = await FileSystem.downloadAsync(slip.pdf_url, fileUri, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (result.status !== 200) {
        Alert.alert("Error", "Could not download payslip. Please try again.");
        return;
      }

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(result.uri, {
          mimeType: "application/pdf",
          dialogTitle: "Open Payslip PDF",
          UTI: "com.adobe.pdf",
        });
      } else {
        Alert.alert("Saved", `Payslip saved to:\n${result.uri}`);
      }
    } catch (e) {
      Alert.alert("Error", "Failed to download payslip PDF.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <View style={D.wrap}>
      {/* Header */}
      <View style={D.head}>
        <View>
          <Text style={D.headMonth}>{MONTHS[slip.month - 1]} {slip.year}</Text>
          <Text style={D.headStatus}>{slip.run_status.toUpperCase()}</Text>
        </View>
        <TouchableOpacity style={D.closeBtn} onPress={onClose}>
          <Text style={D.closeTxt}>← Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {/* Net pay big number */}
        <View style={D.netCard}>
          <Text style={D.netLabel}>Net Take-Home</Text>
          <Text style={D.netAmount}>{fmt(slip.net_pay)}</Text>
          <Text style={D.netMeta}>{slip.present_days}/{slip.working_days} days worked</Text>
        </View>

        {/* Earnings */}
        <Text style={D.sectionTitle}>EARNINGS</Text>
        <View style={D.table}>
          {[
            ["Basic",            slip.basic],
            ["House Rent Allowance", slip.hra],
            ["Dearness Allowance",   slip.da],
            ["Other Allowances", slip.other_allowances],
          ].filter(([, v]) => Number(v) > 0).map(([label, val]) => (
            <View key={label} style={D.row}>
              <Text style={D.rowLabel}>{label}</Text>
              <Text style={D.rowVal}>{fmt(val)}</Text>
            </View>
          ))}
          <View style={[D.row, D.totalRow]}>
            <Text style={D.totalLabel}>Gross Earnings</Text>
            <Text style={D.totalVal}>{fmt(gross)}</Text>
          </View>
        </View>

        {/* Deductions */}
        <Text style={D.sectionTitle}>DEDUCTIONS</Text>
        <View style={D.table}>
          {[
            ["PF (Employee 12%)",  slip.pf_employee],
            ["ESI (Employee 0.75%)", slip.esi_employee],
            ["Other Deductions",  slip.other_deductions],
          ].filter(([, v]) => Number(v) > 0).map(([label, val]) => (
            <View key={label} style={D.row}>
              <Text style={D.rowLabel}>{label}</Text>
              <Text style={[D.rowVal, { color: "#C0392B" }]}>- {fmt(val)}</Text>
            </View>
          ))}
          <View style={[D.row, D.totalRow]}>
            <Text style={D.totalLabel}>Total Deductions</Text>
            <Text style={[D.totalVal, { color: "#C0392B" }]}>- {fmt(totalDed)}</Text>
          </View>
        </View>

        {/* Net */}
        <View style={D.netRow}>
          <Text style={D.netRowLabel}>NET PAY</Text>
          <Text style={D.netRowVal}>{fmt(slip.net_pay)}</Text>
        </View>

        {/* Download PDF */}
        <TouchableOpacity style={[D.pdfBtn, downloading && { opacity: 0.6 }]}
          onPress={handleDownloadPDF} disabled={downloading}>
          <Text style={D.pdfTxt}>
            {downloading ? "Downloading…" : "📄  Download Payslip PDF"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

export default function PayslipScreen() {
  const { data: payslips, isLoading } = useMyPayslipsQuery();
  const [selected, setSelected] = useState(null);

  if (selected) {
    return <SlipDetail slip={selected} onClose={() => setSelected(null)} />;
  }

  return (
    <ScrollView style={S.page} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={S.pageHead}>
        <Text style={S.pageTitle}>My Payslips</Text>
        <Text style={S.pageSub}>Tap a month to view details</Text>
      </View>

      {isLoading && (
        <ActivityIndicator color={colors.saffron} style={{ marginTop: 40 }} />
      )}

      {!isLoading && (!payslips || payslips.length === 0) && (
        <View style={S.empty}>
          <Text style={S.emptyIcon}>📄</Text>
          <Text style={S.emptyText}>No payslips generated yet</Text>
          <Text style={S.emptySub}>Payslips will appear here once HR runs payroll</Text>
        </View>
      )}

      {payslips?.map((slip) => (
        <TouchableOpacity key={slip.id} style={S.card} onPress={() => setSelected(slip)}>
          <View style={S.cardLeft}>
            <View style={S.monthBadge}>
              <Text style={S.monthNum}>{slip.month.toString().padStart(2, "0")}</Text>
              <Text style={S.monthYear}>{slip.year}</Text>
            </View>
          </View>
          <View style={S.cardMid}>
            <Text style={S.cardMonth}>{MONTHS[slip.month - 1]} {slip.year}</Text>
            <Text style={S.cardDays}>{slip.present_days}/{slip.working_days} days</Text>
          </View>
          <View style={S.cardRight}>
            <Text style={S.cardNet}>{fmt(slip.net_pay)}</Text>
            <View style={[S.statusBadge, {
              backgroundColor: slip.run_status === "paid" ? "#E1F4EC" :
                slip.run_status === "approved" ? "#E8F4FF" : "#F4F6FA"
            }]}>
              <Text style={[S.statusText, {
                color: slip.run_status === "paid" ? colors.green :
                  slip.run_status === "approved" ? "#1E6CB5" : colors.muted
              }]}>{slip.run_status}</Text>
            </View>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const S = StyleSheet.create({
  page:       { flex: 1, backgroundColor: "#F4F6FA" },
  pageHead:   { backgroundColor: colors.ink, padding: 20, paddingTop: 16 },
  pageTitle:  { fontSize: 20, fontWeight: "800", color: "#fff" },
  pageSub:    { fontSize: 13, color: "rgba(255,255,255,.6)", marginTop: 3 },
  empty:      { alignItems: "center", paddingTop: 60 },
  emptyIcon:  { fontSize: 48, marginBottom: 16 },
  emptyText:  { fontSize: 16, fontWeight: "700", color: colors.ink, marginBottom: 6 },
  emptySub:   { fontSize: 13, color: colors.muted, textAlign: "center", paddingHorizontal: 40 },
  card:       { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", marginHorizontal: 16, marginTop: 12, borderRadius: 14, padding: 16, elevation: 2 },
  cardLeft:   { marginRight: 14 },
  monthBadge: { backgroundColor: colors.ink, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, alignItems: "center" },
  monthNum:   { color: colors.saffron, fontSize: 18, fontWeight: "800" },
  monthYear:  { color: "rgba(255,255,255,.6)", fontSize: 10, fontWeight: "600" },
  cardMid:    { flex: 1 },
  cardMonth:  { fontSize: 15, fontWeight: "700", color: colors.ink },
  cardDays:   { fontSize: 12, color: colors.muted, marginTop: 3 },
  cardRight:  { alignItems: "flex-end" },
  cardNet:    { fontSize: 17, fontWeight: "800", color: colors.ink },
  statusBadge:{ borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, marginTop: 4 },
  statusText: { fontSize: 11, fontWeight: "700" },
});

const D = StyleSheet.create({
  wrap:       { flex: 1, backgroundColor: "#F4F6FA" },
  head:       { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.ink, padding: 20, paddingTop: 16 },
  headMonth:  { fontSize: 20, fontWeight: "800", color: "#fff" },
  headStatus: { fontSize: 11, color: "rgba(255,255,255,.6)", marginTop: 2 },
  closeBtn:   {},
  closeTxt:   { color: colors.saffron, fontSize: 15, fontWeight: "600" },
  netCard:    { backgroundColor: colors.ink, borderRadius: 16, padding: 24, alignItems: "center", marginBottom: 20 },
  netLabel:   { fontSize: 12, color: "rgba(255,255,255,.6)", fontWeight: "600", letterSpacing: 0.5 },
  netAmount:  { fontSize: 36, fontWeight: "800", color: "#fff", marginTop: 8 },
  netMeta:    { fontSize: 13, color: "rgba(255,255,255,.5)", marginTop: 6 },
  sectionTitle:{ fontSize: 11, fontWeight: "700", color: colors.muted, letterSpacing: 0.5, marginBottom: 8 },
  table:      { backgroundColor: "#fff", borderRadius: 14, marginBottom: 16, overflow: "hidden" },
  row:        { flexDirection: "row", justifyContent: "space-between", padding: 13, borderBottomWidth: 1, borderBottomColor: "#F0F2F8" },
  rowLabel:   { fontSize: 14, color: colors.muted },
  rowVal:     { fontSize: 14, fontWeight: "600", color: colors.ink },
  totalRow:   { backgroundColor: "#F8F9FC" },
  totalLabel: { fontSize: 14, fontWeight: "700", color: colors.ink },
  totalVal:   { fontSize: 14, fontWeight: "800", color: colors.ink },
  netRow:     { flexDirection: "row", justifyContent: "space-between", backgroundColor: colors.ink, borderRadius: 14, padding: 18, marginBottom: 16 },
  netRowLabel:{ fontSize: 14, fontWeight: "700", color: "rgba(255,255,255,.7)" },
  netRowVal:  { fontSize: 20, fontWeight: "800", color: colors.saffron },
  pdfBtn:     { backgroundColor: colors.saffron, borderRadius: 14, padding: 16, alignItems: "center" },
  pdfTxt:     { color: "#fff", fontWeight: "700", fontSize: 15 },
});
