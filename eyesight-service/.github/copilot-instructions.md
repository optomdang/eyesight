# GitHub Copilot Instructions - Eye-Sight Backend Service

## System Overview
Node.js + Express + Sequelize + PostgreSQL REST API for Eye-Sight vision therapy platform. Multi-tenant architecture with JWT authentication and granular RBAC. Based on node-express-boilerplate with clinical healthcare customizations.

**Multi-Tenant Core Principle**: Every model includes `centerId` for complete data isolation between vision therapy centers. Never query without center filtering.

## Architecture Patterns

### Controller-Service-Model Layering
```javascript
// Routes define auth + validation → Controllers handle HTTP → Services contain business logic
router.post('/patients', 
  auth('managePatients'),              // JWT + permission check
  validate(patientValidation.create),  // Joi schema validation
  injectData('body'),                  // Auto-inject centerId, updatedBy
  patientController.createPatient      // HTTP handler
);

// Controllers use catchAsync wrapper for automatic error handling
const createPatient = catchAsync(async (req, res) => {
  const patient = await patientService.createPatient(req.body);
  res.status(httpStatus.CREATED).send(patient);
});

// Services contain all business logic and database access
const createPatient = async (patientBody, transaction = null) => {
  if (await Patient.isDuplicate(patientBody.code, patientBody.centerId)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Mã bệnh nhân đã tồn tại');
  }
  return Patient.create(patientBody, { transaction });
};
```

**Key Files**: `src/routes/v1/**/*.route.js`, `src/controllers/**/*.controller.js`, `src/services/**/*.service.js`

### Multi-Tenant Security Enforcement
Two-layer protection ensures center isolation:
```javascript
// Layer 1: injectData middleware auto-adds centerId to all requests
const injectData = (dataType) => (req, res, next) => {
  req.body = { ...req.body, centerId: req.user.centerId, updatedBy: req.user.id };
};

// Layer 2: Controllers MUST verify center ownership before sensitive ops
const updatePatient = catchAsync(async (req, res) => {
  const patient = await patientService.getPatientById(req.params.patientId);
  if (patient.centerId !== req.user.centerId) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Không có quyền cập nhật');
  }
  // ... proceed with update
});
```

**Security Rule**: Always filter queries by `centerId: req.user.centerId` for list operations and verify ownership for single-resource operations.

### Granular RBAC System
Permission-based authorization with 40+ granular rights defined in `src/config/rights.js`:
```javascript
// Rights definition pattern
module.exports = {
  managePatients: { code: 'managePatients', description: 'Create, edit patients' },
  getPatients: { code: 'getPatients', description: 'View patient list' },
  // ... 40+ more rights
};

// Role assignment in src/config/roles.js
const allRoles = {
  admin: getAllRightsCodes(),  // Full access
  doctor: ['getPatients', 'managePatients', 'getExamResults', ...],
  patient: ['getExamSessions', 'getExerciseResults', 'manageOwnExercises'],
};

// Route protection using auth middleware
router.post('/patients', auth('managePatients'), ...);  // Only admin/doctor can access
```

**User Types**: `admin` (system management), `doctor` (patient care), `patient` (own data only) - defined in User model's `userType` enum.

## Development Workflows

### Running the Service
```bash
# Local development with nodemon hot reload
npm run dev

# Production with PM2 process manager
npm start

# Docker environments
npm run docker:dev    # Development with volume mounting
npm run docker:prod   # Production build with optimizations
npm run docker:test   # Testing environment
```

### Database Migrations
Sequelize CLI manages schema changes. Migration files live in `src/database/migrations/` (currently empty - migrations applied directly):
```bash
# Apply pending migrations
npm run db:migrate

# Rollback last migration
npm run db:migrate:undo

# Check migration status
npm run db:migrate:status
```

**Migration Naming**: Use `YYYYMMDD_action_description.js` format (e.g., `20250928_add_vision_level_to_assignment.js`).

### Error Handling Pattern
Centralized error flow using custom ApiError class:
```javascript
// Throw semantic errors in services
throw new ApiError(httpStatus.NOT_FOUND, 'Bệnh nhân không tồn tại');

// Controllers wrapped in catchAsync automatically forward errors
const getPatient = catchAsync(async (req, res) => {
  const patient = await patientService.getPatientById(req.params.patientId);
  if (!patient) throw new ApiError(httpStatus.NOT_FOUND, 'Patient not found');
  res.send(patient);
});

// Error middleware in app.js converts and responds with proper HTTP status
app.use(errorConverter);
app.use(errorHandler);
```

**Vietnamese Error Messages**: User-facing errors use Vietnamese (`'Mã bác sĩ đã tồn tại'`), internal logs use English.

## Key Conventions

### Sequelize Model Patterns
Models use class-based Sequelize v6 syntax with static helper methods:
```javascript
class Patient extends Model {
  static async isDuplicate(code, centerId, excludeId) {
    const whereClause = { code, centerId };
    if (excludeId) whereClause.id = { [Op.ne]: excludeId };
    return !!(await this.findOne({ where: whereClause }));
  }
}

Patient.init({
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  code: { type: DataTypes.STRING(255), allowNull: false },
  centerId: { type: DataTypes.INTEGER, allowNull: false },  // REQUIRED for multi-tenancy
  deleted: { type: DataTypes.BOOLEAN, defaultValue: false },  // Soft delete
  // ... other fields
}, { sequelize, modelName: 'Patient', tableName: 'Patients', timestamps: true });
```

**Soft Deletes**: Use `deleted` boolean flag instead of actual deletion. Always filter `deleted: false` in queries.

### Validation with Joi
Request validation lives in `src/validations/` with nested object support:
```javascript
const createPatient = {
  body: Joi.object().keys({
    code: Joi.string().required(),
    userId: Joi.number().required(),
    gender: Joi.string().valid('male', 'female', 'other'),
    examResults: Joi.object().keys({
      far: Joi.object().keys({
        initialResult: Joi.object().keys({
          leftEye: Joi.number().allow(null).optional(),
          rightEye: Joi.number().allow(null).optional(),
        }),
      }),
    }),
  }),
};
```

**Apply via middleware**: `validate(patientValidation.createPatient)` before controller.

### Background Scheduling Services
Node-cron schedulers auto-create sessions and send notifications:
```javascript
// Started in app.js when env !== 'test'
examSchedulerService.startExamScheduler();      // Creates ExamSession daily at 6 AM
examNotificationService.startExamNotifier();    // Sends reminders daily at 9 AM
exerciseSchedulerService.startExerciseScheduler();  // Similar for exercises

// Scheduler pattern
const startExamScheduler = () => {
  cron.schedule('0 6 * * *', async () => {  // Daily at 6:00 AM
    logger.info('Starting exam session creation...');
    await createExamSessionsForAllPatients();
  });
};
```

**Session Pre-creation**: Schedulers create `ExamSession` and `ExerciseSession` records in advance for due dates, simplifying notification queries.

## Integration Points

### Multi-Channel Notification System
Template-based notifications with center-specific customization:
```javascript
// Template resolution hierarchy (notificationTemplate.service.js)
1. Center-specific template (centerId match)
2. Global template (centerId = null)
3. Default system template

// Send notification via notificationService
await sendNotification({
  patientId: 123,
  channel: 'zalo',          // email, zalo, sms
  templateCode: 'exam_reminder',
  variables: { patientName, examDate },
});

// Template variables auto-replaced using renderTemplate()
"Xin chào {{patientName}}, bạn có lịch khám {{examDate}}"
```

**Zalo Integration**: Webhook endpoint at `/api/v1/zalo/webhook` handles OA events. Patient linking via QR code stored in `PatientZalo` model.

### Clinical Vision Level System
Exercise difficulty uses standardized vision measurements:
```javascript
// Vision type mappings (far/near/contrast)
getVisionString('far', 14)      // Returns '20/20' (Snellen far vision)
getVisionString('near', 3)      // Returns 'N8' (near vision)
getVisionString('contrast', 10) // Returns '60%' (contrast sensitivity)

// Used in ExerciseConfig and ExerciseAssignment models
// Frontend calculates font sizes based on these mappings
```

**Vision Scaling**: Games adjust difficulty via `visionLevel` field (1-20 for far, 1-6 for near, 1-16 for contrast).

### Exercise Execution Hierarchy
Nested resource structure for patient exercise tracking:
```
Exercise (system definition: name, code, exerciseType)
└── ExerciseConfig (visual settings: contrast, fontSize, visionType)
    └── ExerciseAssignment (patient assignment with visionLevel override)
        └── ExerciseSession (frequency tracking: due dates)
            └── ExerciseResult (individual game executions: score, duration)
```

**Nested Routes**: `/api/v1/patients/:patientId/exam-sessions` follows RESTful nesting for related resources.

### Authentication Flow
JWT tokens with Passport.js strategy:
```javascript
// Login generates access + refresh tokens (token.service.js)
const tokens = await generateAuthTokens(user);
// { access: { token, expires }, refresh: { token, expires } }

// Auth middleware verifies JWT and populates req.user
passport.authenticate('jwt', { session: false }, verifyCallback);

// User object includes: { id, email, userType, centerId, role: { rights: [] } }
```

**Token Storage**: Access tokens expire in 30 days, refresh tokens in 60 days (configurable in `src/config/tokens.js`).

## Advanced Patterns

### Query Pagination with Relations
Services support complex sorting across associations:
```javascript
// Supports both formats:
// 1. sortBy=user.name:desc
// 2. sortBy=user.name&order=desc

const queryDoctors = async (filter, options) => {
  const { sortBy, order: orderParam, limit = 10, page = 1 } = options;
  
  // Parse relation sorting (e.g., "user.name")
  if (sortBy.includes('.')) {
    const [relationName, relationField] = sortBy.split('.');
    order = [[relationName, relationField, direction]];
  }
  
  return Doctor.findAndCountAll({
    where: filter,
    include: [{ model: User, as: 'user' }],
    order,
    limit,
    offset: (page - 1) * limit,
  });
};
```

**Response Format**: Always return `{ rows, count, totalPages, currentPage }` for paginated endpoints.

### CORS Configuration
Frontend URLs explicitly whitelisted in `src/app.js`:
```javascript
cors({
  origin: [
    'http://vision.lotusvision.vn',
    'https://vision.lotusvision.vn',
    'http://localhost:5173',  // Vite dev server
  ],
  credentials: true,  // Allow cookies for auth
})
```

**Health Check**: GET `/api/v1/version` returns `{ version, environment, name }` from package.json.

### Swagger API Documentation
Auto-generated docs at `/api/v1/docs` using swagger-jsdoc. Schemas defined in `src/docs/*.yml`:
```yaml
# docs/components_exam.yml
ExamSession:
  type: object
  properties:
    patientId: { type: integer }
    examType: { type: string, enum: [far, near, contrast] }
    scheduledDate: { type: string, format: date-time }
```

**Production**: Docs only available in development (`config.env !== 'production'`).
