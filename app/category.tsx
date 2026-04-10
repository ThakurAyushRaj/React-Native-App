import { Image as ExpoImage } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAppTheme } from "@/context/ThemeContext";
import { loadStoredUser } from "@/utils/auth";
import { getUnsplashPhotos, UnsplashFeedItem } from "@/utils/unsplash";

const CATEGORIES = [
  { key: "nature", label: "Nature", icon: "🌿" },
  { key: "technology", label: "Technology", icon: "💻" },
  { key: "animals", label: "Animals", icon: "🦋" },
  { key: "architecture", label: "Architecture", icon: "🏛️" },
  { key: "travel", label: "Travel", icon: "✈️" },
  { key: "food", label: "Food", icon: "🍜" },
  { key: "space", label: "Space", icon: "🌌" },
  { key: "fashion", label: "Fashion", icon: "👗" },
];

const NAV_OVERLAY_SPACE = 112;
const COLUMN_COUNT = 2;
const ITEM_GAP = 10;

export default function CategoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useAppTheme();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("nature");
  const [searchQuery, setSearchQuery] = useState("");
  const [images, setImages] = useState<UnsplashFeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const pageEnter = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(pageEnter, {
      toValue: 1,
      duration: 360,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [pageEnter]);

  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      try {
        const storedUser = await loadStoredUser();
        if (!storedUser) {
          router.replace("/");
        }
      } catch {
        router.replace("/");
      } finally {
        if (isMounted) {
          setIsCheckingAuth(false);
        }
      }
    };

    checkAuth();
    return () => {
      isMounted = false;
    };
  }, [router]);

  const fetchImages = async (query: string, page: number, replace: boolean) => {
    if (replace) {
      setIsLoading(true);
    }

    const result = await getUnsplashPhotos(page, 12, query);

    if (replace) {
      setImages(result.items);
    } else {
      setImages((prev) => {
        const existingIds = new Set(prev.map((i) => i.id));
        const unique = result.items.filter((i) => !existingIds.has(i.id));
        return [...prev, ...unique];
      });
    }

    setCurrentPage(page);
    setHasMore(result.hasMore);
    setIsLoading(false);
    setIsLoadingMore(false);
    setIsRefreshing(false);
  };

  useEffect(() => {
    if (!isCheckingAuth) {
      fetchImages(selectedCategory, 1, true);
    }
  }, [selectedCategory, isCheckingAuth]);

  const handleCategorySelect = (key: string) => {
    if (key === selectedCategory) return;
    setSelectedCategory(key);
    setSearchQuery("");
  };

  const handleSearch = () => {
    const q = searchQuery.trim();
    if (!q) return;
    setImages([]);
    setCurrentPage(1);
    fetchImages(q, 1, true);
  };

  const handleLoadMore = () => {
    if (isLoading || isLoadingMore || isRefreshing || !hasMore) return;
    setIsLoadingMore(true);
    const query = searchQuery.trim() || selectedCategory;
    fetchImages(query, currentPage + 1, false);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    const query = searchQuery.trim() || selectedCategory;
    fetchImages(query, 1, true);
  };

  if (isCheckingAuth) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: "#090A0D" }]}>
        <ActivityIndicator size="large" color="#FF6A47" />
      </View>
    );
  }

  const hasUnsplashKey = Boolean(process.env.EXPO_PUBLIC_UNSPLASH_ACCESS_KEY);
  const activeCategoryLabel =
    CATEGORIES.find((c) => c.key === selectedCategory)?.label ??
    selectedCategory;

  return (
    <LinearGradient
      colors={theme.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, { paddingTop: insets.top + 14 }]}
    >
      {/* Decorative blobs */}
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
        {/* Header */}
        <View
          style={[
            styles.badge,
            { backgroundColor: theme.badgeBg, borderColor: theme.badgeBorder },
          ]}
        >
          <Text style={[styles.badgeText, { color: theme.badgeText }]}>
            CATEGORY
          </Text>
        </View>

        {/* Search bar */}
        <View style={styles.searchContainer}>
          <TextInput
            style={[
              styles.searchInput,
              { color: theme.cardTitle, borderColor: theme.cardBorder },
            ]}
            placeholder="Search any topic..."
            placeholderTextColor={theme.cardText}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          <Pressable
            style={({ pressed }) => [
              styles.searchButton,
              { backgroundColor: theme.activeBubbleBg },
              pressed && styles.pressedOpacity,
            ]}
            onPress={handleSearch}
          >
            <Text style={styles.searchButtonText}>🔍</Text>
          </Pressable>
        </View>

        {/* Category chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsContent}
          style={styles.chipsRow}
        >
          {CATEGORIES.map((cat) => {
            const isActive =
              cat.key === selectedCategory && !searchQuery.trim();
            return (
              <Pressable
                key={cat.key}
                onPress={() => handleCategorySelect(cat.key)}
                style={({ pressed }) => [
                  styles.chip,
                  {
                    backgroundColor: isActive
                      ? theme.activeBubbleBg
                      : theme.cardBg,
                    borderColor: isActive
                      ? theme.activeBubbleBg
                      : theme.cardBorder,
                  },
                  pressed && styles.pressedOpacity,
                ]}
              >
                <Text style={styles.chipIcon}>{cat.icon}</Text>
                <Text
                  style={[
                    styles.chipLabel,
                    {
                      color: isActive ? "#FFFFFF" : theme.cardTitle,
                      fontWeight: isActive ? "700" : "500",
                    },
                  ]}
                >
                  {cat.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Section label */}
        <Text style={[styles.sectionLabel, { color: theme.subtitle }]}>
          {searchQuery.trim()
            ? `Results for "${searchQuery.trim()}"`
            : activeCategoryLabel}
        </Text>

        {/* Image grid */}
        {!hasUnsplashKey ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.cardBg }]}>
            <Text style={[styles.emptyText, { color: theme.cardText }]}>
              Add EXPO_PUBLIC_UNSPLASH_ACCESS_KEY in .env to load images.
            </Text>
          </View>
        ) : isLoading && images.length === 0 ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator size="large" color={theme.activeBubbleBg} />
            <Text style={[styles.loaderText, { color: theme.cardText }]}>
              Loading images...
            </Text>
          </View>
        ) : (
          <FlatList
            data={images}
            keyExtractor={(item) => item.id}
            numColumns={COLUMN_COUNT}
            columnWrapperStyle={styles.columnWrapper}
            style={styles.grid}
            contentContainerStyle={{
              paddingBottom: NAV_OVERLAY_SPACE + insets.bottom + 12,
              paddingTop: 4,
            }}
            showsVerticalScrollIndicator={false}
            onEndReachedThreshold={0.4}
            onEndReached={handleLoadMore}
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            ListEmptyComponent={
              <View style={styles.loaderWrap}>
                <Text style={[styles.loaderText, { color: theme.cardText }]}>
                  No images found. Try another search.
                </Text>
              </View>
            }
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
            renderItem={({ item }) => (
              <View
                style={[styles.gridItem, { backgroundColor: theme.cardBg }]}
              >
                <ExpoImage
                  source={{ uri: item.smallUrl }}
                  style={styles.gridImage}
                  contentFit="cover"
                  cachePolicy="disk"
                />
                <Text
                  style={[styles.gridCredit, { color: theme.cardText }]}
                  numberOfLines={1}
                >
                  {item.photographerName}
                </Text>
              </View>
            )}
          />
        )}
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
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
    top: "44%",
    left: -55,
    width: 136,
    height: 136,
    borderRadius: 68,
    borderWidth: 1,
  },
  content: {
    flex: 1,
    width: "100%",
    maxWidth: 980,
    alignSelf: "center",
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
    letterSpacing: 1.4,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  searchButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  searchButtonText: {
    fontSize: 18,
  },
  pressedOpacity: {
    opacity: 0.8,
  },
  chipsRow: {
    marginBottom: 14,
    flexGrow: 0,
  },
  chipsContent: {
    gap: 8,
    paddingRight: 4,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 24,
    borderWidth: 1,
    gap: 6,
  },
  chipIcon: {
    fontSize: 16,
  },
  chipLabel: {
    fontSize: 13,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 10,
  },
  grid: {
    flex: 1,
  },
  columnWrapper: {
    gap: ITEM_GAP,
    marginBottom: ITEM_GAP,
  },
  gridItem: {
    flex: 1,
    borderRadius: 14,
    overflow: "hidden",
  },
  gridImage: {
    width: "100%",
    aspectRatio: 1,
  },
  gridCredit: {
    fontSize: 11,
    padding: 6,
  },
  loaderWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 40,
  },
  loaderText: {
    marginTop: 10,
    fontSize: 14,
    textAlign: "center",
  },
  footerLoader: {
    paddingVertical: 12,
    alignItems: "center",
  },
  emptyCard: {
    borderRadius: 16,
    padding: 20,
    marginTop: 8,
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
});
