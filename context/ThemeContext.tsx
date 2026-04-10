import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type ThemeMode = "dark" | "light";

type ThemePalette = {
  gradient: [string, string, string];
  title: string;
  subtitle: string;
  badgeBg: string;
  badgeBorder: string;
  badgeText: string;
  accentBlob: string;
  accentBlobSecondary: string;
  cardAccent: string;
  cardBg: string;
  cardBorder: string;
  cardTitle: string;
  cardText: string;
  ringBg: string;
  blobTertiary: string;
  navBarBg: string;
  navBorder: string;
  navIcon: string;
  navLabel: string;
  activeBubbleBg: string;
  activeBubbleIcon: string;
};

const THEME_STORAGE_KEY = "app_theme_mode";

const darkPalette: ThemePalette = {
  gradient: ["#090A0D", "#111318", "#1A1E27"],
  title: "#F2F4F8",
  subtitle: "#9EA7B8",
  badgeBg: "rgba(255,255,255,0.08)",
  badgeBorder: "rgba(255,255,255,0.16)",
  badgeText: "#D6DEED",
  accentBlob: "rgba(255,255,255,0.06)",
  accentBlobSecondary: "rgba(120,132,163,0.18)",
  cardAccent: "#7F8AA3",
  cardBg: "rgba(26, 30, 39, 0.72)",
  cardBorder: "rgba(255, 255, 255, 0.28)",
  cardTitle: "#F2F4F8",
  cardText: "#A6AFBF",
  ringBg: "rgba(255, 255, 255, 0.12)",
  blobTertiary: "rgba(100, 120, 163, 0.18)",
  navBarBg: "rgba(12, 16, 24, 0.42)",
  navBorder: "rgba(255,255,255,0.18)",
  navIcon: "#C7CEDC",
  navLabel: "#F2F4F8",
  activeBubbleBg: "#FF6A47",
  activeBubbleIcon: "#FFFFFF",
};

const lightPalette: ThemePalette = {
  gradient: ["#EDF4F1", "#E6F0EB", "#DDEBE3"],
  title: "#1A2A21",
  subtitle: "#617067",
  badgeBg: "#E2EFE8",
  badgeBorder: "rgba(79,138,104,0.26)",
  badgeText: "#4F8A68",
  accentBlob: "rgba(191,220,203,0.65)",
  accentBlobSecondary: "rgba(223,236,229,0.75)",
  cardAccent: "#4F8A68",
  cardBg: "rgba(221, 235, 227, 0.78)",
  cardBorder: "rgba(255, 255, 255, 0.58)",
  cardTitle: "#1A2A21",
  cardText: "#617067",
  ringBg: "rgba(79, 138, 104, 0.18)",
  blobTertiary: "rgba(150, 210, 180, 0.55)",
  navBarBg: "rgba(221, 235, 227, 0.42)",
  navBorder: "rgba(255, 255, 255, 0.55)",
  navIcon: "#2E4A3B",
  navLabel: "#1A2A21",
  activeBubbleBg: "#4F8A68",
  activeBubbleIcon: "#FFFFFF",
};

type ThemeContextValue = {
  mode: ThemeMode;
  isDark: boolean;
  theme: ThemePalette;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>("dark");

  useEffect(() => {
    let mounted = true;

    const loadStoredTheme = async () => {
      try {
        const storedMode = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (!mounted) {
          return;
        }

        if (storedMode === "dark" || storedMode === "light") {
          setMode(storedMode);
        }
      } catch (error) {
        console.log("Failed to load theme:", error);
      }
    };

    loadStoredTheme();

    return () => {
      mounted = false;
    };
  }, []);

  const setThemeMode = (nextMode: ThemeMode) => {
    setMode(nextMode);
    AsyncStorage.setItem(THEME_STORAGE_KEY, nextMode).catch((error) => {
      console.log("Failed to save theme:", error);
    });
  };

  const toggleTheme = () => {
    setThemeMode(mode === "dark" ? "light" : "dark");
  };

  const value = useMemo(
    () => ({
      mode,
      isDark: mode === "dark",
      theme: mode === "dark" ? darkPalette : lightPalette,
      setThemeMode,
      toggleTheme,
    }),
    [mode],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useAppTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useAppTheme must be used within ThemeProvider");
  }

  return context;
}
