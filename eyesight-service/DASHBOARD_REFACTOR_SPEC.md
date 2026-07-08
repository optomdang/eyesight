# DASHBOARD REFACTOR — ĐẶC TẢ & PHÂN TÍCH KỸ THUẬT

> Tài liệu nguồn (source of truth) cho đợt refactor toàn bộ dashboard.
> Mục tiêu: (1) hiểu sâu yêu cầu, (2) phân tích data model / index / query cho **bài toán lâu dài**.
> Trạng thái: ✅ đã chốt với BU · ⚠️ rủi ro/nợ kỹ thuật · 🔧 đề xuất.

---

# PHẦN A — DATA MODEL HIỆN TRẠNG (deepdive)

## A.1 Sơ đồ thực thể & quan hệ

```
Center 1───* Patient ──* ExamSession ──* ExamResult ──1 ExamMetric
                │                                  (leftEyeLevel/rightEyeLevel/bothEyeLevel: STRING)
                │            ExamAssignment (lịch đo: examType, frequency, isEnabled)
                │
                ├── examResults (JSONB cache: 4 loại × {initialResult,currentResult,lastExamDate})
                ├── compliance  (JSONB cache)
                ├── causes       (JSONB array: 6 nguyên nhân)
                │
                └──* ExerciseAssignment ──* ExerciseSession ──* ExerciseResult
                         │  (1 phác đồ/BN)      (1 buổi)            (1 lượt thực hiện)
                         └─1 ExerciseConfig ──1 Exercise (game gốc, vd 2048)
                              (duration phút, executionCount lần/buổi, inactivityThreshold)

User 1──1 Patient | 1──1 Doctor ;  AuditLog(actorUserId→User, action='auth.login')
```

**⚠️ A.1.1 — Không có FK constraint ở DB.** Mọi association khai báo `constraints: false` ([models/index.js](src/models/index.js)). Toàn vẹn tham chiếu chỉ được đảm bảo ở tầng app → rủi ro orphan rows; query phải luôn tự lọc `deleted=false` và không thể dựa vào cascade.

## A.2 Bảng & field trọng yếu cho dashboard

### Patient (`Patients`)
- `centerId, doctorId, userId, treatmentStatus(bool), activeFrom, activeTo, severityLevel, deleted`
- `examResults` **JSONB** — read-model: `{ far|near|contrast|stereopsis: { initialResult:{leftEye,rightEye,bothEye}, currentResult:{...}, lastExamDate } }`
- `compliance` **JSONB** — read-model tuân thủ đo (theo loại).
- `causes` **JSONB array(string)** — 6 nguyên nhân (đã có UI checkbox ở `MedicalRecordTab`).
- **Vòng đời điều trị** (utils/treatmentUtils): `paused` (treatmentStatus=false) · `not_started` (now<activeFrom) · `completed` (now>activeTo) · `active` (còn lại). "Đã từng điều trị" = `activeFrom ≠ null`.

### ExamResult (`ExamResults`) — mỗi lần ĐO thị lực
- `patientId, examSessionId(NOT NULL), examType, status, centerId, deleted`
- `leftEyeLevel / rightEyeLevel / bothEyeLevel` **STRING(50)** ⚠️ (bậc thị lực lưu chuỗi)
- `rawData` JSONB (spherical/cylinder), `startedAt, completedAt`

### ExamSession (`ExamSessions`) — 1 buổi đo
- `code(unique), patientId, examType, status('incomplete'|'completed'), scheduledDate, centerId, deleted`

### ExamAssignment (`ExamAssignments`) — LỊCH đo (không phải kết quả)
- `patientId, examType, frequency, isEnabled, centerId`

### ExerciseResult (`ExerciseResults`) — mỗi LƯỢT tập
- `patientId, exerciseId, exerciseAssignmentId, exerciseSessionId, centerId, deleted`
- `status` ⚠️ hiện `incomplete|passed|failed` → **sẽ đổi `incomplete|completed`**
- `duration(int giây)` = thời gian thực, `score, accuracy, movesCount, level`
- `pauseCount, inactivityCount, focusScore(=max(0,100−pause−inactivity))`

### ExerciseSession (`ExerciseSessions`) — 1 buổi tập (đã denormalize aggregate)
- `code, exerciseAssignmentId, patientId, status('incomplete'|'completed'), centerId`
- aggregate sẵn: `executionsCompleted, validExecutions, totalScore, averageScore, bestScore, validityPercentage, pauseCount, inactivityCount, focusScore, duration`
- ⚠️ **KHÔNG lưu `executionCount` (số lần giao)** → phải lấy từ `ExerciseConfig.executionCount` qua assignment.

### ExerciseAssignment (`ExerciseAssignments`) — phác đồ giao cho 1 BN
- `patientId, exerciseConfigId, assignedBy, status, sessionsCompleted, complianceStatus, currentLevel, visionLevel, centerId`

### ExerciseConfig (`ExerciseConfigs`)
- `exerciseId, configType, duration(DECIMAL phút), executionCount(lần/buổi), frequency, inactivityThreshold(giây, mặc định 30), centerId`

### Exercise (`Exercises`) — game gốc (vd 2048)
- `name, code, exerciseType, status, centerId, deleted`

### AuditLog (`AuditLogs`)
- `centerId, actorUserId, actorUserType, action('auth.login'), status('success'), occurredAt`

## A.3 Index hiện có (bảng nóng)

| Bảng | Index hiện có (model + migration 20260208 + 20260531) |
|---|---|
| Patients | (centerId,treatmentStatus),(doctorId),(userId),(deleted),(activeFrom,activeTo),(centerId,deleted),(treatmentStatus,activeFrom,activeTo),(createdAt,centerId) |
| ExamResults | (patientId,createdAt),(status,createdAt),(examType,status),(patientId,examType,createdAt),(centerId,patientId,examType),(centerId,status),(deleted),(examSessionId,status),**(centerId,status,createdAt)**,**(centerId,examType,completedAt)** |
| ExamSessions | (code unique),(patientId,examType,status),(patientId,examType,scheduledDate),(centerId,status),(scheduledDate,status),(deleted) |
| ExerciseResults | (patientId,createdAt),(exerciseSessionId),(exerciseAssignmentId),(status),(exerciseSessionId,status),(centerId),(centerId,patientId,exerciseAssignmentId),(exerciseAssignmentId,status),(deleted),**(centerId,status,createdAt)** |
| ExerciseSessions | (exerciseAssignmentId,status),(patientId,startedAt),unique(exerciseAssignmentId,startedAt),**(exerciseAssignmentId,createdAt)** |
| ExerciseAssignments | unique(patientId,exerciseConfigId,centerId),(patientId,centerId,status),(exerciseConfigId,centerId,status),(assignedBy,centerId),(nextDueDate,status,centerId),(complianceStatus,centerId),(lastSessionAt,centerId),(createdAt,centerId) |
| AuditLogs | (centerId),(actorUserId),(actorUserType),(action),(status),(occurredAt),(entityType,entityId),(action,status,occurredAt),**(centerId,action,occurredAt)** |
| Patients.examResults / .causes | ❌ **không có GIN index** |

---

# PHẦN B — ĐẶC TẢ TỪNG METRIC (chi tiết)

> Quy ước nguồn: **[P]**=Patient.examResults cache · **[ER]**=ExamResults · **[XR]**=ExerciseResult · **[XS]**=ExerciseSession · **[XA]**=ExerciseAssignment · **[XC]**=ExerciseConfig.
### Định nghĩa nền (dùng xuyên suốt)
- **treatmentStatus (sau D9): STRING enum** `not_started | active | paused | completed`. `now>activeTo` ⇒ `completed`.
- **inTreatment** = `treatmentStatus='active'` (≈ activeFrom ≤ now ≤ activeTo, không paused).
- **everTreated** (mẫu #3/#4/#5) = `treatmentStatus IN ('active','paused','completed')` (đã bắt đầu; gồm cả đã dừng/hoàn thành; loại `not_started`).
- **Mô hình mắt theo loại đo:** lập thể → chỉ `bothEye`; xa/gần/tương phản → chỉ `leftEye`+`rightEye` (KHÔNG bothEye, KHÔNG so chéo mắt).
- **"Cải thiện ở 1 loại"** (#3/#9/#12-15): lập thể: `bothEye.cur>bothEye.init`; loại khác: **bất kỳ mắt nào** `cur>init` (so cùng mắt). [best-practice: bao trùm — 1 mắt tiến bộ = có cải thiện]
- **improvedSet** = everTreated có ≥1/4 loại "cải thiện".
- **#4 số dòng xa** (best-practice tao chốt): = **TB delta 2 mắt xa** có đủ init+cur (`cur_level−init_level` mỗi mắt; chỉ 1 mắt có data → lấy mắt đó). Khác #10 (recovery dùng 1 mắt đại diện) vì #4 đo *mức tăng tổng thể*, #10 đo *mức hiện tại*.

## TAB 1 — TỔNG QUAN BỆNH NHÂN (login bác sĩ/admin KHÔNG tính)

| # | Card/Chart | Định nghĩa & công thức | Nguồn | Edge cases |
|---|---|---|---|---|
| 1 | BỆNH NHÂN | `count(Patient: centerId,deleted=false)` | Patient | — |
| 2 | ĐANG ĐIỀU TRỊ | `count(inTreatment)` | Patient | treatmentStatus=false→loại |
| 3 | TỶ LỆ CẢI THIỆN | `|improvedSet| / |everTreated| × 100` | [P] | mẫu=0 → 0%. So sánh dùng bậc level (current_level>initial_level) |
| 4 | MỨC ĐỘ CẢI THIỆN | TB `(far.current_level − far.initial_level)` trên **improvedSet** (cùng tập #3). Nhãn "Số dòng thị lực cải thiện TB" | [P] | BN cải thiện loại khác mà far không đổi → +0 vẫn vào TB. far thiếu initial/current → bỏ khỏi TB |
| 5 | ĐỘ TUỔI | Min/Max/Avg `age(User.dateOfBirth)` trên **improvedSet** | [P]+User | dob null → bỏ |
| 6 | XU HƯỚNG HOẠT ĐỘNG | Mỗi ngày = **số BN distinct** có ≥1 `ExamResult` HOẶC `ExerciseResult` tạo trong ngày. (BỎ điều kiện login — thừa, vì phải login mới làm bài.) Trục: "số bệnh nhân" | [ER]∪[XR] | fill 0 ngày trống. TZ: gom theo UTC-date thống nhất |
| 7 | BẢNG XẾP HẠNG | inTreatment; cột HOÀN THÀNH%(#8)/TẬP TRUNG%(#9)/CẢI THIỆN(số dòng xa)/PHỤC HỒI%(#10). Sắp **Hoàn thành→Tập trung→Cải thiện**; Phục hồi chỉ hiển thị; LIMIT 10 | tổng hợp | tie → khóa phụ ổn định (patientId) |
| 8 | (cột) HOÀN THÀNH | **% SỐ LẦN gộp test+tập**: `(test full + lượt tập completed) / (test giao + lượt tập giao)` | [ER/ES]+[XR/XS/XC] | giao=0 → 0% |
| 9 | Tỉ lệ cải thiện theo nhóm nguyên nhân | Pie Cải thiện/Giảm sút/Ổn định, lọc `causes` (overlap) + loại thị lực dropdown. Cải thiện=current>init, Giảm sút=current<init, Ổn định=bằng. Toàn thời gian | [P]+causes | thiếu init/current → bỏ |
| 10 | Tương quan độ tuổi – hiệu quả & tuân thủ | X=tuổi (≤18 từng tuổi, >18 gộp); cột1=tổng BN/tuổi, cột2=BN cải thiện/tuổi (%đỉnh); line1=TB %hoàn-thành-**bài tập** improvedSet; line2=TB focus% improvedSet. **Tính TẤT cả BN** (chart time-series). Nút phóng to | [P]+[XR/XS] | tuổi thiếu dob→bỏ |

## TAB 2 — THỐNG KÊ BÀI KIỂM TRA

| # | Card/Chart | Định nghĩa & công thức | Nguồn |
|---|---|---|---|
| 11 | TỈ LỆ TUÂN THỦ (test) | `(test session hoàn thành full) / (tổng test session đã tạo) × 100` | [ES] |
| 12-15 | THỊ LỰC XA/GẦN/TƯƠNG PHẢN/LẬP THỂ | mỗi card = `(everTreated có current>init loại đó) / everTreated × 100` | [P] |
| 16 | Phân Bổ Loại Test | bar theo examType, stack Hoàn thành/Chưa xong; **ghi nhãn đơn vị** | [ER] group(examType,status) |
| 17 | Xu Hướng Hoàn Thành | line (hoàn thành/tổng/tỷ lệ) + **selector Tuần/Tháng/Quý/Năm**; nhãn đơn vị. "hoàn thành"=test full | [ER/ES] theo bucket |
| 18 | ExamDetailsTable | giữ | [ER] |

## TAB 3 — HIỆU SUẤT BÀI TẬP

| # | Card/Chart | Định nghĩa & công thức | Nguồn |
|---|---|---|---|
| 19 | ĐANG SỬ DỤNG | `(số Exercise distinct bác sĩ đã giao) / (tổng Exercise hệ thống)` | Exercise+[XA→XC] |
| 20 | SỐ PHÁC ĐỒ TẬP | `count(ExerciseConfig)` | [XC] |
| 21 | % Hoàn thành (đổi từ "Tỷ Lệ Pass") | **% THỜI GIAN**: `Σ(XR.duration) / Σ(giao)`; giao = `XS.executionCount × XS.executionDuration × 60`. VD 15p/40p=37.5%. **Clamp tại WRITE** (xem #21-clamp) nên duration luôn ≤ giao | [XR]+[XS] |
| 22 | Tuân Thủ | **% SỐ LẦN**: `(lượt completed) / (lượt giao)`. VD 3/4=75% | [XR/XS]+[XC] |
| 23 | BN Xuất Sắc | `count` BN có Tuân thủ(#22) > 80% | per-patient #22 |
| 24 | Xu Hướng Hiệu Suất | **XÓA** (FE `ExercisePerformanceTrend` + nhánh `trendData` BE) | — |
| 25 | Phân Bổ Bài Tập | **bar ngang** theo loại bài tập; nhãn đơn vị | [XR] group(exerciseType) |
| 26 | % Tuân thủ theo dạng bài tập (MỚI) | bar: mỗi loại = `lượt completed / lượt giao` của loại đó | [XR/XS]+[XC] |
| 27 | ExerciseDetailsTable | giữ | [XR] |

### Chỉ số dùng chung
- **#9 TẬP TRUNG (focus)** = TB `focusScore` các lượt `completed`; `focusScore = max(0, 100 − pauseCount − (#idle ≥ inactivityThreshold))`. Field đã có.
- **#10 PHỤC HỒI** = `(20 / mẫu_số_Snellen_xa_mới_nhất) × 100`. Chọn mắt: cả 2 mắt <20/20 → **mắt tốt hơn**; 1 mắt đã 20/20 → **mắt còn lại**. VD: MP 20/25 & MT 20/50 → 80%; MP 20/20 & MT 20/30 → 66.67%.

### 3 chỉ số "hoàn thành" DỄ NHẦM
| | Phạm vi | Kiểu | Công thức |
|---|---|---|---|
| #8 HOÀN THÀNH (BXH) | test + tập | **số lần** | (test full + lượt completed)/(giao) |
| #21 % Hoàn thành (card) | chỉ tập | **thời gian** | Σ thời gian thực / Σ thời gian giao |
| #22 Tuân Thủ (card) | chỉ tập | **số lần** | lượt completed / lượt giao |

---

# PHẦN C — MÔ HÌNH "ĐÚNG vs SỐ LẦN giao" (mấu chốt lâu dài)

Nhiều metric (#8,#11,#21,#22,#26) cần **"số lần/buổi/bài ĐƯỢC GIAO"**. BU chốt: lấy từ **các session đã tạo**, không suy từ frequency.

**Vấn đề thiết kế hiện tại:**
- `ExerciseSession` **không snapshot** `executionCount` → "số lượt giao/buổi" phải join `XS → XA → XC.executionCount`. Nếu config bị sửa sau khi tạo session, "số giao" lịch sử **sai** (đọc giá trị config mới).
- Tương tự thời-gian-giao (#21) đọc `XC.duration` hiện tại, không phải giá trị lúc giao.

**✅ CHỐT (D6):** snapshot vào `ExerciseSession` lúc tạo buổi 2 cột (tên đã chốt):
- `executionCount` = `config.executionCount` (số lần giao/buổi, vd 4)
- `executionDuration` = `config.duration` (phút giao/lượt, vd 10)
→ thời gian giao/buổi = `executionCount × executionDuration × 60` (giây). Mọi #8/#21/#22/#26 đọc thẳng từ session, ổn định lịch sử, bớt 2 join.
- Test: `ExamSession` đã có vòng đời rõ; "test giao" = số ExamSession đã tạo (không cần thêm field).

---

# PHẦN D — PHÂN TÍCH DATA MODEL CHO LÂU DÀI (nợ kỹ thuật)

| # | Vấn đề | Ảnh hưởng | 🔧 Đề xuất |
|---|---|---|---|
| D1 | `status='passed/failed'` → bỏ | Toàn bộ query/báo cáo bài tập | Migration đổi enum `incomplete/completed`; convert dữ liệu cũ → completed; xóa `evaluatePassConditions` |
| D2 | `ExamResult.*Level` là **STRING** | (a) cache `examResults` lưu chuỗi → so sánh cải thiện `current>initial` bằng JS thành **so sánh chữ** ("9">"10"=true) → **SAI ở mốc 1↔2 chữ số**; (b) biểu đồ timeline `getPatientCorrelation` phải `CAST(NULLIF(...,''))` rườm rà, không index được | ✅ **CHỐT**: đổi `STRING(50)→SMALLINT` (migration + backfill); cache lưu số; bỏ CAST |
| D3 | `Patient.examResults` write-flow bị **gate bởi ExamAssignment** (bug đã xác nhận) | Cache cải thiện stale nếu BN không có lịch đo | (đã sửa hook) + **backfill** examResults từ [ER] |
| D4 | `examResults` cache vs [ER] | 2 nguồn — đúng theo thiết kế (single vs timeline). Cần đảm bảo write-flow chuẩn (D3) | Giữ; thêm test write-flow |
| D5 | Không FK constraint (`constraints:false`) | Orphan rows; phải tự lọc deleted | Giữ pattern, nhưng query luôn lọc center+deleted |
| D6 | Không snapshot "số giao" (Phần C) | Số liệu lịch sử lệch khi sửa config | Thêm `requiredExecutions/requiredDurationSec` vào ExerciseSession |
| D7 | `causes` JSONB array, lọc `Op.overlap` | Chart #9 quét toàn center | Thêm **GIN index** `Patients(causes)` |
| D8 | Tính cải thiện đọc JSONB toàn center bằng JS / SQL khác nhau giữa dashboardUser & dashboardExam | Số lệch nhau | Gom **1 hàm tính cải thiện** dùng chung (đọc [P]) |
| D9 | `Patient.treatmentStatus` là **BOOLEAN** (true/false=pause) — không diễn đạt được "Hoàn thành" | inTreatment/everTreated phải suy từ ngày; thiếu trạng thái completed | ✅ **CHỐT**: đổi → **STRING enum** `not_started\|active\|paused\|completed`; job tự set `completed` khi `now>activeTo`. Blast radius: mọi nơi dùng `treatmentStatus=true/false` (buildInTreatment/Completed/NotStarted, queries, FE) |
| D10 | Bug **so chéo mắt** trong hasImprovement (`bothEye ?? left ?? right` lấy field khác nhau cho init vs cur) | Cải thiện tính sai | ✅ Fix: so đúng theo loại đo, cùng mắt |

---

# PHẦN E — PHÂN TÍCH INDEX & QUERY (theo từng metric)

> Nguyên tắc: mọi query lọc `centerId` trước; thời gian dùng range trên cột đã index; tránh quét JSONB nếu có cột phẳng.

**E.1 Cải thiện (#3,#4,#5,#9,#12-15)** — đọc `Patient.examResults`:
- Hiện: quét toàn bộ Patient của center, bóc JSONB. Với center vài trăm–vài nghìn BN: chấp nhận được, nhưng JSONB không index.
- 🔧 Query: 1 hàm `SELECT ... FROM Patients WHERE centerId AND deleted=false AND activeFrom IS NOT NULL` rồi tính trong SQL (hoặc JS 1 lần) cho tất cả #3/#4/#5 — **một lần đọc, nhiều chỉ số** (tránh 3 lần findAll như hiện tại).
- Index dùng: `(centerId, deleted)` ✓. Cho #9: thêm **GIN(causes)** (D7).

**E.2 Hoạt động (#6)** — giao của login & kết quả theo ngày:
- Query: CTE `login_days` (AuditLog) ∩ `active_days` (UNION [ER],[XR]) → distinct (patientId, date).
- Index: AuditLog `(centerId,action,occurredAt)` ✓; [ER]/[XR] `(centerId,createdAt)` — ⚠️ [ER] hiện có `(centerId,status,createdAt)` (prefix centerId dùng được), [XR] tương tự. OK nhưng cân nhắc `(centerId,createdAt)` thuần.

**E.3 Hoàn thành/Tuân thủ tập (#8,#21,#22,#26)** — [XR]/[XS] + giao:
- Query gọn nhất nếu có snapshot "số giao" (D6): `SUM(duration), COUNT(*) FILTER(status=completed)` group theo loại/BN, chia cho `SUM(requiredDurationSec)`/`SUM(requiredExecutions)` từ [XS].
- Index: [XR] `(centerId,status,createdAt)` ✓, `(exerciseAssignmentId,status)` ✓; [XS] `(exerciseAssignmentId,createdAt)` ✓.

**E.4 Tuân thủ test (#11), phân bổ test (#16), trend (#17)** — [ER]/[ES]:
- Index: [ES] `(centerId,status)` ✓; [ER] `(centerId,status,createdAt)` ✓, `(centerId,examType,completedAt)` ✓.
- #17 bucket Tuần/Tháng/Quý/Năm → `date_trunc('week'|'month'|'quarter'|'year', completedAt)`.

**E.5 Bảng xếp hạng (#7)** — nặng nhất: mỗi BN inTreatment cần #8,#9,#10,cải thiện.
- 🔧 Tính set-based (CTE per-patient) + ORDER BY LIMIT 10, **không kéo hết về Node**. Index: [XR] `(centerId,patientId,...)`, Patient `(centerId,treatmentStatus,activeFrom,activeTo)`.
- 🔧 cân nhắc thêm `(centerId, treatmentStatus, activeFrom, activeTo)` composite cho lọc inTreatment.

**E.6 Index đề xuất MỚI**
1. `GIN Patients(causes)` — chart #9.
2. `Patients(centerId, treatmentStatus, activeFrom, activeTo)` — lọc inTreatment (#2,#7,leaderboard).
3. (nếu chuẩn hóa D2) `ExamResults(centerId, examType, patientId, completedAt)` — cải thiện theo loại.
4. (sau D6) `ExerciseSessions(centerId, exerciseAssignmentId)` — gộp giao.

---

# PHẦN F — KẾ HOẠCH THỰC THI (đề xuất, chờ duyệt)

**GĐ0 — Schema nền (migration, rủi ro cao):**
- D1: enum status `incomplete/completed` + convert; xóa evaluatePassConditions.
- D6: thêm `requiredExecutions/requiredDurationSec` vào ExerciseSession + backfill.
- D2 (tùy chọn): level STRING→SMALLINT + backfill.
- D3: backfill `examResults` từ [ER].
- D7: GIN(causes); E.6 indexes.

**GĐ1 — BE từng metric** theo Phần B, mỗi metric 1 hàm + test pin đúng số ví dụ (37.5% / 75% / +2.5 / 80% / 66.67%).

**GĐ2 — FE:** đổi tên card, pie→bar ngang, selector thời gian, bar tuân thủ-theo-loại, xóa chart #24, nút phóng to #10, field nguyên nhân (đã có).

**Kiểm thử:** unit (mock, công thức) + integration (DB test riêng, gated) seed đúng kịch bản BU.

---

# QUYẾT ĐỊNH LỚN — ĐÃ DUYỆT ✅
1. **D6** ✅ snapshot vào ExerciseSession: `executionCount` + `executionDuration`.
2. **D2** ✅ đổi `*Level` STRING(50)→SMALLINT (làm luôn, sửa cả bug so sánh chữ).
3. **#21-clamp** ✅ Chặn tại WRITE: trong `completeExercise`, nếu `duration > giao` (= executionDuration×60) → set `duration = giao` (vượt là bug FE). → mọi query downstream an toàn, không cần `LEAST`.
