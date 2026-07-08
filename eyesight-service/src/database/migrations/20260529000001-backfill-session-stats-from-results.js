/**
 * Backfill session-level and result-level stats for historical data.
 *
 * Background:
 *   ExerciseSessions.duration has always been NULL in production — the old code
 *   never wrote it. The focus-tracking columns (pauseCount, inactivityCount,
 *   focusScore) were added later and default to 0 / 0 / 100.
 *
 *   ExerciseResults.duration IS reliable — the frontend has always reported it.
 *   However 10 passed/failed results have duration = NULL (edge case where the
 *   frontend submit was missing the field).
 *
 * WARNING — NOT USING endedAt - startedAt FOR DURATION:
 *   ExerciseSessions.startedAt is set to midnight of the assignment date, NOT
 *   the moment the patient actually pressed "Start". Therefore
 *   endedAt - startedAt ranges from 2s to 70 days (median ~4h), making it
 *   completely unreliable as a duration proxy. Step 1 below deliberately
 *   avoids timestamp arithmetic and only uses result-level durations.
 *
 * What this migration does (in order):
 *
 *   Step 1 — Fix NULL durations on ExerciseResults.
 *     Set duration = 0 for passed/failed results where duration IS NULL.
 *     These are unrecoverable (frontend didn't send the value). Setting to 0
 *     is honest: it contributes nothing to sums rather than silently being
 *     excluded.
 *
 *   Step 2 — Backfill ExerciseSessions.duration from result sums.
 *     For completed sessions with duration IS NULL, set
 *     session.duration = SUM(completed_results.duration).
 *     This is always safe — er.duration is the ground truth.
 *
 *   Step 3 — Backfill ExerciseSessions focus fields from results.
 *     Recalculate pauseCount, inactivityCount, focusScore for every completed
 *     session. For old data: counts are 0 → focusScore stays 100 (correct —
 *     we have no evidence of pausing before the tracking feature was deployed).
 *
 *   Step 4 — Recalculate ExerciseResults.focusScore.
 *     Ensures stored focusScore = max(0, 100 - pauseCount - inactivityCount)
 *     for every completed result.
 *
 * Rollback:
 *   No safe automatic rollback for a data-correction migration.
 *   To undo: restore from a pre-migration backup.
 */
module.exports = {
  up: async (queryInterface) => {
    // ── Step 1: Fix NULL durations on ExerciseResults ─────────────────────────
    // 10 passed/failed results have duration = NULL. The actual duration cannot
    // be recovered; setting to 0 is the honest minimum.
    await queryInterface.sequelize.query(`
      UPDATE "ExerciseResults"
      SET duration = 0
      WHERE status IN ('passed', 'failed')
        AND deleted = false
        AND duration IS NULL
    `);

    // ── Step 2: Backfill ExerciseSessions.duration from result sums ───────────
    // Only sets sessions that have NULL duration. Does not touch sessions that
    // already have a value (e.g., set by the new updateSessionStats code).
    await queryInterface.sequelize.query(`
      UPDATE "ExerciseSessions" es
      SET duration = COALESCE((
        SELECT SUM(er.duration)
        FROM "ExerciseResults" er
        WHERE er."exerciseSessionId" = es.id
          AND er.status IN ('passed', 'failed')
          AND er.deleted = false
      ), 0)
      WHERE es.status = 'completed'
        AND es.deleted = false
        AND es.duration IS NULL
    `);

    // ── Step 3: Backfill ExerciseSessions focus fields from results ────────────
    // Recalculates pauseCount, inactivityCount, focusScore for all completed
    // sessions using the sum of their completed/failed results.
    // Old data: pauseCount = 0, inactivityCount = 0 → focusScore = 100.
    // This is the correct/honest default: no pause events were recorded before
    // the focus tracking feature was deployed.
    await queryInterface.sequelize.query(`
      UPDATE "ExerciseSessions" es
      SET
        "pauseCount" = COALESCE((
          SELECT SUM(er."pauseCount")
          FROM "ExerciseResults" er
          WHERE er."exerciseSessionId" = es.id
            AND er.status IN ('passed', 'failed')
            AND er.deleted = false
        ), 0),
        "inactivityCount" = COALESCE((
          SELECT SUM(er."inactivityCount")
          FROM "ExerciseResults" er
          WHERE er."exerciseSessionId" = es.id
            AND er.status IN ('passed', 'failed')
            AND er.deleted = false
        ), 0),
        "focusScore" = GREATEST(0, 100 - COALESCE((
          SELECT SUM(er."pauseCount") + SUM(er."inactivityCount")
          FROM "ExerciseResults" er
          WHERE er."exerciseSessionId" = es.id
            AND er.status IN ('passed', 'failed')
            AND er.deleted = false
        ), 0))
      WHERE es.status = 'completed'
        AND es.deleted = false
    `);

    // ── Step 4: Recalculate ExerciseResults.focusScore ────────────────────────
    // Ensures every completed/failed result has a consistent
    // focusScore = max(0, 100 - pauseCount - inactivityCount).
    await queryInterface.sequelize.query(`
      UPDATE "ExerciseResults"
      SET "focusScore" = GREATEST(0, 100 - "pauseCount" - "inactivityCount")
      WHERE status IN ('passed', 'failed')
        AND deleted = false
    `);
  },

  down: async () => {
    // No safe automatic rollback for a data-correction migration.
    // To undo: restore the database from a pre-migration backup.
  },
};
