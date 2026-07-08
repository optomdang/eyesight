# Exercise Components Architecture

## Folder Structure

```
src/components/exercises/
├── admin/          # Components for Admin Panel (Configuration & Preview)
├── portal/         # Components for Patient Portal (Exercise Execution)  
├── shared/         # Components shared between admin and portal
└── index.ts        # Main export file
```

## Component Organization

### **Admin Components** (`/admin`)
**Purpose**: Configuration, preview, and management by administrators

- `Game2048Component.tsx` - Admin game preview with configuration options
- `Game2048Preview.tsx` - Preview component for exercise configuration
- `Game2048Results.tsx` - Results display for admin dashboard

**Usage**: 
```tsx
import { Game2048Component } from 'src/components/exercises/admin';
```

### **Portal Components** (`/portal`) 
**Purpose**: Patient-facing components for actual exercise execution

- `Exercise2048.tsx` - Main portal exercise component with session tracking
- `ExerciseInfo.tsx` - Exercise information display  
- `GameProgress.tsx` - Real-time progress tracking during exercise
- `ExitConfirmationDialog.tsx` - Confirmation dialog for exercise exit
- `EndExerciseDialog.tsx` - End exercise confirmation dialog

**Usage**:
```tsx
import { Exercise2048, ExerciseInfo } from 'src/components/exercises/portal';
```

### **Shared Components** (`/shared`)
**Purpose**: Core game logic used by both admin and portal

- `Game2048Board.tsx` - Core 2048 game board with vision scaling and customization

**Usage**:
```tsx  
import { Game2048Board } from 'src/components/exercises/shared';
```

## Key Differences

### **Admin vs Portal**

| Feature | Admin Components | Portal Components |
|---------|------------------|-------------------|
| **Purpose** | Configuration & Preview | Actual Patient Use |
| **Features** | Settings, Preview | Fullscreen, Timer, Session Tracking |
| **Data Flow** | Mock/Test Data | Real API Integration |
| **UX Focus** | Configuration Tools | Patient Experience |

### **Responsibilities**

- **Admin**: Focus on configuration, preview, and management features
- **Portal**: Focus on patient UX (auto browser fullscreen via `useExerciseFullscreen`, countdown, progress tracking)
- **Shared**: Core game mechanics, vision scaling, color customization

## 🔧 Implementation Plan

### **Current State**
- Folder structure created
- Components moved to correct folders
- Index files created for clean exports

### **Next Steps**
1. **Fix import paths** in external files that reference these components
2. **Implement countdown timer** in Portal components (currently in Admin)  
3. **Add color customization** to Shared Game2048Board
4. **Remove duplicate logic** between Admin and Portal components

## Usage Examples

### **For Admin Panel**
```tsx
// Admin exercise configuration page
import { Game2048Component, Game2048Preview } from 'src/components/exercises/admin';

const ExerciseConfigPage = () => (
  <Game2048Component 
    exerciseId={configId} 
    hideSettings={false}
    onGameComplete={handlePreviewComplete}
  />
);
```

### **For Patient Portal**
```tsx  
// Patient exercise execution page
import { Exercise2048 } from 'src/components/exercises/portal';

const ExerciseExecutionPage = () => (
  <Exercise2048 
    assignmentId={assignmentId}
    sessionId={sessionId}
  />
);
```

### **For Shared Game Logic**
```tsx
// Using shared game board in custom component
import { Game2048Board } from 'src/components/exercises/shared';

const CustomGameWrapper = () => (
  <Game2048Board
    exerciseId={exerciseId}
    visionLevel="20/40"
    levelOverride={true}
    colorScheme={{
      textColor: '#000000',
      backgroundColor: '#FFFFFF'  
    }}
    onGameComplete={handleComplete}
  />
);
```

## Benefits

1. **Clear Separation of Concerns** - Admin vs Portal functionality
2. **Reusable Shared Components** - Core logic in one place  
3. **Easier Maintenance** - Clear component responsibilities
4. **Better Code Organization** - Logical folder structure
5. **Type Safety** - Proper TypeScript exports and imports