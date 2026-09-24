import { useEffect, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import Ionicons from "@react-native-vector-icons/ionicons";
import { makeStyles, useTheme, radius, typography } from "@/src/theme";
import { useLimitGate } from "@/src/hooks/use-limit-gate";

// Session limit is tier-based: the limit-check response carries the right cap
// (5 for free, 6 for premium). Fall back to 5 while loading.

// Always-visible "reading of the day" indicator shown in every tab header:
// dots (filled = stories read, empty = remaining) plus an "N/limit" count.
// If the pause is actually enforcing AND the user is blocked, it turns into a
// tappable countdown pill instead.
export function LimitBadge({ testID = "limit-badge" }: { testID?: string }) {
  const router = useRouter();
  const data = useLimitGate();
  const [now, setNow] = useState(Date.now());
  const styles = useStyles();
  const { colors } = useTheme();

  const blockedUntilMs = data?.blocked_until ? Date.parse(data.blocked_until) : 0;
  const blocked = !!data?.enforce && blockedUntilMs > now;

  useEffect(() => {
    if (!blocked) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [blocked]);

  if (!data) return null;
  // Limit disabled → plain counter of what you've read this session, tap to
  // open the list (no dots / cap, nothing to enforce).
  if (!data.enforce) {
    return (
      <Pressable testID={testID} style={styles.pill} onPress={() => router.push("/read-stories")} accessibilityLabel="read-stories">
        <Ionicons name="book-outline" size={12} color={colors.brand} />
        <Text style={[styles.text, { color: colors.brand }]}>{data.session_count}</Text>
      </Pressable>
    );
  }

  const SESSION_LIMIT = data.limit ?? 5;

  // Blocked (only when the pause is enforcing): countdown to reopen.
  if (blocked) {
    const s = Math.max(0, Math.floor((blockedUntilMs - now) / 1000));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const label = h > 0 ? `${h}h ${m.toString().padStart(2, "0")}m` : `${m}m`;
    return (
      <Pressable onPress={() => router.push("/pause-limit")} testID={testID} style={[styles.pill, { borderColor: colors.brandSecondary + "55" }]}>
        <Ionicons name="hourglass-outline" size={12} color={colors.brandSecondary} />
        <Text style={[styles.text, { color: colors.brandSecondary }]}>{label}</Text>
      </Pressable>
    );
  }

  const read = Math.min(data.session_count, SESSION_LIMIT);
  const done = read >= SESSION_LIMIT;
  const accent = done ? colors.success : read >= SESSION_LIMIT - 1 ? colors.warning : colors.brand;

  return (
    <Pressable testID={testID} style={styles.pill} onPress={() => router.push("/read-stories")}>
      <Ionicons
        name={done ? "checkmark-done" : "book-outline"}
        size={12}
        color={accent}
      />
      <View style={styles.dots}>
        {Array.from({ length: SESSION_LIMIT }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              i < read ? { backgroundColor: accent } : { backgroundColor: colors.borderStrong },
            ]}
          />
        ))}
      </View>
      <Text style={[styles.text, { color: accent }]}>{read}/{SESSION_LIMIT}</Text>
    </Pressable>
  );
}

const useStyles = makeStyles((colors) => ({
  pill: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: colors.overlay, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 9, paddingVertical: 5, borderRadius: radius.pill,
  },
  dots: { flexDirection: "row", alignItems: "center", gap: 3 },
  dot: { width: 5, height: 5, borderRadius: 2.5 },
  text: { fontFamily: typography.bodyBold, fontSize: 11 },
}));
