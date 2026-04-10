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
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppTheme } from "@/context/ThemeContext";
import { loadStoredUser } from "@/utils/auth";

export default function PhotoEditorScreen() {
  const NAV_OVERLAY_SPACE = 112;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const pageEnter = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(pageEnter, {
      toValue: 1,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [pageEnter]);

  useEffect(() => {
    let isMounted = true;

    const loadUser = async () => {
      try {
        const storedUser = await loadStoredUser();

        if (!storedUser) {
          router.replace("/");
          return;
        }

        if (isMounted) {
          setImageUri(null);
        }
      } catch (error) {
        console.log("Error loading user:", error);
        router.replace("/");
      } finally {
        if (isMounted) {
          setIsCheckingAuth(false);
        }
      }
    };

    loadUser();

    return () => {
      isMounted = false;
    };
  }, [router]);

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
          setImageUri(reader.result);
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
      setImageUri(result.assets[0].uri);
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

  const handleDownload = async () => {
    if (!imageUri) {
      Alert.alert("No image", "Pick and edit a photo first.");
      return;
    }

    if (Platform.OS === "web") {
      const anchor = globalThis.document?.createElement("a");
      if (!anchor) {
        Alert.alert("Download failed", "Browser download is not available.");
        return;
      }

      anchor.href = imageUri;
      anchor.download = "edited-photo.jpg";
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      anchor.click();
      return;
    }

    setIsDownloading(true);
    try {
      const permission = await MediaLibrary.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
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
      Alert.alert("Downloaded", "Edited photo saved to your gallery.");
    } catch (error) {
      console.log("Download photo error:", error);
      Alert.alert("Download failed", "Could not download the edited photo.");
    } finally {
      setIsDownloading(false);
    }
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
                <ExpoImage
                  source={{ uri: imageUri }}
                  style={styles.previewImage}
                  contentFit="cover"
                />
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
});
