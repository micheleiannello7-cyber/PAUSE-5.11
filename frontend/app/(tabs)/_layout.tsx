import { Tabs } from "expo-router";
import { Platform, ColorValue, StyleSheet, View } from "react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@react-native-vector-icons/ionicons";
import { useTheme, typography } from "@/src/theme";
import { useLimitGate } from "@/src/hooks/use-limit-gate";
import { useI18n } from "@/src/i18n";

export default function TabsLayout() {
  // Global limit gate — polls backend and redirects to /pause-limit if blocked.
  useLimitGate();
  const { t } = useI18n();
  const { colors, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const isDark = scheme === "dark";
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.cyan,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: {
          fontFamily: typography.bodyMedium,
          fontSize: 11,
          marginTop: 3,
        },
        tabBarItemStyle: { minHeight: 44 },
        tabBarStyle: {
          backgroundColor: "transparent",
          borderTopColor: colors.glassBorder,
          borderTopWidth: 1,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          overflow: "hidden",
          height: 64 + Math.max(insets.bottom, 10),
          paddingTop: 7,
          paddingBottom: Math.max(insets.bottom, 10),
        },
        tabBarBackground: () => (
          <View style={StyleSheet.absoluteFill}>
            <BlurView
              intensity={38}
              tint={isDark ? "dark" : "light"}
              experimentalBlurMethod="dimezisBlurView"
              style={StyleSheet.absoluteFill}
            />
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: colors.overlay, pointerEvents: "none" },
              ]}
            />
          </View>
        ),
        sceneStyle: { backgroundColor: colors.surface },
        // Web's shift driver can retain a translated scene after rapid tab changes.
        // Keep the native transition; web switches tabs without a stale transform.
        animation: Platform.OS === "web" ? "none" : "shift",
      }}
    >
      <Tabs.Screen
        name="discover"
        options={{
          title: t.tab_home,
          tabBarButtonTestID: "tab-home",
          tabBarIcon: ({ color, focused }) => <TabIcon name="home" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: t.tab_explore,
          tabBarButtonTestID: "tab-explore",
          tabBarIcon: ({ color, focused }) => <TabIcon name="grid" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="bookmarks"
        options={{
          title: t.tab_saved,
          tabBarButtonTestID: "tab-saved",
          tabBarIcon: ({ color, focused }) => <TabIcon name="bookmark" color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t.tab_profile,
          tabBarButtonTestID: "tab-profile",
          tabBarIcon: ({ color, focused }) => <TabIcon name="person" color={color} focused={focused} />,
        }}
      />
    </Tabs>
  );
}

function TabIcon({ name, color, focused }: { name: string; color: ColorValue; focused: boolean }) {
  return <Ionicons name={(focused ? name : name + "-outline") as any} size={26} color={color} />;
}
