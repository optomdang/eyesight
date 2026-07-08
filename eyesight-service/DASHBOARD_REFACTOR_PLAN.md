# KẾ HOẠCH THỰC THI — DASHBOARD REFACTOR

> Đi kèm `DASHBOARD_REFACTOR_SPEC.md`. Nguyên tắc: **clean, triệt để, KHÔNG adhoc/workaround, KHÔNG break tính năng cũ.**
> Pattern bắt buộc cho mọi thay đổi schema rủi ro: **Expand → Migrate → Contract** (mỗi bước deploy được độc lập, code cũ vẫn chạy giữa các bước).
> Mọi Phase: regression suite phải **xanh trước & sau**. Test chạy trên **DB test riêng** (không Supabase prod).

## 0. NGUYÊN TẮC & TẦNG TEST
- **Unit** (mock): công thức/logic thuần, không DB.
- **Regression** (đặc tả hành vi HIỆN TẠI trước khi sửa): khóa các luồng dễ vỡ (access-control, exercise flow, exam write-flow) để phát hiện break.
- **Integration** (DB thật, gated `RUN_DB_INTEGRATION=1`): query + migration thật, seed kịch bản BU, assert đúng số ví dụ.
- **E2E** (HTTP qua supertest): các endpoint dashboard + luồng complete exercise/exam, kèm auth + injectData, để đảm bảo không vỡ tầng API.
- **DoD mỗi task:** code + test (đủ 4 tầng nếu áp dụng) + lint sạch + regression cũ xanh + cập nhật spec nếu lệch.

---

## PHASE 0 — LƯỚI AN TOÀN (làm trước, KHÔNG đổi schema)
**Mục tiêu:** có baseline để chứng minh "không break".
- [ ] 0.1 Chạy full `tests/unit` + integration hiện có → ghi nhận baseline xanh.
- [ ] 0.2 Viết **characterization tests** (pin hành vi HIỆN TẠI) cho 3 vùng rủi ro:
  - `checkPatientActive`: patient `treatmentStatus=false` → 403; `=true` → pass.
  - `completeExercise`: hành vi hiện tại (passed/failed) — để biết khi đổi.
  - exam write-flow → `examResults` (đã có `exam-writeflow.integration.test.js`).
- [ ] 0.3 Tạo helper seed dùng chung cho integration (center synthetic, cleanup theo ID) — chuẩn hóa từ các file integration đã có.

---

## PHASE 1 — ExerciseResult: bỏ pass/failed → `incomplete|completed`
**Blast radius (đã quét):** model `exerciseResult.model.js`; service `exerciseResult.service.js` (evaluatePassConditions, completeExercise, updateSessionStats, createExerciseResult, getResultsSummaryByPatient); dashboards (user/exercise/patient); controllers `portal.controller.js`, `exam/exerciseResult.controller.js`; migrations backfill; **FE**: `PatientExerciseResultsTable`, `portal/types`, `SessionResultsPage`, `types/admin/patient-detail.ts`, audit-log filter.

**Expand → Migrate → Contract:**
- [ ] 1.1 (Expand) Migration: enum `status` thêm `'completed'` (giữ passed/failed tạm).
- [ ] 1.2 (Code) `completeExercise` set `'completed'` (+ #21-clamp duration ≤ giao); **xóa `evaluatePassConditions`**; `updateSessionStats` đếm theo completed; reads coi passed/failed/completed đều là "đã xong".
- [ ] 1.3 (Migrate) Migration backfill `UPDATE passed/failed → completed`.
- [ ] 1.4 (Contract) Migration drop `passed`,`failed` khỏi enum; sửa toàn bộ query `status IN ('passed','failed')` → `='completed'`.
- [ ] 1.5 (FE) đổi mọi map trạng thái passed/failed → completed (giữ hiển thị lịch sử).
- **Test:** unit completeExercise (completed + clamp); regression updateSessionStats; integration (DB: tạo lượt → completed, session stats đúng); e2e POST complete.

---

## PHASE 2 — D6: snapshot "số giao" vào ExerciseSession
**Mục tiêu:** `executionCount`, `executionDuration` cố định lúc tạo buổi.
- [ ] 2.1 Migration thêm 2 cột (nullable trước).
- [ ] 2.2 Code: lúc tạo `ExerciseSession` copy từ `ExerciseConfig` (executionCount, duration).
- [ ] 2.3 Backfill buổi cũ từ config hiện tại (best-effort; log số bản ghi).
- [ ] 2.4 Set NOT NULL sau backfill.
- **Test:** integration: tạo session → 2 field đúng; sửa config sau → buổi cũ KHÔNG đổi (chứng minh "khóa lịch sử").

---

## PHASE 3 — D2: `ExamResult.*Level` STRING(50) → SMALLINT
**Blast radius:** BE `examResult.model`, `examMetric.model`, `compliance.service` (write-flow cache), `dashboardPatient` (CAST), `utils/query` (FIELDS), validations. **FE**: `ExamHistoryTable`(×2), `ExamResultTable`, `TreatmentPlanTab`, `TreatmentProgressCharts`, `exam-state.ts`, `types/core/exam.ts`.
**Expand → Migrate → Contract** (tránh vỡ FE đang parse string):
- [ ] 3.1 (Expand) Migration thêm cột mới `*LevelInt SMALLINT` (nullable).
- [ ] 3.2 (Code) write-flow ghi cả 2 (string cũ + int mới); cache `examResults` lưu **số**.
- [ ] 3.3 (Migrate) Backfill `*LevelInt = NULLIF(*Level,'')::smallint`; backfill cache examResults → số.
- [ ] 3.4 (Code) chuyển đọc sang cột int (BE dashboards bỏ CAST; FE đọc số); validation nhận số.
- [ ] 3.5 (Contract) drop cột string cũ, rename int → tên cũ (hoặc giữ tên int — chốt khi làm).
- **Test:** regression so sánh cải thiện đúng ở mốc 9↔10 (bug so chuỗi); integration correlation chart; FE unit exam history render số.

---

## PHASE 4 — D9: `treatmentStatus` BOOLEAN → STRING enum 🔴 RỦI RO CAO NHẤT
**Vì sao rủi ro:** `checkPatientActive` (gate truy cập bệnh nhân) đang `if(!treatmentStatus)→403`. Sai = chặn nhầm/cho qua nhầm.
**Enum:** `not_started | active | paused | completed`. Job set `completed` khi `now>activeTo`.
**Blast radius (đã quét):** BE `patient.model`, `treatmentUtils` (build*WhereClause, getTreatmentPhase, isInTreatmentWindow), `checkPatientActive`, `patient.service`, dashboards (user/exam), `examNotification`, `query.js`, `sessionProvisionUtils`, validations; callers của build*WhereClause (patient/dashboardUser/examNotification/examScheduler/exerciseCompliance/exerciseScheduler/sessionProvisionUtils). **FE**: user-form (schema/types/utils/tsx), PatientFields, patient-page/index, InactivePage, dashboard tests.
**Expand → Migrate → Contract:**
- [ ] 4.1 (Expand) Migration thêm cột `treatmentStatusV2 STRING` (nullable), KHÔNG đụng cột bool.
- [ ] 4.2 (Migrate) Backfill từ (bool + dates): false→`paused`; true & now<activeFrom→`not_started`; true & now>activeTo→`completed`; còn lại→`active`.
- [ ] 4.3 (Code) tập trung toàn bộ logic vào `treatmentUtils` (1 nguồn): đổi `build*WhereClause` + `checkPatientActive` đọc enum. **`checkPatientActive`: cho phép khi `active`; chặn `paused`/`not_started`/`completed`** — ⚠️ chốt rõ: `completed` có được truy cập tính năng điều trị không? (xem ❓P4).
- [ ] 4.4 Scheduled job (dùng scheduler sẵn có) set `active`→`completed` khi `now>activeTo`, hằng ngày.
- [ ] 4.5 (FE) form sửa BN dùng dropdown enum; chỗ hiển thị/filter theo enum.
- [ ] 4.6 (Contract) drop cột bool cũ, rename V2 → `treatmentStatus`.
- **Test (đặc biệt nặng):** regression access-control (mọi tổ hợp enum × endpoint gated); unit treatmentUtils (4 phase); integration job completed; e2e endpoint điều trị với từng trạng thái.
- ❓ **P4 — cần chốt:** bệnh nhân `completed` (hết hạn điều trị) có **bị chặn** truy cập tính năng tập/đo không? (hiện bool=true vẫn cho vào dù hết hạn).

---

## PHASE 5 — Index (D7 + composite)
- [ ] 5.1 `GIN Patients(causes)` (causes là ARRAY → GIN cho `&&`/overlap).
- [ ] 5.2 `Patients(centerId, treatmentStatus, activeFrom, activeTo)` (sau khi enum hóa).
- [ ] 5.3 (sau D2) index theo `*LevelInt` nếu cần cho correlation.
- **Test:** EXPLAIN trước/sau trên DB test có dữ liệu; integration thời gian phản hồi.

---

## PHASE 6 — Backfill `examResults` (D3)
- [ ] 6.1 Script backfill: với mỗi (patient, examType) dựng lại initial (lần đo full đầu) + current (lần đo full mới nhất) từ `ExamResult`.
- [ ] 6.2 Idempotent, chạy lại an toàn, log số bản ghi sửa.
- **Test:** integration: BN có ExamResult nhưng cache rỗng → sau backfill cache đúng.

---

## PHASE 7 — BE METRICS (theo SPEC Phần B) — mỗi metric 1 task + test pin số ví dụ
- [ ] 7.1 Gom **1 service "improvement"** dùng chung (D8): tính improvedSet, far-delta, per-type, per-eye đúng (D10). → #3,#4,#5,#9,#12-15.
- [ ] 7.2 `getTotalPatientsStats` theo enum mới (#1,#2).
- [ ] 7.3 #6 hoạt động (BN distinct completed/ngày, bỏ login).
- [ ] 7.4 #10 PHỤC HỒI (eye rule) — test TH1=80%, TH2=66.67%.
- [ ] 7.5 #8/#21/#22/#26 completion/compliance (đọc snapshot D6) — test 37.5% / 75% / 3/4.
- [ ] 7.6 #7 BXH (sắp Hoàn thành→Tập trung→Cải thiện, in-treatment, LIMIT 10).
- [ ] 7.7 #11 tuân thủ test; #12-15 %cải thiện theo loại; #16/#17 phân bổ + trend (selector Tuần/Tháng/Quý/Năm).
- [ ] 7.8 #19 ĐANG SỬ DỤNG, #20 SỐ PHÁC ĐỒ TẬP, #23 BN xuất sắc.
- [ ] 7.9 Xóa BE: nhánh `trendData` (#24), `evaluatePassConditions` (đã ở P1).
- **Test mỗi metric:** unit (công thức, mock) + integration (DB seed kịch bản BU) + e2e (endpoint trả đúng shape).

---

## PHASE 8 — FRONTEND
- [ ] 8.1 Tab Tổng quan: đổi tên 5 card, ĐỘ TUỔI 3 dòng, BXH cột Hoàn thành/Tập trung/Cải thiện/Phục hồi, age-chart (cột+2 line+nút phóng to), chart nguyên nhân.
- [ ] 8.2 Tab Test: TỈ LỆ TUÂN THỦ + 4 card %cải thiện, selector thời gian, nhãn đơn vị.
- [ ] 8.3 Tab Bài tập: cards (đang sử dụng/phác đồ/...), pie→bar ngang, **xóa** Xu Hướng Hiệu Suất, thêm bar tuân thủ-theo-loại.
- [ ] 8.4 Cập nhật `dashboard.service.ts` types theo response BE mới.
- **Test:** FE unit (component render), e2e Playwright (đã có hạ tầng) cho 3 tab.

---

## THỨ TỰ & PHỤ THUỘC
```
P0 → P1 → P2 → P3 → P4 → P5 → P6 → P7 → P8
        (P2,P3,P4 độc lập tương đối, nhưng P7 phụ thuộc P1,P2,P3,P4,P6)
```
- Mỗi Phase = 1 nhánh/PR riêng, merge khi xanh toàn bộ test + regression.
- Migration luôn có `down()` rollback; chạy `db:migrate:status` kiểm tra.

## ❓ CHỐT TRƯỚC KHI BẮT ĐẦU
1. **P4:** bệnh nhân `completed` có bị `checkPatientActive` chặn không? (quyết định access-control).
2. Có làm **đủ cả P3 (level→smallint) trong đợt này** không, hay tách sau? (blast radius FE rộng).
3. Cho phép tao chạy integration/e2e trên **DB test riêng** nào? (không dùng Supabase hiện tại).
