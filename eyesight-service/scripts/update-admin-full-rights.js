const { sequelize } = require('../src/models');
const allRights = require('../src/config/rights');
const logger = require('../src/config/logger');

/**
 * Script to update admin role with all rights in database
 * This ensures admin users have full permissions
 */
const updateAdminRoleWithFullRights = async () => {
  try {
    logger.info('Starting admin role rights update...');

    // Get all right codes from config
    const allRightCodes = Object.keys(allRights);
    logger.info(`Found ${allRightCodes.length} rights in config`);

    // Find admin role
    const [adminRole] = await sequelize.query(`SELECT id, name, rights FROM "Roles" WHERE name = 'admin' LIMIT 1`, {
      type: sequelize.QueryTypes.SELECT,
    });

    if (!adminRole) {
      logger.error('Admin role not found in database!');
      logger.info('Creating admin role...');

      await sequelize.query(
        `INSERT INTO "Roles" (name, description, rights, "createdAt", "updatedAt") 
         VALUES ('admin', 'Administrator with full access', :rights, NOW(), NOW())`,
        {
          replacements: { rights: JSON.stringify(allRightCodes) },
          type: sequelize.QueryTypes.INSERT,
        }
      );

      logger.info('Admin role created successfully with all rights');
      return;
    }

    // Update admin role with all rights
    await sequelize.query(`UPDATE "Roles" SET rights = :rights, "updatedAt" = NOW() WHERE id = :roleId`, {
      replacements: {
        rights: JSON.stringify(allRightCodes),
        roleId: adminRole.id,
      },
      type: sequelize.QueryTypes.UPDATE,
    });

    logger.info(`Admin role (ID: ${adminRole.id}) updated successfully`);
    logger.info(`Total rights assigned: ${allRightCodes.length}`);
    logger.info('Rights:', allRightCodes.join(', '));

    // Verify the update
    const updatedRoles = await sequelize.query(`SELECT id, name, rights FROM "Roles" WHERE id = :roleId`, {
      replacements: { roleId: adminRole.id },
      type: sequelize.QueryTypes.SELECT,
    });

    if (updatedRoles && updatedRoles.length > 0) {
      const updatedRole = updatedRoles[0];
      const rightsData = typeof updatedRole.rights === 'string' ? JSON.parse(updatedRole.rights) : updatedRole.rights;
      const rightsCount = Array.isArray(rightsData) ? rightsData.length : 0;
      logger.info(`Verification: Admin role now has ${rightsCount} rights`);
    }

    // Also update any users with userType 'admin' to use this role
    const [result] = await sequelize.query(
      `UPDATE "Users" SET "roleId" = :roleId, "updatedAt" = NOW() 
       WHERE "userType" = 'admin' AND ("roleId" IS NULL OR "roleId" != :roleId)
       RETURNING id, email`,
      {
        replacements: { roleId: adminRole.id },
        type: sequelize.QueryTypes.UPDATE,
      }
    );

    if (result && result.length > 0) {
      logger.info(`Updated ${result.length} admin users to use admin role:`);
      result.forEach((user) => {
        logger.info(`  - User ID ${user.id}: ${user.email}`);
      });
    } else {
      logger.info('All admin users already have correct role assigned');
    }

    logger.info('Admin role rights update completed successfully!');
  } catch (error) {
    logger.error('Error updating admin role rights:', error);
    throw error;
  }
};

// Run the script
updateAdminRoleWithFullRights()
  .then(() => {
    logger.info('Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('Script failed:', error);
    process.exit(1);
  });
