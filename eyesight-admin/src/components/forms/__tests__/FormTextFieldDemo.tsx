import React from 'react';
import { useForm } from 'react-hook-form';
import { Box, Typography, Paper, Grid } from '@mui/material';
import FormTextField from '../FormTextField';

interface DemoFormData {
  name: string;
  email: string;
  dateOfBirth: string;
  phoneNumber: string;
}

/**
 * Demo component to showcase FormTextField date input fix
 * This demonstrates that date inputs automatically have shrinking labels
 */
const FormTextFieldDemo: React.FC = () => {
  const { control, watch } = useForm<DemoFormData>({
    defaultValues: {
      name: '',
      email: '',
      dateOfBirth: '',
      phoneNumber: '',
    },
  });

  const values = watch();

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        FormTextField Date Input Fix Demo
      </Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Before Fix Issues:
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          • Date input labels would overlap with placeholder/value • Labels wouldn't shrink
          automatically for date inputs • Required manual InputLabelProps={{ shrink: true }} for
          every date field
        </Typography>

        <Typography variant="h6" gutterBottom>
          After Fix Benefits:
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          • Date inputs automatically shrink labels (no manual prop needed) • Clean, consistent
          appearance across all date fields • Still supports custom InputLabelProps when needed
        </Typography>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Form Fields Demo
        </Typography>

        <Grid container spacing={2}>
          {/* Regular text input - no auto-shrink */}
          <Grid size={{ xs: 12, md: 6 }}>
            <FormTextField
              name="name"
              control={control}
              label="Full Name (text input)"
              type="text"
            />
            <Typography variant="caption" color="text.secondary">
              Text input - label shrinks only when focused/filled
            </Typography>
          </Grid>

          {/* Email input - no auto-shrink */}
          <Grid size={{ xs: 12, md: 6 }}>
            <FormTextField
              name="email"
              control={control}
              label="Email (email input)"
              type="email"
            />
            <Typography variant="caption" color="text.secondary">
              Email input - label shrinks only when focused/filled
            </Typography>
          </Grid>

          {/* Date input - AUTO-SHRINK! */}
          <Grid size={{ xs: 12, md: 6 }}>
            <FormTextField
              name="dateOfBirth"
              control={control}
              label="Date of Birth (auto-shrink)"
              type="date"
            />
            <Typography variant="caption" color="success.main">
              Date input - label automatically shrinks.
            </Typography>
          </Grid>

          {/* Phone input - no auto-shrink */}
          <Grid size={{ xs: 12, md: 6 }}>
            <FormTextField
              name="phoneNumber"
              control={control}
              label="Phone Number (tel input)"
              type="tel"
            />
            <Typography variant="caption" color="text.secondary">
              Tel input - label shrinks only when focused/filled
            </Typography>
          </Grid>
        </Grid>

        <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            Current Form Values:
          </Typography>
          <pre style={{ fontSize: '12px', margin: 0 }}>{JSON.stringify(values, null, 2)}</pre>
        </Box>
      </Paper>
    </Box>
  );
};

export default FormTextFieldDemo;
