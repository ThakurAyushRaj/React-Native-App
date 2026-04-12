import Ionicons from "@expo/vector-icons/Ionicons";
import { File as FSFile, Paths } from "expo-file-system";
import { Image as ExpoImage } from "expo-image";
import { FlipType, manipulateAsync, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import * as MediaLibrary from "expo-media-library";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
    Alert,
    Animated,
    Easing,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useAppTheme } from "@/context/ThemeContext";
import { loadFcmToken } from "@/utils/auth";
import { sendDownloadNotification } from "@/utils/notifications";
import { FilterPreset, FilterWrapper } from "../utils/image-filter-wrapper";

export default function PhotoEditorScreen() {
  const NAV_OVERLAY_SPACE = 112;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const { user, isAuthLoading } = useAuth();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [originalImageUri, setOriginalImageUri] = useState<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<FilterPreset>("none");
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isDownloadModalVisible, setIsDownloadModalVisible] = useState(false);
  const [downloadModalTitle, setDownloadModalTitle] = useState("");
  const [downloadModalMessage, setDownloadModalMessage] = useState("");
  const pageEnter = useRef(new Animated.Value(0)).current;
  const fcmTokenRef = useRef<string | null>(null);

  const showDownloadModal = (title: string, message: string) => {
    setDownloadModalTitle(title);
    setDownloadModalMessage(message);
    setIsDownloadModalVisible(true);
  };

  useEffect(() => {
    Animated.timing(pageEnter, {
      toValue: 1,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [pageEnter]);

  useEffect(() => {
    loadFcmToken().then((token) => {
      fcmTokenRef.current = token;
    });
  }, []);

  useEffect(() => {
    if (isAuthLoading) return;
    if (!user) {
      router.replace("/");
    } else {
      setIsCheckingAuth(false);
    }
  }, [isAuthLoading, user, router]);

  useEffect(() => {
    if (Platform.OS !== "web") {
      return;
    }

    const readDroppedFile = (file?: globalThis.File | null) => {
      if (!file) {
        return;
      }

      if (!file.type.startsWith("image/")) {
        Alert.alert("Invalid file", "Please drop an image file.");
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setOriginalImageUri(reader.result);
          setImageUri(reader.result);
          setSelectedFilter("none");
        }
      };
      reader.readAsDataURL(file);
    };

    const handleDragOver = (event: Event) => {
      const dragEvent = event as DragEvent;
      dragEvent.preventDefault();
      setIsDragActive(true);
    };

    const handleDragLeave = () => {
      setIsDragActive(false);
    };

    const handleDrop = (event: Event) => {
      const dragEvent = event as DragEvent;
      dragEvent.preventDefault();
      setIsDragActive(false);
      readDroppedFile(dragEvent.dataTransfer?.files?.[0] ?? null);
    };

    globalThis.addEventListener("dragover", handleDragOver);
    globalThis.addEventListener("dragleave", handleDragLeave);
    globalThis.addEventListener("drop", handleDrop);

    return () => {
      globalThis.removeEventListener("dragover", handleDragOver);
      globalThis.removeEventListener("dragleave", handleDragLeave);
      globalThis.removeEventListener("drop", handleDrop);
    };
  }, []);

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        "Permission required",
        "Allow gallery access to choose a photo.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.9,
      aspect: [1, 1],
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      setOriginalImageUri(result.assets[0].uri);
      setImageUri(result.assets[0].uri);
      setSelectedFilter("none");
    }
  };

  const applyManipulation = async (
    actions: Parameters<typeof manipulateAsync>[1],
  ) => {
    if (!imageUri) {
      return;
    }

    try {
      const output = await manipulateAsync(imageUri, actions, {
        compress: 0.9,
        format: SaveFormat.JPEG,
      });
      setImageUri(output.uri);
    } catch (error) {
      console.log("Image edit error:", error);
      Alert.alert("Edit failed", "Could not apply changes.");
    }
  };

  const handleCropSquare = async () => {
    if (!imageUri) {
      return;
    }

    try {
      const source = await manipulateAsync(imageUri, [], {
        compress: 1,
        format: SaveFormat.JPEG,
      });

      const cropSize = Math.min(source.width, source.height);
      const originX = Math.floor((source.width - cropSize) / 2);
      const originY = Math.floor((source.height - cropSize) / 2);

      const output = await manipulateAsync(
        source.uri,
        [
          {
            crop: {
              originX,
              originY,
              width: cropSize,
              height: cropSize,
            },
          },
        ],
        {
          compress: 0.9,
          format: SaveFormat.JPEG,
        },
      );

      setImageUri(output.uri);
    } catch (error) {
      console.log("Image crop error:", error);
      Alert.alert("Crop failed", "Could not crop the image.");
    }
  };

  const handleDownload = async () => {
    if (!imageUri) {
      showDownloadModal("No image", "Pick and edit a photo first.");
      return;
    }

    if (Platform.OS === "web") {
      const anchor = globalThis.document?.createElement("a");
      if (!anchor) {
        showDownloadModal(
          "Download failed",
          "Browser download is not available.",
        );
        return;
      }

      anchor.href = imageUri;
      anchor.download = "edited-photo.jpg";
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      anchor.click();
      showDownloadModal(
        "Download started",
        "Your browser started the download.",
      );
      return;
    }

    setIsDownloading(true);
    try {
      const permission = await MediaLibrary.requestPermissionsAsync();
      if (!permission.granted) {
        showDownloadModal(
          "Permission required",
          "Please allow photo access to save edited images.",
        );
        return;
      }

      let localUri = imageUri;
      if (imageUri.startsWith("http")) {
        const downloadedFile = await FSFile.downloadFileAsync(
          imageUri,
          new FSFile(Paths.cache, `edited-photo-${Date.now()}.jpg`),
        );
        localUri = downloadedFile.uri;
      }

      const asset = await MediaLibrary.createAssetAsync(localUri);
      await MediaLibrary.createAlbumAsync("EditedPhotos", asset, false);
      showDownloadModal("Downloaded", "Edited photo saved to your gallery.");
      if (fcmTokenRef.current && user?.name) {
        sendDownloadNotification(fcmTokenRef.current, user.name).catch((e) =>
          console.log("Photo editor download notification error:", e),
        );
      }
    } catch (error) {
      console.log("Download photo error:", error);
      showDownloadModal(
        "Download failed",
        "Could not download the edited photo.",
      );
    } finally {
      setIsDownloading(false);
    }
  };

  const resetImage = () => {
    if (!originalImageUri) {
      return;
    }

    setImageUri(originalImageUri);
    setSelectedFilter("none");
  };

  const renderPreviewImage = () => {
    if (!imageUri) {
      return null;
    }

    const image = (
      <ExpoImage
        source={{ uri: imageUri }}
        style={styles.previewImage}
        contentFit="cover"
      />
    );

    return <FilterWrapper filter={selectedFilter}>{image}</FilterWrapper>;
  };

  if (isCheckingAuth) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

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
                  translateY: pageEnter.interpolate({
                    inputRange: [0, 1],
                    outputRange: [16, 0],
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
                borderColor: theme.badgeBorder,
                backgroundColor: theme.badgeBg,
              },
            ]}
          >
            <Text style={[styles.badgeText, { color: theme.badgeText }]}>
              PHOTO EDITOR
            </Text>
          </View>

          <View style={[styles.card, { backgroundColor: theme.cardBg }]}>
            <Pressable
              style={[
                styles.previewWrap,
                {
                  borderColor: isDragActive
                    ? theme.activeBubbleBg
                    : theme.cardBorder,
                  backgroundColor: isDragActive
                    ? "rgba(255,255,255,0.08)"
                    : "transparent",
                },
              ]}
              onPress={pickImage}
            >
              {imageUri ? (
                renderPreviewImage()
              ) : (
                <View style={styles.emptyPreview}>
                  <Ionicons
                    name="image-outline"
                    size={36}
                    color={theme.cardText}
                  />
                  <Text style={[styles.emptyText, { color: theme.cardText }]}>
                    Upload or drag and drop an image to start editing
                  </Text>
                </View>
              )}
            </Pressable>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}
            >
              {[
                { key: "none", label: "Normal" },
                { key: "grayscale", label: "Grayscale" },
                { key: "sepia", label: "Sepia" },
                { key: "vivid", label: "Vivid" },
                { key: "muted", label: "Muted" },
              ].map((filter) => {
                const isActive = selectedFilter === filter.key;

                return (
                  <Pressable
                    key={filter.key}
                    style={[
                      styles.filterChip,
                      {
                        borderColor: isActive
                          ? theme.activeBubbleBg
                          : theme.cardBorder,
                        backgroundColor: isActive
                          ? theme.activeBubbleBg
                          : theme.badgeBg,
                      },
                    ]}
                    onPress={() =>
                      setSelectedFilter(filter.key as FilterPreset)
                    }
                    disabled={!imageUri}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        { color: isActive ? "#FFFFFF" : theme.cardTitle },
                      ]}
                    >
                      {filter.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={styles.actionGrid}>
              <Pressable
                style={[
                  styles.actionButton,
                  { backgroundColor: theme.activeBubbleBg },
                ]}
                onPress={pickImage}
              >
                <Text style={styles.actionButtonText}>Pick Photo</Text>
              </Pressable>

              <Pressable
                style={[
                  styles.toolButton,
                  {
                    borderColor: theme.cardBorder,
                    backgroundColor: theme.badgeBg,
                  },
                ]}
                onPress={handleCropSquare}
                disabled={!imageUri}
              >
                <Text style={[styles.toolText, { color: theme.cardTitle }]}>
                  Crop
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.toolButton,
                  {
                    borderColor: theme.cardBorder,
                    backgroundColor: theme.badgeBg,
                  },
                ]}
                onPress={() => applyManipulation([{ rotate: -90 }])}
                disabled={!imageUri}
              >
                <Text style={[styles.toolText, { color: theme.cardTitle }]}>
                  Rotate Left
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.toolButton,
                  {
                    borderColor: theme.cardBorder,
                    backgroundColor: theme.badgeBg,
                  },
                ]}
                onPress={() => applyManipulation([{ rotate: 90 }])}
                disabled={!imageUri}
              >
                <Text style={[styles.toolText, { color: theme.cardTitle }]}>
                  Rotate Right
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.toolButton,
                  {
                    borderColor: theme.cardBorder,
                    backgroundColor: theme.badgeBg,
                  },
                ]}
                onPress={() =>
                  applyManipulation([{ flip: FlipType.Horizontal }])
                }
                disabled={!imageUri}
              >
                <Text style={[styles.toolText, { color: theme.cardTitle }]}>
                  Flip Horizontal
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.toolButton,
                  {
                    borderColor: theme.cardBorder,
                    backgroundColor: theme.badgeBg,
                  },
                ]}
                onPress={() => applyManipulation([{ flip: FlipType.Vertical }])}
                disabled={!imageUri}
              >
                <Text style={[styles.toolText, { color: theme.cardTitle }]}>
                  Flip Vertical
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.toolButton,
                  {
                    borderColor: theme.cardBorder,
                    backgroundColor: theme.badgeBg,
                  },
                ]}
                onPress={() => applyManipulation([{ rotate: 180 }])}
                disabled={!imageUri}
              >
                <Text style={[styles.toolText, { color: theme.cardTitle }]}>
                  Rotate 180
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.toolButton,
                  {
                    borderColor: theme.cardBorder,
                    backgroundColor: theme.badgeBg,
                  },
                ]}
                onPress={resetImage}
                disabled={!imageUri || !originalImageUri}
              >
                <Text style={[styles.toolText, { color: theme.cardTitle }]}>
                  Reset
                </Text>
              </Pressable>
            </View>

            <View style={styles.footerRow}>
              <Pressable
                style={[
                  styles.secondaryButton,
                  {
                    borderColor: theme.cardBorder,
                    backgroundColor: theme.badgeBg,
                  },
                ]}
                onPress={() => router.back()}
              >
                <Text
                  style={[
                    styles.secondaryButtonText,
                    { color: theme.cardTitle },
                  ]}
                >
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.primaryButton,
                  { backgroundColor: theme.activeBubbleBg },
                  (isDownloading || !imageUri) && styles.disabledButton,
                ]}
                onPress={handleDownload}
                disabled={isDownloading || !imageUri}
              >
                <Text style={styles.primaryButtonText}>
                  {isDownloading ? "Downloading..." : "Download Photo"}
                </Text>
              </Pressable>
            </View>
          </View>
        </Animated.View>
      </ScrollView>

      <Modal
        visible={isDownloadModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsDownloadModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={styles.modalBackdropPressable}
            onPress={() => setIsDownloadModalVisible(false)}
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
              {downloadModalTitle}
            </Text>
            <Text style={[styles.modalMessage, { color: theme.cardText }]}>
              {downloadModalMessage}
            </Text>

            <Pressable
              style={({ pressed }) => [
                styles.modalPrimaryButton,
                { backgroundColor: theme.activeBubbleBg },
                pressed && styles.modalPrimaryButtonPressed,
              ]}
              onPress={() => setIsDownloadModalVisible(false)}
            >
              <Text style={styles.modalPrimaryButtonText}>OK</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontSize: 16,
    fontWeight: "600",
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
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
    marginBottom: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.1,
  },
  card: {
    borderRadius: 18,
    padding: 14,
  },
  previewWrap: {
    borderWidth: 1,
    borderRadius: 14,
    overflow: "hidden",
    height: 280,
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  emptyPreview: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
  },
  filterRow: {
    marginTop: 12,
    gap: 8,
    paddingRight: 4,
  },
  filterChip: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  actionGrid: {
    marginTop: 14,
    gap: 10,
  },
  actionButton: {
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 15,
  },
  toolButton: {
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  toolText: {
    fontSize: 14,
    fontWeight: "600",
  },
  footerRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  secondaryButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  primaryButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  disabledButton: {
    opacity: 0.8,
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
  modalPrimaryButton: {
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalPrimaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  modalPrimaryButtonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
});
