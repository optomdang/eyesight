# Requirement: Refactor ExerciseResult Model & Thêm Tính Năng Pause

> **Ngày tạo:** 04/01/2026  
> **Cập nhật:** 04/01/2026  
> **Tác giả:** AI Assistant & Product Owner  
> **Trạng thái:** Đã thống nhất, chờ implement

---

## Changelog

| Ngày | Thay đổi |
|------|----------|
| 04/01/2026 | Thêm `completedAt` vào migration |
| 04/01/2026 | Sử dụng `navigator.sendBeacon()` cho beforeunload |
| 04/01/2026 | Làm rõ: Session complete = đủ số lần `passed` (cho phép có `failed`) |
| 04/01/2026 | Giữ lại `reviewedBy`, `reviewedAt`, `reviewNotes` |
| 04/01/2026 | Đổi `/complete` endpoint sang POST |
| 04/01/2026 | Thêm index cho `status` |
| 04/01/2026 | Bỏ backward compatibility (giai đoạn đầu phát triển) |

---

## 1. Tổng Quan

### 1.1 Mục tiêu
1. **Đơn giản hóa model ExerciseResult** - Loại bỏ các field thừa thãi, confusing
2. **Thêm tính năng Pause/Resume** - Cho phép bệnh nhân tạm dừng và tiếp tục bài tập
3. **Đảm bảo Audit Trail** - Lưu snapshot config tại thời điểm thực hiện

### 1.2 Phạm vi ảnh hưởng
- **Backend:** Model, Service, Validation, Migration
- **Frontend:** PortalExercise (game), ExerciseSessionPage (lịch sử), AssignmentPage (danh sách)

---

## 2. Phân Tích Hiện Trạng

### 2.1 Model ExerciseResult Hiện Tại

```javascript
ExerciseResult {
  id: INTEGER,
  patientId: INTEGER,
  exerciseSessionId: INTEGER,
  exerciseAssignmentId: INTEGER,
  exerciseId: INTEGER,
  
  exerciseType: STRING(50),      // ❌ SẼ XÓA
  level: INTEGER,
  score: INTEGER,
  duration: INTEGER,
  movesCount: INTEGER,
  accuracy: FLOAT,
  
  completed: BOOLEAN,            // ❌ SẼ XÓA
  passedLevel: BOOLEAN,          // ❌ SẼ XÓA
  
  exerciseState: JSONB,          // ✅ GIỮ
  visualSettings: JSONB,         // ✅ GIỮ
  passConditions: JSONB,         // ❌ SẼ XÓA
  
  centerId: INTEGER,
  reviewedBy: INTEGER,           // ⚠️ XEM XÉT
  reviewedAt: DATE,              // ⚠️ XEM XÉT
  reviewNotes: TEXT,             // ⚠️ XEM XÉT
  createdBy: INTEGER,
  updatedBy: INTEGER,
  deletedAt: DATE,
  deleted: BOOLEAN,
}
```

### 2.2 Vấn Đề Hiện Tại

| Vấn đề | Mô tả | Ảnh hưởng |
|--------|-------|-----------|
| `completed` thừa thãi | Luôn = `passedLevel` trong hầu hết case | Code confusing, không rõ dùng field nào |
| `passedLevel` tên confusing | Dễ nhầm với `level` (vision level) | Developer confuse |
| Không có `status` | 2 boolean không đủ mô tả các trạng thái | Không thể implement pause |
| `passConditions` trùng lặp | Đã có trong `exerciseConfig` | Data redundant |
| `exerciseType` trùng lặp | Sẽ có trong `exerciseConfig` snapshot | Data redundant |
| Không có audit trail config | Config thay đổi → lịch sử không chính xác | Audit sai |
| Không có `startedAt` | Không biết khi nào bắt đầu | Thiếu thông tin |

---

## 3. Model ExerciseResult Mới

### 3.1 Schema

```javascript
ExerciseResult {
  // === PRIMARY KEYS & FOREIGN KEYS ===
  id: INTEGER,                   // PK, auto increment
  patientId: INTEGER,            // FK → Patients
  exerciseSessionId: INTEGER,    // FK → ExerciseSessions
  exerciseAssignmentId: INTEGER, // FK → ExerciseAssignments
  exerciseId: INTEGER,           // FK → Exercises
  
  // === STATUS (MỚI - thay thế completed + passedLevel) ===
  status: ENUM('incomplete', 'passed', 'failed'),
  // - incomplete: Chưa bấm Complete (đang chơi, pause, bỏ dở)
  // - passed: Bấm Complete + đạt điều kiện
  // - failed: Bấm Complete + không đạt điều kiện
  
  // === METRICS ===
  score: INTEGER,                // Điểm số
  duration: INTEGER,             // Thời gian chơi (seconds)
  movesCount: INTEGER,           // Số nước đi
  accuracy: FLOAT,               // Độ chính xác (0-1)
  level: INTEGER,                // Vision level tại thời điểm chơi
  
  // === GAME STATE (cho resume) ===
  exerciseState: JSONB,          // Game state để resume
  // Format tùy theo exerciseConfig.exerciseType:
  // - 2048: { grid: [[2,4,0,0],...], score: 500 }
  // - Memory: { cards: [...], matchedPairs: 5 }
  // - Stereopsis: { currentLevel: 3, attempts: [...] }
  
  // === CONFIG SNAPSHOT (audit trail) ===
  exerciseConfig: JSONB,         // MỚI - Full config at start time
  // Bao gồm: exerciseType, duration, executionCount, visionType, 
  //          distance, colorScheme, passConditions, ...
  visualSettings: JSONB,         // Visual settings đã dùng
  // Bao gồm: fontSize, contrast, colorScheme, scaleFactor
  
  // === TIMESTAMPS ===
  startedAt: DATE,               // MỚI - Khi bấm Start/Thực hiện
  completedAt: DATE,             // Khi bấm Complete (passed/failed)
  createdAt: DATE,               // Auto by Sequelize
  updatedAt: DATE,               // Auto by Sequelize
  
  // === METADATA ===
  centerId: INTEGER,             // Multi-tenant
  createdBy: INTEGER,
  updatedBy: INTEGER,
  
  // === REVIEW (giữ lại để dùng sau) ===
  reviewedBy: INTEGER,           // FK → Users (bác sĩ review)
  reviewedAt: DATE,              // Thời điểm review
  reviewNotes: TEXT,             // Ghi chú của bác sĩ
  
  // === SOFT DELETE ===
  deleted: BOOLEAN,
  deletedAt: DATE,
}
```

### 3.2 Chi Tiết Thay Đổi

#### 3.2.1 Fields XÓA

| Field | Lý do xóa |
|-------|-----------|
| `completed` | Thừa thãi, thay bằng `status` |
| `passedLevel` | Thừa thãi + tên confusing, thay bằng `status` |
| `passConditions` | Đã có trong `exerciseConfig` snapshot |
| `exerciseType` | Đã có trong `exerciseConfig` snapshot |
| ~~`reviewedBy`~~ | ~~Chưa dùng~~ → **GIỮ LẠI** để dùng sau |
| ~~`reviewedAt`~~ | ~~Chưa dùng~~ → **GIỮ LẠI** để dùng sau |
| ~~`reviewNotes`~~ | ~~Chưa dùng~~ → **GIỮ LẠI** để dùng sau |

#### 3.2.2 Fields THÊM MỚI

| Field | Type | Lý do thêm |
|-------|------|-----------|
| `status` | ENUM | Thay thế 2 boolean, hỗ trợ nhiều trạng thái hơn |
| `exerciseConfig` | JSONB | Audit trail - lưu config tại thời điểm thực hiện |
| `startedAt` | DATE | Biết thời điểm bắt đầu (trước đó chỉ có createdAt) |

#### 3.2.3 Fields GIỮ NGUYÊN

| Field | Lý do giữ |
|-------|-----------|
| `exerciseState` | Dùng để resume game |
| `visualSettings` | Audit - biết font size, contrast đã dùng |
| `score`, `duration`, `movesCount`, `accuracy` | Metrics quan trọng |
| `level` | Vision level tại thời điểm chơi |
| Các FK và metadata | Cần thiết |

---

## 4. Logic Nghiệp Vụ

### 4.1 Status Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  [Bấm Start/Thực hiện]                                          │
│         │                                                       │
│         ▼                                                       │
│  ┌──────────────────────────────────────┐                      │
│  │ CREATE ExerciseResult                 │                      │
│  │   status: 'incomplete'                │                      │
│  │   exerciseConfig: { snapshot }        │                      │
│  │   startedAt: now()                    │                      │
│  │   exerciseState: null                 │                      │
│  └──────────────────────────────────────┘                      │
│         │                                                       │
│         ▼                                                       │
│  ┌──────────────────────────────────────┐                      │
│  │         ĐANG CHƠI GAME                │                      │
│  │   (score, moves update trong memory)  │                      │
│  └──────────────────────────────────────┘                      │
│         │                                                       │
│    ┌────┴────────────────┬──────────────────────┐              │
│    │                     │                      │              │
│    ▼                     ▼                      ▼              │
│  [Pause]            [Complete]         [Đóng tab/Thoát]        │
│    │                     │                      │              │
│    ▼                     ▼                      ▼              │
│  ┌────────────┐   ┌─────────────────┐   ┌────────────────┐    │
│  │ UPDATE     │   │ Evaluate        │   │ beforeunload   │    │
│  │ exercise   │   │ pass/fail       │   │ → PATCH update │    │
│  │ State      │   │ conditions      │   │ exerciseState  │    │
│  │            │   │                 │   │ (nếu có thể)   │    │
│  │ status:    │   │ status:         │   │                │    │
│  │ 'incom-   │   │ 'passed' hoặc   │   │ status:        │    │
│  │ plete'    │   │ 'failed'        │   │ 'incomplete'   │    │
│  │            │   │                 │   │                │    │
│  │ state:     │   │ state: null     │   │ state: {game}  │    │
│  │ {grid,...} │   │ completedAt:now │   │ hoặc null      │    │
│  └────────────┘   └─────────────────┘   └────────────────┘    │
│    │                     │                      │              │
│    ▼                     ▼                      ▼              │
│  Navigate           Navigate              (Tab closed)         │
│  back               back                                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Quy Tắc Nghiệp Vụ

#### 4.2.1 Khi Bấm "Thực hiện" (Start)

```javascript
// Pseudo code
async function startExercise(sessionId, assignmentId) {
  // 1. Check có Result đang incomplete trong session này không
  const pendingResult = await ExerciseResult.findOne({
    where: { 
      exerciseSessionId: sessionId,
      status: 'incomplete'
    }
  });
  
  if (pendingResult) {
    // 2A. Có Result dở → BẮT BUỘC resume
    if (pendingResult.exerciseState) {
      // Có game state → load và resume
      return { action: 'resume', result: pendingResult };
    } else {
      // Không có state → tiếp tục ván mới nhưng dùng Result này
      return { action: 'continue', result: pendingResult };
    }
  } else {
    // 2B. Không có Result dở → Tạo mới
    const config = await getExerciseConfig(assignmentId);
    const newResult = await ExerciseResult.create({
      exerciseSessionId: sessionId,
      exerciseAssignmentId: assignmentId,
      patientId: patient.id,
      exerciseId: config.exerciseId,
      status: 'incomplete',
      startedAt: new Date(),
      exerciseConfig: config,  // Snapshot!
      visualSettings: calculateVisualSettings(config, patient),
      centerId: patient.centerId,
      createdBy: patient.userId,
    });
    return { action: 'new', result: newResult };
  }
}
```

**Lý do:**
- Không cho phép tạo Result mới khi có Result đang dở
- Bắt buộc hoàn thành (Complete) hoặc đợi đến Session mới
- Đảm bảo mỗi lần chơi đều được track

#### 4.2.2 Khi Bấm "Tạm dừng" (Pause)

```javascript
// Pseudo code
async function pauseExercise(resultId, gameState) {
  await ExerciseResult.update({
    exerciseState: gameState,  // { grid, score, ... }
    score: gameState.score,
    movesCount: gameState.moves,
    duration: calculateDuration(result.startedAt),
    // status vẫn là 'incomplete'
  }, {
    where: { id: resultId }
  });
  
  // Navigate về trang trước
}
```

**Lý do:**
- Lưu game state để resume sau
- Không thay đổi status (vẫn `incomplete`)
- User có thể quay lại bất cứ lúc nào trong Session

#### 4.2.3 Khi Bấm "Kết thúc" (Complete)

```javascript
// Pseudo code
async function completeExercise(resultId, finalGameState) {
  const result = await ExerciseResult.findByPk(resultId);
  const config = result.exerciseConfig;
  
  // Evaluate pass/fail
  const finalScore = finalGameState.score;
  const finalDuration = calculateDuration(result.startedAt);
  const finalAccuracy = calculateAccuracy(finalGameState);
  
  const isPassed = evaluatePassConditions(config, {
    score: finalScore,
    duration: finalDuration,
    accuracy: finalAccuracy,
  });
  
  await result.update({
    status: isPassed ? 'passed' : 'failed',
    score: finalScore,
    duration: finalDuration,
    accuracy: finalAccuracy,
    movesCount: finalGameState.moves,
    exerciseState: null,  // Clear state sau khi complete
    completedAt: new Date(),
  });
  
  // Update session statistics
  await updateSessionStats(result.exerciseSessionId);
}
```

**Lý do:**
- Đánh giá pass/fail dựa trên `exerciseConfig` snapshot
- Clear `exerciseState` vì đã complete (không cần resume)
- Set `completedAt` để biết thời điểm hoàn thành

#### 4.2.4 Evaluate Pass Conditions

```javascript
function evaluatePassConditions(config, metrics) {
  // Lấy pass conditions từ config
  const minDuration = (config.duration || 1) * 60; // minutes → seconds
  const minScore = config.minScore || 0;
  const minAccuracy = config.minAccuracy || 0;
  
  return (
    metrics.duration >= minDuration &&
    metrics.score >= minScore &&
    metrics.accuracy >= minAccuracy
  );
}
```

**Lý do:**
- Sử dụng config snapshot để evaluate (không phải config hiện tại)
- Đảm bảo công bằng - đánh giá theo điều kiện lúc bắt đầu

#### 4.2.5 Khi Đóng Tab / Mất Mạng

```javascript
// Frontend: beforeunload event - sử dụng sendBeacon (không block)
window.addEventListener('beforeunload', () => {
  if (isGameActive()) {
    // Sử dụng sendBeacon - fire-and-forget, không block unload
    navigator.sendBeacon(
      `/api/v1/me/assignments/${assignmentId}/sessions/${sessionId}/results/${resultId}`,
      JSON.stringify({
        exerciseState: getCurrentGameState(),
        score: currentScore,
        movesCount: currentMoves,
        duration: calculateDuration(startedAt),
      })
    );
  }
});
```

**Lý do:**
- `sendBeacon` đảm bảo request được gửi đi ngay cả khi tab đóng
- Không block unload như fetch/axios
- Best effort save - chấp nhận data loss trong edge cases (mất mạng hoàn toàn)
- User có thể chơi lại nếu state không được save

#### 4.2.6 Session Completion Logic

```javascript
async function updateSessionStats(sessionId) {
  const results = await ExerciseResult.findAll({
    where: { exerciseSessionId: sessionId }
  });
  
  const passedCount = results.filter(r => r.status === 'passed').length;
  const failedCount = results.filter(r => r.status === 'failed').length;
  const incompleteCount = results.filter(r => r.status === 'incomplete').length;
  
  const session = await ExerciseSession.findByPk(sessionId, {
    include: [{ model: ExerciseAssignment, include: [ExerciseConfig] }]
  });
  
  const requiredCount = session.exerciseAssignment.exerciseConfig.executionCount;
  
  // Session complete khi đủ số lần passed (cho phép có failed)
  const isSessionComplete = passedCount >= requiredCount;
  
  await session.update({
    executionsCompleted: passedCount + failedCount, // Số lần đã complete (không tính incomplete)
    validExecutions: passedCount,                   // Số lần passed
    status: isSessionComplete ? 'completed' : 'incomplete',
    completedAt: isSessionComplete ? new Date() : null,
  });
}
```

**Lý do:**
- Session complete = đủ số lần `passed` (cho phép có `failed`)
- `executionsCompleted` = passed + failed (đã bấm Complete)
- `validExecutions` = chỉ đếm passed
- Không yêu cầu tất cả phải passed, chỉ cần đủ số lần passed

### 4.3 Result `incomplete` Qua Ngày Mới

**Quy tắc:** KHÔNG tự động xử lý. Giữ nguyên `incomplete` mãi mãi.

**Lý do:**
1. `incomplete` là **SỰ THẬT** - bệnh nhân không hoàn thành
2. Thông tin có giá trị cho báo cáo/audit
3. Phân biệt được "bỏ dở" vs "làm xong nhưng failed"

**Ví dụ báo cáo:**
```
Bệnh nhân Nguyễn Văn A:
- Tổng số lần thực hiện: 50
- Passed: 30 (60%)
- Failed: 15 (30%)
- Bỏ dở: 5 (10%)  ← Thông tin quan trọng!
```

---

## 5. API Changes

### 5.1 Endpoints Cần Sửa

| Endpoint | Method | Thay đổi |
|----------|--------|----------|
| `POST /me/assignments/:id/sessions/:id/results` | POST | Thêm `exerciseConfig` snapshot |
| `PATCH /me/assignments/:id/sessions/:id/results/:id` | PATCH | Cho phép update `exerciseState` |
| `POST /me/assignments/:id/sessions/:id/results/:id/complete` | POST | **MỚI** - Action complete (RESTful) |
| `GET /me/assignments/:id/sessions/:id/results` | GET | Trả về `status` thay vì `completed`+`passedLevel` |

### 5.2 Request/Response Changes

#### Create Result (Start)
```javascript
// Request - Không cần gửi exerciseConfig, backend tự lấy
POST /me/assignments/123/sessions/456/results
{
  // Không cần body, hoặc chỉ cần device info
}

// Response
{
  id: 789,
  status: 'incomplete',
  startedAt: '2026-01-04T10:00:00Z',
  exerciseConfig: { ... },  // Snapshot
  exerciseState: null,
  action: 'new' | 'resume' | 'continue'
}
```

#### Update Result (Pause / During game)
```javascript
// Request
PATCH /me/assignments/123/sessions/456/results/789
{
  exerciseState: { grid: [...], score: 500 },
  score: 500,
  movesCount: 45,
  duration: 120
}

// Response
{
  id: 789,
  status: 'incomplete',  // Không đổi
  exerciseState: { ... },
  score: 500,
  ...
}
```

#### Complete Result
```javascript
// Request - Đổi sang POST (RESTful action)
POST /me/assignments/123/sessions/456/results/789/complete
{
  score: 1200,
  movesCount: 89,
  duration: 300,
  accuracy: 0.75
}

// Response
{
  id: 789,
  status: 'passed',  // hoặc 'failed'
  exerciseState: null,  // Cleared
  completedAt: '2026-01-04T10:05:00Z',
  ...
}
```

---

## 6. Frontend Changes

### 6.1 PortalExercise.tsx

#### 6.1.1 UI Changes

```
┌────────────────────────────────────────────────────────────────┐
│  Điểm: 500  │  Thời gian: 2:30  │  Nước đi: 45                 │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│                      [GAME 2048]                               │
│                                                                │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│      [⏸️ Tạm dừng]                    [✅ Hoàn thành]          │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

**Thay đổi:**
- Đổi "Kết thúc" → "Hoàn thành" (rõ nghĩa hơn)
- Thêm nút "Tạm dừng"

#### 6.1.2 Logic Changes

```typescript
// Khi component mount
useEffect(() => {
  const initGame = async () => {
    // 1. Gọi API start/resume
    const response = await startExercise(assignmentId, sessionId);
    
    if (response.action === 'resume' && response.result.exerciseState) {
      // 2A. Resume game từ state
      restoreGameState(response.result.exerciseState);
      setCurrentResultId(response.result.id);
    } else {
      // 2B. Bắt đầu game mới
      initNewGame();
      setCurrentResultId(response.result.id);
    }
  };
  
  initGame();
}, []);

// Nút Tạm dừng
const handlePause = async () => {
  const gameState = getGameState(); // { grid, score, ... }
  
  await patchData(`/me/assignments/${assignmentId}/sessions/${sessionId}/results/${resultId}`, {
    exerciseState: gameState,
    score: gameState.score,
    movesCount: gameState.moves,
    duration: calculateDuration(),
  });
  
  navigate(`/portal/assignments/${assignmentId}/sessions`);
};

// Nút Hoàn thành
const handleComplete = async () => {
  const finalState = getGameState();
  
  await postData(`/me/assignments/${assignmentId}/sessions/${sessionId}/results/${resultId}/complete`, {
    score: finalState.score,
    movesCount: finalState.moves,
    duration: calculateDuration(),
    accuracy: calculateAccuracy(),
  });
  
  navigate(`/portal/assignments/${assignmentId}/sessions`);
};
```

### 6.2 AssignmentPage.tsx

#### 6.2.1 Nút "Thực hiện" Logic

```typescript
const handleExecuteExercise = async (assignment) => {
  const currentSession = assignment.currentSession;
  
  if (!currentSession?.id) {
    // Chưa có session → đi đến danh sách sessions
    navigate(`/portal/assignments/${assignment.id}/sessions`);
    return;
  }
  
  // Có session → vào thẳng game (backend sẽ xử lý resume nếu có)
  navigate(`/portal/exercise/assignments/${assignment.id}/sessions/${currentSession.id}`);
};
```

**Lý do:**
- Logic resume ở backend, frontend chỉ cần navigate
- Backend sẽ check có Result `incomplete` không và trả về action phù hợp

### 6.3 ExerciseSessionPage.tsx

#### 6.3.1 Đã Xóa Actions

Đã confirm: Trang này **CHỈ XEM**, không có action thực hiện.

Chỉ có 1 action: "Xem chi tiết" → navigate đến SessionResultsPage

### 6.4 SessionResultsPage.tsx

#### 6.4.1 Hiển Thị Status Mới

```typescript
const getStatusColor = (status: string) => {
  switch (status) {
    case 'passed': return 'success';
    case 'failed': return 'error';
    case 'incomplete': return 'warning';
    default: return 'default';
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'passed': return 'Đạt';
    case 'failed': return 'Không đạt';
    case 'incomplete': return 'Chưa hoàn thành';
    default: return status;
  }
};
```

#### 6.4.2 Columns Update

```typescript
const columns = [
  { name: 'createdAt', label: 'Thời gian' },
  { name: 'score', label: 'Điểm số' },
  { name: 'accuracy', label: 'Độ chính xác' },
  { name: 'duration', label: 'Thời gian (s)' },
  { 
    name: 'status',  // Đổi từ passedLevel
    label: 'Kết quả',
    customBodyRender: (value) => (
      <Chip label={getStatusText(value)} color={getStatusColor(value)} />
    )
  },
];
```

---

## 7. Database Migration

### 7.1 Migration Script

```javascript
// migrations/YYYYMMDD_refactor_exercise_result.js

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // 1. Thêm column mới
      await queryInterface.addColumn('ExerciseResults', 'status', {
        type: Sequelize.ENUM('incomplete', 'passed', 'failed'),
        defaultValue: 'incomplete',
        allowNull: false,
      }, { transaction });
      
      await queryInterface.addColumn('ExerciseResults', 'exerciseConfig', {
        type: Sequelize.JSONB,
        allowNull: true,
      }, { transaction });
      
      await queryInterface.addColumn('ExerciseResults', 'startedAt', {
        type: Sequelize.DATE,
        allowNull: true,
      }, { transaction });
      
      await queryInterface.addColumn('ExerciseResults', 'completedAt', {
        type: Sequelize.DATE,
        allowNull: true,
      }, { transaction });
      
      // 2. Migrate data cũ
      // completed=true && passedLevel=true → 'passed'
      // completed=true && passedLevel=false → 'failed'
      // còn lại → 'incomplete'
      await queryInterface.sequelize.query(`
        UPDATE "ExerciseResults"
        SET "status" = CASE
          WHEN "completed" = true AND "passedLevel" = true THEN 'passed'
          WHEN "completed" = true AND "passedLevel" = false THEN 'failed'
          ELSE 'incomplete'
        END,
        "startedAt" = "createdAt",
        "completedAt" = CASE
          WHEN "completed" = true THEN "updatedAt"
          ELSE NULL
        END
      `, { transaction });
      
      // 3. Thêm index cho status
      await queryInterface.addIndex('ExerciseResults', ['status'], {
        name: 'idx_exerciseresults_status',
        transaction
      });
      
      await queryInterface.addIndex('ExerciseResults', ['exerciseSessionId', 'status'], {
        name: 'idx_exerciseresults_session_status',
        transaction
      });
      
      // 4. Xóa columns cũ (GIỮ LẠI reviewedBy, reviewedAt, reviewNotes)
      await queryInterface.removeColumn('ExerciseResults', 'completed', { transaction });
      await queryInterface.removeColumn('ExerciseResults', 'passedLevel', { transaction });
      await queryInterface.removeColumn('ExerciseResults', 'passConditions', { transaction });
      await queryInterface.removeColumn('ExerciseResults', 'exerciseType', { transaction });
      
      // 5. Xóa index cũ không còn dùng
      await queryInterface.removeIndex('ExerciseResults', 'idx_exerciseresults_type_completed', { transaction });
      
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
  
  down: async (queryInterface, Sequelize) => {
    // Rollback logic...
  }
};
```

### 7.2 Data Migration Notes

| Dữ liệu cũ | Dữ liệu mới |
|------------|-------------|
| `completed=true, passedLevel=true` | `status='passed'`, `completedAt=updatedAt` |
| `completed=true, passedLevel=false` | `status='failed'`, `completedAt=updatedAt` |
| `completed=false` | `status='incomplete'`, `completedAt=null` |
| `createdAt` | Copy sang `startedAt` |
| `exerciseType`, `passConditions` | Xóa (không migrate) |
| `reviewedBy`, `reviewedAt`, `reviewNotes` | **GIỮ LẠI** |

---

## 8. Validation Changes

### 8.1 exerciseResult.validation.js

```javascript
const createExerciseResult = {
  body: Joi.object().keys({
    // Không cần gửi gì - backend tự lấy config
  }),
};

const updateExerciseResult = {
  body: Joi.object().keys({
    exerciseState: Joi.object().optional(),
    score: Joi.number().optional(),
    duration: Joi.number().optional(),
    movesCount: Joi.number().optional(),
    accuracy: Joi.number().min(0).max(1).optional(),
  }),
};

const completeExerciseResult = {
  body: Joi.object().keys({
    score: Joi.number().required(),
    duration: Joi.number().required(),
    movesCount: Joi.number().optional(),
    accuracy: Joi.number().min(0).max(1).optional(),
  }),
};
```

> **Lưu ý:** Không thêm validation chặt cho `exerciseConfig` JSONB vì đang giai đoạn đầu phát triển.

---

## 8.2 Backward Compatibility

> **KHÔNG HỖ TRỢ backward compatibility.**
> 
> Đang giai đoạn đầu phát triển, frontend và backend phải deploy đồng thời.
> Không cần xử lý format cũ (`completed`, `passedLevel`).

---

## 9. Testing Checklist

### 9.1 Unit Tests

- [ ] `evaluatePassConditions()` với các case khác nhau
- [ ] `updateSessionStats()` đếm đúng passed/failed
- [ ] Migration script chạy đúng

### 9.2 Integration Tests

- [ ] Flow: Start → Play → Pause → Resume → Complete
- [ ] Flow: Start → Đóng tab → Vào lại → Resume
- [ ] Flow: Start → Complete → Start mới (trong cùng session)
- [ ] Flow: Session mới khi có Result cũ `incomplete`

### 9.3 Edge Cases

- [ ] User đóng tab ngay khi vừa start (chưa kịp save)
- [ ] Mất mạng giữa chừng
- [ ] Result `incomplete` từ ngày hôm qua, vào lại hôm nay
- [ ] Complete với duration < required (→ failed)
- [ ] Session đạt đủ số lần passed (→ session complete)

---

## 10. Rollback Plan

Nếu có vấn đề sau khi deploy:

1. **Revert migration** - Rollback database về state cũ
2. **Revert code** - Deploy lại version cũ
3. **Data recovery** - Không mất data vì migration có backup logic

---

## 11. Timeline Estimate

| Task | Estimate |
|------|----------|
| Backend Model + Migration | 2h |
| Backend Service | 3h |
| Backend Validation + Routes | 1h |
| Frontend PortalExercise | 3h |
| Frontend Pages update | 2h |
| Testing | 3h |
| **Total** | **~14h** |

---

## 12. Approval

- [ ] Product Owner reviewed
- [ ] Technical Lead reviewed
- [ ] Ready for implementation
