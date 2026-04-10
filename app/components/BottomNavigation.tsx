import Ionicons from "@expo/vector-icons/Ionicons";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  LayoutChangeEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useAppTheme } from "../context/ThemeContext";

const ACTIVE_BUBBLE_SIZE = 64;
const NAV_HORIZONTAL_PADDING = 10;

type NavKey = "home" | "profile" | "settings" | "logout";

type BottomNavigationProps = {
  activeKey: NavKey;
  onLogout: () => void;
};

const items: {
  key: NavKey;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
}[] = [
  { key: "home", icon: "home-outline", label: "Home" },
  { key: "profile", icon: "person-outline", label: "Profile" },
  { key: "settings", icon: "settings-outline", label: "Settings" },
  { key: "logout", icon: "log-out-outline", label: "Logout" },
];

export default function BottomNavigation({
  activeKey,
  onLogout,
}: BottomNavigationProps) {
  const router = useRouter();
  const { theme, isDark } = useAppTheme();
  const [navWidth, setNavWidth] = useState(0);

  const activeIndex = Math.max(
    items.findIndex((item) => item.key === activeKey),
    0,
  );
  const itemWidth = navWidth
    ? (navWidth - NAV_HORIZONTAL_PADDING * 2) / items.length
    : 0;
  const activeBubbleLeft = itemWidth
    ? NAV_HORIZONTAL_PADDING +
      activeIndex * itemWidth +
      (itemWidth - ACTIVE_BUBBLE_SIZE) / 2
    : NAV_HORIZONTAL_PADDING;

  const handleLayout = (event: LayoutChangeEvent) => {
    setNavWidth(event.nativeEvent.layout.width);
  };

  const handlePress = (key: NavKey) => {
    if (key === "logout") {
      onLogout();
      return;
    }

    router.replace(`/${key}`);
  };

  return (
    <View style={styles.navShell}>
      <BlurView
        intensity={isDark ? 35 : 22}
        tint={isDark ? "dark" : "default"}
        style={[styles.navBar, { backgroundColor: theme.cardBg }]}
        onLayout={handleLayout}
      >
        <View
          pointerEvents="none"
          style={[
            styles.navToneLayer,
            {
              backgroundColor: theme.cardBg,
              opacity: isDark ? 0.55 : 0.9,
            },
          ]}
        />

        <View
          style={[
            styles.activeBubble,
            { left: activeBubbleLeft, backgroundColor: theme.activeBubbleBg },
          ]}
        >
          <Ionicons
            name={items[activeIndex].icon}
            size={27}
            color={theme.activeBubbleIcon}
          />
        </View>

        {items.map((item) => {
          const isActive = item.key === activeKey;
          return (
            <Pressable
              key={item.key}
              style={styles.navItem}
              onPress={() => handlePress(item.key)}
              android_ripple={{ color: "rgba(0,0,0,0.08)", borderless: true }}
            >
              {isActive ? (
                <View style={styles.activeContent}>
                  <Text style={[styles.activeLabel, { color: theme.navLabel }]}>
                    {item.label}
                  </Text>
                </View>
              ) : (
                <Ionicons name={item.icon} size={25} color={theme.navIcon} />
              )}
            </Pressable>
          );
        })}
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  navShell: {
    width: "100%",
    paddingBottom: Platform.OS === "ios" ? 10 : 2,
  },
  navBar: {
    width: "100%",
    minHeight: 88,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: NAV_HORIZONTAL_PADDING,
    borderWidth: 0,
    shadowColor: "transparent",
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  navItem: {
    flex: 1,
    minHeight: 78,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 12,
    zIndex: 2,
  },
  navToneLayer: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
    zIndex: 0,
  },
  activeBubble: {
    position: "absolute",
    top: -22,
    width: ACTIVE_BUBBLE_SIZE,
    height: ACTIVE_BUBBLE_SIZE,
    borderRadius: ACTIVE_BUBBLE_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 9,
    zIndex: 3,
  },
  activeContent: {
    width: "100%",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingTop: 10,
  },
  activeLabel: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
  },
});
