const { Model, DataTypes } = require('sequelize');
const { sequelize } = require('../../config/db');

class NotificationTemplate extends Model {
  /**
   * Get template by code
   * @param {string} code - Template code
   * @param {number} centerId - Center ID (optional)
   * @returns {Promise<NotificationTemplate>}
   */
  static async getByCode(code, centerId = null) {
    const whereCondition = {
      code,
      isActive: true,
    };

    // Try to find center-specific template first
    if (centerId) {
      const centerTemplate = await this.findOne({
        where: { ...whereCondition, centerId },
      });
      if (centerTemplate) return centerTemplate;
    }

    // Fallback to global template
    return this.findOne({
      where: { ...whereCondition, centerId: null },
    });
  }

  /**
   * Get default template for category
   * @param {string} category - Template category
   * @param {number} centerId - Center ID (optional)
   * @returns {Promise<NotificationTemplate>}
   */
  static async getDefaultTemplate(category, centerId = null) {
    const whereCondition = {
      category,
      isActive: true,
    };
    // Try to find center-specific template first
    if (centerId) {
      const centerTemplate = await this.findOne({
        where: { ...whereCondition, centerId },
        order: [
          ['isDefault', 'DESC'],
          ['createdAt', 'DESC'],
        ],
      });
      if (centerTemplate) return centerTemplate;
    }
    // Fallback to global template
    return this.findOne({
      where: { ...whereCondition, centerId: null },
      order: [
        ['isDefault', 'DESC'],
        ['createdAt', 'DESC'],
      ],
    });
  }

  /**
   * Render template with variables
   * @param {Object} variables - Template variables
   * @returns {Object} Rendered template
   */
  renderTemplate(variables = {}) {
    let renderedSubject = this.subject;
    let renderedContent = this.content;

    // Simple template variable replacement
    Object.keys(variables).forEach((key) => {
      // eslint-disable-next-line security/detect-non-literal-regexp
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      const value = variables[key] || '';

      if (renderedSubject) {
        renderedSubject = renderedSubject.replace(placeholder, value);
      }
      renderedContent = renderedContent.replace(placeholder, value);
    });

    // Handle conditional blocks ({{#if variable}} and {{#if !variable}} support)
    const conditionalRegex = /{{#if\s+(!?)(\w+)}}([\s\S]*?){{\/if}}/g;
    const processConditional = (match, negation, variable, content) => {
      const value = variables[variable];
      // If negation (!) present, invert the check
      const shouldInclude = negation ? !value : value;
      return shouldInclude ? content : '';
    };

    if (renderedSubject) {
      renderedSubject = renderedSubject.replace(conditionalRegex, processConditional);
    }
    renderedContent = renderedContent.replace(conditionalRegex, processConditional);

    return {
      subject: renderedSubject,
      content: renderedContent,
      variables: this.variables,
    };
  }

  /**
   * Validate template variables
   * @param {Object} variables - Variables to validate
   * @returns {Object} Validation result
   */
  validateVariables(variables = {}) {
    const requiredVariables = this.variables || [];
    const missingVariables = [];
    const providedVariables = Object.keys(variables);

    requiredVariables.forEach((required) => {
      if (!providedVariables.includes(required)) {
        missingVariables.push(required);
      }
    });

    return {
      isValid: missingVariables.length === 0,
      missingVariables,
      providedVariables,
      requiredVariables,
    };
  }
}

NotificationTemplate.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    code: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        len: [1, 100],
      },
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 255],
      },
    },
    category: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: {
        isIn: [['exam', 'exercise', 'system', 'reminder']],
      },
    },
    subject: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    centerId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Centers',
        key: 'id',
      },
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id',
      },
    },
    updatedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id',
      },
    },
  },
  {
    sequelize,
    modelName: 'NotificationTemplate',
    tableName: 'NotificationTemplates',
    timestamps: true,
    paranoid: false,
    indexes: [
      {
        fields: ['category'],
      },
      {
        fields: ['centerId'],
      },
      {
        fields: ['isActive'],
        where: {
          isActive: true,
        },
      },
      {
        unique: true,
        fields: ['code'],
      },
    ],
  }
);

module.exports = NotificationTemplate;
