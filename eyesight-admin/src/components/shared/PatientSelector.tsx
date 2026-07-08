import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Checkbox,
  Typography,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Alert,
} from '@mui/material';
import { Search, Refresh } from '@mui/icons-material';
import { useTranslation } from 'src/hooks/useTranslation';
import { Patient } from 'src/types/core';
import useSnackbar from 'src/contexts/UseSnackbar';
import { SNACKBAR_SEVERITY } from 'src/utils/constant';
import { getData } from 'src/utils/request';

interface PatientSelectorProps {
  selectedPatientIds: number[];
  onSelectionChange: (patientIds: number[]) => void;
  title?: string;
  showSearch?: boolean;
  showRefresh?: boolean;
  maxHeight?: number;
  preSelectedPatients?: number[];
  disabled?: boolean;
}

const PatientSelector: React.FC<PatientSelectorProps> = ({
  selectedPatientIds,
  onSelectionChange,
  title,
  showSearch = true,
  showRefresh = true,
  maxHeight = 200,
  preSelectedPatients = [],
  disabled = false,
}) => {
  const { t } = useTranslation();
  const { showSnackbar } = useSnackbar();

  const [searchTerm, setSearchTerm] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);

  useEffect(() => {
    loadPatients();
  }, []);

  useEffect(() => {
    if (preSelectedPatients.length > 0) {
      onSelectionChange(preSelectedPatients);
    }
  }, [preSelectedPatients, onSelectionChange]);

  const loadPatients = async () => {
    try {
      const response = (await getData('/patients')) as { data: Patient[] };
      setPatients(response.data || []);
    } catch {
      showSnackbar(t('patient.loadError'), SNACKBAR_SEVERITY.ERROR);
    }
  };

  const handleRefresh = () => {
    loadPatients();
  };

  const handlePatientToggle = (patientId: number | undefined) => {
    if (!patientId || disabled) return;

    const newSelectedIds = selectedPatientIds.includes(patientId)
      ? selectedPatientIds.filter((id) => id !== patientId)
      : [...selectedPatientIds, patientId];

    onSelectionChange(newSelectedIds);
  };

  const filteredPatients = patients.filter(
    (patient) =>
      patient.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (patient.phoneNumber && patient.phoneNumber.includes(searchTerm))
  );

  const formatLastVisit = (patient: Patient) => {
    // Since Patient type doesn't have createdAt/updatedAt, use a default message
    if (patient.status) return patient.status;
    return t('patient.newPatient');
  };

  return (
    <Box>
      {title && (
        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
          {title}
        </Typography>
      )}

      {showSearch && (
        <Box sx={{ mb: 2 }}>
          <TextField
            fullWidth
            size="small"
            placeholder={t('patient.search.placeholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            disabled={disabled}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
              ...(showRefresh && {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={handleRefresh} size="small" disabled={disabled}>
                      <Refresh />
                    </IconButton>
                  </InputAdornment>
                ),
              }),
            }}
          />
        </Box>
      )}

      <Box
        sx={{
          maxHeight,
          overflow: 'auto',
          border: 1,
          borderColor: 'divider',
          borderRadius: 1,
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <List dense>
          {filteredPatients.map((patient) => (
            <ListItem
              key={patient.id}
              onClick={() => handlePatientToggle(patient.id)}
              sx={{
                py: 1,
                cursor: disabled ? 'default' : 'pointer',
                '&:hover': {
                  backgroundColor: disabled ? 'transparent' : 'action.hover',
                },
              }}
            >
              <ListItemIcon>
                <Checkbox
                  checked={patient.id ? selectedPatientIds.includes(patient.id) : false}
                  onChange={() => handlePatientToggle(patient.id)}
                  disabled={disabled}
                />
              </ListItemIcon>
              <ListItemText
                primary={`${patient.code} - ${patient.name || 'N/A'} - Age: ${patient.age || 'N/A'}`}
                secondary={formatLastVisit(patient)}
              />
            </ListItem>
          ))}
          {filteredPatients.length === 0 && (
            <ListItem>
              <ListItemText primary={t('patient.noResults')} />
            </ListItem>
          )}
        </List>
      </Box>

      {selectedPatientIds.length > 0 && (
        <Alert severity="info" sx={{ mt: 2 }}>
          {t('patient.assignment.selectedCount', { count: selectedPatientIds.length })}
        </Alert>
      )}
    </Box>
  );
};

export default PatientSelector;
