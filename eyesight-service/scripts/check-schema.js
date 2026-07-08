/**
 * Check ExerciseAssignments table schema
 */

const { sequelize } = require('../src/config/db');

async function checkSchema() {
  console.log('\n=== KIỂM TRA SCHEMA ExerciseAssignments ===\n');

  try {
    const [results] = await sequelize.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'ExerciseAssignments'
      ORDER BY ordinal_position;
    `);

    console.log('Columns in ExerciseAssignments table:');
    console.log('=====================================');
    results.forEach((col) => {
      console.log(
        `${col.column_name.padEnd(30)} ${col.data_type.padEnd(20)} ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`
      );
    });

    // Check if 'deleted' column exists
    const hasDeleted = results.some((col) => col.column_name === 'deleted');

    console.log('\n=====================================');
    if (hasDeleted) {
      console.log('✅ Column "deleted" EXISTS');
    } else {
      console.log('❌ Column "deleted" DOES NOT EXIST!');
      console.log('\n🔴 THIS IS THE BUG!');
      console.log('Code is querying for "deleted" column but it doesn\'t exist in database.');
      console.log('\nSolution options:');
      console.log('1. Add "deleted" column to ExerciseAssignments table');
      console.log('2. Remove "deleted" filter from queries');
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

checkSchema()
  .then(() => {
    console.log('\n=== DONE ===\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
