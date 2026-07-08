import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read Vietnamese translation file
const viPath = path.join(__dirname, '../src/utils/languages/vi.json');
const enPath = path.join(__dirname, '../src/utils/languages/en.json');

try {
  const viData = JSON.parse(fs.readFileSync(viPath, 'utf8'));
  const enData = JSON.parse(fs.readFileSync(enPath, 'utf8'));

  // Translation mappings for common patterns
  const translations = {
    // Common words
    "Tạo mới": "Create",
    "Trang chủ": "Home", 
    "Lưu": "Save",
    "Hủy": "Cancel",
    "Xóa": "Delete",
    "Chỉnh sửa": "Edit",
    "Thêm": "Add",
    "Đóng": "Close",
    "Xác nhận": "Confirm",
    "Có": "Yes",
    "Không": "No",
    "Đang tải...": "Loading...",
    "Tìm kiếm": "Search",
    "Lọc": "Filter",
    "Xuất": "Export",
    "Nhập": "Import",
    "Làm mới": "Refresh",
    "Quay lại": "Back",
    "Tiếp theo": "Next",
    "Hoàn thành": "Completed",
    "Đang thực hiện": "In Progress",
    "Chờ xử lý": "Pending",
    "Chưa bắt đầu": "Not Started",
    "Trước đó": "Previous",
    "Gửi": "Submit",
    "Đặt lại": "Reset",
    "Xem": "View",
    "Tải xuống": "Download",
    "Tải lên": "Upload",
    "Mã": "Code",
    "Thêm mới": "Add New",
    "Hiệu suất": "Efficiency",
    "Trạng thái": "Status",
    "Hành động": "Actions",
    "Kích hoạt": "Active",
    "Không hoạt động": "Inactive",
    "Cập nhật": "Update",
    "Bảng điều khiển": "Dashboard",
    "Bệnh nhân": "Patients",
    "Bài tập": "Exercises",
    "Báo cáo": "Reports",
    "Cài đặt": "Settings",
    "Đăng xuất": "Logout",
    "Hồ sơ": "Profile",
    "Quản trị": "Administration",
    "Trợ giúp": "Help",
    "Có lỗi xảy ra": "Error occurred",
    "Không có dữ liệu": "No data",
    "Ngày": "Date",
    
    // Auth
    "Đăng nhập": "Login",
    "Quên mật khẩu": "Forgot Password",
    "Đăng ký": "Sign Up",
    "Xác thực": "Verify",
    "Mật khẩu": "Password",
    "Email": "Email",
    "Số điện thoại": "Phone Number",
    
    // Patient
    "Thêm bệnh nhân": "Add Patient",
    "Chỉnh sửa bệnh nhân": "Edit Patient",
    "Xóa bệnh nhân": "Delete Patient",
    "Họ tên": "Full Name",
    "Tên": "First Name", 
    "Họ": "Last Name",
    "Ngày sinh": "Date of Birth",
    "Giới tính": "Gender",
    "Nam": "Male",
    "Nữ": "Female",
    "Khác": "Other",
    "Địa chỉ": "Address",
    "Bác sĩ": "Doctor",
    "Phòng khám": "Clinic",
    "Tuổi": "Age",
    "Tình trạng hiện tại": "Current Condition",
    "Thị lực hiện tại": "Current Eyesight",
    "Lịch sử bệnh": "Medical History",
    "Thông tin bệnh nhân": "Patient Info",
    "Danh sách bệnh nhân": "Patient List",
    "Tiến độ": "Progress",
    "Hiệu quả": "Effectiveness",
    "Phiên cuối": "Last Session",
    "Tổng phiên": "Total Sessions",
    "Bài tập được giao": "Assigned Exercises",
    
    // Exercise
    "Tiêu đề": "Title",
    "Mô tả": "Description",
    "Quản lý bài tập": "Exercise Management",
    "Danh sách bài tập": "Exercise List",
    "Thêm bài tập": "Add Exercise",
    "Chỉnh sửa bài tập": "Edit Exercise",
    "Loại bài tập": "Exercise Type",
    "Tên bài tập": "Exercise Name",
    "Hướng dẫn": "Instructions",
    "Thời lượng": "Duration",
    "Độ khó": "Difficulty",
    "Cấp độ": "Level",
    "Kết quả": "Result",
    "Điểm số": "Score",
    "Vòng": "Rounds",
    "Thời gian tối đa": "Max Time",
    "Điểm tối thiểu": "Min Score",
    "Độ chính xác tối thiểu": "Min Accuracy",
    "Cấp độ tối đa": "Max Level",
    "Cấp độ tối thiểu": "Min Level",
    "Thị giác": "Visual",
    "Vận động": "Motor",
    "Bài tập của tôi": "My Exercises",
    "Chưa bắt đầu": "Not Started",
    "Không tìm thấy bài tập": "Exercise Not Found",
    
    // Exam
    "Khám bệnh": "Examination",
    "Loại khám": "Test Type",
    "Loại kiểm tra": "Test Type",
    "Mã khám": "Exam Code",
    "Ngày hoàn thành": "Completed At",
    "Thời gian tạo": "Created At",
    "Mắt trái": "Left Eye",
    "Mắt phải": "Right Eye",
    "Nhìn gần": "Near Vision",
    "Nhìn xa": "Far Vision",
    "Độ tương phản": "Contrast",
    "Chưa có kết quả": "No Result",
    "Có kết quả": "Has Result",
    
    // Portal
    "Portal Bệnh nhân": "Patient Portal",
    "Chào mừng": "Welcome",
    "Chăm sóc sức khỏe thị lực": "Eye care",
    "Thao tác nhanh": "Quick Actions",
    "Kiểm tra thị lực": "Vision Test",
    "Lịch sử": "History",
    "Truy cập": "Access",
    "Điểm trung bình": "Average Score",
    "Tình trạng hiện tại": "Current Status",
    "Bài tập 2048": "2048 Exercise",
    "Bài tập game": "Exercise Game",
    "Đăng nhập để sử dụng": "Login Required",
    
    // History  
    "Lịch sử bài tập": "Exercise History",
    "Lịch sử khám bệnh": "Exam History",
    "Theo dõi tiến trình": "Track Progress",
    
    // Clinic/Center
    "Quản lý phòng khám": "Clinic Management",
    "Quản lý trung tâm": "Center Management",
    "Tên phòng khám": "Clinic Name",
    "Tên trung tâm": "Center Name",
    "Mã phòng khám": "Clinic Code",
    "Mã trung tâm": "Center Code",
    
    // Notification
    "Thông báo": "Notification",
    "Quản lý thông báo": "Manage Notifications",
    "Lên lịch thông báo": "Schedule Notification",
    "Gửi thông báo test": "Send Test Notification",
    "Xử lý thông báo": "Process Notifications",
    "Thành công": "Success",
    "Thất bại": "Error",
    
    // Form
    "Bắt buộc": "Required",
    "Email không hợp lệ": "Invalid Email",
    "Số điện thoại không hợp lệ": "Invalid Phone",
    "Số không hợp lệ": "Invalid Number",
    "Mật khẩu không khớp": "Password Mismatch",
    "Độ dài tối thiểu": "Min Length",
    "Độ dài tối đa": "Max Length",
    "Chọn tùy chọn": "Select Option",
    "Đang lưu": "Saving",
    
    // Navigation
    "Điều hướng": "Navigation",
    
    // Role
    "Vai trò": "Role",
    "Tên vai trò": "Role Name",
    
    // Status
    "Hoạt động": "Active",
    
    // User
    "Người dùng": "User",
    "Loại người dùng": "User Type",
    "Thông tin cơ bản": "Basic Info",
    "Thông tin vị trí": "Location Info",
    "Phòng khám mặc định": "Default Clinic",
    "Tạo ghi chú cho quản trị viên": "Create Admin Note",
    "Tạo ghi chú cho bác sĩ": "Create Doctor Note", 
    "Tạo ghi chú cho bệnh nhân": "Create Patient Note",
    
    // Default fallbacks
    "Bạn có chắc chắn muốn xóa?": "Are you sure you want to delete?",
  };

  function translateText(text) {
    if (translations[text]) {
      return translations[text];
    }
    
    // Simple word-by-word translation for compound phrases
    const words = text.split(' ');
    const translatedWords = words.map(word => translations[word] || word);
    const result = translatedWords.join(' ');
    
    // If no translation found, keep original or provide generic English equivalent
    if (result === text) {
      // Some basic patterns
      if (text.includes('Quản lý')) return text.replace('Quản lý', 'Management');
      if (text.includes('Danh sách')) return text.replace('Danh sách', 'List');
      if (text.includes('Trang')) return text.replace('Trang', 'Page');
      if (text.includes('Thêm')) return text.replace('Thêm', 'Add');
      if (text.includes('Chỉnh sửa')) return text.replace('Chỉnh sửa', 'Edit');
    }
    
    return result;
  }

  function syncObject(viObj, enObj = {}) {
    const result = { ...enObj };
    
    for (const [key, value] of Object.entries(viObj)) {
      if (typeof value === 'object' && value !== null) {
        result[key] = syncObject(value, result[key] || {});
      } else if (typeof value === 'string') {
        // Keep existing English translation if available, otherwise translate
        if (!result[key]) {
          result[key] = translateText(value);
        }
      }
    }
    
    return result;
  }

  // Sync the translations
  const syncedEnData = syncObject(viData, enData);
  
  // Write back to English file
  fs.writeFileSync(enPath, JSON.stringify(syncedEnData, null, 2));
  
  console.log('✅ Translation sync completed!');
  console.log(`📊 Vietnamese keys: ${Object.keys(JSON.stringify(viData)).length}`);
  console.log(`📊 English keys: ${Object.keys(JSON.stringify(syncedEnData)).length}`);
  
} catch (error) {
  console.error('❌ Error syncing translations:', error.message);
  process.exit(1);
}
