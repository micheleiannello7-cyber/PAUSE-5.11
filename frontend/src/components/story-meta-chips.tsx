// PAUSE — riga dei badge della card Home: a sinistra tipo (Curiosità / Mini
// lezione) + categoria nella stessa pillola, a destra la durata. Nel lettore
// le stesse informazioni vivono nella griglia StoryInfoGrid.
import { View, Text, StyleProp, ViewStyle } from "react-native";
import Ionicons from "@react-native-vector-icons/ionicons";

import { StoryPreview, isLesson } from "@/src/api";
import { makeStyles, typography, useTheme } from "@/src/theme";
import { useI18n } from "@/src/i18n";
import { CategoryIcon } from "./category-icon";
import { KindIcon } from "./kind-icon";

export function StoryMetaChips({
  story, minutes, idPrefix, style,
}: {
  story: StoryPreview;
  minutes: number;
  /** Prefix for testIDs: `${idPrefix}-kind`, `-category`, `-duration`. */
  idPrefix: string;
  style?: StyleProp<ViewStyle>;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { t } = useI18n();
  const lesson = isLesson(story);
  const kind = lesson ? "lessons" : "stories";
  const kindLabel = lesson ? t.lesson_badge : t.curiosity_badge;
  const category = story.category_name.split("·")[0].trim();

  return (
    <View style={[styles.row, style]} testID={`${idPrefix}-meta`}>
      <View style={styles.chips}>
        <View testID={`${idPrefix}-kind`} style={styles.kind}>
          <KindIcon kind={kind} size={18} glow={false} testID={`${idPrefix}-kind-icon`} />
          <Text testID={`${idPrefix}-kind-label`} style={styles.kindText} numberOfLines={1}>{kindLabel}</Text>
        </View>
        <View style={styles.divider} />
        <View testID={`${idPrefix}-category`} style={styles.category}>
          <CategoryIcon categoryId={story.category_id} color={story.category_color} highlightColor={colors.onGradient} size={13} testID={`${idPrefix}-category-icon`} />
          <Text testID={`${idPrefix}-category-label`} style={styles.categoryText} numberOfLines={1}>{category}</Text>
        </View>
      </View>
      <View testID={`${idPrefix}-duration`} style={styles.durationPill}>
        <Ionicons name="time-outline" size={13} color={colors.onGradient} />
        <Text testID={`${idPrefix}-duration-label`} style={styles.duration}>{minutes} {t.min}</Text>
      </View>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  // --- sm: card della Home (tipo + categoria in una pillola, durata a destra)
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 7 },
  chips: { flexShrink: 1, maxWidth: "77%", flexDirection: "row", alignItems: "center", borderRadius: 30, borderWidth: 1, borderColor: colors.glassBorderStrong, backgroundColor: colors.scrim, overflow: "hidden" },
  kind: { flexDirection: "row", alignItems: "center", gap: 4, paddingLeft: 4, paddingRight: 8, minHeight: 26, backgroundColor: colors.cyanGlowSoft, borderRadius: 30 },
  kindText: { fontFamily: typography.bodyBold, fontSize: 8, letterSpacing: 0.6, color: colors.onGradient, flexShrink: 1 },
  divider: { height: 10, width: 1, backgroundColor: colors.glassBorderStrong },
  category: { flexShrink: 1, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 7 },
  categoryText: { flexShrink: 1, color: colors.onGradient, fontFamily: typography.bodyBold, fontSize: 8, letterSpacing: 0.5, textTransform: "uppercase" },
  durationPill: { flexShrink: 0, flexDirection: "row", alignItems: "center", gap: 4, borderRadius: 30, minHeight: 26, paddingHorizontal: 8, backgroundColor: colors.scrim },
  duration: { color: colors.onGradient, fontFamily: typography.bodyMedium, fontSize: 10 },
}));
