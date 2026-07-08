# SPEC v2: Biểu đồ tiến độ bài tập (4 chỉ số, multi-assignment)

> Trạng thái: **CHỜ DUYỆT** — chưa implement.
> Phạm vi: `eye-sight-service` (data model + logic), `eye-sight-admin` (chart + form).
> Giai đoạn: **CHƯA go-live** → không cần backfill / lo data cũ. Thiết kế sạch.
> v2 sửa các sai sót của v1 (xem mục L — Changelog).

---

## 0. Bối cảnh & nguyên tắc

- **1 session = 1 ngày = 1 assignment** (`startExerciseSession` ép tối đa 1 session/ngày/assignment).
- **Session là nguồn dữ liệu chuẩn** cho cả 4 chỉ số. Chart chỉ đọc Session, không fetch Result.
- **Server là source of truth.** Mọi giá trị tính toán (điểm, thời gian, tập trung, độ khó) do server tính & lưu — không tin client gửi.
- Tổng hợp **theo ngày, không cần giờ** — trục X chỉ DD/MM/YYYY.
- Hỗ trợ **multi cấu hình** (nhiều `ExerciseAssignment`/bệnh nhân) → small multiples.

---

## A. Quyết định đã chốt

| # | Vấn đề | Chốt |
|---|---|---|
| 1 | Nguồn dữ liệu chart | Session cho cả 4 chỉ số |
| 2 | Mẫu số Chỉ số 2 | `executionDuration × executionCount` (snapshot trên session) |
| 3 | Độ khó (Chỉ số 4) | **Server tự resolve** (override OR exam-level theo mắt) → lưu `result.level`, snapshot `session.visionLevel` |
| 4 | Kiểu biểu đồ | Small multiples — mỗi assignment 1 chart con, trục X categorical theo ngày |
| 5 | Data cũ | Không backfill (chưa go-live) |

---

## B. Công thức 4 chỉ số (để BU confirm)

### Chỉ số 1 — Điểm trung bình (cột bar, trục trái)
```
= session.averageScore = TRUNG BÌNH(điểm từng lượt trong buổi)
```
Server tính sẵn trong `updateSessionStats`. Chỉ lấy session `status = completed`.
VD: 3 lượt 200/220/240 → 220.

### Chỉ số 2 — Thời gian thực hiện % (đường cam, trục phải 0–100%)
```
Tử  = session.duration = Σ ExerciseResult.duration (active time, đã loại pause)
Mẫu = session.executionDuration × session.executionCount × 60   (giây)
%   = ROUND(Tử / Mẫu × 100)        // KHÔNG cap
```
VD: yêu cầu 5 lần × 10p = 50p (3000s); tập 3 lần × 9p = 27p (1620s) → 1620/3000 = **54%**.

**Bất biến hệ thống — % luôn ≤ 100% (không cap):**
- Mỗi `result.duration` bị clamp về `config.duration × 60` mỗi lượt (`exerciseResult.service.js:251-256`).
- `executionsCompleted ≤ executionCount` (gate hoàn thành).
- ⇒ Σ result.duration ≤ executionCount × executionDuration × 60 = Mẫu ⇒ % ≤ 100 **theo cấu trúc**.
- **KHÔNG dùng `MIN(100, …)` để cap.** Nếu chart hiện > 100% → đó là **bug hệ thống** (clamp hỏng hoặc snapshot lệch), phải điều tra, không được che.
- ⚠️ Consistency: clamp dùng `result.exerciseConfig.duration` (snapshot lúc tạo result); Mẫu dùng `session.executionDuration` (snapshot lúc tạo session). Hai snapshot này phải cùng giá trị — nếu config bị sửa giữa 2 thời điểm có thể lệch. Test phải khẳng định bất biến này.

### Chỉ số 3 — Mức độ tập trung % (đường xanh, trục phải 0–100%)
```
= session.focusScore = MAX(0, 100 − Σ pauseCount − Σ inactivityCount)
```
- Pause: mỗi lần bấm tạm dừng −1%.
- Bỏ tương tác: mỗi lần không có nước đi quá `ExerciseConfig.inactivityThreshold` giây (mặc định 30) −1%.
- Sàn 0%. VD: pause 2, bỏ tương tác 3 → 95%.

### Chỉ số 4 — Độ khó (nhãn trên đầu mỗi cột)
```
= formatVisionLevel(config.visionType, session.visionLevel)
```
`session.visionLevel` = độ khó **server resolve lúc bệnh nhân bắt đầu lượt đầu của buổi**:
```
resolveDifficulty(assignment, patient):
  if assignment.levelOverride && assignment.visionLevel: return assignment.visionLevel
  cur = patient.examResults[config.visionType].currentResult
  eye = config.eye
  return eye=='right' ? cur.rightEye : eye=='both' ? cur.bothEye : cur.leftEye
```
Định dạng: xa → Snellen (20/200…20/20); gần → N (N36…N5); tương phản → thập phân (0.10…1.00); stereopsis → `Lv N`.

---

## C. Thay đổi DATA MODEL (backend)

| # | Thay đổi | Ghi chú |
|---|---|---|
| C1 | Migration: thêm `visionLevel` (INTEGER, nullable) vào `ExerciseSessions` | snapshot độ khó của buổi |
| C2 | `exerciseSession.model.js`: khai báo `visionLevel` | |
| C3 | `ExerciseResult.level` đã có sẵn trong model | chỉ cần bắt đầu **ghi** nó |
| C4 | `ExerciseConfig.inactivityThreshold` (đã thêm ở vòng trước) | giữ |

Không đụng: `executionDuration`, `executionCount`, `duration`, `focusScore`, `averageScore`.

---

## D. Thay đổi LOGIC (backend)

| # | File / hàm | Thay đổi |
|---|---|---|
| D1 | `exerciseResult.service.js` — **mới**: `resolveAssignmentDifficultyLevel(assignment, patient)` | helper server-side resolve độ khó (override OR exam-level theo mắt). 1 nguồn duy nhất |
| D2 | `exerciseResult.service.js` — `createExerciseResult` (nhánh 'new', ~dòng 100) | load thêm `patient.examResults`; set `level = resolveAssignmentDifficultyLevel(...)` cho result |
| D3 | `exerciseResult.service.js` — `updateSessionStats` (~dòng 329) | set `session.visionLevel` = level của các result (đồng nhất trong buổi). Tận dụng điểm aggregate sẵn có |
| D4 | `exerciseSession.service.js` — **xóa** `completeExerciseSession` | DEAD CODE (không route/controller gọi). Luồng thật là `updateSessionStats` |
| D5 | `exerciseSession.service.js` — `getPatientExerciseSessions` | **bỏ include `results`** (thêm dư vòng trước). Include config lấy `visionType, name, eye, frequency`. Trả các cột snapshot của session |

Không cần đụng `startExerciseSession`/scheduler cho độ khó (độ khó resolve lúc tạo **result**, không phải lúc tạo session — chính xác theo thời điểm bệnh nhân thực sự chơi, tránh stale do scheduler pre-create).

---

## E. Thay đổi FRONTEND

| # | File | Thay đổi |
|---|---|---|
| E1 | `ExerciseSessionProgressChart.tsx` | Chỉ số 2: `round(session.duration/(executionDuration×executionCount×60)×100)` — **KHÔNG cap** (K1). Chỉ số 4: dùng `session.visionLevel`. Gỡ field `results` khỏi `RawSession`. |
| E2 | `ExerciseSessionProgressChart.tsx` | Layout **small multiples**: group theo `exerciseAssignmentId`, mỗi nhóm 1 ComposedChart. Filter "tất cả / chọn 1". Trục X categorical theo `completedAt` (DD/MM/YYYY), nhãn thích nghi theo `frequency` (daily/weekly → DD/MM, monthly+ → MM/YYYY). |
| E3 | `PortalExercise.tsx` (đã làm) | đọc `inactivityThreshold` từ config; verify payload assignment có field (mục F2) |

---

## F. IMPACT ANALYSIS

### F1. `session.duration` đổi ngữ nghĩa?
KHÔNG. Luồng thật (`updateSessionStats:336`) đã = Σ result.duration từ trước. Chỉ xóa hàm dead `completeExerciseSession` (vốn ghi wall-clock nhưng không chạy). Không consumer nào bị đổi giá trị.

### F2. `inactivityThreshold` có tới client không? ✅ **ĐÃ VERIFY — có.**
`GET /me/assignments/:id` → `getMyAssignment` (portal.controller:69) → `getAssignmentById` (exerciseAssignment.service:473) include `exerciseConfig` **không giới hạn `attributes`** → trả full columns kể cả `inactivityThreshold`. `ExerciseExecutePage:35` fetch endpoint này rồi truyền vào PortalExercise. Client đọc được, KHÔNG no-op. Không cần sửa backend.

### F3. `getPatientExerciseSessions` — 2 nơi gọi:
- `portal.controller.js:345` (route `/me/exercise-sessions/history`)
- `exerciseResult.controller.js:155` (route `/patients/:id/exercise-sessions`)
→ Cả 2 cùng service; đổi include (bỏ results, thêm frequency) ảnh hưởng cả 2 → test cả 2.

### F4. Consumer FE của chart:
- Admin: `TreatmentPlanTab.tsx`
- Portal: `TreatmentProgressCharts.tsx`
→ Cả 2 dùng chung `ExerciseSessionProgressChart`; đổi props/logic ảnh hưởng cả 2.

### F5. `createExerciseResult` thêm load patient + set level:
- Thêm 1 query `Patient` (attributes `examResults`) mỗi lần tạo result mới → chi phí nhỏ, chấp nhận được.
- `result.level` trước đây null → nay có giá trị. Dashboard đọc `result.level` (`dashboardExercise.service.js:296`) sẽ **bắt đầu có dữ liệu thật** (cải thiện, không phá).

### F6. Xóa `completeExerciseSession`:
Đã grep: 0 route, 0 controller, 0 service khác gọi. An toàn xóa. (Chạy lại grep khi implement để chắc.)

---

## G. Edge cases & rules

| Tình huống | Xử lý |
|---|---|
| `executionDuration`/`executionCount` null | Chỉ số 2 = null (không vẽ điểm), không chia cho 0 |
| Tử > mẫu (chơi lố giờ) | **KHÔNG cap.** Theo bất biến không bao giờ xảy ra; nếu xảy ra → bug hệ thống, hiện giá trị thật (>100%) để lộ lỗi, không che |
| `session.visionLevel` null (không có exam, không override) | Nhãn độ khó = "-" |
| visionType = stereopsis | Nhãn = `Lv N` |
| Assignment chưa có buổi completed nào | Không render chart con cho assignment đó |
| Patient nhiều assignment cùng visionType | Mỗi assignment vẫn 1 chart riêng (theo exerciseAssignmentId) |

---

## H. KẾ HOẠCH TEST (chính xác từng file)

> Nguyên tắc: update file sẵn có; chỉ tạo mới khi chưa có gì cover. Tạo tối thiểu **2 file mới**.

### Backend
| File | Hành động | Cases |
|---|---|---|
| `tests/unit/services/exerciseSession.service.test.js` | **TẠO MỚI** (service chưa có test) | getPatientExerciseSessions: filter `completed`, include config (visionType/name/eye/frequency), KHÔNG include results; xác nhận đã xóa completeExerciseSession |
| `tests/unit/services/exerciseResult.service.test.js` | **UPDATE** | `resolveAssignmentDifficultyLevel`: override → visionLevel; near/right eye → cur.rightEye; không exam → null. `createExerciseResult` set level. `updateSessionStats` set `session.visionLevel`. (duration=sum, focus đã cover — giữ) |
| `tests/unit/services/exerciseConfig.service.test.js` | **UPDATE** | `inactivityThreshold` persist qua create/update |
| `tests/integration/exercise-controller.test.js` | **UPDATE** | e2e `GET /patients/:id/exercise-sessions` + `GET /me/exercise-sessions/history` (auth + shape: có visionLevel, executionDuration, executionCount, duration, focusScore, averageScore) |

### Frontend
| File | Hành động | Cases |
|---|---|---|
| `src/components/shared/__tests__/ExerciseSessionProgressChart.test.tsx` | **TẠO MỚI** (4 công thức 0% coverage) | điểm TB; timePercent (ví dụ 27/50=54%; KHÔNG cap — vượt 100% hiện giá trị thật; null khi thiếu snapshot); focusScore; độ khó theo visionType (far/near/contrast/stereopsis/null); small-multiples (n assignment → n chart); empty state |
| `.../patient-page/__tests__/TreatmentPlanTab.test.tsx` | **UPDATE** | mock session thêm executionDuration/executionCount/visionLevel/duration; vẫn stub chart |
| `src/utils/exerciseDuration.ts` + `__tests__/exerciseDuration.test.ts` | **UPDATE** | tách helper `getInactivityThresholdMs(config)`; thêm cases vào test có sẵn |
| `PortalExercise.timer.test.tsx` | **GIỮ NGUYÊN** | không liên quan |

---

## I. Acceptance criteria (Definition of Done)

1. Migration chạy được up/down; cột `visionLevel` xuất hiện trên `ExerciseSessions`.
2. Tạo result mới → `result.level` có giá trị đúng theo resolver (verify bằng test + 1 lần chạy thật).
3. Hoàn thành buổi → `session.visionLevel` được set; `session.duration` = Σ result.duration.
4. API 2 endpoint trả đủ field chart cần; không còn include `results`.
5. Chart render small multiples; 4 chỉ số đúng công thức; nhãn độ khó đúng ký hiệu theo visionType.
6. Form ExerciseConfig nhập/sửa được `inactivityThreshold`; client thực sự dùng (F2 verified).
7. Toàn bộ test (mới + cũ) xanh; `tsc` không lỗi mới.
8. Chạy app: mở trang bác sĩ + portal, mắt thấy biểu đồ đúng.

---

## J. Thứ tự thực hiện

1. C1+C2 — migration + model `visionLevel`
2. D1 — helper `resolveAssignmentDifficultyLevel`
3. D2+D3 — set `result.level` + snapshot `session.visionLevel`
4. D4 — xóa dead `completeExerciseSession`
5. D5 — dọn `getPatientExerciseSessions` (bỏ results, thêm frequency)
6. F2 — verify/sửa payload assignment để `inactivityThreshold` tới client
7. E1+E2 — chart công thức đúng + small multiples
8. H — test (2 file mới + update)
9. I — chạy migration + chạy app verify tận mắt

---

## K. Đã chốt (BU)
- **K1. ✅ KHÔNG cap.** Hệ thống đảm bảo % ≤ 100 theo bất biến (clamp/lượt + gate). Vượt 100% = bug hệ thống → để lộ, không che. Bỏ `MIN(100,…)`.
- **K2. ✅** Không có exam result & không override → độ khó hiển thị "-".

---

## L. Changelog v1 → v2
- **Sửa Chỉ số 4**: nguồn KHÔNG phải `assignment.visionLevel` (đa số null) — server resolve (override OR exam-level theo mắt), lưu `result.level` + snapshot `session.visionLevel`.
- **Bỏ "fix wall-clock" D2 cũ**: `completeExerciseSession` là dead code → xóa hẳn.
- **Thêm mục F — Impact Analysis** (2 nơi gọi service, 2 consumer FE, verify inactivityThreshold tới client, ảnh hưởng dashboard đọc result.level).
- **Fix mâu thuẫn**: include thêm `frequency` cho nhãn trục X.
- **Thêm** Edge cases (G), Acceptance criteria (I).
- **Bỏ** lo backfill data cũ (chưa go-live).
