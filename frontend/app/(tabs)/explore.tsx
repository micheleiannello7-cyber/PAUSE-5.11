import { useEffect, useState } from "react";
import { View, Text, ScrollView, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { api } from "@/src/api";
import { makeStyles, useTheme, spacing, typography } from "@/src/theme";
import { useUserId } from "@/src/session";
import { CategoryGrid, toggleInterest, ALL_ID } from "@/src/components/category-grid";
import { LimitBadge } from "@/src/components/limit-badge";
import { useI18n } from "@/src/i18n";
import { CoachTip } from "@/src/coach-tips";

// Topics: pick / change interests any time. Saves immediately.
export default function Explore() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const userId = useUserId();
  const { t } = useI18n();
  const styles = useStyles();
  const { colors } = useTheme();

  const { data: categories, isLoading } = useQuery({ queryKey: ["categories"], queryFn: api.categories });
  const { data: user } = useQuery({
    queryKey: ["user", userId],
    queryFn: () => api.user(userId!),
    enabled: !!userId,
  });

  const [selected, setSelected] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (user) setSelected(new Set(user.interests));
  }, [user]);

  const save = useMutation({
    mutationFn: (interests: string[]) => api.setInterests(userId!, interests),
    onSuccess: (state) => {
      qc.setQueryData(["user", userId], state);
      qc.invalidateQueries({ queryKey: ["discover-next"] });
    },
  });

  const onToggle = (id: string) => {
    const next = toggleInterest(selected, id);
    setSelected(next);
    if (userId) save.mutate(Array.from(next));
  };

  const count = selected.has(ALL_ID) ? categories?.length ?? 0 : selected.size;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <CoachTip id="topics" text={t.tip_topics} icon="grid-outline" style={{ bottom: insets.bottom + spacing.md }} />
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>{t.explore_title}</Text>
          <LimitBadge testID="explore-limit-badge" />
        </View>
        <Text style={styles.subtitle}>{t.explore_sub}</Text>
      </View>

      {isLoading || !categories ? (
        <ActivityIndicator color={colors.brand} style={{ marginTop: spacing.xxl }} />
      ) : (
        <View style={styles.content}>
          <View style={styles.statusRow}>
            <Text style={styles.status} testID="interests-count">
              {count === 0 ? t.no_interests : `${count} ${count === 1 ? t.interest_1 : t.interests}`}
            </Text>
            {save.isPending ? <ActivityIndicator size="small" color={colors.brand} /> : null}
          </View>
          {/* Compact 3-column grid: every category visible without scrolling. */}
          <ScrollView showsVerticalScrollIndicator={false} bounces={false} contentContainerStyle={{ paddingBottom: insets.bottom + spacing.md }}>
            <CategoryGrid
              compact
              categories={categories}
              selected={selected}
              modes={user?.content_modes}
              onToggle={onToggle}
            />
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: { flex: 1, backgroundColor: colors.surface },
  header: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.md },
  headerTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { color: colors.onSurface, fontFamily: typography.displayBold, fontSize: 26 },
  subtitle: { color: colors.muted, fontFamily: typography.body, fontSize: 13, lineHeight: 18, marginTop: spacing.xs },
  content: { flex: 1, paddingHorizontal: spacing.xl },
  statusRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: spacing.xs, marginBottom: spacing.sm, minHeight: 20 },
  status: { color: colors.brand, fontFamily: typography.bodyBold, fontSize: 11, letterSpacing: 1.5, textTransform: "uppercase" },
}));
