import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
    Animated,
    Easing,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useAppTheme } from "@/context/ThemeContext";
import { getMonthlyRecords } from "@/utils/attendance";

type AttendanceRecord = {
  id: string;
  date: string;
  checkIn: string;
  checkOut: string | null;
  duration: string | null;
};

type MonthlyStats = {
  workingDays: number;
  present: number;
  absent: number;
  leave: number;
  halfDays: number;
  totalHours: number;
  salary: number;
};

const SALARY_KEY = "monthly_salary";

export default function PerformanceScreen() {
  const NAV_OVERLAY_SPACE = 112;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useAppTheme();
  const { user, isAuthLoading } = useAuth();
  const pageEnter = useRef(new Animated.Value(0)).current;

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [monthlySalary, setMonthlySalary] = useState(30000);
  const [isSalaryModalVisible, setIsSalaryModalVisible] = useState(false);
  const [salaryInput, setSalaryInput] = useState("30000");

  useEffect(() => {
    Animated.timing(pageEnter, {
      toValue: 1,
      duration: 360,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [pageEnter]);

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.replace("/");
    }
  }, [isAuthLoading, user, router]);

  useEffect(() => {
    loadSalary();
    if (user?.email) {
      loadRecords();
    }
  }, [user?.email]);

  const loadRecords = async () => {
    if (!user?.email) return;
    try {
      const { year, month } = getCurrentMonth();
      const data = await getMonthlyRecords(user.email, year, month);
      setRecords(data);
    } catch (error) {
      console.log("Error loading records:", error);
    }
  };

  const loadSalary = async () => {
    try {
      const stored = await AsyncStorage.getItem(SALARY_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setMonthlySalary(parsed);
        setSalaryInput(parsed.toString());
      }
    } catch (error) {
      console.log("Error loading salary:", error);
    }
  };

  const saveSalary = async (salary: number) => {
    try {
      await AsyncStorage.setItem(SALARY_KEY, JSON.stringify(salary));
      setMonthlySalary(salary);
    } catch (error) {
      console.log("Error saving salary:", error);
    }
  };

  const getCurrentMonth = () => {
    const now = new Date();
    return {
      year: now.getFullYear(),
      month: now.getMonth(),
    };
  };

  const getMonthName = (month: number) => {
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    return months[month];
  };

  const getWorkingDaysInMonth = (year: number, month: number) => {
    const date = new Date(year, month, 1);
    const lastDate = new Date(year, month + 1, 0);
    let workingDays = 0;
    while (date <= lastDate) {
      const dayOfWeek = date.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        workingDays++;
      }
      date.setDate(date.getDate() + 1);
    }
    return workingDays;
  };

  const calculateStats = (): MonthlyStats => {
    const { year, month } = getCurrentMonth();
    const workingDays = getWorkingDaysInMonth(year, month);

    const present = records.length;
    const absent = Math.max(0, workingDays - present);
    const halfDays = records.filter((r) => {
      if (!r.duration) return false;
      const match = r.duration.match(/(\d+)h\s*(\d+)m/);
      if (!match) return false;
      const hours = parseInt(match[1]);
      const mins = parseInt(match[2]);
      const totalMins = hours * 60 + mins;
      return totalMins < 240;
    }).length;

    const totalHours = records.reduce((acc, record) => {
      if (!record.duration) return acc;
      const match = record.duration.match(/(\d+)h\s*(\d+)m/);
      if (!match) return acc;
      const hours = parseInt(match[1]);
      const mins = parseInt(match[2]);
      return acc + hours + mins / 60;
    }, 0);

    const salary = monthlySalary;
    const leave = 0;

    return {
      workingDays,
      present,
      absent,
      leave,
      halfDays,
      totalHours,
      salary,
    };
  };

  const calculateEarnedSalary = () => {
    const stats = calculateStats();
    if (stats.workingDays === 0) return 0;
    const perDaySalary = stats.salary / stats.workingDays;
    const fullDaysEarned = stats.present - (stats.halfDays * 0.5);
    return Math.round(fullDaysEarned * perDaySalary);
  };

  const handleSaveSalary = () => {
    const salaryValue = parseInt(salaryInput) || 0;
    if (salaryValue > 0) {
      saveSalary(salaryValue);
    }
    setIsSalaryModalVisible(false);
  };

  if (isAuthLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Loading...</Text>
      </View>
    );
  }

  const displayName = user?.name?.trim() || "Guest User";
  const { year, month } = getCurrentMonth();
  const stats = calculateStats();
  const earnedSalary = calculateEarnedSalary();
  const perDaySalary = stats.workingDays > 0 ? Math.round(stats.salary / stats.workingDays) : 0;

  return (
    <LinearGradient
      colors={theme.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.container,
        {
          paddingTop: insets.top + 14,
        },
      ]}
    >
      <View
        style={[styles.accentBlob, { backgroundColor: theme.accentBlob }]}
      />
      <View
        style={[
          styles.accentBlobSecondary,
          { backgroundColor: theme.accentBlobSecondary },
        ]}
      />
      <View style={[styles.ring1, { borderColor: theme.ringBg }]} />
      <View style={[styles.ring2, { borderColor: theme.ringBg }]} />
      <View
        style={[styles.blobTertiary, { backgroundColor: theme.blobTertiary }]}
      />

      <Animated.View
        style={[
          styles.content,
          {
            opacity: pageEnter,
            transform: [
              {
                translateX: pageEnter.interpolate({
                  inputRange: [0, 1],
                  outputRange: [24, 0],
                }),
              },
            ],
          },
        ]}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.headerRow}>
            <View
              style={[
                styles.badge,
                {
                  backgroundColor: theme.badgeBg,
                  borderColor: theme.badgeBorder,
                },
              ]}
            >
              <Text style={[styles.badgeText, { color: theme.badgeText }]}>
                PERFORMANCE
              </Text>
            </View>
          </View>

          <View style={[styles.welcomeCard, { backgroundColor: theme.cardBg }]}>
            <Text style={[styles.welcomeTitle, { color: theme.cardTitle }]}>
              {displayName}
            </Text>
            <Text style={[styles.welcomeSubtitle, { color: theme.cardText }]}>
              {getMonthName(month)} {year}
            </Text>
          </View>

          <View style={[styles.salaryCard, { backgroundColor: theme.cardBg }]}>
            <View style={styles.salaryHeader}>
              <View>
                <Text style={[styles.salaryLabel, { color: theme.cardText }]}>
                  Monthly Salary
                </Text>
                <Text style={[styles.salaryValue, { color: theme.cardTitle }]}>
                  ₹{monthlySalary.toLocaleString()}
                </Text>
              </View>
              <Pressable
                style={({ pressed }) => [
                  styles.editSalaryButton,
                  { backgroundColor: theme.activeBubbleBg },
                  pressed && styles.buttonPressed,
                ]}
                onPress={() => setIsSalaryModalVisible(true)}
              >
                <Text style={styles.editSalaryButtonText}>Edit</Text>
              </Pressable>
            </View>
            <View style={[styles.salaryDivider, { backgroundColor: theme.cardBorder }]} />
            <View style={styles.earnedRow}>
              <Text style={[styles.earnedLabel, { color: theme.cardText }]}>
                Earned this month
              </Text>
              <Text style={[styles.earnedValue, { color: "#4CAF50" }]}>
                ₹{earnedSalary.toLocaleString()}
              </Text>
            </View>
            <Text style={[styles.perDayText, { color: theme.cardText }]}>
              ₹{perDaySalary.toLocaleString()} per working day
            </Text>
          </View>

          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: theme.cardBg }]}>
              <Text style={[styles.statValue, { color: "#4CAF50" }]}>
                {stats.present}
              </Text>
              <Text style={[styles.statLabel, { color: theme.cardText }]}>
                Days Present
              </Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: theme.cardBg }]}>
              <Text style={[styles.statValue, { color: "#E74C3C" }]}>
                {stats.absent}
              </Text>
              <Text style={[styles.statLabel, { color: theme.cardText }]}>
                Days Absent
              </Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: theme.cardBg }]}>
              <Text style={[styles.statValue, { color: "#FF9800" }]}>
                {stats.halfDays}
              </Text>
              <Text style={[styles.statLabel, { color: theme.cardText }]}>
                Half Days
              </Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: theme.cardBg }]}>
              <Text style={[styles.statValue, { color: "#2196F3" }]}>
                {stats.leave}
              </Text>
              <Text style={[styles.statLabel, { color: theme.cardText }]}>
                Leave Taken
              </Text>
            </View>
          </View>

          <View style={[styles.summaryCard, { backgroundColor: theme.cardBg }]}>
            <Text style={[styles.summaryTitle, { color: theme.cardTitle }]}>
              Monthly Summary
            </Text>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.cardText }]}>
                Working Days
              </Text>
              <Text style={[styles.summaryValue, { color: theme.cardTitle }]}>
                {stats.workingDays}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.cardText }]}>
                Total Hours Worked
              </Text>
              <Text style={[styles.summaryValue, { color: theme.cardTitle }]}>
                {stats.totalHours.toFixed(1)}h
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: theme.cardText }]}>
                Attendance Rate
              </Text>
              <Text style={[styles.summaryValue, { color: theme.cardTitle }]}>
                {stats.workingDays > 0
                  ? Math.round((stats.present / stats.workingDays) * 100)
                  : 0}%
              </Text>
            </View>
          </View>
        </ScrollView>
      </Animated.View>

      <Modal
        visible={isSalaryModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsSalaryModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: theme.cardBg,
                borderColor: theme.cardBorder,
              },
            ]}
          >
            <Text style={[styles.modalTitle, { color: theme.cardTitle }]}>
              Set Monthly Salary
            </Text>
            <Text style={[styles.modalSubtitle, { color: theme.cardText }]}>
              Enter your monthly salary for accurate calculations
            </Text>
            <TextInput
              style={[
                styles.salaryInput,
                {
                  color: theme.cardTitle,
                  borderColor: theme.cardBorder,
                  backgroundColor: theme.badgeBg,
                },
              ]}
              value={salaryInput}
              onChangeText={setSalaryInput}
              keyboardType="numeric"
              placeholder="Enter salary"
              placeholderTextColor={theme.cardText}
            />
            <View style={styles.modalActions}>
              <Pressable
                style={({ pressed }) => [
                  styles.modalCancelButton,
                  { borderColor: theme.cardBorder },
                  pressed && styles.buttonPressed,
                ]}
                onPress={() => setIsSalaryModalVisible(false)}
              >
                <Text style={[styles.modalCancelText, { color: theme.cardTitle }]}>
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.modalSaveButton,
                  { backgroundColor: theme.activeBubbleBg },
                  pressed && styles.buttonPressed,
                ]}
                onPress={handleSaveSalary}
              >
                <Text style={styles.modalSaveText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    justifyContent: "flex-start",
    alignItems: "stretch",
    position: "relative",
  },
  accentBlob: {
    position: "absolute",
    top: 82,
    left: -36,
    width: 190,
    height: 190,
    borderRadius: 95,
    opacity: 0.8,
  },
  accentBlobSecondary: {
    position: "absolute",
    bottom: 210,
    right: -28,
    width: 160,
    height: 160,
    borderRadius: 80,
    opacity: 0.72,
  },
  content: {
    width: "100%",
    maxWidth: 980,
    alignSelf: "center",
    paddingTop: 8,
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    marginBottom: 10,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  welcomeCard: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
  },
  welcomeSubtitle: {
    fontSize: 14,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8,
  },
  salaryCard: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
  },
  salaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  salaryLabel: {
    fontSize: 13,
    marginBottom: 4,
  },
  salaryValue: {
    fontSize: 28,
    fontWeight: "800",
  },
  editSalaryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  editSalaryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  salaryDivider: {
    height: 1,
    marginVertical: 14,
  },
  earnedRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  earnedLabel: {
    fontSize: 14,
  },
  earnedValue: {
    fontSize: 22,
    fontWeight: "800",
  },
  perDayText: {
    fontSize: 12,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    width: "47%",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
  },
  statValue: {
    fontSize: 32,
    fontWeight: "800",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  summaryCard: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 100,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 14,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  summaryLabel: {
    fontSize: 14,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "700",
  },
  ring1: {
    position: "absolute",
    top: 50,
    right: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 1.5,
  },
  ring2: {
    position: "absolute",
    top: "44%",
    left: -55,
    width: 136,
    height: 136,
    borderRadius: 68,
    borderWidth: 1,
  },
  blobTertiary: {
    position: "absolute",
    top: "26%",
    right: 22,
    width: 66,
    height: 66,
    borderRadius: 33,
    opacity: 0.6,
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.38)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 13,
    marginBottom: 16,
    lineHeight: 18,
  },
  salaryInput: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 18,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: "600",
  },
  modalSaveButton: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalSaveText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
