/**
 * Fix script: Sync admin role rights across all centers.
 * Admin roles for centers created before adding readDashboard and getAuditLogs
 * are missing those two rights. This script brings them in sync with getAllRightsCodes().
 *
 * Usage: node scripts/fix-admin-role-rights.js
 */

require('dotenv').config({ path: '.env' });
const { sequelize, Role } = require('../src/models');
const { getAllRightsCodes } = require('../src/utils/defaultRoles');

const run = async () => {
  const fullRights = getAllRightsCodes();
  console.log(`Full admin rights (${fullRights.length}):`, fullRights);

  const adminRoles = await Role.findAll({ where: { code: 'admin' } });
  console.log(`Found ${adminRoles.length} admin role(s)`);

  // Collect update promises
  const updatePromises = [];
  const updateResults = [];

  for (const role of adminRoles) {
    const currentRights = role.rights || [];
    const missing = fullRights.filter((r) => !currentRights.includes(r));
    if (missing.length > 0) {
      console.log(`Center ${role.centerId} (role id ${role.id}) missing: ${missing.join(', ')}`);
      updatePromises.push(
        role.update({ rights: fullRights }).then(() => {
          updateResults.push({ centerId: role.centerId, roleId: role.id, updated: true });
          console.log(`✅ Updated role ${role.id} for center ${role.centerId}`);
        })
      );
    } else {
      console.log(`Center ${role.centerId} (role id ${role.id}) - OK, no changes needed`);
      updateResults.push({ centerId: role.centerId, roleId: role.id, updated: false });
    }
  }

  // Execute all updates in parallel
  await Promise.all(updatePromises);
  const updated = updateResults.filter((r) => r.updated).length;

  console.log(`\nDone. Updated ${updated} role(s).`);
  await sequelize.close();
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
