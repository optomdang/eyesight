# GitHub Copilot Instructions - Eye-Sight Frontend (Admin & Portal)

## System Overview
React + TypeScript + Vite multi-tenant vision therapy platform serving both admin panel (`/admin`) and patient portal (`/portal`). Built with Material-UI v7, React Router v7, and context-driven state management. Integrates with eye-sight-service backend (Node.js + Express + PostgreSQL).

**Multi-Tenant Core Principle**: Every API call automatically filtered by `centerId` through authentication context. Admin users can switch centers; patients are locked to their assigned center.

## Architecture Patterns

### Role-Based Routing System
Three distinct user flows with automatic role-based redirection:
```typescript
// Route hierarchy with guards
/admin/*   → AdminGuard → admin/doctor users → FullLayout (sidebar + header)
/portal/*  → PatientGuard → patient users → FullLayout/MinimalLayout
/auth/*    → GuestGuard → unauthenticated → BlankLayout

// Automatic redirection in guards
if (user.userType === 'patient') navigate('/portal/exercises');
if (['admin', 'doctor'].includes(user.userType)) navigate('/admin/dashboard');
```

**Route Files**: `src/routes/AdminRoutes.tsx`, `PortalRoutes.tsx`, `PublicRoutes.tsx`, `DefaultRoutes.tsx` combined in `src/routes/index.tsx`

**Layout Strategy**: Exercise execution uses `MinimalLayout` (fullscreen, no chrome) while all other pages use `FullLayout` with navigation.

### Context-Driven State Management
Multi-layered context architecture for separation of concerns:
```typescript
// Core authentication & authorization
<AuthProvider>              // JWT token management + user state
  <CenterProvider>          // Multi-tenant center switching (admin only)
    <ConfirmProvider>       // Standardized confirmation dialogs
      <SnackbarProvider>    // Centralized toast notifications
        <DataTableProvider> // Server-state CRUD with pagination
          <App />
        </DataTableProvider>
      </SnackbarProvider>
    </ConfirmProvider>
  </CenterProvider>
</AuthProvider>

// Usage pattern
const { user, isAuthenticated, login, logout } = useAuth();
const { currentCenter, changeCenter } = useCenter();
const { confirm } = useConfirm();
const { showSnackbar } = useSnackbar();
```

**Key Files**: `src/contexts/authGuard/JwtContext.tsx`, `CenterContext.tsx`, `hooks/useConfirm.tsx`, `SnackbarProvider.tsx`

### DataTable Pattern (Server-State Management)
Standardized CRUD operations with automatic server-side pagination, filtering, sorting:
```typescript
// Provider wraps page component - handles all server communication
<DataTableProvider endpoint="patients">
  <PatientPage />  // Gets full data context via hook
</DataTableProvider>

// Page component accesses context
const { 
  dataRes,          // { rows, count, totalPages, page }
  tableState,       // Current table state (page, limit, sortOrder)
  onTableChange,    // Auto-sync with server on user actions
  createData,       // POST endpoint
  updateData,       // PATCH endpoint/:id
  removeData,       // DELETE endpoint/:id
  getRecordData,    // GET endpoint/:id
  fetchData,        // Manual refresh
  searchData,       // Filter + reset to page 0
} = useDataTable<Patient>();

// CustomDataTable integrates with MUI DataTables
<CustomDataTable
  dataRes={dataRes}
  tableState={tableState}
  onTableChange={onTableChange}  // Auto-handles sort, pagination changes
  columns={columns}              // MUI column definitions
  onEditData={handleEdit}        // Optional edit handler
  onDeleteData={handleDelete}    // Optional delete handler
/>
```

**Provider Features**:
- Auto-generates query strings from `filter` state + `tableState`
- Handles loading states and error notifications
- Supports nested filtering (e.g., `sortBy=user.name&order=desc`)
- Vietnamese error messages via `useSnackbar`

**Key Files**: `src/contexts/data-context/DataTableContext.tsx`, `hooks/useDataTable.tsx`, `components/shared/CustomDataTable.tsx`

## Development Workflows

### Running the Application
```bash
# Development with Vite HMR on http://localhost:5173
npm run dev

# Production build (outputs to dist/)
npm run build

# Type checking and linting
npm run lint

# Preview production build
npm run preview
```

**Environment Variables**: Configure in `.env` files (Vite uses `VITE_` prefix):
```env
VITE_BASE_API_URL=http://localhost:3000/v1
VITE_APP_BASE_NAME=/
```

### Authentication Flow
JWT-based auth with automatic token refresh and retry logic:
```typescript
// Login flow (JwtContext.tsx)
1. POST /auth/login → { accessToken, refreshToken }
2. Store tokens in localStorage
3. Initialize user context via GET /me
4. Dispatch LOGIN action to reducer

// Request interceptor (utils/request.ts)
1. Attach Authorization: Bearer {accessToken}
2. On 401 error → attempt refresh via POST /auth/refresh-tokens
3. Retry original request with new token
4. On refresh failure → clear tokens + redirect to /auth/login

// Token validation (utils/Jwt.ts)
isValidToken(token) → decode JWT + check expiry
setSession(accessToken) → store in localStorage
```

**Auto-Refresh**: `requestWithAuth` function automatically handles token refresh with max 3 retries for network errors.

### Form Validation Patterns
React Hook Form + Yup schema validation with MUI integration:
```typescript
// Schema definition
const schema = Yup.object({
  code: Yup.string().required('Mã bệnh nhân là bắt buộc'),
  userId: Yup.number().required('Tài khoản là bắt buộc'),
  visionLevel: Yup.number().min(1).max(20, 'Vision level must be between 1 and 20'),
});

// Form integration
const { control, handleSubmit, formState: { errors } } = useForm({
  resolver: yupResolver(schema),
  defaultValues: { code: '', userId: null, visionLevel: 14 },
});

// MUI Controller integration
<Controller
  name="visionLevel"
  control={control}
  render={({ field }) => (
    <TextField
      {...field}
      error={!!errors.visionLevel}
      helperText={errors.visionLevel?.message}
    />
  )}
/>
```

**Vietnamese Error Messages**: All user-facing validation messages in Vietnamese for better UX.

## Key Conventions

### API Request Utilities
Centralized request functions with automatic error handling:
```typescript
// Core request functions (src/utils/request.ts)
getData<T>(url: string): Promise<T>
postData<T>(url: string, data: any): Promise<T>
patchData<T>(url: string, data: any): Promise<T>
deleteData<T>(url: string): Promise<T>

// Specialized DataTable request
getDataTable<T>(url: string): Promise<PaginatedResponse<T>>
// Returns: { rows: T[], count, totalPages, page, limit }

// Usage with auto-retry and auth handling
const patient = await getData<Patient>(`patients/${id}`);
await postData('patients', { code: 'P001', userId: 123 });
```

**Error Handling**: All requests throw on error, automatically caught by context providers and displayed via snackbar.

### Component File Structure
Feature-based organization with clear separation:
```
src/features/{feature}/
├── views/              # Page components (lazy-loaded)
│   └── {feature}-page/
│       ├── index.tsx   # Page entry point
│       ├── forms/      # Form components
│       └── components/ # Page-specific components
├── components/         # Shared feature components
├── hooks/              # Feature-specific custom hooks
├── services/           # API service functions
└── types/             # TypeScript type definitions

src/components/         # Global shared components
├── shared/             # Generic reusable components
│   ├── CustomDataTable.tsx
│   ├── ErrorBoundary.tsx
│   └── RouteErrorBoundary.tsx
├── exercises/          # Exercise-specific components
└── forms/              # Generic form components

src/layouts/            # Layout wrappers
├── full/               # Full layout (sidebar + header)
├── minimal/            # Minimal layout (fullscreen)
└── blank/              # Blank layout (auth pages)
```

### TypeScript Type Definitions
Strict typing with centralized type definitions:
```typescript
// src/types/dataTable.ts
export interface PaginatedResponse<T> {
  rows: T[];
  count: number;
  totalPages: number;
  page: number;
  limit: number;
}

export interface FilterTable {
  [key: string]: string | number | boolean;
}

// src/types/admin/user.ts
export interface User {
  id: number;
  email: string;
  userType: 'admin' | 'doctor' | 'patient';
  centerId: number;
  roleId?: number;
  role?: Role;
}

// Feature-specific types
src/types/
├── api.ts              # API-related types
├── dataTable.ts        # DataTable types
├── admin/              # Admin feature types
├── portal/             # Portal feature types
├── exam/               # Exam types
└── exercise/           # Exercise types
```

**Naming Convention**: Use PascalCase for interfaces/types, camelCase for variables/functions.

### Lazy Loading Strategy
All route components are lazy-loaded with error boundaries:
```typescript
// src/layouts/full/shared/loadable/Loadable.tsx
const Loadable = (Component: React.LazyExoticComponent<any>, options?: LoadableOptions) => {
  return (props: any) => (
    <Suspense fallback={<LoadingSpinner />}>
      <ErrorBoundary onError={options?.onError}>
        <Component {...props} />
      </ErrorBoundary>
    </Suspense>
  );
};

// Usage in routes
const PatientPage = Loadable(
  lazy(() => import('src/features/admin/views/manage/patient-page')),
  { onError: (error) => console.error('Failed to load PatientPage:', error) }
);
```

**Performance**: Reduces initial bundle size and improves first-load performance.

## Integration Points

### Exercise System Architecture
Vision training exercises follow a hierarchical clinical model:
```
Exercise (definition: name, code, exerciseType)
└── ExerciseConfig (visual settings: contrast, fontSize, visionType, frequency)
    └── ExerciseAssignment (patient-specific with visionLevel override)
        └── ExerciseSession (frequency tracking: daily/weekly/monthly)
            └── ExerciseResult (individual executions: score, duration, completedAt)
```

**Exercise Execution Flow**:
```typescript
// 1. Patient views assignments (/portal/exercises)
GET /patients/{patientId}/exercise-assignments

// 2. Select assignment → view sessions
GET /patients/{patientId}/exercise-assignments/{assignmentId}/sessions

// 3. Click session → Execute exercise (MinimalLayout)
navigate(`/portal/exercises/execute/${assignmentId}/${sessionId}`, {
  state: { screenParams, assignment }
});

// 4. Game completes → POST result
POST /patients/{patientId}/exercise-assignments/{assignmentId}/sessions/{sessionId}/results
{ score, duration, completedAt }

// 5. Auto-navigate to session results list
navigate(`/portal/assignments/${assignmentId}/sessions/${sessionId}/results`);
```

**Key Components**: `PortalExercise.tsx`, `ExerciseExecutePage.tsx`, `ExerciseResultPage.tsx`

### Clinical Vision Level System
Exercise difficulty uses standardized vision measurements with automatic scaling:
```typescript
// Vision level mappings (src/utils/constant.ts + visionUtils.ts)
Far Vision:  1-20 → 20/400 to 20/5 (Snellen)
Near Vision: 1-6  → N3 to N24 (near vision)
Contrast:    1-16 → 2.5% to 100% (contrast sensitivity)

// Vision string conversion (backend service provides clinical notation)
getVisionString('far', 14)      // Returns '20/20'
getVisionString('near', 3)      // Returns 'N8'
getVisionString('contrast', 10) // Returns '60%'

// Font size calculation based on vision level and distance
calculateFarFontSize(visionLevel: number, distance: number, screenInfo: ScreenInfo): number
// Calculates physical font size in pixels for specified vision level

// Screen calibration
interface ScreenInfo {
  screenWidth: number;   // pixels
  screenHeight: number;  // pixels
  diagonalInch: number;  // inches
}

calculatePPI(screenInfo: ScreenInfo): number  // Pixels per inch
mmToPixels(sizeMm: number, screenInfo: ScreenInfo): number
```

**Vision Scaling Integration**: Games receive `visionLevel` from assignment and calculate appropriate font sizes using `visionUtils.ts` functions.

**Key Files**: `src/utils/visionUtils.ts`, `src/utils/constant.ts`, `components/exercises/portal/PortalExercise.tsx`

### Game Integration (iframe Communication)
Vision training games (2048, memory) are embedded via iframe with postMessage API:
```typescript
// Parent sends configuration to game
const gameConfig = {
  visualSettings: {
    contrast: assignment.exerciseConfig.contrast,
    fontSize: calculateFontSize(visionLevel, distance, screenParams),
    colorScheme: assignment.exerciseConfig.colorScheme,
  },
  visionLevel: assignment.visionLevel,
  difficulty: assignment.difficulty,
};

iframeRef.current?.contentWindow?.postMessage({
  type: 'GAME_CONFIG',
  payload: gameConfig,
}, '*');

// Game sends results back
window.addEventListener('message', (event) => {
  if (event.data.type === 'GAME_COMPLETE') {
    const { score, duration } = event.data.payload;
    // POST to /exercise-results
  }
});
```

**Game Files**: Located in `public/2048/` and `public/stereopsis/` - standalone HTML/CSS/JS applications.

### Multi-Channel Notification System
Template-based notifications with admin customization:
```typescript
// Notification template types
interface NotificationTemplate {
  id: number;
  code: string;                 // e.g., 'exam_reminder', 'exercise_complete'
  category: 'exam' | 'exercise' | 'system' | 'reminder';
  event: 'reminder' | 'start' | 'complete' | 'custom';
  channel: 'email' | 'zalo' | 'sms';
  subject?: string;             // For email
  content: string;              // Template with {{variables}}
  centerId?: number;            // null = global template
}

// Admin can create center-specific templates to override global ones
// Template resolution priority: center-specific → global → system default
```

**Template Management**: Admin UI at `/admin/notification-templates` allows CRUD operations on templates.

### Translation System (i18next)
Multi-language support with Vietnamese default:
```typescript
// src/hooks/useTranslation.ts
const { t, i18n } = useTranslation();

// Usage
t('common.save', 'Lưu')           // Key + default value
t('datatable.noData', 'Không có dữ liệu')

// Translation files
src/locales/
├── en/
│   └── translation.json
└── vi/
    └── translation.json
```

**Current State**: Most UI uses direct Vietnamese text; i18next infrastructure in place for future multi-language support.

## Advanced Patterns

### Confirmation Dialog Pattern
Centralized confirmation dialogs via context:
```typescript
// src/hooks/useConfirm.tsx
const { confirm } = useConfirm();

const handleDelete = async (id: number) => {
  const confirmed = await confirm({
    title: 'Xác nhận xóa',
    message: 'Bạn có chắc chắn muốn xóa bệnh nhân này?',
    confirmText: 'Xóa',
    cancelText: 'Hủy',
    confirmColor: 'error',
  });
  
  if (confirmed) {
    await removeData(id);
    showSnackbar('Xóa thành công', 'success');
  }
};
```

**Benefits**: Consistent UI/UX, Promise-based API, auto-cleanup on unmount.

### Error Boundary Strategy
Multi-level error boundaries for graceful degradation:
```typescript
// Global error boundary (App.tsx)
<ErrorBoundary onError={handleGlobalError}>
  <App />
</ErrorBoundary>

// Route-level error boundary (AdminRoutes.tsx)
<Route
  path="patients"
  element={
    <RouteErrorBoundary>
      <DataTableProvider endpoint="patients">
        <PatientPage />
      </DataTableProvider>
    </RouteErrorBoundary>
  }
/>

// Custom error handling
const handleGlobalError = (error: Error, errorInfo: React.ErrorInfo) => {
  if (process.env.NODE_ENV === 'production') {
    // TODO: Send to error tracking service (Sentry, LogRocket)
  }
  console.error('Error caught:', error, errorInfo);
};
```

**Error Boundary Components**: `components/shared/ErrorBoundary.tsx`, `RouteErrorBoundary.tsx`

### Custom Hooks Patterns
Reusable business logic extraction:
```typescript
// src/hooks/useGameSession.ts
export const useGameSession = (assignmentId: number, sessionId: number) => {
  const [session, setSession] = useState<ExerciseSession | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadSession();
  }, [assignmentId, sessionId]);
  
  const loadSession = async () => {
    const data = await getData(`exercise-assignments/${assignmentId}/sessions/${sessionId}`);
    setSession(data);
    setLoading(false);
  };
  
  const submitResult = async (result: ExerciseResultCreate) => {
    await postData(`exercise-assignments/${assignmentId}/sessions/${sessionId}/results`, result);
  };
  
  return { session, loading, submitResult, refresh: loadSession };
};

// Usage in component
const { session, loading, submitResult } = useGameSession(assignmentId, sessionId);
```

**Hook Files**: `src/hooks/use2048Exercise.ts`, `useGameSession.ts`, `core/useAuth.ts`

### Table Column Definitions
Standardized column configuration with custom renderers:
```typescript
// MUI DataTables column definition pattern
const columns: MUIDataTableColumnDef[] = [
  {
    name: 'code',
    label: 'Mã bệnh nhân',
    options: {
      filter: false,
      sort: true,
    },
  },
  {
    name: 'user.name',  // Nested field access
    label: 'Tên',
    options: {
      customBodyRender: (value, tableMeta) => {
        return <Typography>{value || 'N/A'}</Typography>;
      },
    },
  },
  {
    name: 'actions',
    label: 'Thao tác',
    options: {
      filter: false,
      sort: false,
      customBodyRender: (value, tableMeta) => {
        const rowData = dataRes.rows[tableMeta.rowIndex];
        return (
          <IconButton onClick={() => handleEdit(rowData)}>
            <EditIcon />
          </IconButton>
        );
      },
    },
  },
];
```

**CustomDataTable Features**: Auto-adds STT (index) column, Vietnamese labels, server-side operations.

### Multi-Tenant Center Switching
Admin users can switch between centers with automatic data refresh:
```typescript
// src/contexts/CenterContext.tsx
const { centers, currentCenter, changeCenter } = useCenter();

// Change center (updates user.centerId + reloads page)
const handleCenterChange = async (newCenter: Center) => {
  await changeCenter(newCenter);  // PATCH /users/{userId} + window.location.reload()
};

// All subsequent API calls automatically filtered by new centerId
// Backend injectData middleware adds centerId to all requests
```

**User Types**:
- `admin`: Can switch centers, full system access
- `doctor`: Locked to assigned center, patient management access
- `patient`: Locked to assigned center, own data only

### Exam System Integration
Vision exam results tracking with specialized context:
```typescript
// src/contexts/ExamContext.tsx
const { examResults, updateExamResult, setDistance } = useExam();

// Exam result structure
interface ExamResult {
  far?: {
    leftEye?: number;   // Vision level 1-20
    rightEye?: number;
    bothEyes?: number;
  };
  near?: { /* similar */ };
  contrast?: { /* similar */ };
}

// Patient portal exam flow
1. Navigate to /portal/exam → ExamDashboard
2. Select exam type (far/near/contrast)
3. Calibrate screen distance
4. Execute vision test
5. Auto-save results to backend
6. Update patient vision levels for exercise scaling
```

**Key Files**: `features/portal/views/exam/ExamPage.tsx`, `ExamDashboard.tsx`, `contexts/ExamContext.tsx`

## Build & Deployment

### Production Build Configuration
```typescript
// vite.config.ts optimizations
export default defineConfig({
  base: '/',  // Set to subdirectory if not root
  build: {
    sourcemap: false,           // Disable for production
    commonjsOptions: {
      sourceMap: false,
    },
  },
  resolve: {
    alias: {
      src: resolve(__dirname, 'src'),  // Absolute imports
    },
  },
});
```

**Build Output**: Static files in `dist/` ready for nginx/CDN deployment.

### Docker Deployment
```bash
# Build production image
docker build -t eye-sight-admin .

# Run container
docker run -p 80:80 eye-sight-admin

# nginx.conf serves static files + proxies /api to backend
```

**CORS Configuration**: Backend must whitelist frontend domain in `src/app.js` CORS settings.

### Environment-Specific Configuration
```typescript
// Access env variables with VITE_ prefix
const API_URL = import.meta.env.VITE_BASE_API_URL;
const BASE_NAME = import.meta.env.VITE_APP_BASE_NAME;

// Type-safe env variables (src/vite-env.d.ts)
interface ImportMetaEnv {
  readonly VITE_BASE_API_URL: string;
  readonly VITE_APP_BASE_NAME: string;
}
```

**Production Checklist**:
1. Set `VITE_BASE_API_URL` to production backend
2. Configure CORS on backend for frontend domain
3. Build with `npm run build`
4. Deploy `dist/` to static hosting
5. Configure nginx for SPA routing (fallback to index.html)

## Common Pitfalls & Best Practices

### State Management Rules
- **Use contexts for global state**: Auth, center, notifications
- **Use DataTableProvider for CRUD pages**: Automatic server-sync
- **Avoid prop drilling**: Extract to custom hooks or contexts
- **Keep component state local**: Only lift when truly shared

### Type Safety Guidelines
- **Always define interfaces for API responses**: Prevents runtime errors
- **Use generics for reusable components**: `DataTableProvider<T>`, `CustomDataTable<T>`
- **Avoid `any` type**: Use `unknown` and type guards instead
- **Leverage TypeScript strict mode**: Catches more errors at compile time

### Performance Optimization
- **Lazy load all route components**: Reduces initial bundle size
- **Memoize expensive calculations**: `useMemo`, `useCallback` for derived values
- **Debounce search inputs**: Prevent excessive API calls
- **Use `memo()` for pure components**: Prevents unnecessary re-renders

### Error Handling Best Practices
- **Always wrap async operations in try-catch**: Even in context providers
- **Show user-friendly Vietnamese error messages**: Via snackbar
- **Log detailed errors to console**: For debugging
- **Use error boundaries for component crashes**: Graceful degradation

### Security Considerations
- **Never store sensitive data in localStorage**: Only tokens (httpOnly cookies preferred)
- **Validate user permissions client-side**: But always enforce server-side
- **Sanitize user inputs**: Prevent XSS attacks
- **Use HTTPS in production**: Protect tokens in transit