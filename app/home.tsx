import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
    Animated,
    Easing,
    FlatList,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useAppTheme } from "@/context/ThemeContext";
import { checkIn, checkOut, getTodayRecord, getMonthlyRecords } from "@/utils/attendance";

type AttendanceRecord = {
  id: string;
  date: string;
  checkIn: string;
  checkOut: string | null;
  duration: string | null;
};

function CircularTimer({ checkInTime, theme }: { checkInTime: string; theme: any }) {
  const secondsAnim = useRef(new Animated.Value(0)).current;
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    secondsAnim.setValue(0);
    const animation = Animated.loop(
      Animated.timing(secondsAnim, {
        toValue: 60,
        duration: 60000,
        easing: Easing.linear,
        useNativeDriver: false,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [secondsAnim]);

  const getElapsed = () => {
    const trimmed = checkInTime.trim();
    const match = trimmed.match(/(\d{1,2}):(\d{2})(?:\s*(AM|PM))?/i);
    if (!match) return "00:00";
    const hours = parseInt(match[1]);
    const mins = parseInt(match[2]);
    const period = (match[3] || "").toUpperCase();

    let hours24 = hours;
    if (period === "PM" && hours !== 12) hours24 += 12;
    if (period === "AM" && hours === 12) hours24 = 0;

    const now = new Date();
    const checkInDate = new Date();
    checkInDate.setHours(hours24, mins, 0, 0);

    const diff = now.getTime() - checkInDate.getTime();
    const elapsed = Math.max(0, Math.floor(diff / 1000));
    const hrs = Math.floor(elapsed / 3600);
    const mns = Math.floor((elapsed % 3600) / 60);
    return `${String(hrs).padStart(2, "0")}:${String(mns).padStart(2, "0")}`;
  };

  const rotateInterpolation = secondsAnim.interpolate({
    inputRange: [0, 60],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View style={timerStyles.container}>
      <View style={timerStyles.circleContainer}>
        <View style={[timerStyles.progressRing, { borderColor: theme.activeBubbleBg + "30" }]} />
        <Animated.View
          style={[
            timerStyles.dotContainer,
            { transform: [{ rotate: rotateInterpolation }] },
          ]}
        >
          <View
            style={[
              timerStyles.glowDot,
              {
                backgroundColor: theme.activeBubbleBg,
                shadowColor: theme.activeBubbleBg,
              },
            ]}
          />
        </Animated.View>
        <View style={[timerStyles.innerCircle, { backgroundColor: theme.cardBg, borderColor: theme.cardBorder }]}>
          <Text style={[timerStyles.elapsedTime, { color: theme.cardTitle }]}>{getElapsed()}</Text>
        </View>
      </View>
    </View>
  );
}

const timerStyles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 12,
  },
  circleContainer: {
    width: 140,
    height: 140,
    alignItems: "center",
    justifyContent: "center",
  },
  progressRing: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 3,
  },
  dotContainer: {
    position: "absolute",
    width: 140,
    height: 140,
    alignItems: "center",
  },
  glowDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: -6,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 6,
  },
  innerCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  elapsedTime: {
    fontSize: 16,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
});

export default function HomeScreen() {
  const NAV_OVERLAY_SPACE = 112;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useAppTheme();
  const { user, isAuthLoading } = useAuth();
  const pageEnter = useRef(new Animated.Value(0)).current;

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [isCheckInModalVisible, setIsCheckInModalVisible] = useState(false);
  const [isCheckOutModalVisible, setIsCheckOutModalVisible] = useState(false);
  const [isErrorModalVisible, setIsErrorModalVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [checkInTime, setCheckInTime] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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
    if (user?.email) {
      loadData();
    }
  }, [user?.email]);

  const loadData = async () => {
    if (!user?.email) return;
    try {
      const [today, monthly] = await Promise.all([
        getTodayRecord(user.email),
        getMonthlyRecords(user.email, new Date().getFullYear(), new Date().getMonth()),
      ]);
      setTodayRecord(today);
      setRecords(monthly);
    } catch (error) {
      console.log("Error loading data:", error);
    }
  };

  const handleCheckIn = async () => {
    if (!user?.email) {
      setErrorMessage("Please sign in again to check in");
      setIsErrorModalVisible(true);
      return;
    }

    setIsLoading(true);
    try {
      const result = await checkIn(user.email);
      if (result.success && result.record) {
        setCheckInTime(result.record.checkIn);
        setTodayRecord(result.record);
        setRecords((prev) => [result.record!, ...prev]);
        setIsCheckInModalVisible(true);
      } else {
        setErrorMessage(result.error || "Failed to check in");
        setIsErrorModalVisible(true);
      }
    } catch (error) {
      setErrorMessage("Failed to check in. Please try again.");
      setIsErrorModalVisible(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!user?.email) {
      setErrorMessage("Please sign in again to check out");
      setIsErrorModalVisible(true);
      return;
    }

    setIsLoading(true);
    try {
      const result = await checkOut(user.email);
      if (result.success && result.record) {
        setTodayRecord(result.record);
        setRecords((prev) =>
          prev.map((r) => (r.id === result.record!.id ? result.record! : r))
        );
        setIsCheckOutModalVisible(true);
      } else {
        setErrorMessage(result.error || "Failed to check out");
        setIsErrorModalVisible(true);
      }
    } catch (error) {
      setErrorMessage("Failed to check out. Please try again.");
      setIsErrorModalVisible(true);
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentTimeString = () => {
    const now = new Date();
    return now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDateDisplay = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusBadge = (record: AttendanceRecord) => {
    if (record.checkOut) {
      return { text: "Complete", color: "#4CAF50" };
    }
    return { text: "Active", color: "#FF9800" };
  };

  if (isAuthLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Loading...</Text>
      </View>
    );
  }

  const displayName = user?.name?.trim() || "Guest User";
  const isCheckedIn = todayRecord && !todayRecord.checkOut;

  const renderRecord = ({ item }: { item: AttendanceRecord }) => {
    const status = getStatusBadge(item);
    return (
      <View style={[styles.recordCard, { backgroundColor: theme.cardBg }]}>
        <View style={styles.recordHeader}>
          <Text style={[styles.recordDate, { color: theme.cardTitle }]}>
            {formatDateDisplay(item.date)}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: status.color + "20" }]}>
            <Text style={[styles.statusText, { color: status.color }]}>
              {status.text}
            </Text>
          </View>
        </View>
        <View style={styles.recordTimes}>
          <View style={styles.timeBlock}>
            <Text style={[styles.timeLabel, { color: theme.cardText }]}>Check In</Text>
            <Text style={[styles.timeValue, { color: theme.cardTitle }]}>{item.checkIn}</Text>
          </View>
          <View style={styles.timeDivider} />
          <View style={styles.timeBlock}>
            <Text style={[styles.timeLabel, { color: theme.cardText }]}>Check Out</Text>
            <Text style={[styles.timeValue, { color: theme.cardTitle }]}>
              {item.checkOut || "-"}
            </Text>
          </View>
          <View style={styles.timeDivider} />
          <View style={styles.timeBlock}>
            <Text style={[styles.timeLabel, { color: theme.cardText }]}>Duration</Text>
            <Text style={[styles.timeValue, { color: theme.cardTitle }]}>
              {item.duration || "-"}
            </Text>
          </View>
        </View>
      </View>
    );
  };

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
              HOME
            </Text>
          </View>
        </View>

        <View style={[styles.welcomeCard, { backgroundColor: theme.cardBg }]}>
          <Text style={[styles.welcomeTitle, { color: theme.cardTitle }]}>
            Welcome back, {displayName}!
          </Text>
          <Text style={[styles.welcomeText, { color: theme.cardText }]}>
            {getCurrentTimeString()} • {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </Text>
        </View>

        {isCheckedIn && todayRecord && (
          <CircularTimer checkInTime={todayRecord.checkIn} theme={theme} />
        )}

        <View style={styles.attendanceSection}>
          <View style={styles.attendanceActions}>
            {!isCheckedIn ? (
              <Pressable
                style={({ pressed }) => [
                  styles.actionButton,
                  { backgroundColor: "#4CAF50" },
                  pressed && styles.actionButtonPressed,
                  isLoading && styles.actionButtonDisabled,
                ]}
                onPress={handleCheckIn}
                disabled={isLoading}
              >
                <Text style={styles.actionButtonText}>
                  {isLoading ? "Processing..." : "Check In"}
                </Text>
              </Pressable>
            ) : (
              <Pressable
                style={({ pressed }) => [
                  styles.actionButton,
                  { backgroundColor: "#E74C3C" },
                  pressed && styles.actionButtonPressed,
                  isLoading && styles.actionButtonDisabled,
                ]}
                onPress={handleCheckOut}
                disabled={isLoading}
              >
                <Text style={styles.actionButtonText}>
                  {isLoading ? "Processing..." : "Check Out"}
                </Text>
              </Pressable>
            )}
          </View>
        </View>

        <View style={styles.historySection}>
          <Text style={[styles.sectionTitle, { color: theme.cardTitle }]}>
            Attendance History
          </Text>
          {records.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: theme.cardBg }]}>
              <Text style={[styles.emptyText, { color: theme.cardText }]}>
                No attendance records yet
              </Text>
            </View>
          ) : (
            <FlatList
              data={records.slice(0, 10)}
              keyExtractor={(item) => item.id}
              renderItem={renderRecord}
              scrollEnabled={false}
              style={styles.recordList}
            />
          )}
        </View>
      </Animated.View>

      <Modal
        visible={isCheckInModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsCheckInModalVisible(false)}
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
            <View style={[styles.modalIcon, { backgroundColor: "#4CAF5020" }]}>
              <Text style={styles.modalIconText}>✓</Text>
            </View>
            <Text style={[styles.modalTitle, { color: theme.cardTitle }]}>
              Checked In!
            </Text>
            <Text style={[styles.modalMessage, { color: theme.cardText }]}>
              Your attendance has been recorded at {checkInTime}
            </Text>
            <Pressable
              style={({ pressed }) => [
                styles.modalButton,
                { backgroundColor: theme.activeBubbleBg },
                pressed && styles.modalButtonPressed,
              ]}
              onPress={() => setIsCheckInModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>OK</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={isCheckOutModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsCheckOutModalVisible(false)}
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
            <View style={[styles.modalIcon, { backgroundColor: "#E74C3C20" }]}>
              <Text style={styles.modalIconText}>✓</Text>
            </View>
            <Text style={[styles.modalTitle, { color: theme.cardTitle }]}>
              Checked Out!
            </Text>
            <Text style={[styles.modalMessage, { color: theme.cardText }]}>
              Your session has ended. Have a great day!
            </Text>
            <Pressable
              style={({ pressed }) => [
                styles.modalButton,
                { backgroundColor: theme.activeBubbleBg },
                pressed && styles.modalButtonPressed,
              ]}
              onPress={() => setIsCheckOutModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>OK</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={isErrorModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsErrorModalVisible(false)}
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
            <View style={[styles.modalIcon, { backgroundColor: "#FF980020" }]}>
              <Text style={styles.modalIconText}>!</Text>
            </View>
            <Text style={[styles.modalTitle, { color: theme.cardTitle }]}>
              Notice
            </Text>
            <Text style={[styles.modalMessage, { color: theme.cardText }]}>
              {errorMessage}
            </Text>
            <Pressable
              style={({ pressed }) => [
                styles.modalButton,
                { backgroundColor: theme.activeBubbleBg },
                pressed && styles.modalButtonPressed,
              ]}
              onPress={() => setIsErrorModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>OK</Text>
            </Pressable>
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
    marginBottom: 8,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
  },
  welcomeText: {
    fontSize: 14,
    lineHeight: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8,
  },
  attendanceSection: {
    marginBottom: 20,
  },
  attendanceActions: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  actionButton: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  actionButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  historySection: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 12,
  },
  recordList: {
    flex: 1,
  },
  recordCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  recordHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  recordDate: {
    fontSize: 15,
    fontWeight: "600",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  recordTimes: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  timeBlock: {
    flex: 1,
    alignItems: "center",
  },
  timeDivider: {
    width: 1,
    backgroundColor: "rgba(128,128,128,0.2)",
  },
  timeLabel: {
    fontSize: 11,
    marginBottom: 4,
  },
  timeValue: {
    fontSize: 14,
    fontWeight: "700",
  },
  emptyCard: {
    borderRadius: 14,
    padding: 24,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.38)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 320,
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: "center",
  },
  modalIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  modalIconText: {
    fontSize: 28,
    fontWeight: "700",
    color: "#4CAF50",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  modalMessage: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 20,
  },
  modalButton: {
    width: "100%",
    height: 46,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  modalButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
