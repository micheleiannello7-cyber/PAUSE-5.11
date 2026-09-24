import { Pressable, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@react-native-vector-icons/ionicons";
import { useRouter } from "expo-router";
import { makeStyles, typography, useTheme, withAlpha } from "@/src/theme";
import { useI18n } from "@/src/i18n";

export function HomeReadingProgress({ count }: { count: number }) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const styles = useStyles();
  const router = useRouter();
  // A reading milestone, not a session limit. Grows only after completing 20.
  const goal = Math.max(20, Math.ceil(count / 20) * 20);
  const label = count === 1 ? t.home_read_count_one : t.home_read_count.replace("{count}", String(count));
  return (
    <Pressable testID="home-reading-progress" accessibilityRole="button" accessibilityLabel={`${label}. ${count} / ${goal}. ${t.stats_row}`} onPress={() => router.push("/stats")} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <LinearGradient colors={[withAlpha(colors.brandSecondary, 0.35), withAlpha(colors.cyan, 0.12), withAlpha(colors.brand, 0.24)]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.row}>
        <View style={styles.orb}><Ionicons name="book-outline" size={23} color={colors.onSurface} /></View>
        <View style={styles.copy}>
          <Text testID="home-reading-count" style={styles.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>{label}</Text>
          <Text testID="home-reading-caption" style={styles.subtitle} numberOfLines={1}>{t.home_read_caption}</Text>
        </View>
        <View testID="home-reading-track" style={styles.track} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: goal, now: count }}>
          <LinearGradient colors={[colors.cyan, colors.brand]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.fill, { width: `${Math.min(count / goal, 1) * 100}%` }]} />
        </View>
        <Text testID="home-reading-goal" style={styles.counter}>{count} / {goal}</Text>
      </LinearGradient>
    </Pressable>
  );
}

const useStyles = makeStyles((colors) => ({
  card: { height: 56, overflow: "hidden", borderRadius: 19, borderWidth: 1, borderColor: withAlpha(colors.cyanSoft, 0.38), backgroundColor: colors.surfaceSecondary },
  row: { flex: 1, flexDirection: "row", alignItems: "center", paddingHorizontal: 10, gap: 9 },
  orb: { width: 33, height: 33, borderRadius: 18, alignItems: "center", justifyContent: "center", backgroundColor: colors.cyanGlowSoft, borderWidth: 1, borderColor: colors.glassHighlight },
  copy: { flex: 1.7, gap: 2 },
  title: { color: colors.onSurface, fontFamily: typography.bodyBold, fontSize: 10.5 },
  subtitle: { color: colors.onSurfaceTertiary, fontFamily: typography.body, fontSize: 9 },
  track: { flex: 1, height: 7, borderRadius: 8, overflow: "hidden", backgroundColor: colors.track },
  fill: { height: "100%", borderRadius: 8 },
  counter: { color: colors.onSurfaceTertiary, fontFamily: typography.bodyMedium, fontSize: 10 },
  pressed: { opacity: 0.83 },
}));