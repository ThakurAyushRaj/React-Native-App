import { Image as ExpoImage } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
    Alert,
    Animated,
    Easing,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useAppTheme } from "@/context/ThemeContext";
import { User } from "@/utils/auth";

export default function SettingsScreen() {
  const NAV_OVERLAY_SPACE = 112;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { mode, isDark, theme, setThemeMode } = useAppTheme();
  const { user, isAuthLoading, updateUser, logout } = useAuth();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isLogoutModalVisible, setIsLogoutModalVisible] = useState(false);
  const [isPhotoPreviewModalVisible, setIsPhotoPreviewModalVisible] =
    useState(false);
  const [isProfileEditOptionsVisible, setIsProfileEditOptionsVisible] =
    useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [profileNameInput, setProfileNameInput] = useState("");
  const [pendingProfilePhotoUri, setPendingProfilePhotoUri] = useState<
    string | null
  >(null);
  const [showNameEditor, setShowNameEditor] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const pageEnter = useRef(new Animated.Value(0)).current;
  const logoutModalAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(pageEnter, {
      toValue: 1,
      duration: 360,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [pageEnter]);

  useEffect(() => {
    if (isAuthLoading) return;
    if (!user) {
      router.replace("/");
    } else {
      setProfileNameInput(user.name ?? "");
      setIsCheckingAuth(false);
    }
  }, [isAuthLoading, user, router]);

  useEffect(() => {
    setImageFailed(false);
  }, [user?.photo]);

  const performLogout = async () => {
    try {
      await logout();
      router.replace("/");
    } catch {
      Alert.alert("Error", "Failed to logout. Please try again.");
    }
  };

  const handleSaveProfile = async () => {
    if (!user) {
      return;
    }

    const trimmedName = profileNameInput.trim();

    if (!trimmedName) {
      Alert.alert("Missing name", "Please enter your name.");
      return;
    }

    setIsSavingProfile(true);
    try {
      const updatedUser: User = {
        ...user,
        name: trimmedName,
      };

      await updateUser(updatedUser);
      setShowNameEditor(false);
      Alert.alert("Saved", "Profile details updated.");
    } catch (error) {
      console.log("Save profile error:", error);
      Alert.alert("Save failed", "Could not update profile details.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const openProfilePhotoPicker = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "Permission required",
        "Allow gallery access to choose a display photo.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      setPendingProfilePhotoUri(result.assets[0].uri);
      setIsPhotoPreviewModalVisible(true);
    }
  };

  const openProfileEditOptions = () => {
    setIsProfileEditOptionsVisible(true);
  };

  const closeProfileEditOptions = () => {
    setIsProfileEditOptionsVisible(false);
  };

  const handleChangeDpOption = async () => {
    closeProfileEditOptions();
    await openProfilePhotoPicker();
  };

  const handleChangeNameOption = () => {
    closeProfileEditOptions();
    setShowNameEditor(true);
  };

  const applyProfilePhoto = async () => {
    if (!user || !pendingProfilePhotoUri) {
      setIsPhotoPreviewModalVisible(false);
      return;
    }

    try {
      const updatedUser: User = {
        ...user,
        photo: pendingProfilePhotoUri,
      };

      await updateUser(updatedUser);
      setIsPhotoPreviewModalVisible(false);
      setPendingProfilePhotoUri(null);
      Alert.alert("Saved", "Display photo updated.");
    } catch (error) {
      console.log("Save display photo error:", error);
      Alert.alert("Save failed", "Could not update display photo.");
    }
  };

  const openLogoutModal = () => {
    setIsLogoutModalVisible(true);
    logoutModalAnim.setValue(0);
    Animated.parallel([
      Animated.timing(logoutModalAnim, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeLogoutModal = () => {
    Animated.timing(logoutModalAnim, {
      toValue: 0,
      duration: 180,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setIsLogoutModalVisible(false);
      }
    });
  };

  const handleLogoutConfirm = async () => {
    closeLogoutModal();
    await performLogout();
  };

  if (isCheckingAuth) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Loading...</Text>
      </View>
    );
  }

  const displayName =
    profileNameInput.trim() || user?.name?.trim() || "Guest User";
  const displayEmail = user?.email?.trim() || "guest@example.com";
  const displayPhoto =
    user?.photo?.trim() ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=D7E7D0&color=1A2A21`;
  const avatarInitial = displayName.charAt(0).toUpperCase();

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

      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: NAV_OVERLAY_SPACE + insets.bottom + 12 },
        ]}
        showsVerticalScrollIndicator={false}
        decelerationRate="fast"
      >
        <Animated.View
          style={[
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
              SETTINGS
            </Text>
          </View>

          <View
            style={[styles.settingsCard, { backgroundColor: theme.cardBg }]}
          >
            <View
              style={[styles.cardAccent, { backgroundColor: theme.cardAccent }]}
            />

            <View style={styles.profileSummaryRow}>
              {!imageFailed ? (
                <ExpoImage
                  source={{ uri: displayPhoto }}
                  style={styles.profileAvatar}
                  contentFit="cover"
                  cachePolicy="disk"
                  onError={() => setImageFailed(true)}
                />
              ) : (
                <View style={styles.profileAvatarFallback}>
                  <Text style={styles.profileAvatarFallbackText}>
                    {avatarInitial}
                  </Text>
                </View>
              )}

              <View style={styles.profileInfoWrap}>
                <Text style={[styles.profileName, { color: theme.cardTitle }]}>
                  {displayName}
                </Text>
                <Text style={[styles.profileEmail, { color: theme.cardText }]}>
                  {displayEmail}
                </Text>
              </View>

              <Pressable
                style={({ pressed }) => [
                  styles.editPhotoButton,
                  {
                    backgroundColor: theme.activeBubbleBg,
                  },
                  pressed && styles.logoutButtonPressed,
                ]}
                onPress={openProfileEditOptions}
              >
                <Text style={styles.editPhotoButtonText}>Edit</Text>
              </Pressable>
            </View>

            {showNameEditor ? (
              <View style={styles.profileFormRow}>
                <TextInput
                  style={[
                    styles.profileInput,
                    { color: theme.cardTitle, borderColor: theme.cardBorder },
                  ]}
                  value={profileNameInput}
                  onChangeText={setProfileNameInput}
                  placeholder="Your name"
                  placeholderTextColor={theme.cardText}
                />
                <View style={styles.profileFormActionsRow}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.cancelProfileButton,
                      {
                        borderColor: theme.cardBorder,
                        backgroundColor: theme.badgeBg,
                      },
                      pressed && styles.logoutButtonPressed,
                    ]}
                    onPress={() => {
                      setProfileNameInput(user?.name ?? "");
                      setShowNameEditor(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.cancelProfileButtonText,
                        { color: theme.cardTitle },
                      ]}
                    >
                      Cancel
                    </Text>
                  </Pressable>

                  <Pressable
                    style={({ pressed }) => [
                      styles.saveProfileButton,
                      { backgroundColor: theme.activeBubbleBg },
                      (pressed || isSavingProfile) &&
                        styles.logoutButtonPressed,
                    ]}
                    onPress={handleSaveProfile}
                    disabled={isSavingProfile}
                  >
                    <Text style={styles.saveProfileButtonText}>
                      {isSavingProfile ? "Saving..." : "Save Name"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            <View
              style={[styles.separator, { backgroundColor: theme.cardBorder }]}
            />

            <View style={styles.settingRow}>
              <View>
                <Text style={[styles.settingTitle, { color: theme.cardTitle }]}>
                  Push Notifications
                </Text>
                <Text style={[styles.settingText, { color: theme.cardText }]}>
                  Receive updates and reminders.
                </Text>
              </View>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: "#CDD2DA", true: "#FFB39F" }}
                thumbColor={
                  notificationsEnabled ? theme.activeBubbleBg : "#FFFFFF"
                }
              />
            </View>

            <View
              style={[styles.separator, { backgroundColor: theme.cardBorder }]}
            />

            <View style={styles.settingRow}>
              <View>
                <Text style={[styles.settingTitle, { color: theme.cardTitle }]}>
                  Dark Theme
                </Text>
                <Text style={[styles.settingText, { color: theme.cardText }]}>
                  Enable dark mode for a better experience in low light.
                </Text>
              </View>
              <Switch
                value={isDark}
                onValueChange={(enabled) =>
                  setThemeMode(enabled ? "dark" : "light")
                }
                trackColor={{ false: "#CDD2DA", true: "#FFB39F" }}
                thumbColor={isDark ? theme.activeBubbleBg : "#FFFFFF"}
              />
            </View>

            <View
              style={[styles.separator, { backgroundColor: theme.cardBorder }]}
            />

            <View style={styles.metaRow}>
              <Text style={[styles.metaLabel, { color: theme.cardText }]}>
                Account Type
              </Text>
              <Text style={[styles.metaValue, { color: theme.cardTitle }]}>
                Authenticated User
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={[styles.metaLabel, { color: theme.cardText }]}>
                Current mode
              </Text>
              <Text style={[styles.metaValue, { color: theme.cardTitle }]}>
                {mode === "dark" ? "Dark" : "Light"}
              </Text>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.logoutButton,
                { backgroundColor: "#E74C3C" },
                pressed && styles.logoutButtonPressed,
              ]}
              onPress={openLogoutModal}
            >
              <Text style={styles.logoutButtonText}>Logout</Text>
            </Pressable>
          </View>
        </Animated.View>
      </ScrollView>

      <Modal
        visible={isProfileEditOptionsVisible}
        transparent
        animationType="fade"
        onRequestClose={closeProfileEditOptions}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={styles.modalBackdropPressable}
            onPress={closeProfileEditOptions}
          />
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
              Edit Profile
            </Text>
            <Text style={[styles.modalMessage, { color: theme.cardText }]}>
              Choose what you want to update.
            </Text>

            <View style={styles.editOptionList}>
              <Pressable
                style={({ pressed }) => [
                  styles.editOptionButton,
                  {
                    borderColor: theme.cardBorder,
                    backgroundColor: theme.badgeBg,
                  },
                  pressed && styles.modalButtonPressed,
                ]}
                onPress={handleChangeDpOption}
              >
                <Text
                  style={[styles.editOptionText, { color: theme.cardTitle }]}
                >
                  Change DP
                </Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.editOptionButton,
                  {
                    borderColor: theme.cardBorder,
                    backgroundColor: theme.badgeBg,
                  },
                  pressed && styles.modalButtonPressed,
                ]}
                onPress={handleChangeNameOption}
              >
                <Text
                  style={[styles.editOptionText, { color: theme.cardTitle }]}
                >
                  Change Name
                </Text>
              </Pressable>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.singleCloseButton,
                {
                  borderColor: theme.cardBorder,
                  backgroundColor: theme.badgeBg,
                },
                pressed && styles.modalButtonPressed,
              ]}
              onPress={closeProfileEditOptions}
            >
              <Text
                style={[styles.modalCancelText, { color: theme.cardTitle }]}
              >
                Close
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={isPhotoPreviewModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setIsPhotoPreviewModalVisible(false);
          setPendingProfilePhotoUri(null);
        }}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={styles.modalBackdropPressable}
            onPress={() => {
              setIsPhotoPreviewModalVisible(false);
              setPendingProfilePhotoUri(null);
            }}
          />
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
              Preview DP
            </Text>
            <Text style={[styles.modalMessage, { color: theme.cardText }]}>
              This is how your display photo will look.
            </Text>

            <View style={styles.dpPreviewWrap}>
              {pendingProfilePhotoUri ? (
                <ExpoImage
                  source={{ uri: pendingProfilePhotoUri }}
                  style={styles.dpPreviewImage}
                  contentFit="cover"
                />
              ) : null}
            </View>

            <View style={styles.modalActions}>
              <Pressable
                style={({ pressed }) => [
                  styles.modalButton,
                  styles.modalCancelButton,
                  {
                    borderColor: theme.cardBorder,
                    backgroundColor: theme.badgeBg,
                  },
                  pressed && styles.modalButtonPressed,
                ]}
                onPress={() => {
                  setIsPhotoPreviewModalVisible(false);
                  setPendingProfilePhotoUri(null);
                }}
              >
                <Text
                  style={[styles.modalCancelText, { color: theme.cardTitle }]}
                >
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.modalButton,
                  styles.modalLogoutButton,
                  pressed && styles.modalButtonPressed,
                ]}
                onPress={applyProfilePhoto}
              >
                <Text style={styles.modalLogoutText}>Use Photo</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={isLogoutModalVisible}
        transparent
        animationType="none"
        onRequestClose={closeLogoutModal}
      >
        <Animated.View
          style={[
            styles.modalBackdrop,
            {
              opacity: logoutModalAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 1],
              }),
            },
          ]}
        >
          <Pressable
            style={styles.modalBackdropPressable}
            onPress={closeLogoutModal}
          />
          <Animated.View
            style={[
              styles.modalCard,
              {
                backgroundColor: theme.cardBg,
                borderColor: theme.cardBorder,
                transform: [
                  {
                    translateY: logoutModalAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0],
                    }),
                  },
                  {
                    scale: logoutModalAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.94, 1],
                    }),
                  },
                ],
                opacity: logoutModalAnim,
              },
            ]}
          >
            <Text style={[styles.modalTitle, { color: theme.cardTitle }]}>
              Logout
            </Text>
            <Text style={[styles.modalMessage, { color: theme.cardText }]}>
              Are you sure you want to logout?
            </Text>

            <View style={styles.modalActions}>
              <Pressable
                style={({ pressed }) => [
                  styles.modalButton,
                  styles.modalCancelButton,
                  {
                    borderColor: theme.cardBorder,
                    backgroundColor: theme.badgeBg,
                  },
                  pressed && styles.modalButtonPressed,
                ]}
                onPress={closeLogoutModal}
              >
                <Text
                  style={[styles.modalCancelText, { color: theme.cardTitle }]}
                >
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.modalButton,
                  styles.modalLogoutButton,
                  pressed && styles.modalButtonPressed,
                ]}
                onPress={handleLogoutConfirm}
              >
                <Text style={styles.modalLogoutText}>Logout</Text>
              </Pressable>
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    justifyContent: "space-between",
    alignItems: "center",
    position: "relative",
  },
  accentBlob: {
    position: "absolute",
    top: 88,
    left: -30,
    width: 172,
    height: 172,
    borderRadius: 86,
    opacity: 0.75,
  },
  accentBlobSecondary: {
    position: "absolute",
    bottom: 216,
    right: -26,
    width: 146,
    height: 146,
    borderRadius: 73,
    opacity: 0.68,
  },
  content: {
    width: "100%",
    maxWidth: 920,
    alignSelf: "center",
  },
  contentContainer: {
    paddingTop: 8,
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
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
  settingsCard: {
    width: "100%",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
    elevation: 0,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  cardAccent: {
    width: 54,
    height: 4,
    borderRadius: 999,
    marginTop: 4,
    marginBottom: 8,
    alignSelf: "flex-start",
  },
  settingRow: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  settingText: {
    marginTop: 4,
    fontSize: 13,
  },
  separator: {
    height: 1,
  },
  metaRow: {
    paddingVertical: 12,
  },
  profileSummaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
  },
  profileAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  profileAvatarFallback: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#D7E7D0",
    alignItems: "center",
    justifyContent: "center",
  },
  profileAvatarFallbackText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1A2A21",
  },
  profileInfoWrap: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: "700",
  },
  profileEmail: {
    marginTop: 2,
    fontSize: 13,
  },
  profileFormRow: {
    marginTop: 8,
    gap: 8,
  },
  profileFormActionsRow: {
    flexDirection: "row",
    gap: 8,
  },
  profileInput: {
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  saveProfileButton: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelProfileButton: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelProfileButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  saveProfileButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  editPhotoButton: {
    height: 36,
    borderRadius: 10,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  editPhotoButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  metaLabel: {
    fontSize: 13,
    marginBottom: 6,
  },
  metaValue: {
    fontSize: 16,
    fontWeight: "600",
  },
  ring1: {
    position: "absolute",
    top: 36,
    right: -74,
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 1.5,
  },
  ring2: {
    position: "absolute",
    bottom: 180,
    left: -52,
    width: 144,
    height: 144,
    borderRadius: 72,
    borderWidth: 1,
  },
  blobTertiary: {
    position: "absolute",
    top: "38%",
    left: 28,
    width: 72,
    height: 72,
    borderRadius: 36,
    opacity: 0.55,
  },
  logoutButton: {
    width: "100%",
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  logoutButtonPressed: {
    opacity: 0.85,
  },
  logoutButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.38)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  modalBackdropPressable: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 6,
  },
  modalMessage: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
  },
  modalButton: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelButton: {
    borderWidth: 1,
  },
  modalLogoutButton: {
    backgroundColor: "#E74C3C",
  },
  modalButtonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: "600",
  },
  modalLogoutText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  dpPreviewWrap: {
    width: 130,
    height: 130,
    borderRadius: 65,
    overflow: "hidden",
    alignSelf: "center",
    marginBottom: 14,
  },
  dpPreviewImage: {
    width: "100%",
    height: "100%",
  },
  editOptionList: {
    gap: 10,
    marginBottom: 12,
  },
  editOptionButton: {
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  editOptionText: {
    fontSize: 15,
    fontWeight: "600",
  },
  singleCloseButton: {
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
