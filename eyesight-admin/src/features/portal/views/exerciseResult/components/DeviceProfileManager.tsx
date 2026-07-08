import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  TextField,
  Box,
  Typography,
  Chip,
  Alert,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Add as AddIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import useSnackbar from 'src/contexts/UseSnackbar';
import { SNACKBAR_SEVERITY } from 'src/utils/constant';
import {
  getDeviceProfiles,
  saveDeviceProfile,
  updateDeviceProfile,
  deleteDeviceProfile,
  setDefaultDeviceProfile,
  detectCurrentScreen,
  type DeviceProfile,
} from 'src/services/deviceProfile.service';

interface DeviceProfileManagerProps {
  open: boolean;
  onClose: () => void;
  onSelectProfile: (profile: DeviceProfile) => void;
}

const DeviceProfileManager: React.FC<DeviceProfileManagerProps> = ({
  open,
  onClose,
  onSelectProfile,
}) => {
  const { showSnackbar } = useSnackbar();
  const [profiles, setProfiles] = useState<DeviceProfile[]>([]);
  const [editingProfile, setEditingProfile] = useState<DeviceProfile | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    diagonalInch: 15.6,
    screenWidth: 1920,
    screenHeight: 1080,
  });

  useEffect(() => {
    if (open) {
      loadProfiles();
    }
  }, [open]);

  const loadProfiles = () => {
    setProfiles(getDeviceProfiles());
  };

  const handleDetectScreen = () => {
    const detected = detectCurrentScreen();
    setFormData((prev) => ({
      ...prev,
      screenWidth: detected.screenWidth,
      screenHeight: detected.screenHeight,
    }));
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      showSnackbar('Vui lòng nhập tên thiết bị', SNACKBAR_SEVERITY.WARNING);
      return;
    }

    try {
      if (editingProfile) {
        updateDeviceProfile(editingProfile.id, formData);
        showSnackbar('Cập nhật thiết bị thành công', SNACKBAR_SEVERITY.SUCCESS);
      } else {
        saveDeviceProfile({
          ...formData,
          isDefault: profiles.length === 0, // First profile is default
        });
        showSnackbar('Thêm thiết bị thành công', SNACKBAR_SEVERITY.SUCCESS);
      }

      setIsAdding(false);
      setEditingProfile(null);
      setFormData({
        name: '',
        diagonalInch: 15.6,
        screenWidth: 1920,
        screenHeight: 1080,
      });
      loadProfiles();
    } catch (error) {
      showSnackbar('Có lỗi xảy ra', SNACKBAR_SEVERITY.ERROR);
    }
  };

  const handleEdit = (profile: DeviceProfile) => {
    setEditingProfile(profile);
    setFormData({
      name: profile.name,
      diagonalInch: profile.diagonalInch,
      screenWidth: profile.screenWidth,
      screenHeight: profile.screenHeight,
    });
    setIsAdding(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Bạn có chắc muốn xóa thiết bị này?')) {
      try {
        deleteDeviceProfile(id);
        showSnackbar('Xóa thiết bị thành công', SNACKBAR_SEVERITY.SUCCESS);
        loadProfiles();
      } catch (error) {
        showSnackbar('Có lỗi khi xóa thiết bị', SNACKBAR_SEVERITY.ERROR);
      }
    }
  };

  const handleSetDefault = (id: string) => {
    setDefaultDeviceProfile(id);
    loadProfiles();
  };

  const handleSelect = (profile: DeviceProfile) => {
    onSelectProfile(profile);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Quản lý thiết bị
        <Typography variant="body2" color="text.secondary">
          Lưu thông tin màn hình để sử dụng lại cho các lần sau
        </Typography>
      </DialogTitle>

      <DialogContent>
        {!isAdding ? (
          <>
            <Button
              startIcon={<AddIcon />}
              variant="outlined"
              fullWidth
              onClick={() => setIsAdding(true)}
              sx={{ mb: 2 }}
            >
              Thêm thiết bị mới
            </Button>

            {profiles.length === 0 ? (
              <Alert severity="info">
                Chưa có thiết bị nào được lưu. Thêm thiết bị đầu tiên để sử dụng lại cho các lần
                sau.
              </Alert>
            ) : (
              <List>
                {profiles.map((profile) => (
                  <ListItem
                    key={profile.id}
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      mb: 1,
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                    onClick={() => handleSelect(profile)}
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          {profile.name}
                          {profile.isDefault && (
                            <Chip label="Mặc định" size="small" color="primary" />
                          )}
                        </Box>
                      }
                      secondary={
                        <>
                          {profile.diagonalInch}" - {profile.screenWidth}x{profile.screenHeight}
                          <br />
                          Dùng lần cuối: {new Date(profile.lastUsed).toLocaleDateString('vi-VN')}
                        </>
                      }
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSetDefault(profile.id);
                        }}
                        sx={{ mr: 1 }}
                      >
                        {profile.isDefault ? <StarIcon color="primary" /> : <StarBorderIcon />}
                      </IconButton>
                      <IconButton
                        edge="end"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(profile);
                        }}
                        sx={{ mr: 1 }}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        edge="end"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(profile.id);
                        }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}
          </>
        ) : (
          <Box>
            <TextField
              fullWidth
              label="Tên thiết bị"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="VD: Laptop Dell, Màn hình văn phòng"
              sx={{ mb: 2 }}
            />

            <Button variant="outlined" onClick={handleDetectScreen} sx={{ mb: 2 }} fullWidth>
              Tự động phát hiện độ phân giải ({window.screen.width}x{window.screen.height})
            </Button>

            <TextField
              fullWidth
              label="Kích thước màn hình (inch)"
              type="number"
              value={formData.diagonalInch}
              onChange={(e) =>
                setFormData({ ...formData, diagonalInch: parseFloat(e.target.value) })
              }
              inputProps={{ step: 0.1, min: 10, max: 50 }}
              sx={{ mb: 2 }}
            />

            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <TextField
                fullWidth
                label="Độ phân giải ngang (px)"
                type="number"
                value={formData.screenWidth}
                onChange={(e) =>
                  setFormData({ ...formData, screenWidth: parseInt(e.target.value) })
                }
              />
              <TextField
                fullWidth
                label="Độ phân giải dọc (px)"
                type="number"
                value={formData.screenHeight}
                onChange={(e) =>
                  setFormData({ ...formData, screenHeight: parseInt(e.target.value) })
                }
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                onClick={() => {
                  setIsAdding(false);
                  setEditingProfile(null);
                }}
                fullWidth
              >
                Hủy
              </Button>
              <Button variant="contained" onClick={handleSave} fullWidth>
                {editingProfile ? 'Cập nhật' : 'Lưu'}
              </Button>
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Đóng</Button>
      </DialogActions>
    </Dialog>
  );
};

export default DeviceProfileManager;
