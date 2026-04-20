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
  useWindowDimensions,
  View,
} from "react-native";

import { useAppTheme } from "@/context/ThemeContext";

const NAV_HORIZONTAL_PADDING = 10;

type NavKey = "home" | "performance" | "settings";

type BottomNavigationProps = {
  activeKey: NavKey;
};

const items: {
  key: NavKey;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
}[] = [
  { key: "home", icon: "home-outline", label: "Home" },
  { key: "performance", icon: "stats-chart-outline", label: "Performance" },
  { key: "settings", icon: "settings-outline", label: "Settings" },
];

export default function BottomNavigation({ activeKey }: BottomNavigationProps) {
  const router = useRouter();
  const { theme, isDark } = useAppTheme();
  const { width } = useWindowDimensions();
  const [navWidth, setNavWidth] = useState(0);
  const isCompact = width < 768;
  const bubbleSize = isCompact ? 56 : 62;
  const navHeight = isCompact ? 66 : 74;
  const navItemHeight = isCompact ? 56 : 64;

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
      (itemWidth - bubbleSize) / 2
    : NAV_HORIZONTAL_PADDING;

  const handleLayout = (event: LayoutChangeEvent) => {
    setNavWidth(event.nativeEvent.layout.width);
  };

  const handlePress = (key: NavKey) => {
    router.replace(`/${key}`);
  };

  return (
    <View style={styles.navShell}>
      <View style={styles.navClip} onLayout={handleLayout}>
        <BlurView
          intensity={Platform.select({
            ios: 66,
            android: 58,
            web: 62,
            default: 62,
          })}
          tint={isDark ? "dark" : "light"}
          experimentalBlurMethod={
            Platform.OS === "android" ? "dimezisBlurView" : undefined
          }
          style={[styles.navBar, { minHeight: navHeight }]}
        >
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFillObject,
              {
                backgroundColor: theme.navBarBg,
              },
            ]}
          />
          {items.map((item) => {
            const isActive = item.key === activeKey;
            return (
              <Pressable
                key={item.key}
                style={[
                  styles.navItem,
                  { minHeight: navItemHeight, paddingTop: isCompact ? 8 : 10 },
                ]}
                onPress={() => handlePress(item.key)}
                android_ripple={{ color: "rgba(0,0,0,0.08)", borderless: true }}
              >
                {isActive ? (
                  <View style={styles.activeContent}>
                    <Text
                      style={[styles.activeLabel, { color: theme.navLabel }]}
                    >
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

      <View
        style={[
          styles.activeBubble,
          {
            left: activeBubbleLeft,
            width: bubbleSize,
            height: bubbleSize,
            borderRadius: bubbleSize / 2,
            backgroundColor: theme.activeBubbleBg,
          },
        ]}
      >
        <Ionicons
          name={items[activeIndex].icon}
          size={27}
          color={theme.activeBubbleIcon}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  navShell: {
    position: "relative",
    width: "100%",
    maxWidth: 680,
    alignSelf: "center",
    paddingBottom: Platform.OS === "ios" ? 10 : 2,
  },
  navClip: {
    borderRadius: 24,
    overflow: "hidden",
  },
  navBar: {
    width: "100%",
    borderRadius: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: NAV_HORIZONTAL_PADDING,
    backgroundColor: "transparent",
    borderWidth: 0,
    shadowColor: "transparent",
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  activeBubble: {
    position: "absolute",
    top: -18,
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
