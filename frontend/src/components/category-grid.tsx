import { useState } from "react";
import { View, Text, Pressable } from "react-native";
import Ionicons from "@react-native-vector-icons/ionicons";
import { Category } from "@/src/api";
import { makeStyles, useTheme, spacing, radius, typography, withAlpha } from "@/src/theme";
import { useI18n } from "@/src/i18n";
import { CategoryArtwork } from "./category-artwork";

export const ALL_ID = "all";

// Shared toggle logic: "all" is exclusive with specific categories.
export function toggleInterest(prev: Set<string>, id: string): Set<string> {
  const next = new Set(prev);
  if (id === ALL_ID) {
    return next.has(ALL_ID) ? new Set() : new Set([ALL_ID]);
  }
  next.delete(ALL_ID);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

// A clean, centred 3-column picker: a full-width "any topic" card on top, then
// Original single-subject artwork fills each tile; the dark label scrim keeps
// the name/count readable. The approved SVG family is preserved as fallback.
// Selecting a tile tints its border and shows a check. `compact` is accepted for API
// compatibility; the layout is the same everywhere.
export function CategoryGrid({
  categories, selected, onToggle, modes,
}: { categories: Category[]; selected: Set<string>; onToggle: (id: string) => void; compact?: boolean; modes?: ("stories" | "lessons")[] }) {
  const allActive = selected.has(ALL_ID);
  const { t } = useI18n();
  const styles = useStyles();
  const { colors } = useTheme();
  // Larghezza tessere dal contenitore misurato: sempre 3 colonne centrate,
  // anche su schermi stretti (con le percentuali scendeva a 2 per riga).
  const [gridW, setGridW] = useState(0);
  const tileW = gridW > 0 ? Math.floor((gridW - spacing.xs * 2 - spacing.sm * 2) / 3) : undefined;

  // Count label reflects which content modes are active (curiosities / lessons
  // / both) so the numbers match what the user will actually receive.
  const showStories = !modes || modes.includes("stories");
  const showLessons = !!modes && modes.includes("lessons");
  const countFor = (c: Category): string => {
    if (showStories && showLessons) return `${c.story_count + c.lesson_count} ${t.items_n}`;
    if (showLessons && !showStories) return `${c.lesson_count} ${t.lessons_n}`;
    return `${c.story_count} ${t.stories_n}`;
  };

  return (
    <View testID="category-grid">
      <Pressable
        testID="chip-all"
        onPress={() => onToggle(ALL_ID)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: allActive }}
        accessibilityLabel={t.any_topic}
        style={({ pressed }) => [
          styles.allCard,
          allActive && { borderColor: colors.cyan + "AA" },
          pressed && styles.pressed,
        ]}
      >
        <CategoryArtwork category={{ id: "all", color: colors.cyan }} wide testID="category-art-all" />
        <View style={styles.allText}>
          <Text testID="category-all-name" style={styles.allName} numberOfLines={2}>{t.any_topic}</Text>
          <Text testID="category-all-subtitle" style={styles.allSub} numberOfLines={2}>{t.any_topic_sub}</Text>
        </View>
        {allActive ? <SelectionMark id="all" color={colors.cyan} /> : null}
      </Pressable>

      <View style={styles.grid} onLayout={(e) => setGridW(Math.round(e.nativeEvent.layout.width))}>
        {tileW ? categories.map((c) => {
          const active = selected.has(c.id);
          return (
            <Pressable
              key={c.id}
              testID={`chip-${c.id}`}
              onPress={() => onToggle(c.id)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: active }}
              accessibilityLabel={`${c.name}, ${countFor(c)}`}
              style={({ pressed }) => [
                styles.tile,
                { width: tileW },
                active && {
                  borderColor: c.color + "AA",
                },
                pressed && styles.pressed,
              ]}
            >
              <CategoryArtwork category={c} testID={`category-art-${c.id}`} />
              {active ? <SelectionMark id={c.id} color={c.color} /> : null}
              <View style={styles.labels}>
                <Text testID={`category-name-${c.id}`} style={styles.tileName} numberOfLines={2}>{c.name}</Text>
                <Text testID={`category-count-${c.id}`} style={styles.tileCount} numberOfLines={1}>{countFor(c)}</Text>
              </View>
            </Pressable>
          );
        }) : null}
      </View>
    </View>
  );
}

function SelectionMark({ id, color }: { id: string; color: string }) {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View testID={`category-selected-${id}`} style={[styles.badge, { backgroundColor: color }]}>
      <Ionicons name="checkmark" size={12} color={colors.artworkSurface} />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  allCard: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md, minHeight: 84,
    borderRadius: radius.lg, marginBottom: spacing.md,
    backgroundColor: colors.artworkSurface, borderWidth: 1, borderColor: withAlpha(colors.onGradient, 0.12), overflow: "hidden",
  },
  allText: { width: "68%" },
  allName: {
    color: colors.onGradient, fontFamily: typography.bodyBold, fontSize: 15,
    textShadowColor: withAlpha(colors.artworkSurface, 0.9), textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6,
  },
  allSub: {
    color: withAlpha(colors.onGradient, 0.8), fontFamily: typography.body, fontSize: 11, lineHeight: 15, marginTop: 3,
    textShadowColor: withAlpha(colors.artworkSurface, 0.9), textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 5,
  },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, paddingTop: spacing.xs, paddingHorizontal: spacing.xs, justifyContent: "center" },
  tile: {
    aspectRatio: 0.86, minHeight: 112, justifyContent: "flex-end", overflow: "visible",
    borderRadius: radius.lg,
    backgroundColor: colors.artworkSurface, borderWidth: 1, borderColor: withAlpha(colors.onGradient, 0.12),
  },
  labels: { paddingHorizontal: 5, paddingBottom: 9, gap: 3, alignItems: "center" },
  badge: {
    position: "absolute", top: 7, right: 7, width: 18, height: 18, borderRadius: 5,
    alignItems: "center", justifyContent: "center",
  },
  tileName: { color: colors.onGradient, fontFamily: typography.bodyBold, fontSize: 12, lineHeight: 15, textAlign: "center" },
  tileCount: { color: withAlpha(colors.onGradient, 0.68), fontFamily: typography.body, fontSize: 10, lineHeight: 12, textAlign: "center" },
  pressed: { opacity: 0.86, transform: [{ scale: 0.98 }] },
}));
