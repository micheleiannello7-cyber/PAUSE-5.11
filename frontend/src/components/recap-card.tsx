import { View, Text } from "react-native";
import Ionicons from "@react-native-vector-icons/ionicons";

import { StoryRecap } from "@/src/api";
import { makeStyles, useTheme, spacing, radius, typography } from "@/src/theme";
import { StoryHero } from "@/src/components/story-hero";
import { useI18n } from "@/src/i18n";

// Card of the session recap: thumbnail + title + "Da ricordare" summary point.
// Shared between /pause-limit and /read-stories.
export function RecapCard({ story, index }: { story: StoryRecap; index: number }) {
  const { t } = useI18n();
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.card} testID={`recap-${story.id}`}>
      <View style={styles.head}>
        <StoryHero story={story} style={styles.thumb} iconSize={22} size="thumb" />
        <View style={{ flex: 1 }}>
          <Text style={styles.meta}>{index} · {story.category_name.toUpperCase()}</Text>
          <Text style={styles.title} numberOfLines={2}>{story.title}</Text>
        </View>
      </View>
      <View style={styles.summary}>
        <View style={styles.summaryHead}>
          <Ionicons name="star" size={12} color={colors.warning} />
          <Text style={styles.summaryLabel}>{t.remember}</Text>
        </View>
        <Text style={styles.summaryText}>{story.summary}</Text>
      </View>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  card: {
    backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg, overflow: "hidden",
  },
  head: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md },
  thumb: { width: 56, height: 56, borderRadius: radius.md, backgroundColor: colors.surfaceTertiary, overflow: "hidden" },
  meta: { color: colors.brand, fontFamily: typography.bodyBold, fontSize: 10, letterSpacing: 1.5, marginBottom: 3 },
  title: { color: colors.onSurface, fontFamily: typography.displayBold, fontSize: 14, lineHeight: 19 },
  summary: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.md, gap: 6,
    borderTopWidth: 1, borderTopColor: colors.divider,
  },
  summaryHead: { flexDirection: "row", alignItems: "center", gap: 6 },
  summaryLabel: { color: colors.warning, fontFamily: typography.bodyBold, fontSize: 10, letterSpacing: 1.5 },
  summaryText: { color: colors.onSurfaceSecondary, fontFamily: typography.body, fontSize: 13, lineHeight: 20 },
}));
