const swaggerJSDoc = require('swagger-jsdoc');
const { version } = require('../../package.json');
const config = require('../config/config');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Eye-Sight Vision Treatment Service API',
      version,
      description: `
        Comprehensive API for the Eye-Sight vision treatment system providing endpoints for:
        
        - **Patient Management**: Complete patient lifecycle with treatment tracking
        - **Vision Testing**: Multiple test types (far/near vision, contrast, stereopsis)
        - **Exercise Management**: Configurable vision training with progress tracking
        - **Multi-Tenant Support**: Complete data isolation by healthcare center
        - **Notification System**: Multi-channel notifications (Email, Zalo, SMS, Push)
        - **Analytics & Reporting**: Treatment progress and compliance tracking
        
        ## Architecture
        
        The API follows a domain-driven architecture organized into five main domains:
        
        1. **Authentication** (\`/v1/auth/*\`, \`/v1/users/*\`) - User management and authentication
        2. **Clinic** (\`/v1/patients/*\`, \`/v1/doctors/*\`) - Patient and doctor management
        3. **Exam** (\`/v1/exam-sessions/*\`, \`/v1/exam-results/*\`) - Vision testing system
        4. **Exercise** (\`/v1/exercises/*\`, \`/v1/exercise-configs/*\`) - Training exercises
        5. **System** (\`/v1/centers/*\`, \`/v1/clinics/*\`) - Multi-tenant administration
        
        ## Key Features
        
        - **Consistent CRUD Patterns**: Standardized operations across all entities
        - **Vietnamese Error Messages**: Localized user-facing error messages
        - **Performance Optimized**: Database indexing and query optimization
        - **Comprehensive Validation**: Joi-based request validation
        - **Role-Based Permissions**: Granular access control
        - **Soft Delete**: Data preservation with logical deletion
        
        ## Authentication
        
        All endpoints require JWT authentication via Bearer token in the Authorization header.
        Obtain tokens through the \`/v1/auth/login\` endpoint.
        
        ## Multi-Tenant Isolation
        
        All data is automatically scoped by \`centerId\` for complete tenant isolation.
        Users can only access data within their assigned healthcare center.
        
        ## Response Format
        
        **Success (Single Item)**:
        \`\`\`json
        {
          "id": 1,
          "name": "Item Name",
          "createdAt": "2024-01-01T00:00:00.000Z"
        }
        \`\`\`
        
        **Success (List with Pagination)**:
        \`\`\`json
        {
          "rows": [...],
          "count": 100,
          "limit": 10,
          "page": 1,
          "totalPages": 10
        }
        \`\`\`
        
        **Error**:
        \`\`\`json
        {
          "code": 400,
          "message": "Vietnamese error message"
        }
        \`\`\`
      `,
      contact: {
        name: 'Eye-Sight Development Team',
        email: 'support@nhuocthi.vn',
        url: 'https://nhuocthi.vn',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: `http://localhost:${config.port}/v1`,
        description: 'Development server',
      },
      {
        url: 'https://api.nhuocthi.vn/api/v1',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtained from /v1/auth/login endpoint',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            code: {
              type: 'integer',
              description: 'HTTP status code',
            },
            message: {
              type: 'string',
              description: 'Error message in Vietnamese',
            },
          },
        },
        PaginatedResponse: {
          type: 'object',
          properties: {
            rows: {
              type: 'array',
              items: {},
              description: 'Array of items for current page',
            },
            count: {
              type: 'integer',
              description: 'Total number of items',
            },
            limit: {
              type: 'integer',
              description: 'Items per page',
            },
            page: {
              type: 'integer',
              description: 'Current page number',
            },
            totalPages: {
              type: 'integer',
              description: 'Total number of pages',
            },
          },
        },
        QueryParams: {
          type: 'object',
          properties: {
            page: {
              type: 'integer',
              minimum: 1,
              default: 1,
              description: 'Page number',
            },
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              default: 10,
              description: 'Items per page',
            },
            sortBy: {
              type: 'string',
              description: 'Field to sort by',
            },
            order: {
              type: 'string',
              enum: ['ASC', 'DESC', 'asc', 'desc'],
              default: 'ASC',
              description: 'Sort order',
            },
          },
        },
      },
      parameters: {
        PageParam: {
          name: 'page',
          in: 'query',
          schema: {
            type: 'integer',
            minimum: 1,
            default: 1,
          },
          description: 'Page number',
        },
        LimitParam: {
          name: 'limit',
          in: 'query',
          schema: {
            type: 'integer',
            minimum: 1,
            maximum: 100,
            default: 10,
          },
          description: 'Items per page',
        },
        SortByParam: {
          name: 'sortBy',
          in: 'query',
          schema: {
            type: 'string',
          },
          description: 'Field to sort by',
        },
        OrderParam: {
          name: 'order',
          in: 'query',
          schema: {
            type: 'string',
            enum: ['ASC', 'DESC', 'asc', 'desc'],
            default: 'ASC',
          },
          description: 'Sort order',
        },
      },
      responses: {
        BadRequest: {
          description: 'Bad Request - Validation error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                code: 400,
                message: 'Dữ liệu không hợp lệ',
              },
            },
          },
        },
        Unauthorized: {
          description: 'Unauthorized - Authentication required',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                code: 401,
                message: 'Vui lòng đăng nhập',
              },
            },
          },
        },
        Forbidden: {
          description: 'Forbidden - Insufficient permissions',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                code: 403,
                message: 'Không có quyền truy cập',
              },
            },
          },
        },
        NotFound: {
          description: 'Not Found - Resource does not exist',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                code: 404,
                message: 'Không tìm thấy dữ liệu',
              },
            },
          },
        },
        InternalServerError: {
          description: 'Internal Server Error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
              example: {
                code: 500,
                message: 'Có lỗi xảy ra',
              },
            },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      {
        name: 'Authentication',
        description: 'User authentication and authorization endpoints',
      },
      {
        name: 'Users',
        description: 'User management endpoints',
      },
      {
        name: 'Roles',
        description: 'Role and permission management',
      },
      {
        name: 'Patients',
        description: 'Patient management and treatment tracking',
      },
      {
        name: 'Doctors',
        description: 'Doctor management and patient assignments',
      },
      {
        name: 'ExamSessions',
        description: 'Vision test session management',
      },
      {
        name: 'ExamResults',
        description: 'Vision test results and analytics',
      },
      {
        name: 'Exercises',
        description: 'Vision training exercise definitions',
      },
      {
        name: 'ExerciseConfigs',
        description: 'Exercise configuration and assignment',
      },
      {
        name: 'ExerciseResults',
        description: 'Exercise results and progress tracking',
      },
      {
        name: 'Centers',
        description: 'Healthcare center management',
      },
      {
        name: 'Clinics',
        description: 'Clinic management within centers',
      },
      {
        name: 'Notifications',
        description: 'Multi-channel notification system',
      },
      {
        name: 'Dashboard',
        description: 'Analytics and reporting endpoints',
      },
    ],
  },
  apis: ['./src/routes/**/*.js', './src/models/**/*.js', './src/controllers/**/*.js'],
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = swaggerSpec;
