import Ionicons from "@expo/vector-icons/Ionicons";
import * as LegacyFS from "expo-file-system/legacy";
import { Image as ExpoImage } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import * as MediaLibrary from "expo-media-library";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    Easing,
    FlatList,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/context/AuthContext";
import { useAppTheme } from "@/context/ThemeContext";
import { loadFcmToken } from "@/utils/auth";
import { sendDownloadNotification } from "@/utils/notifications";
import { getUnsplashPhotos, UnsplashFeedItem } from "@/utils/unsplash";

export default function HomeScreen() {
  const NAV_OVERLAY_SPACE = 112;
  const UNSPLASH_PAGE_SIZE = 8;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useAppTheme();
  const { user, isAuthLoading } = useAuth();
  const [images, setImages] = useState<UnsplashFeedItem[]>([]);
  const [isLoadingImages, setIsLoadingImages] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [isDownloadModalVisible, setIsDownloadModalVisible] = useState(false);
  const [downloadModalTitle, setDownloadModalTitle] = useState("");
  const [downloadModalMessage, setDownloadModalMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const pageEnter = useRef(new Animated.Value(0)).current;
  const feedListRef = useRef<FlatList<UnsplashFeedItem>>(null);
  const fcmTokenRef = useRef<string | null>(null);

  const showDownloadModal = (title: string, message: string) => {
    setDownloadModalTitle(title);
    setDownloadModalMessage(message);
    setIsDownloadModalVisible(true);
  };

  useEffect(() => {
    loadFcmToken().then((t) => {
      fcmTokenRef.current = t;
    });
  }, []);

  const getEffectiveQuery = () => {
    const query = searchQuery.trim();
    return query.length > 0 ? query : "landscape nature";
  };

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

  const loadImageFeed = async (
    page: number,
    replace: boolean,
    query = getEffectiveQuery(),
  ) => {
    if (replace) {
      setIsLoadingImages(true);
    }

    const result = await getUnsplashPhotos(page, UNSPLASH_PAGE_SIZE, query);

    if (replace) {
      setImages(result.items);
    } else {
      setImages((previous) => {
        const existingIds = new Set(previous.map((item) => item.id));
        const uniqueIncoming = result.items.filter(
          (item) => !existingIds.has(item.id),
        );
        return [...previous, ...uniqueIncoming];
      });
    }

    setCurrentPage(page);
    setHasMore(result.hasMore);
    setIsLoadingImages(false);
    setIsLoadingMore(false);
    setIsRefreshing(false);
  };

  useEffect(() => {
    loadImageFeed(1, true, "landscape nature");
  }, []);

  const handleLoadMore = useCallback(async () => {
    if (isLoadingImages || isLoadingMore || isRefreshing || !hasMore) {
      return;
    }

    setIsLoadingMore(true);
    await loadImageFeed(currentPage + 1, false);
  }, [isLoadingImages, isLoadingMore, isRefreshing, hasMore, currentPage]);

  const handleRefresh = useCallback(async () => {
    feedListRef.current?.scrollToOffset({ offset: 0, animated: true });
    setIsRefreshing(true);
    const hasCustomSearch = searchQuery.trim().length > 0;
    const refreshPage = hasCustomSearch
      ? 1
      : Math.floor(Math.random() * 20) + 1;
    await loadImageFeed(refreshPage, true);
  }, [searchQuery]);

  const handleSearch = useCallback(async () => {
    const query = searchQuery.trim();

    if (query.length === 0) {
      Alert.alert("Search", "Please enter a search term");
      return;
    }

    feedListRef.current?.scrollToOffset({ offset: 0, animated: true });
    setIsRefreshing(true);
    await loadImageFeed(1, true, query);
  }, [searchQuery]);

  const handleDownloadImage = useCallback(
    async (image: UnsplashFeedItem) => {
      try {
        setDownloadingId(image.id);

        const permission = await MediaLibrary.requestPermissionsAsync();
        if (!permission.granted) {
          showDownloadModal(
            "Permission required",
            "Please allow photo access to save images.",
          );
          return;
        }

        const baseDir = LegacyFS.cacheDirectory ?? LegacyFS.documentDirectory;
        if (!baseDir) {
          throw new Error("No writable directory available.");
        }

        const candidateUrls = [image.fullUrl, image.smallUrl];
        let localUri: string | null = null;

        for (let i = 0; i < candidateUrls.length; i += 1) {
          const sourceUrl = candidateUrls[i];
          const tempUri = `${baseDir}unsplash-${image.id}-${i}.jpg`;

          try {
            const result = await LegacyFS.downloadAsync(sourceUrl, tempUri);
            if (result.status >= 200 && result.status < 300) {
              localUri = result.uri;
              break;
            }
          } catch {
            // Try next URL variant.
          }
        }

        if (!localUri) {
          throw new Error("Unable to download image from source URLs.");
        }

        await MediaLibrary.saveToLibraryAsync(localUri);

        showDownloadModal("Saved", "Image downloaded to your gallery.");

        if (fcmTokenRef.current && user?.name) {
          sendDownloadNotification(fcmTokenRef.current, user.name).catch((e) =>
            console.log("Download notification error:", e),
          );
        }
      } catch (error) {
        console.log("Home download error:", error);
        showDownloadModal(
          "Download failed",
          "Could not download image. Try again.",
        );
      } finally {
        setDownloadingId(null);
      }
    },
    [user],
  );

  const renderFeedItem = useCallback(
    ({ item }: { item: UnsplashFeedItem }) => {
      const isItemDownloading = downloadingId === item.id;

      return (
        <View style={[styles.feedCard, { backgroundColor: theme.cardBg }]}>
          <ExpoImage
            source={{ uri: item.smallUrl }}
            style={styles.feedImage}
            contentFit="cover"
            cachePolicy="disk"
          />
          <Text style={[styles.creditText, { color: theme.cardText }]}>
            Photo by {item.photographerName} on Unsplash
          </Text>
          <Pressable
            onPress={() => handleDownloadImage(item)}
            disabled={isItemDownloading}
            style={({ pressed }) => [
              styles.downloadButton,
              { backgroundColor: theme.activeBubbleBg },
              (pressed || isItemDownloading) && styles.downloadButtonPressed,
            ]}
          >
            <Text style={styles.downloadButtonText}>
              {isItemDownloading ? "Downloading..." : "Download"}
            </Text>
          </Pressable>
        </View>
      );
    },
    [downloadingId, handleDownloadImage, theme],
  );

  if (isAuthLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Loading...</Text>
      </View>
    );
  }

  const displayName = user?.name?.trim() || "Guest User";
  const hasUnsplashKey = Boolean(process.env.EXPO_PUBLIC_UNSPLASH_ACCESS_KEY);

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
          <Pressable
            style={({ pressed }) => [
              styles.refreshButton,
              {
                backgroundColor: theme.activeBubbleBg,
                borderColor: isDark
                  ? "rgba(255,255,255,0.28)"
                  : "rgba(0,0,0,0.12)",
              },
              (pressed || isRefreshing) && styles.refreshButtonPressed,
            ]}
            disabled={isRefreshing}
            onPress={handleRefresh}
          >
            {isRefreshing ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="refresh" size={18} color="#FFFFFF" />
            )}
          </Pressable>
        </View>

        <View style={styles.searchContainer}>
          <TextInput
            style={[
              styles.searchInput,
              { color: theme.cardTitle, borderColor: theme.cardBorder },
            ]}
            placeholder="Search images..."
            placeholderTextColor={theme.cardText}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
          />
          <Pressable
            style={({ pressed }) => [
              styles.searchButton,
              { backgroundColor: theme.activeBubbleBg },
              pressed && styles.searchButtonPressed,
            ]}
            onPress={handleSearch}
          >
            <Text style={styles.searchButtonText}>🔍</Text>
          </Pressable>
        </View>

        {!hasUnsplashKey ? (
          <View style={[styles.messageCard, { backgroundColor: theme.cardBg }]}>
            <Text style={[styles.messageText, { color: theme.cardText }]}>
              Add EXPO_PUBLIC_UNSPLASH_ACCESS_KEY in .env and restart Expo to
              load images.
            </Text>
          </View>
        ) : isLoadingImages && images.length === 0 ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator size="large" color={theme.activeBubbleBg} />
            <Text style={[styles.loaderText, { color: theme.cardText }]}>
              Loading images...
            </Text>
          </View>
        ) : (
          <FlatList
            ref={feedListRef}
            data={images}
            keyExtractor={(item) => item.id}
            style={styles.feedList}
            contentContainerStyle={[
              styles.feedContent,
              { paddingBottom: NAV_OVERLAY_SPACE + insets.bottom + 12 },
            ]}
            showsVerticalScrollIndicator={false}
            onEndReachedThreshold={0.35}
            onEndReached={handleLoadMore}
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            removeClippedSubviews
            maxToRenderPerBatch={6}
            windowSize={10}
            initialNumToRender={4}
            ListFooterComponent={
              isLoadingMore ? (
                <View style={styles.footerLoader}>
                  <ActivityIndicator
                    size="small"
                    color={theme.activeBubbleBg}
                  />
                </View>
              ) : null
            }
            renderItem={renderFeedItem}
          />
        )}

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
      </Animated.View>
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
    marginBottom: 12,
  },
  messageCard: {
    borderRadius: 16,
    padding: 14,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  loaderWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loaderText: {
    marginTop: 10,
    fontSize: 14,
  },
  feedList: {
    width: "100%",
    flex: 1,
  },
  feedContent: {
    paddingBottom: 12,
  },
  feedCard: {
    borderRadius: 18,
    padding: 12,
    marginBottom: 12,
    elevation: 0,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
  },
  feedImage: {
    width: "100%",
    height: 220,
    borderRadius: 12,
    marginBottom: 12,
  },
  creditText: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  downloadButton: {
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  downloadButtonPressed: {
    opacity: 0.85,
  },
  downloadButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  footerLoader: {
    paddingVertical: 10,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  refreshButtonPressed: {
    transform: [{ scale: 0.96 }],
    opacity: 0.9,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    borderWidth: 1,
    backgroundColor: "white",
  },
  searchButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  searchButtonPressed: {
    opacity: 0.85,
  },
  searchButtonText: {
    fontSize: 18,
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
