import { File, Paths } from "expo-file-system";
import { Image as ExpoImage } from "expo-image";
import * as MediaLibrary from "expo-media-library";
import { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    View,
    useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type UnsplashPhoto = {
  id: string;
  urls: {
    small: string;
    full: string;
  };
  user: {
    name: string;
  };
};

type SearchResponse = {
  results: UnsplashPhoto[];
  total_pages: number;
};

const UNSPLASH_BASE_URL = "https://api.unsplash.com";
const PER_PAGE = 20;
const SEARCH_DEBOUNCE_MS = 500;
const NAV_OVERLAY_SPACE = 112;

export default function GalleryScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const [photos, setPhotos] = useState<UnsplashPhoto[]>([]);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const accessKey = process.env.EXPO_PUBLIC_UNSPLASH_ACCESS_KEY;

  const cardWidth = useMemo(() => {
    const horizontalPadding = 32;
    const gap = 12;
    return (width - horizontalPadding - gap) / 2;
  }, [width]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    fetchPhotos({ nextPage: 1, replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery]);

  const buildEndpoint = (nextPage: number, searchTerm: string) => {
    if (searchTerm) {
      return `${UNSPLASH_BASE_URL}/search/photos?query=${encodeURIComponent(searchTerm)}&page=${nextPage}&per_page=${PER_PAGE}&orientation=portrait`;
    }

    return `${UNSPLASH_BASE_URL}/photos?page=${nextPage}&per_page=${PER_PAGE}&order_by=popular`;
  };

  const fetchPhotos = async ({
    nextPage,
    replace,
  }: {
    nextPage: number;
    replace: boolean;
  }) => {
    if (!accessKey) {
      setError(
        "Missing Unsplash key. Add EXPO_PUBLIC_UNSPLASH_ACCESS_KEY in .env",
      );
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
      return;
    }

    const searchTerm = debouncedQuery;

    if (replace) {
      setLoading(true);
      setError(null);
    }

    try {
      const response = await fetch(buildEndpoint(nextPage, searchTerm), {
        headers: {
          Authorization: `Client-ID ${accessKey}`,
          "Accept-Version": "v1",
        },
      });

      if (!response.ok) {
        throw new Error(`Unsplash request failed (${response.status})`);
      }

      let incoming: UnsplashPhoto[] = [];
      let moreAvailable = true;

      if (searchTerm) {
        const payload = (await response.json()) as SearchResponse;
        incoming = payload.results ?? [];
        moreAvailable = nextPage < (payload.total_pages ?? 0);
      } else {
        const payload = (await response.json()) as UnsplashPhoto[];
        incoming = payload ?? [];
        moreAvailable = incoming.length === PER_PAGE;
      }

      setPhotos((prev) => {
        if (replace) {
          return incoming;
        }

        const existing = new Set(prev.map((item) => item.id));
        const uniqueIncoming = incoming.filter(
          (item) => !existing.has(item.id),
        );
        return [...prev, ...uniqueIncoming];
      });

      setPage(nextPage);
      setHasMore(moreAvailable);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load images.";
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPhotos({ nextPage: 1, replace: true });
  };

  const handleLoadMore = async () => {
    if (loading || loadingMore || refreshing || !hasMore) {
      return;
    }

    setLoadingMore(true);
    await fetchPhotos({ nextPage: page + 1, replace: false });
  };

  const handleDownload = async (photo: UnsplashPhoto) => {
    try {
      setDownloadingId(photo.id);

      const permission = await MediaLibrary.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Permission needed",
          "Please allow photo access to save images.",
        );
        return;
      }

      const fileName = `unsplash-${photo.id}.jpg`;
      const downloadedFile = await File.downloadFileAsync(
        photo.urls.full,
        new File(Paths.cache, fileName),
      );
      const asset = await MediaLibrary.createAssetAsync(downloadedFile.uri);
      await MediaLibrary.createAlbumAsync("Unsplash", asset, false);

      Alert.alert("Saved", "Image downloaded successfully to your gallery.");
    } catch {
      Alert.alert("Download failed", "Unable to save image. Please try again.");
    } finally {
      setDownloadingId(null);
    }
  };

  const renderItem = ({ item }: { item: UnsplashPhoto }) => {
    const downloading = downloadingId === item.id;

    return (
      <View style={[styles.card, { width: cardWidth }]}>
        <ExpoImage
          source={{ uri: item.urls.small }}
          style={styles.image}
          contentFit="cover"
          cachePolicy="disk"
          transition={150}
        />
        <Text numberOfLines={2} style={styles.credit}>
          Photo by {item.user.name} on Unsplash
        </Text>
        <Pressable
          style={({ pressed }) => [
            styles.downloadButton,
            pressed && styles.downloadButtonPressed,
          ]}
          onPress={() => handleDownload(item)}
          disabled={downloading}
        >
          <Text style={styles.downloadButtonText}>
            {downloading ? "Downloading..." : "Download"}
          </Text>
        </Pressable>
      </View>
    );
  };

  if (!accessKey) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top + 24 }]}>
        <Text style={styles.errorText}>
          Missing Unsplash key. Add EXPO_PUBLIC_UNSPLASH_ACCESS_KEY in .env and
          restart Expo.
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + NAV_OVERLAY_SPACE,
        },
      ]}
    >
      <Text style={styles.title}>Image Gallery</Text>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search images..."
        placeholderTextColor="#7a7a7a"
        style={styles.searchInput}
        autoCorrect={false}
      />

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2a8a5f" />
          <Text style={styles.helperText}>Loading images...</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable
            style={styles.retryButton}
            onPress={() => fetchPhotos({ nextPage: 1, replace: true })}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={photos}
          keyExtractor={(item) => item.id}
          numColumns={2}
          renderItem={renderItem}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          onEndReachedThreshold={0.35}
          onEndReached={handleLoadMore}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#2a8a5f"
            />
          }
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color="#2a8a5f" />
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.helperText}>
                No images found for this search.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f1f5f2",
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#193326",
    marginBottom: 10,
  },
  searchInput: {
    height: 46,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#dbe7df",
    paddingHorizontal: 14,
    marginBottom: 14,
    fontSize: 15,
    color: "#1d2e24",
  },
  listContent: {
    paddingBottom: 24,
  },
  row: {
    justifyContent: "space-between",
    marginBottom: 12,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 8,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  image: {
    width: "100%",
    height: 140,
    borderRadius: 10,
    marginBottom: 8,
  },
  credit: {
    fontSize: 12,
    lineHeight: 16,
    color: "#44584c",
    minHeight: 34,
    marginBottom: 8,
  },
  downloadButton: {
    height: 36,
    borderRadius: 10,
    backgroundColor: "#2a8a5f",
    alignItems: "center",
    justifyContent: "center",
  },
  downloadButtonPressed: {
    opacity: 0.85,
  },
  downloadButtonText: {
    color: "#ffffff",
    fontWeight: "600",
    fontSize: 13,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  helperText: {
    marginTop: 10,
    color: "#4b5f53",
    fontSize: 14,
  },
  errorText: {
    textAlign: "center",
    color: "#b33a3a",
    fontSize: 14,
    lineHeight: 20,
  },
  retryButton: {
    marginTop: 12,
    backgroundColor: "#1f6f4c",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryButtonText: {
    color: "#ffffff",
    fontWeight: "600",
  },
  footerLoader: {
    paddingVertical: 14,
  },
});
