# 📋 Luồng Khám Thị Lực

---

## 📌 Mục Lục

1. [Tổng Quan Hệ Thống](#1-tổng-quan-hệ-thống)
2. [Các Khái Niệm Cơ Bản](#2-các-khái-niệm-cơ-bản)
3. [Luồng Thiết Lập Cài Đặt Khám](#3-luồng-thiết-lập-cài-đặt-khám)
4. [Luồng Bệnh Nhân Thực Hiện](#4-luồng-bệnh-nhân-thực-hiện)
5. [Hệ Thống Tự Động](#5-hệ-thống-tự-động)
6. [Các Trạng Thái & Ý Nghĩa](#6-các-trạng-thái--ý-nghĩa)
7. [Ví Dụ Minh Họa](#7-ví-dụ-minh-họa)

---

## 1. Tổng Quan Hệ Thống

### 1.1 Mô Hình Tổng Thể

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           HỆ THỐNG KHÁM THỊ LỰC                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │   BÁC SĨ    │    │  HỆ THỐNG   │    │ BỆNH NHÂN  │    │   BÁO CÁO   │  │
│  │             │    │   TỰ ĐỘNG   │    │             │    │             │  │
│  │ • Cài đặt   │    │             │    │ • Tự khám   │    │ • Theo dõi  │  │
│  │   khám      │───▶│ • Tạo phiên │───▶│   tại nhà   │───▶│   tiến độ   │  │
│  │ • Giao cho  │    │   khám theo │    │ • Xem kết   │    │ • So sánh   │  │
│  │   bệnh nhân │    │   tần suất  │    │   quả       │    │   kết quả   │  │
│  └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Ai Làm Gì?

| Vai trò | Công việc | Ví dụ |
|---------|-----------|-------|
| **Bác sĩ** | Cài đặt khám cho bệnh nhân | Cài đặt khám mắt xa hàng tuần cho bệnh nhân A |
| **Hệ thống** | Tự động tạo phiên khám theo tần suất | 0h đêm tạo phiên khám cho tuần mới |
| **Bệnh nhân** | Tự khám thị lực tại nhà | Mở web, làm bài kiểm tra mắt xa |
| **Bác sĩ** | Xem báo cáo và theo dõi tiến triển | So sánh kết quả khám qua các tuần |

---

## 2. Các Khái Niệm Cơ Bản

### 2.1 Sơ Đồ Quan Hệ

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  ┌──────────────────┐                                                       │
│  │   CÀI ĐẶT KHÁM   │  ← Bác sĩ cài đặt khám cho bệnh nhân                 │
│  │                  │     VD: Khám mắt xa, hàng tuần                       │
│  └────────┬─────────┘                                                       │
│           │                                                                 │
│           ▼                                                                 │
│  ┌──────────────────┐                                                       │
│  │   PHIÊN KHÁM     │  ← Phiên khám của 1 tuần/tháng (hệ thống tự tạo)     │
│  │                  │     VD: Phiên khám tuần 04-10/01/2026                │
│  └────────┬─────────┘                                                       │
│           │                                                                 │
│           ▼                                                                 │
│  ┌──────────────────┐                                                       │
│  │   KẾT QUẢ KHÁM   │  ← Kết quả mỗi lần bệnh nhân khám                    │
│  │                  │     VD: Mắt trái 20/25, Mắt phải 20/20               │
│  └──────────────────┘                                                       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Giải Thích Từng Khái Niệm

#### ⚙️ CÀI ĐẶT KHÁM
- **Là gì:** Cài đặt khám định kỳ cho bệnh nhân
- **Bao gồm:**
  - Loại khám (Mắt xa / Mắt gần / Độ tương phản / Lập thể)
  - Tần suất khám (Hàng ngày / Hàng tuần / Hàng tháng / Hàng quý / Hàng năm)
  - Cài đặt nhắc nhở (Có/Không, nhắc trước mấy ngày)
- **Ai tạo:** Bác sĩ
- **Trạng thái:** Đang bật / Đã tắt

#### 📅 PHIÊN KHÁM
- **Là gì:** Phiên khám của một khoảng thời gian (ngày/tuần/tháng)
- **Ví dụ:** Phiên khám tuần 04-10/01/2026
- **Ai tạo:** Hệ thống tự động tạo vào 2 thời điểm:
  1. Hàng ngày lúc 0:00 (12 giờ đêm)
  2. Ngay khi bệnh nhân chuyển sang trạng thái "Đang điều trị" (kích hoạt, tiếp tục, gia hạn)
- **Trạng thái:** 
  - Chưa hoàn thành (đã tạo, chờ bệnh nhân khám)
  - Hoàn thành (đã khám xong)

#### 📊 KẾ́T QUẢ KHÁM
- **Là gì:** Kết quả đo thị lực của bệnh nhân
- **Bao gồm:**
  - Kết quả mắt trái, mắt phải, cả hai mắt
  - Độ chính xác của bài kiểm tra
  - Thời gian thực hiện
- **Ai tạo:** Hệ thống (khi bệnh nhân hoàn thành bài kiểm tra)
- **Ứng dụng:** Kết quả khám được dùng làm mức thị lực cho bài tập

#### 👁️ MỐI LIÊN HỆ VỚI BÀI TẬP
- **Kết quả khám → Mức độ bài tập:**
  - Khi bệnh nhân khám xong → Hệ thống lưu kết quả
  - Khi bệnh nhân tập bài → Hệ thống lấy kết quả khám để tính cỡ chữ, độ khó
- **Bác sĩ có thể điều chỉnh:**
  - Nếu muốn bệnh nhân tập ở mức dễ hơn → Bác sĩ chỉ định mức riêng khi giao bài tập
  - Mức bác sĩ chỉ định sẽ được ưu tiên hơn kết quả khám

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                 KẾT QUẢ KHÁM ẢNH HƯỞNG ĐẾN BÀI TẬP NHƯ THẾ NÀO?             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐         ┌─────────────┐         ┌─────────────┐           │
│  │  BỆNH NHÂN  │         │  HỆ THỐNG   │         │   BÀI TẬP   │           │
│  │  KHÁM MẮT   │ ──────▶ │  LƯU KẾT QUẢ│ ──────▶ │  ĐIỀU CHỈNH │           │
│  │             │         │  20/25      │         │  CỠ CHỮ     │           │
│  └─────────────┘         └─────────────┘         └─────────────┘           │
│                                                                             │
│  ─────────────────────────────────────────────────────────                  │
│                                                                             │
│  📌 VÍ DỤ:                                                                  │
│                                                                             │
│  Bệnh nhân A khám mắt xa → Kết quả: 20/25 (mức 13)                          │
│  → Khi tập bài 2048 mắt xa:                                                 │
│     • Hệ thống tự động lấy mức 13                                           │
│     • Tính ra cỡ chữ phù hợp với thị lực 20/25                             │
│     • Bệnh nhân nhìn được chữ vừa đủ, không quá to không quá nhỏ           │
│                                                                             │
│  Nếu bác sĩ muốn bệnh nhân tập dễ hơn:                                      │
│  → Khi giao bài, chỉ định mức 10 (thay vì mức 13)                          │
│  → Chữ sẽ to hơn, bệnh nhân dễ nhìn hơn                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```
---

## 3. Luồng Thiết Lập Cài Đặt Khám

### 3.1 Bác Sĩ Cài Đặt Khám

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      BÁC SĨ CÀI ĐẶT KHÁM                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Bước 1: Chọn bệnh nhân                                                     │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │  🔍 Tìm bệnh nhân: [Nguyễn Văn A                    ]           │       │
│  │                                                                 │       │
│  │  ✓ Nguyễn Văn A - BN001 - Cận thị                              │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│                                                                             │
│  Bước 2: Chọn loại khám và tần suất                                         │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │  ☑ Khám mắt xa      Tần suất: [Hàng tuần ▼]    [Bật]           │       │
│  │  ☑ Khám mắt gần     Tần suất: [Hàng tháng ▼]   [Bật]           │       │
│  │  ☐ Độ tương phản    Tần suất: [Hàng tuần ▼]    [Tắt]           │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│                                                                             │
│  Bước 3: Lưu cài đặt                                                        │
│                         [💾 Lưu cài đặt]                                    │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  ✅ Đã lưu thành công!                                                      │
│     → Hệ thống sẽ tự động tạo phiên khám theo tần suất đã cài đặt          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Luồng Bệnh Nhân Thực Hiện

### 4.1 Sơ Đồ Tổng Thể

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    LUỒNG BỆNH NHÂN KHÁM THỊ LỰC                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│     ┌─────────────┐                                                         │
│     │ Mở web     │                                                         │
│     └──────┬──────┘                                                         │
│            │                                                                │
│            ▼                                                                │
│     ┌─────────────────────────────────────┐                                │
│     │ Xem danh sách phiên khám            │                                │
│     │ • Mắt xa: Chưa hoàn thành (tuần này) │                                │
│     │ • Mắt gần: Hoàn thành ✅             │                                │
│     └──────┬──────────────────────────────┘                                │
│            │                                                                │
│            ▼                                                                │
│     ┌───────────────────────┐                                               │
│     │ Bấm "Bắt đầu kiểm tra"│                                               │
│     └──────┬────────────────┘                                               │
│            │                                                                │
│            ▼                                                                │
│     ┌─────────────────────────────────────┐                                │
│     │        BÀI KIỂM TRA THỊ LỰC           │                                │
│     │  ┌─────────────────────────────┐   │                                │
│     │  │      Chữ cái hiện ra        │   │                                │
│     │  │           E                 │   │                                │
│     │  │  ← ↑ → ↓ (chọn hướng)       │   │                                │
│     │  └─────────────────────────────┘   │                                │
│     └──────┬──────────────────────────────┘                                │
│            │                                                                │
│            ▼                                                                │
│     ┌─────────────────────────────────────┐                                │
│     │         KẾT QUẢ KHÁM                │                                │
│     │  Mắt trái:  20/25                   │                                │
│     │  Mắt phải:  20/20                   │                                │
│     │  Cả hai:    20/20                   │                                │
│     └─────────────────────────────────────┘                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Hệ Thống Tự Động

### 5.1 Các Thời Điểm Hệ Thống Tự Động Tạo Phiên Khám

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                   KHI NÀO HỆ THỐNG TẠO PHIÊN KHÁM TỰ ĐỘNG?                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  📌 CÓ 2 THỜI ĐIỂM:                                                         │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │ 1️⃣ HÀNG NGÀY LÚC 0:00 (12 GIỞ ĐÊM)                            │       │
│  │                                                                 │       │
│  │    Hệ thống tìm tất cả cài đặt khám đang BẬT                   │       │
│  │    + Bệnh nhân đang trong trạng thái ĐANG ĐIỀU TRỊ             │       │
│  │    → Tạo phiên khám cho chu kỳ mới (ngày/tuần/tháng...)        │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │ 2️⃣ KHI BỆNH NHÂN CHUYỂN SANG TRẠNG THÁI ĐANG ĐIỀU TRỊ           │       │
│  │                                                                 │       │
│  │    Ngay khi bác sĩ:                                            │       │
│  │    • Kích hoạt bệnh nhân mới                                   │       │
│  │    • Tiếp tục điều trị (từ Tạm dừng → Đang điều trị)           │       │
│  │    • Gia hạn thời gian điều trị (từ Hết hạn → Đang điều trị)   │       │
│  │                                                                 │       │
│  │    → Hệ thống TỰ ĐỘNG tạo phiên khám NGAY LẬP TỨC              │       │
│  │       (không cần đợi đến 0:00 đêm)                             │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Ví Dụ Với Tần Suất Khác Nhau

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          VÍ DỤ TẦN SUẤT                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  📅 HÀNG TUẦN                                                               │
│  ─────────────────────────────────────────────────────────                  │
│  Tuần 1     Tuần 2     Tuần 3     Tuần 4                                   │
│  [Phiên]   [Phiên]   [Phiên]   [Phiên]                                     │
│                                                                             │
│  → Bệnh nhân có cả tuần để thực hiện khám                                  │
│                                                                             │
│                                                                             │
│  📅 HÀNG THÁNG                                                              │
│  ─────────────────────────────────────────────────────────                  │
│  Tháng 1   Tháng 2   Tháng 3   Tháng 4                                     │
│  [Phiên]   [Phiên]   [Phiên]   [Phiên]                                     │
│                                                                             │
│  → Bệnh nhân có cả tháng để thực hiện khám                                 │
│                                                                             │
│                                                                             │
│  📅 HÀNG QUÝ                                                                │
│  ─────────────────────────────────────────────────────────                  │
│  Q1 2026   Q2 2026   Q3 2026   Q4 2026                                     │
│  [Phiên]   [Phiên]   [Phiên]   [Phiên]                                     │
│                                                                             │
│  → Bệnh nhân có cả quý (3 tháng) để thực hiện khám                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.3 Ví Dụ Khi Bệnh Nhân Chuyển Trạng Thái Điều Trị

```
┌─────────────────────────────────────────────────────────────────────────────┐
│         VÍ DỤ: TẠM DỪNG ĐIỀU TRỊ → TIẾP TỤC ĐIỀU TRỊ                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  📅 Ngày 01/01: Bệnh nhân A được cài đặt khám mắt xa hàng tuần              │
│     → Hệ thống tạo phiên khám cho tuần 01-07/01                             │
│                                                                             │
│  📅 Ngày 02/01: Bác sĩ TẠM DỪNG ĐIỀU TRỊ cho bệnh nhân A                    │
│     → Hệ thống KHÔNG tạo phiên mới từ lúc này                               │
│                                                                             │
│  📅 Ngày 03/01 - 10/01: Bệnh nhân nghỉ, hệ thống không tạo phiên            │
│                                                                             │
│  📅 Ngày 11/01 lúc 14:00: Bác sĩ TIẾP TỤC ĐIỀU TRỊ                          │
│     → Hệ thống TỰ ĐỘNG tạo phiên khám NGAY LẬP TỨC (14:00)                  │
│     → Bệnh nhân mở web thấy phiên mới ngay                                  │
│     → KHÔNG cần đợi đến 0:00 đêm                                            │
│                                                                             │
│  📅 Ngày 12/01 lúc 0:00: Hệ thống tạo phiên mới như bình thường            │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  📌 TƯƠNG TỰ CHO CÁC TRƯỜNG HỢP KHÁC:                                       │
│  • Kích hoạt bệnh nhân mới → Tạo phiên ngay                                │
│  • Gia hạn thời gian điều trị (hết hạn → còn hạn) → Tạo phiên ngay         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.4 Phiên Khám Cũ Chưa Hoàn Thành

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              PHIÊN KHÁM CŨ CHƯA HOÀN THÀNH - XỬ LÝ THẾ NÀO?                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Câu hỏi: Bệnh nhân có phiên khám tuần 1 chưa hoàn thành,                  │
│           tuần 2 hệ thống tạo phiên mới. Điều gì xảy ra?                   │
│                                                                             │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  Trả lời: KHÔNG XỬ LÝ TỰ ĐỘNG                                              │
│                                                                             │
│  • Phiên tuần 1 vẫn giữ nguyên trạng thái "Chưa hoàn thành"                │
│  • Hệ thống tạo thêm phiên mới cho tuần 2                                  │
│  • Bệnh nhân sẽ thấy cả 2 phiên trong lịch sử                              │
│                                                                             │
│  ─────────────────────────────────────────────────────────                  │
│                                                                             │
│  Lý do:                                                                     │
│  • Giữ nguyên trạng thái "Chưa hoàn thành" để bác sĩ biết bệnh nhân bỏ qua │
│  • Thông tin này có giá trị cho báo cáo và đánh giá tuân thủ               │
│  • Bác sĩ cần biết bệnh nhân bỏ qua bao nhiêu phiên khám                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Các Trạng Thái & Ý Nghĩa

### 6.1 Trạng Thái Cài Đặt Khám

| Trạng thái | Ý nghĩa | Khi nào? |
|------------|---------|----------|
| 🟢 **Đang bật** | Hệ thống sẽ tạo phiên khám theo tần suất | Sau khi bác sĩ cài đặt |
| ⚫ **Đã tắt** | Không tạo phiên khám mới | Bác sĩ tắt cài đặt |

### 6.2 Trạng Thái Phiên Khám

| Trạng thái | Ý nghĩa | Khi nào? |
|------------|---------|----------|
| 🟡 **Chưa hoàn thành** | Phiên vừa được tạo, chờ bệnh nhân khám | Hệ thống vừa tạo |
| 🟢 **Hoàn thành** | Đã khám xong, có kết quả | Bệnh nhân hoàn thành |

---

## 7. Ví Dụ Minh Họa

### 7.1 Một Tuần Khám Của Bệnh Nhân

```
┌─────────────────────────────────────────────────────────────────────────────┐
│          VÍ DỤ: MỘT TUẦN KHÁM CỦA BỆNH NHÂN NGUYỄN VĂN A                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  📋 Cài đặt khám: Mắt xa, hàng tuần                                         │
│                                                                             │
│  ─────────────────────────────────────────────────────────                  │
│                                                                             │
│  ⏰ 00:00 Thứ 2 - Hệ thống tự động tạo phiên khám cho tuần 04-10/01         │
│                                                                             │
│  ⏰ Thứ 3 - Bệnh nhân mở web, thấy phiên khám "Chưa hoàn thành"             │
│                                                                             │
│  ⏰ Thứ 4 - Bệnh nhân bấm "Bắt đầu kiểm tra"                                │
│           → Làm bài kiểm tra thị lực mắt xa                                 │
│           → Chọn hướng chữ E hiển thị                                       │
│           → Kết quả: Mắt trái 20/25, Mắt phải 20/20                        │
│           → Phiên khám chuyển sang "Hoàn thành" ✅                          │
│                                                                             │
│  ⏰ 00:00 Thứ 2 tuần sau - Hệ thống tạo phiên khám mới cho tuần 11-17/01   │
│                                                                             │
│  ─────────────────────────────────────────────────────────                  │
│                                                                             │
│  📊 KẾT QUẢ CUỐI TUẦN:                                                      │
│  • Phiên khám tuần 04-10/01: ✅ Hoàn thành                                  │
│  • Kết quả: Mắt trái 20/25, Mắt phải 20/20                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```


