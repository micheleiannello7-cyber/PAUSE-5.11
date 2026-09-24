# PAUSE — final cover batch verification

## Resolved findings from iteration_5
- Baseline179 belongs to the three-cover pilot, not the second batch. Its baseline182
  correctly includes the three newly added covers. Both snapshots are now checked;
  all original179 references and the pilot generated references are preserved.
- Production process used `python -u generate_covers.py`. The original test's exact
  process pattern omitted `-u`. The process was live and continued generating, not stale.
- The dry-run test now holds a real OS lock and verifies duplicate prevention without
  making paid calls, regardless of whether a real batch is currently active.
- Test subprocess uses `sys.executable`, avoiding login-shell interpreter differences.
- A genuine startup issue reintroduced excluded fallback photos under newly generated
  covers. Seed now preserves fallback metadata with generated covers. Reconciled only
  new cover IDs; existing179 were not edited.

## Final state
- 194 new covers (3 pilot, 187 immediate main successes, 4 recovered paid originals).
- 373 covered stories/lessons out of437; remaining64. Main run stopped on budget error.
- Four recovered IDs: v5-lez-decisioni, v5-lez-stress, v8-why-are-flamingos-pink,
  v8-how-do-fireflies-make-light-without-heat. Recovery made no image AI calls.
- No generation process is intentionally left running after the budget stop.
- Final automated regression: **5 passed**, no skipped tests, 34.82s.
  JUnit: `test_reports/pytest/cover_batch_final.xml`.
- Final dry run prints `missing covers: 64`; idempotent recovery prints194 linked.
- TTS and Stripe requests intentionally return503; health and all194×2 new media
  endpoints return200. No frontend edits needed; tested reader images are visible.