/**
 * Migration: Add manageNotifications right to doctor role
 *
 * The auth middleware reads rights from user.role.rights (DB JSON field),
 * so changes to roles.js alone are not sufficient — the DB must also be updated.
 */

module.exports = {
  up: async (queryInterface) => {
    // Fetch all doctor roles across all centers
    const [doctorRoles] = await queryInterface.sequelize.query(`SELECT id, rights FROM "Roles" WHERE code = 'doctor'`);

    // Collect update promises
    const updatePromises = [];

    for (const role of doctorRoles) {
      let { rights } = role;
      if (typeof rights === 'string') {
        rights = JSON.parse(rights);
      }
      if (!Array.isArray(rights)) {
        rights = [];
      }

      if (!rights.includes('manageNotifications')) {
        rights.push('manageNotifications');
        updatePromises.push(
          queryInterface.sequelize
            .query(`UPDATE "Roles" SET rights = :rights WHERE id = :id`, {
              replacements: {
                rights: JSON.stringify(rights),
                id: role.id,
              },
            })
            .then(() => {
              console.log(`Added manageNotifications to doctor role id=${role.id}`);
            })
        );
      } else {
        console.log(`Doctor role id=${role.id} already has manageNotifications`);
      }
    }

    // Execute all updates in parallel
    await Promise.all(updatePromises);
  },

  down: async (queryInterface) => {
    const [doctorRoles] = await queryInterface.sequelize.query(`SELECT id, rights FROM "Roles" WHERE code = 'doctor'`);

    // Collect update promises
    const updatePromises = [];

    for (const role of doctorRoles) {
      let { rights } = role;
      if (typeof rights === 'string') {
        rights = JSON.parse(rights);
      }
      if (!Array.isArray(rights)) continue;

      const updated = rights.filter((r) => r !== 'manageNotifications');
      updatePromises.push(
        queryInterface.sequelize
          .query(`UPDATE "Roles" SET rights = :rights WHERE id = :id`, {
            replacements: {
              rights: JSON.stringify(updated),
              id: role.id,
            },
          })
          .then(() => {
            console.log(`Removed manageNotifications from doctor role id=${role.id}`);
          })
      );
    }

    // Execute all updates in parallel
    await Promise.all(updatePromises);
  },
};
