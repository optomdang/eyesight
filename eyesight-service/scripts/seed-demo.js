/* eslint-disable no-console, no-await-in-loop, no-bitwise, no-nested-ternary, operator-assignment */
/**
 * DEMO SEED — wipes all business data and seeds a coherent demo dataset for the dashboards.
 *
 * Scope (confirmed with the team):
 *   - KEEPS: Roles, Configurations, NotificationTemplates (config/auth).
 *   - WIPES: every business table, then seeds 1 center (id=1, reuses roles 1/2/3), 3 doctors,
 *     20 patients with varied treatmentStatus / causes (CODES) / examResults, plus exercises,
 *     configs, assignments, sessions, results, exams — enough to populate all 3 dashboard tabs.
 *
 * Safety: refuses to run unless SEED_DEMO=1 (and ALLOW_PROD_DB=1 for prod-looking hosts).
 * Reproducible: seeded PRNG (no Math.random), so re-runs are identical.
 *
 * Run:  SEED_DEMO=1 ALLOW_PROD_DB=1 node scripts/seed-demo.js
 */
const models = require('../src/models');
const { CAUSE_CODES } = require('../src/config/causes');

const { sequelize } = models;
const CENTER_ID = 1;
const ROLE = { admin: 1, doctor: 2, patient: 3 };
const DEMO_PASSWORD = 'Demo@1234';
const NOW = Date.now();
const DAY = 864e5;

// Deterministic PRNG (mulberry32) so the demo dataset is identical on every run.
let _seed = 0x9e3779b9;
const rng = () => {
  _seed |= 0;
  _seed = (_seed + 0x6d2b79f5) | 0;
  let t = Math.imul(_seed ^ (_seed >>> 15), 1 | _seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const randInt = (min, max) => min + Math.floor(rng() * (max - min + 1));
const pick = (arr) => arr[Math.floor(rng() * arr.length)];
const pickSome = (arr, n) => {
  const copy = [...arr];
  const out = [];
  for (let i = 0; i < n && copy.length; i += 1) out.push(copy.splice(Math.floor(rng() * copy.length), 1)[0]);
  return out;
};

const EXERCISE_TYPES = ['2048', 'memory', 'tracking', 'puzzle'];
const VISION_TYPES = ['far', 'near', 'contrast', 'stereopsis'];
const phone = (i) => `09${String(10000000 + i).slice(-8)}`;
const dobForAge = (age) => new Date(NOW - age * 365.25 * DAY).toISOString().slice(0, 10);

// Build one vision-type result block: initial → current with a chosen trend.
// trend: 'up' (improve), 'down' (decline), 'flat' (stable). Eye model per type.
const visionBlock = (type, trend) => {
  const base = randInt(6, 12);
  const delta = trend === 'up' ? randInt(1, 4) : trend === 'down' ? -randInt(1, 3) : 0;
  const cur = Math.max(1, Math.min(20, base + delta));
  const lastExamDate = new Date(NOW - randInt(1, 20) * DAY).toISOString();
  if (type === 'stereopsis') {
    return {
      initialResult: { leftEye: null, rightEye: null, bothEye: base },
      currentResult: { leftEye: null, rightEye: null, bothEye: cur },
      lastExamDate,
    };
  }
  // far/near/contrast → both eyes (independent but same trend for a clean demo)
  const curR = Math.max(1, Math.min(20, base + delta));
  return {
    initialResult: { leftEye: base, rightEye: base, bothEye: null },
    currentResult: { leftEye: cur, rightEye: curR, bothEye: null },
    lastExamDate,
  };
};

const buildExamResults = (trendByType) => {
  const out = {};
  VISION_TYPES.forEach((t) => {
    out[t] = visionBlock(t, trendByType[t] || 'flat');
  });
  return out;
};

async function wipe() {
  // Order doesn't matter (no FK constraints), but list every business table explicitly.
  const tables = [
    'Tokens',
    'AuditLogs',
    'Notifications',
    'ExerciseResults',
    'ExerciseSessions',
    'ExerciseAssignments',
    'ExerciseConfigs',
    'Exercises',
    'PatientExercises',
    'ExamResults',
    'ExamSessions',
    'ExamAssignments',
    'ExamMetrics',
    'Patients',
    'Doctors',
    'Clinics',
    'Centers',
    'Users',
    'ScheduleHistories',
  ];

  const [existingRows] = await sequelize.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND table_name = ANY(ARRAY[${tables.map((t) => `'${t}'`).join(', ')}])
  `);
  const existing = new Set(existingRows.map((row) => row.table_name));
  const toWipe = tables.filter((t) => existing.has(t));

  if (!toWipe.length) {
    console.log('No business tables to wipe.');
    return;
  }

  const quoted = toWipe.map((t) => `"${t}"`).join(', ');
  await sequelize.query(`TRUNCATE TABLE ${quoted} RESTART IDENTITY CASCADE`);
  console.log(`Wiped ${toWipe.length} business tables (kept Roles/Configurations/NotificationTemplates).`);
}

async function seed() {
  // 1) Center (id=1 so the kept roles 1/2/3 with centerId=1 stay valid → login works)
  await models.Center.create({
    id: CENTER_ID,
    code: 'DEMO_CENTER',
    name: 'Trung tâm Demo Eyesight',
    active: true,
    deleted: false,
  });

  const mkUser = async (overrides) =>
    models.User.create({
      password: DEMO_PASSWORD, // hashed by the model's beforeSave hook
      centerId: CENTER_ID,
      isEmailVerified: true,
      active: true,
      deleted: false,
      ...overrides,
    });

  // 2) Admin
  const admin = await mkUser({
    name: 'Quản trị Demo',
    email: 'admin@demo.com',
    phoneNumber: phone(0),
    userType: 'admin',
    roleId: ROLE.admin,
    roleCode: 'admin',
  });

  // 3) Doctors (3)
  const doctors = [];
  for (let d = 1; d <= 3; d += 1) {
    const du = await mkUser({
      name: `Bác sĩ ${d}`,
      email: `bs${d}@demo.com`,
      phoneNumber: phone(d),
      userType: 'doctor',
      roleId: ROLE.doctor,
      roleCode: 'doctor',
    });
    const doc = await models.Doctor.create({
      code: `BS${String(d).padStart(2, '0')}`,
      userId: du.id,
      centerId: CENTER_ID,
      specialization: 'Nhãn khoa',
      deleted: false,
    });
    doctors.push(doc);
  }

  // 4) Exercises + one config each
  const exercises = [];
  for (let e = 0; e < EXERCISE_TYPES.length; e += 1) {
    const ex = await models.Exercise.create({
      code: `EX_${EXERCISE_TYPES[e].toUpperCase()}`,
      name: `Bài tập ${EXERCISE_TYPES[e]}`,
      exerciseType: EXERCISE_TYPES[e],
      centerId: CENTER_ID,
      status: 'active',
      deleted: false,
    });
    const cfg = await models.ExerciseConfig.create({
      exerciseId: ex.id,
      configType: 'admin',
      name: `Cấu hình ${EXERCISE_TYPES[e]}`,
      eye: pick(['both', 'left', 'right']),
      distance: 0.5,
      duration: pick([5, 8, 10]), // phút/lượt
      frequency: 'daily',
      executionCount: pick([3, 4]), // lượt/buổi
      visionType: pick(VISION_TYPES),
      centerId: CENTER_ID,
      deleted: false,
    });
    exercises.push({ ex, cfg });
  }

  // 5) Patients (20) with varied status / causes / examResults
  const STATUS_PLAN = [
    ...Array(12).fill('active'),
    ...Array(3).fill('paused'),
    ...Array(3).fill('completed'),
    ...Array(2).fill('not_started'),
  ];
  const TREND_PLAN = [
    ...Array(11).fill('up'), // improved
    ...Array(5).fill('down'), // declined
    ...Array(4).fill('flat'), // stable
  ];

  const summary = { patients: 0, exSessions: 0, exResults: 0, examSessions: 0, examResults: 0, byStatus: {} };

  for (let i = 1; i <= 20; i += 1) {
    const status = STATUS_PLAN[i - 1];
    const trend = TREND_PLAN[(i - 1) % TREND_PLAN.length];
    summary.byStatus[status] = (summary.byStatus[status] || 0) + 1;

    const age = randInt(5, 20);
    const pu = await mkUser({
      name: `Bệnh nhân ${String(i).padStart(2, '0')}`,
      email: `bn${String(i).padStart(2, '0')}@demo.com`,
      phoneNumber: phone(10 + i),
      userType: 'patient',
      roleId: ROLE.patient,
      roleCode: 'patient',
      dateOfBirth: dobForAge(age),
    });

    // Treatment window per status
    let activeFrom = new Date(NOW - randInt(20, 90) * DAY);
    let activeTo = new Date(NOW + randInt(30, 120) * DAY);
    if (status === 'completed') {
      activeFrom = new Date(NOW - randInt(120, 200) * DAY);
      activeTo = new Date(NOW - randInt(5, 30) * DAY);
    } else if (status === 'not_started') {
      activeFrom = new Date(NOW + randInt(5, 30) * DAY);
      activeTo = new Date(NOW + randInt(60, 150) * DAY);
    }

    // Improvement trend mostly on far+near; contrast/stereopsis vary lightly.
    // Per-type trends are COHERENT with the patient's headline trend so #3 stays realistic:
    //  - 'up' patients improve (far always up; other types up-or-flat → varied #12-15),
    //  - 'down'/'flat' patients improve in NO type (every type follows the headline trend).
    // → improvementRate = #improved / everTreated (not ~100%).
    const typeTrend = () => (trend === 'up' ? pick(['up', 'flat']) : trend);
    const examResults = buildExamResults({
      far: trend,
      near: typeTrend(),
      contrast: typeTrend(),
      stereopsis: typeTrend(),
    });

    const patient = await models.Patient.create({
      code: `BN${String(i).padStart(3, '0')}`,
      userId: pu.id,
      doctorId: pick(doctors).id,
      centerId: CENTER_ID,
      treatmentStatus: status,
      activeFrom,
      activeTo,
      severityLevel: pick(['mild', 'moderate', 'severe']),
      causes: pickSome(CAUSE_CODES, randInt(1, 2)),
      examResults,
      deleted: false,
    });
    summary.patients += 1;

    // Only patients who have started treatment get exercise/exam activity.
    if (status === 'not_started') continue;

    // 6) Exercise assignments (1-2) + sessions + results over the last ~30 days
    const chosen = pickSome(exercises, randInt(1, 2));
    for (const { ex, cfg } of chosen) {
      const assignment = await models.ExerciseAssignment.create({
        patientId: patient.id,
        exerciseConfigId: cfg.id,
        assignedBy: admin.id,
        status: 'active',
        currentLevel: randInt(1, 5),
        centerId: CENTER_ID,
        deleted: false,
      });

      const numSessions = randInt(3, 8);
      for (let s = 0; s < numSessions; s += 1) {
        // Distinct day per session (unique constraint: exerciseAssignmentId + startedAt).
        const day = new Date(NOW - (s + 1) * DAY);
        const assignedCount = cfg.executionCount;
        const assignedDur = cfg.duration;
        const session = await models.ExerciseSession.create({
          code: `XS_${patient.id}_${ex.id}_${s}`,
          exerciseAssignmentId: assignment.id,
          patientId: patient.id,
          status: 'completed',
          startedAt: day,
          executionCount: assignedCount,
          executionDuration: assignedDur,
          centerId: CENTER_ID,
          createdAt: day,
        });
        summary.exSessions += 1;

        // Completed executions ≤ assigned; better compliance for "up"-trend patients.
        const completeBias = trend === 'up' ? 0.9 : trend === 'down' ? 0.5 : 0.7;
        const completedCount = Math.max(1, Math.round(assignedCount * completeBias));
        for (let r = 0; r < assignedCount; r += 1) {
          const done = r < completedCount;
          const pauseCount = randInt(0, 3);
          const inactivity = randInt(0, 2);
          await models.ExerciseResult.create({
            patientId: patient.id,
            exerciseId: ex.id,
            exerciseAssignmentId: assignment.id,
            exerciseSessionId: session.id,
            status: done ? 'completed' : 'incomplete',
            score: randInt(100, 2048),
            duration: done ? randInt(60, assignedDur * 60) : randInt(10, 60), // ≤ assigned (#21-clamp safe)
            movesCount: randInt(20, 200),
            accuracy: parseFloat((0.6 + rng() * 0.4).toFixed(2)),
            focusScore: Math.max(0, 100 - pauseCount - inactivity),
            pauseCount,
            inactivityCount: inactivity,
            exerciseConfig: { duration: assignedDur, executionCount: assignedCount },
            centerId: CENTER_ID,
            createdAt: day,
            completedAt: done ? day : null,
          });
          summary.exResults += 1;
        }
      }
    }

    // 7) Exam assignments + sessions + results (drives Tab 2 #11/#16/#17)
    const examTypes = pickSome(VISION_TYPES, randInt(1, 3));
    for (const et of examTypes) {
      await models.ExamAssignment.create({
        patientId: patient.id,
        examType: et,
        frequency: 'weekly',
        isEnabled: true,
        centerId: CENTER_ID,
      });
      const numExam = randInt(2, 5);
      for (let s = 0; s < numExam; s += 1) {
        const day = new Date(NOW - randInt(0, 29) * DAY);
        const completed = rng() < (trend === 'up' ? 0.85 : 0.6);
        const session = await models.ExamSession.create({
          code: `ES_${patient.id}_${et}_${s}`,
          patientId: patient.id,
          examType: et,
          status: completed ? 'completed' : 'incomplete',
          centerId: CENTER_ID,
          createdAt: day,
        });
        summary.examSessions += 1;
        // Create an ExamResult for EVERY session (completed OR incomplete) so #16
        // (stack Hoàn thành / Chưa xong, grouped over [ER]) shows both segments.
        const lvl = randInt(6, 16);
        await models.ExamResult.create(
          {
            code: `ER_${patient.id}_${et}_${s}`,
            patientId: patient.id,
            examSessionId: session.id,
            examType: et,
            status: completed ? 'completed' : 'incomplete',
            leftEyeLevel: completed && et !== 'stereopsis' ? lvl : null,
            rightEyeLevel: completed && et !== 'stereopsis' ? lvl : null,
            bothEyeLevel: completed && et === 'stereopsis' ? lvl : null,
            centerId: CENTER_ID,
            completedAt: completed ? day : null,
            createdAt: day,
          },
          { hooks: false } // do NOT let the afterCreate hook overwrite the explicit examResults cache
        );
        summary.examResults += 1;
      }
    }
  }

  return summary;
}

(async () => {
  if (process.env.SEED_DEMO !== '1') {
    console.error('Refusing to run: set SEED_DEMO=1 to confirm wiping + reseeding the database.');
    process.exit(1);
  }
  const host = process.env.DB_HOST || '';
  if (/supabase|pooler|amazonaws|rds\./i.test(host) && process.env.ALLOW_PROD_DB !== '1') {
    console.error(`Refusing prod-looking host "${host}". Set ALLOW_PROD_DB=1 if you are certain.`);
    process.exit(1);
  }

  try {
    await sequelize.authenticate();
    console.log(`Connected to ${host || 'db'} / ${process.env.DB_NAME}`);
    await wipe();
    const summary = await seed();
    console.log('Seed complete:', JSON.stringify(summary, null, 2));
    console.log('\nDemo logins (password for all):', DEMO_PASSWORD);
    console.log('  admin@demo.com (admin)');
    console.log('  bs1@demo.com / bs2@demo.com / bs3@demo.com (doctor)');
    console.log('  bn01@demo.com ... bn20@demo.com (patient)');
  } catch (err) {
    console.error('Seed failed:', err.message);
    if (err.errors)
      console.error(
        'Validation details:',
        JSON.stringify(err.errors.map((e) => ({ path: e.path, msg: e.message, value: e.value })))
      );
    console.error(err.stack);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
})();
