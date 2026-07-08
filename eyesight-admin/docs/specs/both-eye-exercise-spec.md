# SPEC: Cho phép bài tập "Cả 2 mắt" (eye='both') với thị lực Xa / Gần / Tương phản

> Trạng thái: **ĐÃ IMPLEMENT (T1–T6) — chờ QA thủ công trên thiết bị thật**
> Phạm vi: `eye-sight-admin` (frontend thuần). **KHÔNG** đụng backend, migration, exam, override, statistics.
> Ngày: 2026-06-07
>
> Ghi chú triển khai: ngoài 2 hàm trong spec, đã tách thêm hàm pure `computeExercisePatientVision`
> (visionUtils) để PortalExercise + ExerciseSetup dùng chung và test 6.2 không cần render nặng.
> Lint gate dùng `prettier/prettier` với `trailingComma: 'es5'` (khác `.prettierrc` 'all') — code đã
> format theo es5 qua `eslint --fix`; phần code mới 0 error/0 warning.

---

## 1. Bối cảnh & mục tiêu

### 1.1 Yêu cầu BU
- Hiện tại form cấu hình bài tập chỉ cho chọn `Cả 2 mắt` (`eye='both'`) khi `visionType='stereopsis'` (thị giác lập thể). Với Xa/Gần/Tương phản chỉ cho Mắt phải/Mắt trái.
- BU cần: **cho phép cấu hình tập đồng thời cả 2 mắt** cho cả Xa / Gần / Tương phản, vì có bệnh nhân cần tập 2 mắt cùng lúc.
- Quy tắc lâm sàng do BU chốt: bài tập `both` lấy **level của MẮT KÉM HƠN** (tương ứng theo từng loại thị lực).

### 1.2 Những điều ĐÃ đúng sẵn (không làm gì)
| Hạng mục | Lý do |
|---|---|
| "Chỉ tập 1 lần" | Exercise chạy `executionCount` lần, **eye-agnostic, không loop theo mắt**. Config left/right/both đều chạy như nhau. 1 session/ngày. |
| Thống kê theo mắt cho game | **Không tồn tại** per-eye stat cho exercise; BU xác nhận chỉ cần "không tách/nhân đôi" → đã đúng. **0 công.** |
| Override (`levelOverride`/`visionLevel`) | Là **scalar đơn**, key theo `visionType`, **không** đọc `eye`. Khi override BẬT → `eye` vô can. **0 công.** |
| Backend validation/model | `eye STRING(20) NULL`, Joi đã `.valid('right','left','both')` cho mọi visionType. **Không migration.** |
| Hiển thị/label `both` ("Cả hai mắt") | Đã render đủ ở ExercisePage, ExerciseConfigTable, PatientExerciseDetail, ExerciseInfo, AssignmentPage, ActiveSessionsPage, ExerciseSessionProgressChart. |
| Backend bounds-check level | `exerciseAssignment.service.js:82-104` key theo `visionType` (far≤20/near≤6/contrast≤16), không đụng eye. |

### 1.3 ⚠️ KHÔNG ĐƯỢC ĐỤNG (vùng cấm)
- Phân hệ **EXAM (bài test)**: `visionImprovement.js` (đã fix "D10 cross-eye bug"), `examUtils.js`, `dashboardExam.service.js`, `compliance.service.js`, các per-eye exam chart (`TreatmentProgressCharts`, `TreatmentPlanTab` exam chart). Coupling `both==stereopsis` chỉ tồn tại ở đây và phải GIỮ NGUYÊN.
- Logic override, backend, migration, stats.

### 1.4 ⚠️ Inconsistency CÓ SẴN (ngoài phạm vi — chỉ ghi nhận, KHÔNG fix)
- **`visionType='stereopsis'` không lưu được cho config bài tập:** form `BasicConfigFields.tsx:76` vẫn hiện option "Thị giác lập thể (Stereopsis)" và `ExerciseConfigFormData` (exercise.ts:110) khai báo `stereopsis`, NHƯNG `exerciseConfigSchema.visionType` (exercise.ts:57-58) và Joi backend chỉ chấp nhận `far/near/contrast`. → Submit config stereopsis sẽ **fail yup validation**.
- **Hệ quả tới feature này:** vì `both` hiện chỉ mở cho stereopsis, mà stereopsis lại không lưu được → **`eye='both'` cho bài tập gần như bất khả thi qua UI hiện tại**. Thay đổi của spec này là **con đường thực tế đầu tiên** tạo config `eye='both'` (far/near/contrast). Nhiều khả năng DB **chưa có** config exercise nào `eye='both'` → rủi ro dữ liệu cũ thấp.
- **Không fix** việc stereopsis-trong-form ở spec này (vấn đề riêng). Branch `stereopsis → both/disabled` trong form **giữ nguyên** (vô hại). Nếu muốn dọn, tạo ticket riêng.
- `eye` là field **`.required`** (exercise.ts:28) → default phải là giá trị hợp lệ. Default `'left'` (mục 4.5) thoả mãn.

---

## 2. Quy tắc lâm sàng (chính xác)

### 2.1 Thang level (đã verify trong `src/utils/constant.ts`)
**Cả 3 loại: số level CÀNG CAO = thị lực CÀNG TỐT.**
- Far (L54-75): 1 = 20/400 (kém nhất) … 14 = 20/20 … 20 = 20/5 (tốt nhất).
- Near (L77-86): 1 = N64 (dễ nhất/kém) … 8 = N3 (khó nhất/tốt).
- Contrast (L88-105): 1 = 100% tương phản (dễ/kém) … 16 = 0.56% (khó/tốt).

### 2.2 Rule chốt
> Với `eye='both'`, level dùng cho game = **`Math.min(leftEye, rightEye)`** trong **cùng một visionType** (far so far, near so near, contrast so contrast). `min` = mắt kém hơn vì thang đơn điệu cùng chiều cho cả 3 loại.

### 2.3 Xử lý dữ liệu thiếu (BẮT BUỘC)
- Nếu một mắt **thiếu/null/0/rỗng** → **loại khỏi phép `min`**, lấy mắt còn lại.
- Nếu **cả 2 mắt** thiếu → trả `null` (caller tự áp fallback của nó).
- **TUYỆT ĐỐI** không để giá trị fallback (vd far=14) lọt vào phép `min` → sẽ thiên về "mắt tốt" sai lâm sàng.

### 2.4 Phạm vi áp dụng
- Chỉ far/near/contrast. `stereopsis` vẫn `both`-only và disabled như cũ (không đổi).
- `bothEye` (cột exam) KHÔNG dùng cho exercise far/near/contrast — chỉ left/right.

---

## 3. Các điểm chạm (đã xác minh, KHÔNG có điểm thứ 3)

| # | File | Hàm | Vai trò | Khi nào chạy |
|---|---|---|---|---|
| A | `src/components/shared/exercise-config/BasicConfigFields.tsx` | form guards | Chốt UI chặn `both` | Tạo/sửa config (admin + assignment form) |
| B | `src/components/exercises/portal/PortalExercise.tsx` | `getExamLevelByEye` (L86-100) | **Load-bearing** — quyết định cỡ tile game thật | Khi bệnh nhân chơi game (route `.../execute`) |
| C | `src/features/portal/views/exerciseResult/components/ExerciseSetup.tsx` | `getVisionLevelByEye` (L29-35) | **Display-only** — preview "cỡ ký tự dự kiến" | Màn setup trước khi vào game (route `.../sessions/:id`) |
| — | `src/components/shared/exercise-config/PreviewDialog.tsx` | — | **KHÔNG dùng eye** (level selector thủ công) → KHÔNG sửa | (xác nhận loại trừ) |

> B và C là 2 giai đoạn của cùng 1 luồng, là 2 route component riêng, tính level độc lập → đã phân kỳ. Phải sửa cả 2 bằng **1 helper chung** để preview khớp game thật.

---

## 4. Thiết kế giải pháp

### 4.1 Helper dùng chung (MỚI) — `src/utils/visionUtils.ts`
Đặt cạnh `getCurrentVisionLevel` hiện có (cũng eye-aware nhưng trả string — giữ nguyên, không sửa).

```ts
/**
 * Resolve numeric vision level cho EXERCISE theo eye config.
 * - 'left'  → leftEye
 * - 'right' → rightEye
 * - 'both'  → MẮT KÉM HƠN = Math.min(leftEye, rightEye), loại mắt thiếu dữ liệu
 * Trả null khi không có giá trị dùng được (caller tự áp fallback).
 * Áp dụng far/near/contrast; level cao = thị lực tốt nên mắt kém = min.
 * KHÔNG dùng cho exam/stereopsis.
 */
export const resolveExerciseVisionLevel = (
  result: { leftEye?: number | string | null; rightEye?: number | string | null } | undefined | null,
  eye: 'left' | 'right' | 'both' | string | undefined | null,
): number | null => {
  if (!result) return null;
  const toLevel = (v: unknown): number | null => {
    if (v === null || v === undefined || v === '') return null;
    const n = parseInt(String(v), 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  };
  const left = toLevel(result.leftEye);
  const right = toLevel(result.rightEye);

  if (eye === 'left') return left;
  if (eye === 'right') return right;
  if (eye === 'both') {
    const candidates = [left, right].filter((x): x is number => x !== null);
    return candidates.length ? Math.min(...candidates) : null;
  }
  return null; // eye undefined/unknown → null (caller fallback)
};
```

**Lý do trả `number | null` (không nhận fallback):** B cần fallback số (14/1/1), C cần `null` để ẩn dòng preview. Để mỗi caller tự `?? fallback`.

### 4.2 Sửa B — `PortalExercise.tsx`
Thay thân `getExamLevelByEye` bằng helper (giữ chữ ký để giảm blast radius), hoặc thay thẳng call site.

**Trước (L86-100):**
```ts
const getExamLevelByEye = useCallback((result, eye, fallback): number => {
  if (!result) return fallback;
  const left = result.leftEye ? parseInt(String(result.leftEye), 10) : null;
  const right = result.rightEye ? parseInt(String(result.rightEye), 10) : null;
  if (eye === 'left') return left ?? fallback;
  if (eye === 'right') return right ?? fallback;
  return fallback;
}, []);
```
**Sau:**
```ts
import { resolveExerciseVisionLevel } from 'src/utils/visionUtils';
// ...
const getExamLevelByEye = useCallback(
  (result, eye: string | undefined, fallback: number): number =>
    resolveExerciseVisionLevel(result, eye) ?? fallback,
  [],
);
```
- Sửa docstring L80-85 (bỏ câu "'both' chỉ dùng cho stereopsis").
- Call site L122-124 **giữ nguyên** (mỗi visionType truyền `currentResult` riêng + fallback far=14/near=1/contrast=1). Nhánh override (L107-113) **giữ nguyên**.
- **Tương thích ngược:** với left/right/undefined, kết quả y hệt cũ. Chỉ `both` đổi từ fallback → min.

### 4.3 Sửa C — `ExerciseSetup.tsx`
**Trước (L29-35):**
```ts
const getVisionLevelByEye = (result): number | null => {
  if (!result) return null;
  if (exerciseConfig?.eye === 'right') return result.rightEye ?? null;
  return result.leftEye ?? null;
};
```
**Sau:**
```ts
import { resolveExerciseVisionLevel } from 'src/utils/visionUtils';
// ...
const getVisionLevelByEye = (result): number | null =>
  resolveExerciseVisionLevel(result, exerciseConfig?.eye);
```
- Call site L199 (`effectiveLevel`) giữ nguyên. Nhánh `isOverrideActive` (L190-192) giữ nguyên.
- **Sửa bug sẵn có:** trước đây `'left'`/`'both'`/undefined đều lấy `leftEye`; nay `'left'`→left, `'both'`→min, `'right'`→right. Preview sẽ khớp game thật (B).

### 4.4 Sửa A — `BasicConfigFields.tsx` (gỡ 3 guard)
Mục tiêu hành vi sau sửa:

| visionType | Dropdown Mắt | Options | Disabled? | Auto-reset? |
|---|---|---|---|---|
| stereopsis | (giữ nguyên) | chỉ `both` | có | ép `both` |
| far/near/contrast | cho chọn | right, left, **both** | không | **bỏ reset** |

**Thay đổi cụ thể:**
1. `handleVisionTypeChange` (L42-49): refactor để (i) `stereopsis → eye='both'`; (ii) khi **rời khỏi** stereopsis (visionType cũ = stereopsis, mới ≠ stereopsis) → reset `eye='left'` (default an toàn, vì lúc ở stereopsis eye bị ép 'both'); (iii) các trường hợp còn lại **giữ nguyên** lựa chọn của user (cho phép chọn 'both' thủ công).
```tsx
const handleVisionTypeChange = (newVisionType: string) => {
  const prev = values.visionType;
  onFieldChange('visionType', newVisionType);
  if (newVisionType === 'stereopsis') {
    onFieldChange('eye', 'both');
  } else if (prev === 'stereopsis') {
    onFieldChange('eye', 'left'); // rời stereopsis → về default per-eye
  }
  // else: giữ nguyên eye (kể cả 'both' do user chủ động chọn)
};
```
2. **Xóa** `useEffect` normalize (L52-56) + xóa import `useEffect` nếu không còn dùng. (Đây là thứ đang ép `both→left` và chặn lựa chọn thủ công.)
3. Dropdown (L81-116): bỏ ép `both→left` ở `value=`; nhánh non-stereopsis **thêm** MenuItem `both`:
```tsx
value={values.visionType === 'stereopsis' ? 'both' : values.eye || 'left'}
// ...
: [
    <MenuItem key="right" value="right">{t('config.eyes.right')}</MenuItem>,
    <MenuItem key="left" value="left">{t('config.eyes.left')}</MenuItem>,
    <MenuItem key="both" value="both">{t('config.eyes.both')}</MenuItem>,
  ]
```

### 4.5 Default eye cho config non-stereopsis mới — GIỮ NGUYÊN = **left** (BU chốt)
- Hiện `ConfigForm.getInitialValues` (L71) default `eye: 'both'`, nhưng bị `useEffect` reset về `left` cho non-stereopsis → default thực tế hiện là **left**.
- Vì ta **xóa** `useEffect` đó (mục 4.4.2), phải đổi luôn literal default để giữ đúng hành vi cũ: sửa `ConfigForm.tsx:71` `eye: configData?.eye || ('left' as const)`.
- **KHÔNG** đổi sang 'right' (BU xác nhận: dư thừa). `both` chỉ là **option thêm**, không phải default.
- Kết quả: config mới far/near/contrast vẫn mặc định **Mắt trái** như trước; user chủ động chọn "Cả 2 mắt" khi cần.

### 4.6 Nhãn i18n
- `config.eyes.both` đã có. Spec trước đã đổi thành **"Cả 2 mắt"** (vi) / **"Both Eyes"** (en) → giữ.
- Không cần key mới.

---

## 5. Bảng edge case (để viết test & QA)

| # | visionType | eye | leftEye | rightEye | Kỳ vọng level | Ghi chú |
|---|---|---|---|---|---|---|
| E1 | far | both | 8 | 12 | 8 | min = mắt kém |
| E2 | far | both | 12 | 8 | 8 | đối xứng |
| E3 | far | both | 10 | 10 | 10 | bằng nhau |
| E4 | far | both | null | 9 | 9 | thiếu 1 mắt → mắt còn lại |
| E5 | far | both | 7 | null | 7 | thiếu 1 mắt |
| E6 | far | both | null | null | null → fallback 14 | cả 2 thiếu |
| E7 | far | both | 0 | 11 | 11 | 0 coi như thiếu |
| E8 | near | both | 3 | 5 | 3 | min near |
| E9 | contrast | both | 6 | 14 | 6 | min contrast |
| E10 | far | left | 8 | 12 | 8 | không đổi vs cũ |
| E11 | far | right | 8 | 12 | 12 | không đổi vs cũ |
| E12 | far | undefined | 8 | 12 | null → fallback 14 | không đổi vs cũ |
| E13 | far | both | "9" | "11" | 9 | parse string |
| E14 | far | both (override ON, visionLevel=15) | 8 | 12 | 15 | override thắng, eye vô can |
| E15 | far | left, result=undefined | — | — | null → fallback | không đổi |

---

## 6. Kế hoạch Unit Test (Vitest + fast-check, đã có hạ tầng)

### 6.1 MỚI: `src/utils/__tests__/resolveExerciseVisionLevel.test.ts`
Test thuần hàm helper — đây là phần lõi chính xác lâm sàng.
- **Example tests:** phủ toàn bộ E1–E13, E15 (trừ E14 thuộc PortalExercise).
- Nhóm `describe`:
  - `eye='both' → mắt kém (min)`: E1, E2, E3, E8, E9.
  - `xử lý dữ liệu thiếu`: E4, E5, E6, E7 (loại 0/null khỏi min; cả 2 thiếu → null).
  - `left/right giữ nguyên hành vi cũ`: E10, E11.
  - `eye undefined/unknown → null`: E12.
  - `parse string`: E13.
  - `result undefined/null → null`: E15.
- **Property test (fast-check) — generator cho cả 2 mắt là integer ∈ [1..20] (đều có giá trị):**
  - `resolve({l,r}, both) === Math.min(l, r)`.
  - `resolve({l,r}, both) <= resolve({l,r}, left)` **và** `<= resolve({l,r}, right)` (mắt kém ≤ từng mắt — chỉ kiểm khi cả 2 mắt có giá trị).
  - Đối xứng: `resolve({l,r}, both) === resolve({l:r, r:l}, both)`.
  - Idempotent khi 1 mắt null: `resolve({leftEye:l, rightEye:null}, both) === resolve({leftEye:l}, left)` (= l).
  - **Lưu ý:** không generate null trong các property dùng so sánh `<=` để tránh so `number <= null`.

### 6.2 SỬA/THÊM: `PortalExercise` (đã có `__tests__/`)
Ưu tiên test ở tầng helper (6.1). Tại PortalExercise, test mỏng cho tích hợp:
- `patientVision` với `eye='both'`, override OFF → dùng min (E1) cho đúng visionType active.
- `eye='both'`, override ON → dùng `assignment.visionLevel`, bỏ qua min (E14).
- `eye='both'`, cả 2 mắt null → fallback (E6: far→14).
- Regression: `eye='left'`/`'right'` cho cùng kết quả như trước.
> Nếu khó dựng full render, tách logic `patientVision` ra hàm pure export để test trực tiếp (refactor nhỏ, khuyến nghị).

### 6.3 THÊM: `ExerciseSetup` preview (tuỳ chọn, mức nhẹ)
- `getVisionLevelByEye` qua helper: `both`→min, `left`→left (sửa bug cũ lấy left cho mọi thứ).
- Có thể test gián tiếp qua render `renderAdditionalExerciseInfo` hoặc tách helper.

### 6.4 THÊM: form `BasicConfigFields` (Testing Library)
- visionType=far → dropdown Mắt **có** option "Cả 2 mắt"; chọn được; không bị reset về left.
- visionType=stereopsis → chỉ `both`, disabled (regression).
- Chuyển stereopsis→far rồi far→stereopsis: giá trị eye không bị ép sai.
- visionType=far, chọn both, đổi sang near → eye giữ `both` (không reset).

### 6.5 Validation schema (đã có `validations/__tests__/`)
- Khẳng định `exerciseConfigSchema`/`patientAssignment` chấp nhận `eye='both'` + visionType far/near/contrast (regression — vốn đã pass, thêm case tường minh).

---

## 7. Kiểm thử hồi quy & non-breaking

### 7.1 Bất biến phải giữ
1. left/right cho mọi visionType → level y hệt trước thay đổi.
2. stereopsis → vẫn `both`-only, disabled.
3. Override ON → hành vi không đổi (eye vô can).
4. Exam/test → không thay đổi gì (không import chéo helper mới vào exam).
5. PreviewDialog → không đổi.

### 7.2 Lệnh chạy
```
npm run test            # vitest run — toàn bộ unit
npm run lint            # eslint max-warnings 0 (chú ý import useEffect thừa)
npm run build           # tsc + vite, bắt lỗi type
npm run test:e2e -- portal-exercise.spec.ts   # E2E luồng tập (nếu chạy được)
```

### 7.3 QA thủ công (checklist)
- [ ] Tạo config far + Cả 2 mắt → lưu OK, hiển thị "Cả 2 mắt".
- [ ] Gán cho bệnh nhân có far L: trái=8, phải=12 → vào game, cỡ chữ ứng với **L8** (mắt kém).
- [ ] Bệnh nhân chỉ có 1 mắt có data → dùng mắt đó.
- [ ] Bệnh nhân không có exam far → fallback (game vẫn chạy, không crash).
- [ ] Preview "cỡ ký tự dự kiến" ở màn setup **khớp** cỡ chữ trong game.
- [ ] Override ON cho config both → game theo level bác sĩ nhập, bỏ qua mắt kém.
- [ ] Config stereopsis vẫn chỉ both, disabled.
- [ ] Near & Contrast: lặp lại 2 ca trên.

---

## 8. Mức độ & rủi ro

| Yếu tố | Đánh giá |
|---|---|
| Phức tạp | Thấp–Trung bình (frontend thuần, 1 helper + 3 file chạm) |
| Breaking risk | **Trung bình** — `getExamLevelByEye` nằm trong luồng game runtime; nếu sai min/null → bệnh nhân tập sai độ khó. Giảm rủi ro bằng helper + unit test 6.1. |
| Backend/migration | Không |
| Vùng cấm bị chạm | Không (exam tách biệt) |
| Effort ước tính | ~0.5–1 ngày gồm test |

**Cảnh báo trước khi merge:** thay đổi tác động trực tiếp độ khó bệnh nhân nhận khi chơi (lâm sàng). Bắt buộc pass test 6.1 + QA E1/E4/E6/E14 trước khi release.

---

## 9. Task breakdown (thứ tự thực thi)

> T1–T2 là lõi (logic + test), làm & verify trước. T3–T5 là UI/wiring. T6 verify tổng.

- **T1 — Helper `resolveExerciseVisionLevel`** (`visionUtils.ts`)
  - Thêm hàm theo §4.1. Không sửa `getCurrentVisionLevel`.
  - AC: export đúng chữ ký, không phá type build.

- **T2 — Unit test helper** (`src/utils/__tests__/resolveExerciseVisionLevel.test.ts`)
  - Toàn bộ §6.1 (example + property). AC: 100% case E1–E13,E15 pass.

- **T3 — Sửa runtime B** (`PortalExercise.tsx`)
  - Refactor `getExamLevelByEye` dùng helper (§4.2), sửa docstring. Giữ call site/override.
  - (Khuyến nghị) tách `patientVision` thành hàm pure export để test.
  - AC: test 6.2 pass; left/right regression xanh.

- **T4 — Sửa preview C** (`ExerciseSetup.tsx`)
  - `getVisionLevelByEye` dùng helper (§4.3). AC: preview khớp runtime; bug left-mặc-định biến mất.

- **T5 — Gỡ guard form A** (`BasicConfigFields.tsx` + `ConfigForm.tsx`)
  - §4.4 (refactor handleVisionTypeChange, xóa useEffect, thêm option both) + §4.5 (default eye giữ **left**: `ConfigForm.tsx:71` → `|| 'left'`).
  - AC: test 6.4 pass; stereopsis regression giữ; config mới vẫn default Mắt trái.

- **T6 — Regression & QA tổng**
  - `npm run test && npm run lint && npm run build`; QA §7.3.
  - AC: tất cả xanh; checklist QA tick đủ; không đụng file exam.

---

## 10. Quyết định đã chốt với BU
1. ✅ **Default eye** config non-stereopsis mới: **GIỮ NGUYÊN = left**. `both` chỉ là option thêm, không phải default. (Không đổi sang right.)
2. ✅ **"Mắt kém = min level"** áp cho **TẤT CẢ** loại thị lực far/near/contrast (không riêng far).
3. ✅ **Stats theo mắt** = chỉ cần "không tách/nhân đôi" → **0 công**. Nếu sau này muốn báo cáo per-eye cho game → tạo spec riêng (net-new full-stack).

---

## 11. ⚠️ BỔ SUNG SAU IMPLEMENT — PHÂN TÍCH THIẾU (review lần 2, 2026-06)

> Phần này ghi nhận **lỗ hổng phân tích của chính spec này**. Spec gốc tự giới hạn "frontend thuần — KHÔNG đụng backend/statistics" và khẳng định chỉ có **3 điểm chạm (A/B/C, đều FE)**, *"KHÔNG có điểm thứ 3"*. Review lần 2 cho thấy kết luận đó **CHƯA ĐỦ**: có một điểm chạm BACKEND bị bỏ sót, và một mismatch FE↔BE rộng hơn.
>
> **Bài học:** với feature dính tới "độ khó/level", phải soi **cả đường server ghi `ExerciseResult.level`**, không chỉ đường FE tính cỡ chữ. Hai đường này tính **song song cùng một đại lượng** nên bắt buộc phải khớp nhau.

### 11.1 ĐIỂM CHẠM D (BACKEND) — spec gốc bỏ sót — ĐÃ FIX

- **File:** `eye-sight-service/src/services/exercise/exerciseResult.service.js`
- **Hàm:** `resolveAssignmentDifficultyLevel(assignment, patient)` — chạy server-side trong `startExercise` (POST `…/sessions/:id/start`) để **ghi `ExerciseResult.level`** ("độ khó tại thời điểm thực hiện", dùng cho chart "Tiến độ bài tập" + `dashboardExercise.getExerciseDetails` + snapshot `ExerciseSession.visionLevel` qua `updateSessionStats`).
- **Bug:** nhánh `eye === 'both'` đọc `current.bothEye`. Nhưng với **far/near/contrast**, `bothEye` **LUÔN null** (chỉ stereopsis mới lưu bothEye — xem `compliance.service.js` / `examResultsBackfill.js`). ⇒ Mọi bài tập `eye='both'` far/near/contrast (không override) ghi `level = null`.
- **Hệ quả:** bệnh nhân **vẫn tập đúng cỡ chữ** (FE tự tính `min`), nhưng **bản ghi/biểu đồ độ khó = null** → sai dữ liệu báo cáo. Không crash, không sai điều trị.
- **Vì sao 100% config both dính:** stereopsis exercise config không lưu được (§1.4) ⇒ mọi config `both` đều là far/near/contrast ⇒ trúng bug.
- **FIX đã áp dụng:** nhánh `both` nay mirror đúng FE `resolveExerciseVisionLevel`:
  - far/near/contrast → `min(leftEye, rightEye)` (loại null/0; cả hai thiếu → null);
  - stereopsis → `bothEye`.
  ⇒ `ExerciseResult.level` = đúng mức mắt kém = khớp cỡ chữ game.

> **Cập nhật mục §3 (Các điểm chạm):** thực tế là **4 điểm chạm**, không phải 3. Điểm **D = backend `resolveAssignmentDifficultyLevel`**.
> **Cập nhật §1.2 / §10.3:** câu "stats/backend = 0 công" **SAI** — đường ghi `level` ở server là backend và có ảnh hưởng tới statistics.

### 11.2 "GAP #1" — Mismatch fallback FE↔BE → **THỰC RA LÀ BY-DESIGN (không phải bug)**

- FE `computeExercisePatientVision` khi **không có dữ liệu khám** → fallback **far=14 / near=1 / contrast=1** chỉ để **game chạy được** (cỡ chữ mặc định).
- Server `resolveAssignmentDifficultyLevel` khi không có khám → **null** → `ExerciseResult.level = null` → `ExerciseSession.visionLevel = null`.
- **Kết luận sau khi đối chiếu `exercise-progress-chart.spec.md`:** đây **KHÔNG phải bug**. BU đã chốt (spec đó, **§K2** + **§G**): *"Không có exam result & không override → độ khó hiển thị '-'"*. Chart đã xử lý null → nhãn "-". Tức là khi chưa khám, độ khó **đúng là "chưa biết" ('-')**; fallback 14/1/1 chỉ để game không vỡ, **không** phải mức đo thật → ghi null là hợp lý.
- ⇒ **Không cần fix.** Chỉ cần đảm bảo chart luôn map null → "-" (đã có ở `ExerciseSessionProgressChart`). Bất biến cần giữ khi viết test.

### 11.3 GAP CÒN MỞ #2 — Edge `level = 0` (rất nhỏ, gần như lý thuyết)

- Nhánh `left`/`right` ở server trả thẳng `current.rightEye`/`leftEye` (kể cả `0` → `Number(0)=0`), trong khi FE coi `0` là "thiếu" (`> 0`). Lệch khi giá trị = 0. Mức độ thấp (level hợp lệ là 1+), nhưng nên đồng bộ `>0` cho cả left/right ở server để nhất quán tuyệt đối.

### 11.4 GAP CÒN MỞ #3 — Validation `visionLevel` không theo loại thị lực (pre-existing)

- `eye-sight-service/.../validations/exercise/exerciseConfig.validation.js` → `assignConfigToPatients.body.visionLevel` = `min(1).max(20)` **bất kể visionType**. Cho phép override `visionLevel=18` cho **near** (đúng ra ≤6) / **contrast** (≤16) lọt qua backend. (FE yup `patientAssignment` siết theo loại; backend thì không.) Không do feature both nhưng kết hợp override+both dễ tạo mức sai.
- **Downstream (đã verify `calculateVisualSettings`):** level ngoài thang → `nearVisionLevels[17]`/`contrastVisionLevels[...]` = `undefined` → `if (level)` false → **fontSizeMm về mặc định 16mm**, KHÔNG crash. ⇒ Hệ quả thực: cỡ chữ **sai (về default)**, không vỡ app. Severity thấp về runtime nhưng là **lỗ hổng tính toàn vẹn dữ liệu** ở backend (FE chặn, API trực tiếp thì không) → nên siết Joi theo visionType (defense-in-depth).

### 11.5 AUDIT CONSUMER `level` / `visionLevel` — ĐÃ SOI HẾT

**`ExerciseResult.level` — nơi ĐỌC:**
| Consumer | Vai trò | Sau fix |
|---|---|---|
| `dashboardExercise.service.js` → `getExerciseDetails` (cột `level`) | Bảng chi tiết Tab "Hiệu Suất Bài Tập" | both-eye hiện đúng `min` |
| `exerciseResult.service.js` → `updateSessionStats` | Derive `session.visionLevel` (gián tiếp) | đúng theo |

(KHÔNG nơi nào khác: `getExerciseStats` dùng status/duration/executionCount; `dashboardPatient`/`dashboardUser` dùng focusScore/duration/examResults — **không** đọc `result.level`.)

**`ExerciseSession.visionLevel` — nơi ĐỌC:**
| Consumer | Vai trò |
|---|---|
| `exerciseSession.service.js` → `getPatientExerciseSessions` → `/me/exercise-sessions/history` | Chart tiến độ (portal `TreatmentProgressCharts`) |
| ⤷ cùng service → `/patients/:id/exercise-sessions` | Chart tiến độ (admin `TreatmentPlanTab`) |
| FE `ExerciseSessionProgressChart.tsx` (Chỉ số 4 — nhãn độ khó) | dùng chung cho 2 chart trên |

(KHÔNG đọc ở `dashboardUser` leaderboard / `dashboardPatient` correlation / `dashboardCompliance` — các nơi này dùng focusScore/duration/averageScore/examResults.)

**Kết luận audit:** mọi consumer của `level`/`visionLevel` chỉ phục vụ **hiển thị độ khó** (1 cột bảng dashboard + 1 nhãn chart). Sau fix điểm chạm D, both-eye far/near/contrast (có exam) ghi đúng `min` → tất cả hiển thị đúng; null được map thành "-" (không crash). **Không còn consumer nào bị bỏ sót.**

**Các mục khác đã soi:**
- `autoAdjustLevel` / auto-adjust: **chết** (`levelAdjustment.controller.js` comment toàn bộ + route không mount). `currentLevel` là field **legacy** (type ghi rõ "use visionLevel instead"). Không tương tác both-eye runtime.
- **Dữ liệu lịch sử:** theo §1.4 + `exercise-progress-chart.spec.md §A5` ("chưa go-live, không backfill") → DB gần như **chưa có config both cũ** → **không cần backfill**.

### 11.6 CÒN LẠI (test — chưa có)
- **Backend integration:** `startExercise` với assignment both (far/near/contrast, có exam 2 mắt) → `ExerciseResult.level === min(left,right)`; both + chưa exam → null. (unit đã cover hàm; thiếu e2e qua API.)
- **FE chart unit:** `ExerciseSessionProgressChart` với `visionLevel` từ both → nhãn độ khó đúng; null → "-".
- **E2E:** chưa có kịch bản both-eye xuyên suốt (config both → gán → chơi → chart). Nên bổ sung khi dựng happy-path.
