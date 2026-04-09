import Ionicons from "@expo/vector-icons/Ionicons";
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
      <View style={styles.navBar} onLayout={handleLayout}>
        <View style={[styles.activeBubble, { left: activeBubbleLeft }]}>
          <Ionicons name={items[activeIndex].icon} size={27} color="#1F232C" />
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
                  <Text style={styles.activeLabel}>{item.label}</Text>
                </View>
              ) : (
                <Ionicons name={item.icon} size={25} color="#2D313A" />
              )}
            </Pressable>
          );
        })}
      </View>
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
    borderRadius: 20,
    backgroundColor: "#F2F2F2",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: NAV_HORIZONTAL_PADDING,
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 7,
  },
  navItem: {
    flex: 1,
    minHeight: 78,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 12,
  },
  activeBubble: {
    position: "absolute",
    top: -22,
    width: ACTIVE_BUBBLE_SIZE,
    height: ACTIVE_BUBBLE_SIZE,
    borderRadius: ACTIVE_BUBBLE_SIZE / 2,
    backgroundColor: "#FF6A47",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 9,
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
    color: "#141821",
    textAlign: "center",
  },
});
