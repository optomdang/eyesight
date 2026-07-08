# Refactor Plan — PortalExercise → Registry-driven Multi-Exercise

> Mục tiêu: mở năng lực **multi-exercise** qua `exerciseRegistry` (mỗi entry tự khai báo component chơi),
> **bảo toàn hành vi tuyệt đối** cho game 2048 hiện có. Làm trước bàn giao → ưu tiên số 1 là KHÔNG regression.
>
> Nguyên tắc: mỗi task nhỏ, có cross-check riêng, có thể rollback độc lập. Không sang task sau khi task hiện tại chưa xanh.

## 0. Trạng thái khởi đầu (đã xác minh)

- `PortalExercise.tsx` (990 dòng) = thực chất là bài **2048** (barrel đã alias `Exercise2048`).
- Engine 2048 đan với lifecycle qua 2 ref dùng chung (`gameExecutionRef`, `gameInstanceRef`) + `attachGameTracking`.
- Import coupling tới registry:
  - `registry/index.ts` → import `Game2048Preview` (admin). ⚠️
  - `PortalExercise.tsx` → import `isExerciseSupported` (registry) + `UnsupportedExercise` (→ registry). ⚠️ **back-edge gây circular nếu registry import component chơi**.
- Test:
  - `execution-lifecycle.test.tsx` → **mount component thật**, mock registry, có case "stereopsis → Unsupported" (dòng ~289). ⚠️ DUY NHẤT cần sửa.
  - `pause-resume.test.tsx` → chỉ test logic qua services, **KHÔNG import component** → không ảnh hưởng.
  - `timer.test.tsx` / `timer.test.ts` → test helper thuần → không ảnh hưởng.
- Consumer runtime: `features/portal/views/exerciseExecute/ExerciseExecutePage.tsx` import `PortalExercise` (giữ nguyên path).

## Kiến trúc đích (không circular)

```
ExerciseExecutePage → PortalExercise(dispatcher) ─┬─ registry.getExerciseEntry(type,code)
                                                  └─ <entry.ExerciseComponent {...props}/>  hoặc <UnsupportedExercise/>
registry ──(eager)──► Game2048Exercise (portal), Game2048Preview (admin)
Game2048Exercise ──► KHÔNG import registry, KHÔNG import UnsupportedExercise   ✅ cắt back-edge
PortalExerciseProps ──► tách ra portal/types.ts (import type, không tạo runtime edge)
```

---

## PHASE 1 — Tách bảo toàn hành vi + wiring registry

### Task 1.1 — Tạo `portal/types.ts` chứa `PortalExerciseProps`
- Tạo file `src/components/exercises/portal/types.ts`, export `interface PortalExerciseProps` (copy nguyên từ `PortalExercise.tsx` dòng 37–43).
- **Cross-check:** `npx tsc --noEmit` không lỗi mới; grep `types.ts` không import gì từ `registry`/component.

### Task 1.2 — Di dời `PortalExercise.tsx` → `Game2048Exercise.tsx` (NGUYÊN XI)
- `git mv portal/PortalExercise.tsx portal/Game2048Exercise.tsx`.
- Đổi tên biến component + `export default` `PortalExercise` → `Game2048Exercise`.
- Đổi props interface nội bộ → `import type { PortalExerciseProps } from './types'` (xóa khai báo inline).
- **KHÔNG sửa bất kỳ logic engine/lifecycle nào ở bước này.**
- **Cross-check:** diff chỉ gồm rename + import type; `tsc --noEmit` ok (sẽ còn lỗi tạm do barrel chưa cập nhật — chấp nhận, sửa ở 1.5).

### Task 1.3 — Cắt back-edge tới registry trong `Game2048Exercise.tsx`
- Xóa `import { isExerciseSupported } from '...registry'` (dòng 35) và `import UnsupportedExercise` (dòng 21).
- `useEffect` khởi động (dòng ~402–412): bỏ điều kiện `isExerciseSupported(...)`, đổi thành `if (assignment) void startExerciseResult();` (an toàn vì dispatcher đã chặn — 2048 luôn supported).
- Xóa nhánh render gate "không hỗ trợ" (dòng ~825–832) trả `<UnsupportedExercise/>` (dispatcher lo việc này).
- **Cross-check (BẮT BUỘC):** `grep -n "registry\|UnsupportedExercise" Game2048Exercise.tsx` → **rỗng**. Đây là điều kiện chống circular.
- **Cross-check phụ:** grep các file mà Game2048Exercise import (ExitConfirmationDialog, ExerciseEndConfirmDialog, ExerciseCompletionDialog, các util) → **không file nào import registry** (xác nhận không có back-edge gián tiếp).

### Task 1.4 — Mở rộng `registry/index.ts`
- Thêm vào `ExerciseRegistryEntry`: `ExerciseComponent: React.ComponentType<PortalExerciseProps>` (import type từ `../portal/types`).
- Import eager `Game2048Exercise` (cạnh `Game2048Preview`, ở cuối file để theo pattern lazy hiện có).
- Thêm `ExerciseComponent: Game2048Exercise` vào entry `'2048'`.
- Thêm helper `getExerciseComponent(type?, code?)` trả `getExerciseEntry(type,code)?.ExerciseComponent`.
- **Cross-check:** `tsc --noEmit`; chạy test registry nếu có (`registry/__tests__` nếu tồn tại) → xanh.

### Task 1.5 — Tạo dispatcher `portal/PortalExercise.tsx` (mới, mỏng)
- Resolve `type`/`code` từ `assignment` (copy đúng logic cũ dòng 826–829).
- `const Comp = getExerciseComponent(type, code);`
- `return Comp ? <Comp {...props}/> : <UnsupportedExercise exerciseType={type ?? undefined}/>;`
- Import `PortalExerciseProps` từ `./types`; import `UnsupportedExercise`; import `getExerciseComponent` từ `../registry`.
- **Cross-check:** `tsc --noEmit` sạch; grep xác nhận `components/exercises/index.ts` vẫn export `PortalExercise` từ path cũ (không cần đổi).

### Task 1.6 — Cập nhật barrel `portal/index.ts`
- `Exercise2048` → `from './Game2048Exercise'`.
- `PortalExercise` → vẫn `from './PortalExercise'` (giờ là dispatcher).
- **Cross-check:** grep toàn repo `from './PortalExercise'` / `Exercise2048` không còn trỏ nhầm; `tsc --noEmit` sạch.

---

## PHASE 2 — Test

### Task 2.1 — Repoint `execution-lifecycle.test.tsx`
- Đổi `import PortalExercise from '../PortalExercise'` → `import Game2048Exercise from '../Game2048Exercise'` (đổi tên dùng trong test).
- **Gỡ** test case "shows UnsupportedExercise when exerciseType is not in registry" (sẽ chuyển sang 2.2).
- Bỏ `vi.mock('src/components/exercises/registry', ...)` nếu Game2048Exercise không còn dùng registry (mock thừa) — hoặc giữ vô hại; ưu tiên gỡ cho sạch.
- Giữ nguyên mock `useGame2048Engine`, `patient.service`, mock assignment `exerciseType:'2048'`.
- **Cross-check:** `npx vitest run execution-lifecycle` → xanh đủ số test (trừ case đã chuyển).

### Task 2.2 — Tạo `portal/__tests__/PortalExercise.dispatcher.test.tsx` (mới)
- Mock `Game2048Exercise` thành stub (`data-testid="game-2048"`) để test routing thuần.
- Case A: assignment `exerciseType:'2048'` → render stub Game2048.
- Case B: assignment `exerciseType:'stereopsis'` (chuyển từ 2.1) → render `UnsupportedExercise`.
- Case C: assignment thiếu type nhưng `code` khớp '2048' → vẫn route đúng (kiểm tra fallback code của registry).
- **Cross-check:** `npx vitest run dispatcher` → 3 case xanh.

### Task 2.3 — Chạy TOÀN BỘ unit test FE
- `npm run test` (vitest run).
- **Cross-check:** số test pass ≥ baseline trước refactor (baseline: ghi lại trước khi bắt đầu — xem mục Baseline). Không phát sinh fail mới. (1 fail timer cũ nếu vốn đã đỏ thì ghi rõ là tồn đọng.)

---

## PHASE 3 — Build & E2E

### Task 3.1 — Type-check & build
- `npx tsc --noEmit` (ghi nhận: repo vốn có lỗi tồn đọng — chỉ so DELTA, không được tăng).
- `npm run build` (Vite/esbuild) → thành công, không lỗi import.

### Task 3.2 — Chống circular import (xác nhận cuối)
- Smoke runtime: build pass + app khởi động.
- Nếu có `madge`: `npx madge --circular src/components/exercises` → 0 vòng liên quan registry/portal.
- Nếu không: dựa vào grep ở 1.3 (Game2048Exercise sạch registry) + build pass.

### Task 3.3 — E2E (cổng cuối, môi trường thật)
- Cần BE chạy + FE chạy. Chạy:
  - `npm run test:e2e -- portal-2048.spec.ts`
  - `npm run test:e2e -- portal-exercise.spec.ts`
- **Cross-check:** 2 spec xanh (chơi 2048: start → move → pause → resume → complete). Nếu môi trường ở đây không dựng được app+BE, đánh dấu cổng này để chạy tay trước khi merge.

---

## Baseline (chốt 2026-06-21, để so sánh DELTA)
- [x] Unit test FE: **1065 pass / 0 fail / 19 skipped** (63 files). Test portal-exercise: **82 pass / 5 files**.
- [x] `tsc --noEmit`: **473 lỗi tồn đọng** (không được tăng sau refactor).
- [x] e2e portal-2048: chưa chạy ở môi trường này (cần app+BE) → cổng cuối chạy tay.
- Ghi chú: đã phát hiện & sửa 1 regression do bước dọn `console` trước đó (test `use2048Exercise` assert vào câu log đã xóa; logic chống trùng vẫn đúng — đã đổi assertion sang kiểm tra hành vi). Sau sửa suite về 0 fail.

## Rollback
- Mỗi task là 1 commit nhỏ. Lỗi ở task N → `git revert`/reset đúng task đó, các task trước vẫn an toàn.
- Toàn bộ Phase 1 chỉ là rename + 1 dispatcher + cắt back-edge → revert sạch nếu cần.

## Definition of Done
- [x] Game 2048 hành vi KHÔNG đổi (execution-lifecycle 3/3 + pause-resume + 106 test portal/use2048 xanh). e2e: **chờ chạy tay**.
- [x] Thêm game mới = thêm 1 component + 1 entry registry (kèm `ExerciseComponent`), KHÔNG đụng 2048.
- [x] Không circular import (build pass + Game2048Exercise sạch import registry). Không lỗi tsc mới (473=473). Không fail unit mới (1067 pass / 0 fail).

## Kết quả thực thi (2026-06-21)
- Phase 1 (1.1–1.6): ✅ — tsc về đúng baseline 473, không lỗi path, không circular.
- Phase 2 (2.1–2.3): ✅ — execution-lifecycle repoint sang `Game2048Exercise` (3/3); thêm `PortalExercise.dispatcher.test.tsx` (3/3); full suite **1067 pass / 0 fail / 19 skipped** (64 files).
- Phase 3.1–3.2: ✅ — `npm run build` thành công (26s, không lỗi import/circular); lint file mới sạch (exit 0).
- Phase 3.3 (e2e): ⏳ **CHƯA chạy** — cần backend + DB test. Chạy tay:
  ```
  # 1. Bật backend eye-sight-service (trỏ DB test, KHÔNG phải DB thật)
  # 2. Tại eye-sight-admin:
  npm run test:e2e -- portal-2048.spec.ts
  npm run test:e2e -- portal-exercise.spec.ts
  ```
  Lưu ý: spec gọi `eye-sight-service/tests/e2e-reset.cjs` để reset DB → chỉ chạy với DB test.

## Cách thêm game mới từ giờ (đã đạt mục tiêu)
1. Tạo `portal/<Game>Exercise.tsx` implement `PortalExerciseProps` (tự ôm engine hook + board).
2. Tạo preview `admin/<Game>Preview.tsx`.
3. Thêm 1 entry vào `exerciseRegistry` (`PreviewComponent` + `ExerciseComponent`).
→ Dispatcher tự route. KHÔNG đụng `Game2048Exercise` hay `PortalExercise`.
