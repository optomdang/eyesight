import { FC } from 'react';
import { Box, Typography, Card, CardContent, Button, CircularProgress } from '@mui/material';
import { IconAlertCircle, IconLogout, IconPhone } from '@tabler/icons-react';
import { usePatientStatus } from 'src/hooks/usePatientStatus';
import useAuth from 'src/contexts/authGuard/useAuth';

/**
 * Display support information for inactive patient accounts.
 */
export const InactivePage: FC = () => {
  const { logout } = useAuth();
  const { patientInfo, loading } = usePatientStatus();

  const handleLogout = () => {
    void logout();
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          bgcolor: 'background.default',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        bgcolor: 'background.default',
        p: { xs: 2, sm: 3 },
      }}
    >
      <Card
        sx={{
          maxWidth: 500,
          width: '100%',
          boxShadow: 3,
        }}
      >
        <CardContent
          sx={{
            textAlign: 'center',
            p: { xs: 3, sm: 4 },
          }}
        >
          {/* Alert Icon */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              mb: 2,
            }}
          >
            <IconAlertCircle
              size={64}
              style={{ color: '#ff9800' }} // warning color
            />
          </Box>

          {/* Title */}
          <Typography
            variant="h4"
            sx={{
              mt: 2,
              mb: 1,
              fontWeight: 600,
              fontSize: { xs: '1.5rem', sm: '2rem' },
            }}
          >
            Tài khoản tạm ngừng điều trị
          </Typography>

          {/* Description */}
          <Typography
            variant="body1"
            color="text.secondary"
            sx={{
              mb: 3,
              fontSize: { xs: '0.875rem', sm: '1rem' },
            }}
          >
            Tài khoản của bạn đang tạm ngừng điều trị. Vui lòng liên hệ bác sĩ để được hỗ trợ.
          </Typography>

          {/* Doctor Information */}
          {patientInfo?.doctor && (
            <Box
              sx={{
                mb: 3,
                p: 2,
                bgcolor: 'grey.50',
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'grey.200',
              }}
            >
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                Bác sĩ phụ trách
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 600,
                  mb: 1,
                }}
              >
                {patientInfo.doctor.name}
              </Typography>
              {patientInfo.doctor.phoneNumber && (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 0.5,
                  }}
                >
                  <IconPhone size={18} />
                  <Typography variant="body2" color="primary" sx={{ fontWeight: 500 }}>
                    {patientInfo.doctor.phoneNumber}
                  </Typography>
                </Box>
              )}
            </Box>
          )}

          {/* Logout Button */}
          <Button
            variant="outlined"
            startIcon={<IconLogout />}
            onClick={handleLogout}
            fullWidth
            sx={{
              py: 1.5,
              fontSize: { xs: '0.875rem', sm: '1rem' },
            }}
          >
            Đăng xuất
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
};

export default InactivePage;
