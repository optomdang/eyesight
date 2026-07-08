/**
 * Device Profile Service
 * Quản lý thông tin thiết bị (màn hình) cho bài tập luyện thị lực
 * Lưu trữ local trên từng máy tính/thiết bị
 */

export interface DeviceProfile {
  id: string;
  name: string; // Tên thiết bị do người dùng đặt (VD: "Laptop Dell", "Màn hình văn phòng")
  diagonalInch: number;
  screenWidth: number;
  screenHeight: number;
  isDefault: boolean;
  createdAt: string;
  lastUsed: string;
}

export interface ScreenConfig {
  diagonalInch: number;
  screenWidth: number;
  screenHeight: number;
}

const STORAGE_KEY = 'eyesight_device_profiles';
const LAST_USED_KEY = 'eyesight_last_device';
const LAST_SCREEN_CONFIG_KEY = 'eyesight_last_screen_config';

/**
 * Default screen configuration used as the last resort when no saved profile
 * exists and the user has not yet configured their screen.
 *
 * 15.6" 1920×1080 is the most common laptop size in Vietnam clinical settings.
 * All files that need a fallback screen MUST import this constant — never
 * hardcode screen dimensions independently.
 */
export const DEFAULT_SCREEN_CONFIG: ScreenConfig = {
  diagonalInch: 15.6,
  screenWidth: 1920,
  screenHeight: 1080,
};

/**
 * Lấy tất cả device profiles
 */
export const getDeviceProfiles = (): DeviceProfile[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error loading device profiles:', error);
    return [];
  }
};

/**
 * Lấy device profile mặc định hoặc profile được dùng gần nhất
 */
export const getDefaultDeviceProfile = (): DeviceProfile | null => {
  const profiles = getDeviceProfiles();

  // Tìm profile mặc định
  const defaultProfile = profiles.find((p) => p.isDefault);
  if (defaultProfile) return defaultProfile;

  // Nếu không có mặc định, lấy profile dùng gần nhất
  const lastUsedId = localStorage.getItem(LAST_USED_KEY);
  if (lastUsedId) {
    const lastUsed = profiles.find((p) => p.id === lastUsedId);
    if (lastUsed) return lastUsed;
  }

  // Nếu không có gì, lấy profile đầu tiên
  return profiles.length > 0 ? profiles[0] : null;
};

/**
 * Lấy cấu hình màn hình dùng gần nhất, kể cả khi người dùng chưa lưu thành profile.
 */
export const getLastScreenConfig = (): ScreenConfig | null => {
  try {
    const data = localStorage.getItem(LAST_SCREEN_CONFIG_KEY);
    if (!data) {
      return null;
    }

    const parsed = JSON.parse(data) as Partial<ScreenConfig>;
    if (
      typeof parsed.diagonalInch !== 'number' ||
      typeof parsed.screenWidth !== 'number' ||
      typeof parsed.screenHeight !== 'number'
    ) {
      return null;
    }

    return {
      diagonalInch: parsed.diagonalInch,
      screenWidth: parsed.screenWidth,
      screenHeight: parsed.screenHeight,
    };
  } catch (error) {
    console.error('Error loading last screen config:', error);
    return null;
  }
};

/**
 * Lưu cấu hình màn hình dùng gần nhất để lần sau mở setup vẫn giữ nguyên giá trị đã nhập.
 */
export const saveLastScreenConfig = (config: ScreenConfig): void => {
  localStorage.setItem(LAST_SCREEN_CONFIG_KEY, JSON.stringify(config));
};

/**
 * Lưu device profile mới
 */
export const saveDeviceProfile = (
  profile: Omit<DeviceProfile, 'id' | 'createdAt' | 'lastUsed'>
): DeviceProfile => {
  const profiles = getDeviceProfiles();

  const newProfile: DeviceProfile = {
    ...profile,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
    lastUsed: new Date().toISOString(),
  };

  // Nếu profile mới là mặc định, bỏ mặc định của các profile khác
  if (newProfile.isDefault) {
    profiles.forEach((p) => (p.isDefault = false));
  }

  profiles.push(newProfile);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));

  return newProfile;
};

/**
 * Cập nhật device profile
 */
export const updateDeviceProfile = (
  id: string,
  updates: Partial<DeviceProfile>
): DeviceProfile | null => {
  const profiles = getDeviceProfiles();
  const index = profiles.findIndex((p) => p.id === id);

  if (index === -1) return null;

  // Nếu set làm mặc định, bỏ mặc định của các profile khác
  if (updates.isDefault) {
    profiles.forEach((p) => (p.isDefault = false));
  }

  profiles[index] = {
    ...profiles[index],
    ...updates,
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
  return profiles[index];
};

/**
 * Xóa device profile
 */
export const deleteDeviceProfile = (id: string): boolean => {
  const profiles = getDeviceProfiles();
  const filtered = profiles.filter((p) => p.id !== id);

  if (filtered.length === profiles.length) return false;

  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));

  // Xóa last used nếu đang là profile này
  if (localStorage.getItem(LAST_USED_KEY) === id) {
    localStorage.removeItem(LAST_USED_KEY);
  }

  return true;
};

/**
 * Đánh dấu profile đã được sử dụng
 */
export const markDeviceProfileUsed = (id: string): void => {
  const profiles = getDeviceProfiles();
  const profile = profiles.find((p) => p.id === id);

  if (profile) {
    profile.lastUsed = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
    localStorage.setItem(LAST_USED_KEY, id);
    saveLastScreenConfig({
      diagonalInch: profile.diagonalInch,
      screenWidth: profile.screenWidth,
      screenHeight: profile.screenHeight,
    });
  }
};

/**
 * Set profile làm mặc định
 */
export const setDefaultDeviceProfile = (id: string): boolean => {
  const profiles = getDeviceProfiles();

  // Bỏ mặc định tất cả
  profiles.forEach((p) => (p.isDefault = false));

  // Set mặc định cho profile được chọn
  const profile = profiles.find((p) => p.id === id);
  if (!profile) return false;

  profile.isDefault = true;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));

  return true;
};

/**
 * Tự động phát hiện thông số màn hình hiện tại
 */
export const detectCurrentScreen = (): Omit<
  DeviceProfile,
  'id' | 'name' | 'isDefault' | 'createdAt' | 'lastUsed'
> => {
  return {
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    // Ước tính kích thước màn hình (có thể không chính xác)
    diagonalInch: 15.6, // Default, người dùng cần điều chỉnh
  };
};
