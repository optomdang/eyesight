#!/usr/bin/env node
/**
 * Diagnose why an exercise session shows incomplete despite play time / scores.
 *
 * Usage:
 *   node scripts/diagnose-exercise-session.js --patient "Nguyễn Diệu Linh"
 *   node scripts/diagnose-exercise-session.js --session 12345
 *   node scripts/diagnose-exercise-session.js --assignment 67 --date 2026-07-13
 */
require('dotenv').config();

const { Sequelize } = require('sequelize');

const COMPLETION_THRESHOLD_PCT = 80;

const pct = (durationSec, assignedMin) => {
  const assignedSec = (Number(assignedMin) || 0) * 60;
  if (assignedSec <= 0) return durationSec > 0 ? 100 : 0;
  return Math.min(100, (Math.max(0, durationSec || 0) / assignedSec) * 100);
};

const isEnded = (r) => r.status === 'completed' || (r.status === 'incomplete' && (r.duration ?? 0) > 0);
const isFullyComplete = (durationSec, assignedMin) =>
  pct(durationSec, assignedMin) >= COMPLETION_THRESHOLD_PCT;

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    if (key.startsWith('--')) {
      out[key.slice(2)] = argv[i + 1];
      i += 1;
    }
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv);
  const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    logging: false,
    dialectOptions:
      process.env.DB_USE_SSL === 'true' || process.env.DB_USE_SSL === '1'
        ? { ssl: { require: true, rejectUnauthorized: false } }
        : {},
  });

  try {
    let sessionIds = [];

    if (args.session) {
      sessionIds = [Number(args.session)];
    } else if (args.assignment && args.date) {
      const [rows] = await sequelize.query(
        `
        SELECT es.id
        FROM "ExerciseSessions" es
        WHERE es."exerciseAssignmentId" = :assignmentId
          AND es."startedAt"::date = :date::date
          AND es.deleted = false
        ORDER BY es.id
        `,
        { replacements: { assignmentId: Number(args.assignment), date: args.date } }
      );
      sessionIds = rows.map((r) => r.id);
    } else if (args.patient) {
      const [rows] = await sequelize.query(
        `
        SELECT es.id
        FROM "ExerciseSessions" es
        JOIN "Patients" p ON p.id = es."patientId"
        JOIN "Users" u ON u.id = p."userId"
        WHERE u.name ILIKE :name
          AND es.deleted = false
        ORDER BY es."startedAt" DESC
        LIMIT 20
        `,
        { replacements: { name: `%${args.patient}%` } }
      );
      sessionIds = rows.map((r) => r.id);
    } else {
      console.error('Provide --session ID, or --assignment ID + --date YYYY-MM-DD, or --patient "Name"');
      process.exit(1);
    }

    if (!sessionIds.length) {
      console.log('No matching sessions found.');
      return;
    }

    for (const sessionId of sessionIds) {
      const [sessions] = await sequelize.query(
        `
        SELECT es.*, ec.name AS config_name, ec.duration AS config_duration,
               ec."executionCount" AS config_execution_count, e.name AS exercise_name, e."exerciseType"
        FROM "ExerciseSessions" es
        JOIN "ExerciseAssignments" ea ON ea.id = es."exerciseAssignmentId"
        JOIN "ExerciseConfigs" ec ON ec.id = ea."exerciseConfigId"
        JOIN "Exercises" e ON e.id = ec."exerciseId"
        WHERE es.id = :sessionId
        `,
        { replacements: { sessionId } }
      );
      const session = sessions[0];
      if (!session) continue;

      const [results] = await sequelize.query(
        `
        SELECT id, status, duration, score, "pauseCount", "inactivityCount",
               "completedAt", "startedAt", "createdAt", "updatedAt",
               "exerciseConfig"->>'duration' AS result_snapshot_duration
        FROM "ExerciseResults"
        WHERE "exerciseSessionId" = :sessionId AND deleted = false
        ORDER BY id
        `,
        { replacements: { sessionId } }
      );

      const snapDur = parseFloat(session.executionDuration);
      const snapCount = parseInt(session.executionCount, 10);
      const cfgDur = parseFloat(session.config_duration);
      const cfgCount = parseInt(session.config_execution_count, 10);
      const assignedMin = snapDur || cfgDur || 0;
      const requiredCount = snapCount || cfgCount || 1;

      const ended = results.filter(isEnded);
      const fullyComplete = ended.filter((r) => isFullyComplete(r.duration, assignedMin));

      console.log('\n══════════════════════════════════════════════════════════');
      console.log(`Session #${sessionId} — ${session.exercise_name} (${session.exerciseType})`);
      console.log(`Config: ${session.config_name}`);
      console.log(`Date: ${session.startedAt}`);
      console.log('──────────────────────────────────────────────────────────');
      console.log('SESSION ROW (DB):', {
        status: session.status,
        validExecutions: session.validExecutions,
        executionsCompleted: session.executionsCompleted,
        durationSec: session.duration,
        durationDisplay: session.duration ? `${Math.floor(session.duration / 60)}p ${session.duration % 60}s` : '-',
        bestScore: session.bestScore,
        snapshot_executionDuration_min: session.executionDuration,
        snapshot_executionCount: session.executionCount,
      });
      console.log('CURRENT CONFIG (UI "Thời lượng yêu cầu"):', {
        duration_per_slot_min: cfgDur,
        executionCount: cfgCount,
        total_required_display_min: cfgDur * cfgCount,
      });
      console.log('VALIDATION USES (snapshot at session create):', {
        assignedMin_per_slot: assignedMin,
        requiredValidSlots: requiredCount,
      });
      console.log('RECOMPUTED FROM RESULTS:', {
        endedSlots: ended.length,
        fullyCompleteSlots: fullyComplete.length,
        wouldBeSessionComplete: fullyComplete.length >= requiredCount,
      });

      if (snapDur && cfgDur && Math.abs(snapDur - cfgDur) > 0.01) {
        console.log('\n⚠️  SNAPSHOT MISMATCH: session.executionDuration ≠ current config.duration');
        console.log(`   Chấm điểm dùng ${assignedMin} phút/lượt; UI hiển thị ${cfgDur} phút/lượt.`);
      }

      console.log('\nRESULTS:');
      for (const r of results) {
        const snapResultDur = r.result_snapshot_duration ? parseFloat(r.result_snapshot_duration) : null;
        console.log(`  #${r.id}`, {
          status: r.status,
          durationSec: r.duration,
          durationMin: r.duration ? (r.duration / 60).toFixed(1) : 0,
          score: r.score,
          timePct_vs_sessionSnap: `${pct(r.duration, assignedMin).toFixed(1)}%`,
          timePct_vs_resultSnap: snapResultDur
            ? `${pct(r.duration, snapResultDur).toFixed(1)}%`
            : 'n/a',
          valid_vs_sessionSnap: isFullyComplete(r.duration, assignedMin),
          pauseCount: r.pauseCount,
          completedAt: r.completedAt,
          ended: isEnded(r),
        });
      }

      // Diagnosis
      console.log('\nDIAGNOSIS:');
      if (!ended.length) {
        console.log('  → Chưa có lượt nào kết thúc (chưa complete / pause có duration).');
      } else if (fullyComplete.length < requiredCount) {
        if (fullyComplete.length === 0) {
          const maxPct = Math.max(...ended.map((r) => pct(r.duration, assignedMin)));
          if (maxPct < COMPLETION_THRESHOLD_PCT) {
            console.log(
              `  → Có ${ended.length} lượt đã chơi nhưng KHÔNG lượt nào đạt ≥${COMPLETION_THRESHOLD_PCT}% thời gian giao (${assignedMin} phút/lượt).`
            );
            console.log(`     Cao nhất: ${maxPct.toFixed(1)}% — cần ≥${COMPLETION_THRESHOLD_PCT}%.`);
            if (snapDur && cfgDur && snapDur > cfgDur) {
              console.log(
                `     Khả năng cao: bác sĩ đã giảm thời lượng config (${cfgDur}p) nhưng phiên chấm theo snapshot cũ (${snapDur}p/lượt).`
              );
            }
          }
        }
        if (fullyComplete.length > 0 && fullyComplete.length < requiredCount) {
          console.log(
            `  → Đã có ${fullyComplete.length}/${requiredCount} lượt hợp lệ — thiếu ${requiredCount - fullyComplete.length} lượt nữa.`
          );
        }
        const pauseOnly = ended.every((r) => r.status === 'incomplete' && r.completedAt == null);
        if (pauseOnly) {
          console.log('  → Các lượt chỉ pause (chưa completeExercise) — stats có thể chưa/cập nhật sai.');
        }
      } else {
        console.log('  → Đủ lượt hợp lệ theo logic hiện tại; kiểm tra session.status có bị stale không.');
      }
    }
  } finally {
    await sequelize.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
