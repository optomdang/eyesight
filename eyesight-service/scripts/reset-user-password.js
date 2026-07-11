/**
 * Reset password for a user by email (run with .env pointing at target DB).
 * Usage: node scripts/reset-user-password.js admin@nhuocthi.vn 'Admin@123'
 */
const { sequelize } = require('../src/config/db');
const User = require('../src/models/authentication/user.model');

const [, , email, password] = process.argv;

(async () => {
  if (!email || !password) {
    console.error('Usage: node scripts/reset-user-password.js <email> <password>');
    process.exit(1);
  }

  try {
    await sequelize.authenticate();
    const user = await User.findOne({ where: { email } });
    if (!user) {
      console.error(`User not found: ${email}`);
      process.exit(1);
    }

    user.password = password;
    user.active = true;
    await user.save();

    console.log(`✅ Password reset for ${email}`);
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed:', error.message);
    process.exit(1);
  }
})();
