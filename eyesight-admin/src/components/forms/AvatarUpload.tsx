import React, { useState, useRef } from 'react';
import {
  Box,
  Avatar,
  Button,
  IconButton,
  Typography,
  Stack,
  CircularProgress,
} from '@mui/material';
import { IconCamera, IconTrash, IconUpload } from '@tabler/icons-react';

interface AvatarUploadProps {
  value?: string; // Base64 string or URL
  onChange: (base64: string | null) => void;
  size?: number;
  disabled?: boolean;
  name?: string; // For display when no avatar
}

const AvatarUpload: React.FC<AvatarUploadProps> = ({
  value,
  onChange,
  size = 120,
  disabled = false,
  name = '',
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Vui lòng chọn file ảnh (JPG, PNG, GIF, WEBP)');
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setError('Kích thước ảnh không được vượt quá 5MB');
      return;
    }

    setError(null);
    setLoading(true);

    // Convert to base64
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;

      // Create image to check dimensions and compress if needed
      const img = new Image();
      img.onload = () => {
        // If image is too large, compress it
        const maxDimension = 800;
        let { width, height } = img;

        if (width > maxDimension || height > maxDimension) {
          const ratio = Math.min(maxDimension / width, maxDimension / height);
          width *= ratio;
          height *= ratio;
        }

        // Create canvas to resize
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to base64 with compression
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85);
          onChange(compressedBase64);
          setLoading(false);
        }
      };

      img.onerror = () => {
        setError('Không thể tải ảnh');
        setLoading(false);
      };

      img.src = base64;
    };

    reader.onerror = () => {
      setError('Không thể đọc file');
      setLoading(false);
    };

    reader.readAsDataURL(file);
  };

  const handleRemove = () => {
    onChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  // Get initials for avatar
  const getInitials = (name: string) => {
    return (
      name
        ?.split(' ')
        .map((word) => word.charAt(0))
        .join('')
        .toUpperCase()
        .slice(0, 2) || 'U'
    );
  };

  return (
    <Box>
      <Stack direction="column" alignItems="center" spacing={2}>
        {/* Avatar Display */}
        <Box position="relative">
          <Avatar
            src={value || undefined}
            sx={{
              width: size,
              height: size,
              fontSize: size / 3,
              bgcolor: value ? 'transparent' : 'primary.main',
              border: '4px solid',
              borderColor: 'divider',
            }}
          >
            {!value && getInitials(name)}
          </Avatar>

          {/* Camera overlay button */}
          {!disabled && (
            <IconButton
              onClick={handleClick}
              sx={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                bgcolor: 'primary.main',
                color: 'white',
                width: 36,
                height: 36,
                '&:hover': {
                  bgcolor: 'primary.dark',
                },
              }}
              size="small"
            >
              {loading ? <CircularProgress size={20} color="inherit" /> : <IconCamera size={20} />}
            </IconButton>
          )}
        </Box>

        {/* Upload/Remove buttons */}
        {!disabled && (
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<IconUpload size={16} />}
              onClick={handleClick}
              disabled={loading}
            >
              Tải ảnh lên
            </Button>
            {value && (
              <Button
                variant="outlined"
                size="small"
                color="error"
                startIcon={<IconTrash size={16} />}
                onClick={handleRemove}
                disabled={loading}
              >
                Xóa
              </Button>
            )}
          </Stack>
        )}

        {/* Error message */}
        {error && (
          <Typography variant="caption" color="error" textAlign="center">
            {error}
          </Typography>
        )}

        {/* Helper text */}
        {!disabled && !error && (
          <Typography variant="caption" color="text.secondary" textAlign="center">
            Chấp nhận JPG, PNG, GIF, WEBP. Tối đa 5MB.
          </Typography>
        )}

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
          disabled={disabled}
        />
      </Stack>
    </Box>
  );
};

export default AvatarUpload;
