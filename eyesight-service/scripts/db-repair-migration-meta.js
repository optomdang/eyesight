/**
 * Repair SequelizeMeta naming mismatch.
 *
 * sequelize-cli v6 / umzug stores migration names WITH ".js" suffix,
 * but older db:stamp wrote names WITHOUT ".js". That makes db:migrate
 * re-run already-applied migrations and fail (e.g. "column already exists").
 *
 * Safe to run multiple times.
 */
const fs = require('fs');
const path = require('path');
const { sequelize } = require('../src/config/db');

const migrationsDir = path.join(__dirname, '../src/database/migrations');

const schemaFixes = [
  `ALTER TABLE "ExerciseConfigs" ADD COLUMN IF NOT EXISTS "vtSettings" JSONB`,
  `ALTER TABLE "ExerciseResults" ADD COLUMN IF NOT EXISTS "resultMetrics" JSONB`,
];

(async () => {
  try {
    await sequelize.authenticate();

    const files = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.js'))
      .sort();

    const [metaRows] = await sequelize.query('SELECT name FROM "SequelizeMeta"');
    const metaSet = new Set(metaRows.map((r) => r.name));

    let renamed = 0;
    let inserted = 0;
    let removed = 0;

    // Rename legacy entries (no .js) → correct umzug name (with .js)
    for (const row of metaRows) {
      const { name } = row;
      if (name.endsWith('.js')) continue;

      const withJs = `${name}.js`;
      if (!files.includes(withJs)) continue;

      if (metaSet.has(withJs)) {
        await sequelize.query('DELETE FROM "SequelizeMeta" WHERE name = :name', {
          replacements: { name },
        });
        metaSet.delete(name);
        removed += 1;
      } else {
        await sequelize.query('UPDATE "SequelizeMeta" SET name = :newName WHERE name = :oldName', {
          replacements: { newName: withJs, oldName: name },
        });
        metaSet.delete(name);
        metaSet.add(withJs);
        renamed += 1;
      }
    }

    // Ensure every migration file is stamped (schema assumed current after db:sync)
    for (const file of files) {
      if (metaSet.has(file)) continue;
      await sequelize.query('INSERT INTO "SequelizeMeta" (name) VALUES (:name) ON CONFLICT DO NOTHING', {
        replacements: { name: file },
      });
      inserted += 1;
    }

    for (const sql of schemaFixes) {
      await sequelize.query(sql);
    }

    console.log(`✅ Migration meta repaired: ${renamed} renamed, ${removed} duplicate removed, ${inserted} inserted`);
    console.log('✅ VT columns ensured (vtSettings, resultMetrics)');

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Repair failed:', error.message);
    process.exit(1);
  }
})();
