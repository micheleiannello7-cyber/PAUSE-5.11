// PAUSE — griglia informativa della storia (presentazione, sotto l'introduzione):
// tre celle in vetro leggero — Tipo di storia · Categoria (icona 3D) · Tempo di
// lettura. Dati presi dalla storia stessa, nessuna chiamata in più.
import { View, Text } from "react-native";
import { BlurView } from "expo-blur";
import { StyleSheet } from "react-native";
import Ionicons from "@react-native-vector-icons/ionicons";

import { StoryPreview, isLesson } from "@/src/api";
import { makeStyles, radius, spacing, typography, useTheme, withAlpha } from "@/src/theme";
import { useI18n } from "@/src/i18n";
import { KindIcon } from "./kind-icon";
import { CategoryArtMark } from "./category-artwork";

export function StoryInfoGrid({ story, minutes, testID = "story-info-grid" }: { story: StoryPreview; minutes: number; testID?: string }) {
  const styles = useStyles();
  const { colors, scheme } = useTheme();
  const { t } = useI18n();
  const lesson = isLesson(story);
  const category = story.category_name.split("·")[0].trim();
  const tint = scheme === "dark" ? "dark" : "light";
  const cells = [
    { id: "kind", label: t.info_kind, value: lesson ? t.lesson_badge : t.curiosity_badge, glow: colors.cyan,
      icon: <KindIcon kind={lesson ? "lessons" : "stories"} size={30} glow={false} testID={`${testID}-kind-icon`} /> },
    { id: "category", label: t.info_category, value: category, glow: story.category_color,
      icon: <CategoryArtMark categoryId={story.category_id} color={story.category_color} size={32} testID={`${testID}-category-icon`} /> },
    { id: "time", label: t.info_time, value: `${minutes} ${t.min}`, glow: colors.brand,
      icon: <Ionicons name="time-outline" size={26} color={colors.brand} /> },
  ];
  return (
    <View style={styles.grid} testID={testID}>
      {cells.map((c) => (
        <View key={c.id} style={styles.cell} testID={`${testID}-${c.id}`}>
          <BlurView pointerEvents="none" tint={tint} intensity={18} style={StyleSheet.absoluteFill} />
          <View pointerEvents="none" style={[styles.glow, { backgroundColor: withAlpha(c.glow, 0.16) }]} />
          <Text style={styles.label} numberOfLines={1} testID={`${testID}-${c.id}-label`}>{c.label}</Text>
          <View style={styles.iconWrap}>{c.icon}</View>
          <Text style={styles.value} numberOfLines={2} testID={`${testID}-${c.id}-value`}>{c.value}</Text>
        </View>
      ))}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  grid: { flexDirection: "row", gap: spacing.sm + 2 },
  cell: {
    flex: 1, minHeight: 112, paddingVertical: spacing.md, paddingHorizontal: spacing.sm, gap: 6,
    alignItems: "center", justifyContent: "space-between", borderRadius: radius.lg, overflow: "hidden",
    backgroundColor: withAlpha(colors.onGradient, 0.05), borderWidth: 1, borderColor: withAlpha(colors.onGradient, 0.14),
  },
  glow: { position: "absolute", top: -30, left: "20%", right: "20%", height: 60, borderRadius: 40, opacity: 0.9 },
  label: { color: withAlpha(colors.textWarm, 0.6), fontFamily: typography.bodyBold, fontSize: 9, letterSpacing: 1.6, textTransform: "uppercase", textAlign: "center" },
  iconWrap: { height: 34, alignItems: "center", justifyContent: "center" },
  value: { color: colors.textWarm, fontFamily: typography.bodyBold, fontSize: 13, lineHeight: 16, textAlign: "center" },
}));
