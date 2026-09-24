// PAUSE — fine della storia nella lettura verticale: conclusione "Da
// ricordare" in una card di vetro molto trasparente (lo sfondo resta
// protagonista), Mi piace + Salva affiancati, Condividi sotto e, spinto in
// fondo alla pagina, il passo successivo: "Prosegui con un'altra notizia".
import { View, Text, LayoutChangeEvent } from "react-native";
import Ionicons from "@react-native-vector-icons/ionicons";

import { Story } from "@/src/api";
import { makeStyles, useTheme, spacing, typography, withAlpha } from "@/src/theme";
import { useI18n } from "@/src/i18n";
import { GlassSurface, GlowButton, GlowOrb } from "@/src/components/glass";
import { READER_MAX_W, SectionDivider } from "@/src/components/reader-section";
import { EndActionButton } from "@/src/components/end-action-button";

type Props = {
  story: Story;
  liked: boolean;
  onLike: () => void;
  bookmarked: boolean;
  onBookmark: () => void;
  onShare: () => void;
  onNext: () => void;
  bottomInset: number;
  onLayout: (e: LayoutChangeEvent) => void;
};

export function ReaderEnding({ story, liked, onLike, bookmarked, onBookmark, onShare, onNext, bottomInset, onLayout }: Props) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { t } = useI18n();

  return (
    <View style={[styles.section, { paddingBottom: bottomInset + spacing.xxl }]} onLayout={onLayout} testID="deep-dive-page-end">
      <SectionDivider color={colors.warning} />
      <GlassSurface
        intensity="soft"
        highlight={false}
        borderColor={withAlpha(colors.warning, 0.28)}
        glow
        glowColor={withAlpha(colors.warning, 0.1)}
        style={styles.card}
        contentStyle={styles.cardInner}
        testID="summary-card"
      >
        <View style={styles.eyebrowRow}>
          <Ionicons name="star" size={12} color={colors.warning} />
          <Text style={[styles.eyebrow, { color: colors.warning }]}>{t.remember}</Text>
        </View>
        <Text style={styles.summary}>{story.summary}</Text>
      </GlassSurface>

      {/* Mi piace + Salva affiancati; Condividi sotto, centrato. Ogni tasto
          mostra la propria conferma sopra di sé (vedi EndActionButton). */}
      <View style={styles.endActions} testID="deep-dive-actions">
        <View style={styles.endRow}>
          <EndActionButton
            icon={liked ? "heart" : "heart-outline"}
            label={t.i_like}
            active={liked}
            tint={colors.error}
            toastText={liked ? t.toast_unliked : t.toast_liked}
            onPress={onLike}
            style={styles.half}
            testID="like-button"
          />
          <EndActionButton
            icon={bookmarked ? "bookmark" : "bookmark-outline"}
            label={t.save_verb}
            active={bookmarked}
            tint={colors.cyan}
            toastText={bookmarked ? t.toast_unsaved : t.toast_saved}
            onPress={onBookmark}
            style={styles.half}
            testID="bookmark-button"
          />
        </View>
        <EndActionButton
          icon="share-outline"
          label={t.share}
          onPress={onShare}
          style={styles.shareBtn}
          testID="share-story"
        />
      </View>

      {/* Azione principale dopo la storia: staccata, in fondo alla pagina. */}
      <GlowButton onPress={onNext} height={62} style={styles.next} contentStyle={styles.nextInner} testID="next-story" accessibilityLabel={t.next_story}>
        <Text style={styles.nextLabel} numberOfLines={2}>{t.next_story}</Text>
        <GlowOrb size={34}>
          <Ionicons name="arrow-forward" size={18} color={colors.onGradient} />
        </GlowOrb>
      </GlowButton>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  section: {
    width: "100%", maxWidth: READER_MAX_W, alignSelf: "center",
    paddingHorizontal: spacing.xl, paddingTop: spacing.lg, gap: spacing.lg,
  },
  // Vetro quasi invisibile: solo un velo leggero sopra la copertina.
  card: { backgroundColor: "transparent" },
  cardInner: { padding: spacing.lg + 2, gap: spacing.md },
  eyebrowRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  eyebrow: { fontFamily: typography.bodyBold, fontSize: 11, letterSpacing: 2 },
  summary: {
    color: colors.textWarm, fontFamily: typography.bodyMedium, fontSize: 18, lineHeight: 30, letterSpacing: 0.1,
    textShadowColor: withAlpha(colors.surface, 0.6), textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 8,
  },

  endActions: { gap: spacing.md, alignItems: "center" },
  endRow: { flexDirection: "row", gap: spacing.md, alignSelf: "stretch" },
  half: { flex: 1 },
  shareBtn: { alignSelf: "center", minWidth: "58%" },

  next: { marginTop: spacing.xxxl + spacing.xl, marginBottom: spacing.md },
  nextInner: { justifyContent: "space-between", paddingHorizontal: spacing.lg + 4 },
  nextLabel: { flexShrink: 1, color: colors.textWarm, fontFamily: typography.bodyBold, fontSize: 16.5, letterSpacing: 0.1 },
}));
