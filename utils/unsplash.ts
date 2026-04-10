type UnsplashPhoto = {
  id?: string;
  urls?: {
    regular?: string;
    small?: string;
    full?: string;
  };
  user?: {
    name?: string;
  };
};

type UnsplashRandomResponse = UnsplashPhoto | UnsplashPhoto[];

type UnsplashImage = {
  url: string;
};

export type UnsplashFeedItem = {
  id: string;
  smallUrl: string;
  fullUrl: string;
  photographerName: string;
};

type UnsplashFeedResult = {
  items: UnsplashFeedItem[];
  hasMore: boolean;
};

const UNSPLASH_BASE_URL = "https://api.unsplash.com";

export async function getUnsplashPhotos(
  page = 1,
  perPage = 10,
  query = "nature",
): Promise<UnsplashFeedResult> {
  const accessKey = process.env.EXPO_PUBLIC_UNSPLASH_ACCESS_KEY;

  if (!accessKey) {
    return { items: [], hasMore: false };
  }

  const endpoint = `${UNSPLASH_BASE_URL}/search/photos?query=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}&orientation=landscape&content_filter=high`;

  try {
    const response = await fetch(endpoint, {
      headers: {
        Authorization: `Client-ID ${accessKey}`,
        "Accept-Version": "v1",
      },
    });

    if (!response.ok) {
      return { items: [], hasMore: false };
    }

    const payload = (await response.json()) as {
      results?: UnsplashPhoto[];
      total_pages?: number;
    };

    const items = (payload.results ?? [])
      .map((photo) => {
        const smallUrl = photo.urls?.small ?? photo.urls?.regular;
        const fullUrl = photo.urls?.full ?? photo.urls?.regular;

        if (!photo.id || !smallUrl || !fullUrl) {
          return null;
        }

        return {
          id: photo.id,
          smallUrl,
          fullUrl,
          photographerName: photo.user?.name ?? "Unknown",
        } satisfies UnsplashFeedItem;
      })
      .filter((item): item is UnsplashFeedItem => item !== null);

    return {
      items,
      hasMore: page < (payload.total_pages ?? 0),
    };
  } catch {
    return { items: [], hasMore: false };
  }
}

export async function getUnsplashRandomImage(
  query = "nature",
): Promise<UnsplashImage | null> {
  const accessKey = process.env.EXPO_PUBLIC_UNSPLASH_ACCESS_KEY;

  if (!accessKey) {
    return null;
  }

  const endpoint = `${UNSPLASH_BASE_URL}/photos/random?query=${encodeURIComponent(query)}&orientation=landscape&content_filter=high`;

  try {
    const response = await fetch(endpoint, {
      headers: {
        Authorization: `Client-ID ${accessKey}`,
        "Accept-Version": "v1",
      },
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as UnsplashRandomResponse;
    const photo = Array.isArray(payload) ? payload[0] : payload;
    const url = photo?.urls?.regular ?? photo?.urls?.small;

    if (!url) {
      return null;
    }

    return { url };
  } catch {
    return null;
  }
}
