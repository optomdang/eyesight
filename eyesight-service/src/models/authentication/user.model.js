const { Model, DataTypes, Op } = require('sequelize');
const bcrypt = require('bcryptjs');
const { sequelize } = require('../../config/db');
const { removeAccents } = require('../../utils/common');
const { getUserTypeMapping } = require('../../utils/defaultRoles');

class User extends Model {
  /**
   * Check if an email is taken (global check)
   * @param {string} email - Email to check
   * @param {number} excludeUserId - User ID to exclude from check (for updates)
   * @returns {Promise<boolean>}
   */
  static async isEmailTaken(email, excludeUserId) {
    const whereClause = { email };
    if (excludeUserId !== undefined && excludeUserId !== null) {
      whereClause.id = { [Op.ne]: Number(excludeUserId) };
    }
    const user = await this.findOne({ where: whereClause });
    return !!user;
  }

  /**
   * Check if a phone number is taken (global check)
   * @param {string} phoneNumber - Phone number to check
   * @param {number} excludeUserId - User ID to exclude from check (for updates)
   * @returns {Promise<boolean>}
   */
  static async isPhoneNumberTaken(phoneNumber, excludeUserId) {
    const whereClause = { phoneNumber };
    if (excludeUserId !== undefined && excludeUserId !== null) {
      whereClause.id = { [Op.ne]: Number(excludeUserId) };
    }
    const user = await this.findOne({ where: whereClause });
    return !!user;
  }

  /**
   * Check if email or phone is taken (for registration validation)
   * @param {string} email - Email to check
   * @param {string} phoneNumber - Phone number to check
   * @param {number} excludeUserId - User ID to exclude from check (for updates)
   * @returns {Promise<{emailTaken: boolean, phoneTaken: boolean}>}
   */
  static async checkEmailAndPhone(email, phoneNumber, excludeUserId) {
    const [emailTaken, phoneTaken] = await Promise.all([
      this.isEmailTaken(email, excludeUserId),
      this.isPhoneNumberTaken(phoneNumber, excludeUserId),
    ]);
    return { emailTaken, phoneTaken };
  }

  /**
   * Instance method to check if password matches
   * @param {string} password - Password to check
   * @returns {Promise<boolean>}
   */
  async isPasswordMatch(password) {
    return bcrypt.compare(password, this.password);
  }
}

User.init(
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false, trim: true },
    nameEng: { type: DataTypes.STRING, trim: true },
    dateOfBirth: { type: DataTypes.DATEONLY, allowNull: true },
    gender: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'Gender of the user (admin, doctor, patient)',
    },
    address: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Address object {country, province, ward, specificAddress}',
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      trim: true,
      lowercase: true,
      validate: { isEmail: true },
    },
    phoneNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      trim: true,
      lowercase: true,
      validate: { is: /^0\d{9}$/ },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      trim: true,
      validate: { len: [8, Infinity], is: /^(?=.*\d)(?=.*[a-zA-Z])/ },
    },
    roleId: { type: DataTypes.INTEGER, allowNull: false },
    roleCode: { type: DataTypes.STRING },
    userType: {
      type: DataTypes.STRING(20),
      allowNull: true,
      comment: 'Loại người dùng: admin, doctor, patient',
    },
    isEmailVerified: { type: DataTypes.BOOLEAN, defaultValue: false },
    defaultClinicId: { type: DataTypes.INTEGER },
    fcmRegistrationToken: { type: DataTypes.STRING },
    zaloUserId: { type: DataTypes.STRING(255), allowNull: true }, // Zalo User ID for notifications
    zaloPhoneNumber: { type: DataTypes.STRING(20), allowNull: true }, // Zalo Phone Number (may differ from main phone)
    avatar: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Base64 encoded image or URL to avatar',
    },
    lastLoginAt: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Last successful login timestamp',
    },
    centerId: { type: DataTypes.INTEGER, allowNull: false },
    updatedBy: { type: DataTypes.INTEGER },
    active: { type: DataTypes.BOOLEAN, defaultValue: true },
    deletedAt: { type: DataTypes.DATE },
    deleted: { type: DataTypes.BOOLEAN, defaultValue: false },
  },
  {
    sequelize,
    modelName: 'User',
    tableName: 'Users',
    timestamps: true,
    indexes: [
      {
        name: 'idx_users_email',
        fields: ['email'],
        unique: true,
      },
      {
        name: 'idx_users_phone',
        fields: ['phoneNumber'],
        unique: true,
      },
      {
        name: 'idx_users_center_type',
        fields: ['centerId', 'userType'],
      },
      {
        name: 'idx_users_center_deleted',
        fields: ['centerId', 'deleted'],
      },
      {
        name: 'idx_users_role',
        fields: ['roleId'],
      },
      {
        name: 'idx_users_lastlogin',
        fields: ['lastLoginAt'],
      },
      {
        name: 'idx_users_deleted',
        fields: ['deleted'],
      },
    ],
    hooks: {
      beforeSave: async (user) => {
        if (user.changed('password')) {
          // eslint-disable-next-line no-param-reassign
          user.password = await bcrypt.hash(user.password, 8);
        }
        if (user.changed('name')) {
          // eslint-disable-next-line no-param-reassign
          user.nameEng = removeAccents(user.name);
        }
        // Auto-set userType based on roleCode
        if (user.changed('roleCode') && user.roleCode) {
          const typeMapping = getUserTypeMapping();
          // eslint-disable-next-line no-param-reassign
          user.userType = typeMapping[user.roleCode] || null;
        }
      },
    },
  }
);

module.exports = User;
