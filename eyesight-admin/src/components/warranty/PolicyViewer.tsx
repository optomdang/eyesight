import React from 'react';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import {
  WARRANTY_POLICY_SECTIONS,
  WARRANTY_POLICY_VERSION,
  E_SIGN_DISCLAIMER,
} from 'src/content/warrantyPolicy';

export interface PolicyViewerProps {
  policyVersion?: string;
  compact?: boolean;
}

const PolicyViewer: React.FC<PolicyViewerProps> = ({
  policyVersion = WARRANTY_POLICY_VERSION,
  compact = false,
}) => (
  <Paper variant="outlined" sx={{ p: compact ? 2 : 3 }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
      <Typography variant={compact ? 'subtitle1' : 'h6'} sx={{ fontWeight: 700 }}>
        Chính sách cam kết bảo hành D-VisUp
      </Typography>
      <Chip label={`Phiên bản ${policyVersion}`} size="small" variant="outlined" />
    </Box>

    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
      KHÔNG HIỆU QUẢ KHÔNG MẤT TIỀN — áp dụng có điều kiện cho gói Ultra và Ultimate.
    </Typography>

    {WARRANTY_POLICY_SECTIONS.map((section) => (
      <Box key={section.title} sx={{ mb: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
          {section.title}
        </Typography>
        <List dense disablePadding>
          {section.items.map((item) => (
            <ListItem key={item} disableGutters sx={{ alignItems: 'flex-start', py: 0.25 }}>
              <ListItemIcon sx={{ minWidth: 28, mt: 0.25 }}>
                <CheckCircleOutlineIcon fontSize="small" color="primary" />
              </ListItemIcon>
              <ListItemText
                primary={item}
                primaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
              />
            </ListItem>
          ))}
        </List>
      </Box>
    ))}

    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
      {E_SIGN_DISCLAIMER}
    </Typography>
  </Paper>
);

export default PolicyViewer;
