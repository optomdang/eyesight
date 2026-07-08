import React, { useState, useEffect } from 'react';
import { useTranslation } from 'src/hooks/useTranslation';
import { useParams, useNavigate } from 'react-router-dom';
import { Typography, Box, Tabs, Tab, Grid, Button } from '@mui/material';
import { ArrowBack } from '@mui/icons-material';
import LoadingBoundary from 'src/components/shared/LoadingBoundary';
import PageContainer from 'src/components/container/PageContainer';
import * as PatientService from 'src/services/patient.service';
import * as ExamAssignmentService from 'src/services/exam-assignment.service';
import { DataTableProvider } from 'src/contexts/data-context/DataTableContext';

import ExamConfigTable from './components/ExamConfigTable';
import ExerciseConfigTable from './components/ExerciseConfigTable.tsx';
import type { ExamAssignment, Patient, Assignment } from 'src/types/core';
import ExamAssignmentForm from './forms/ExamConfigForm.tsx';
import TreatmentPlanTab from './TreatmentPlanTab';
import PatientExerciseDetail from './PatientExerciseDetail.tsx';
import MedicalRecordTab from './MedicalRecordTab';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`patient-tabpanel-${index}`}
      aria-labelledby={`patient-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 1 }}>{children}</Box>}
    </div>
  );
}

const PatientDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [examConfigs, setExamConfigs] = useState<ExamAssignment[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [examConfigLoading, setExamConfigLoading] = useState(true);
  const [assignmentLoading, setAssignmentLoading] = useState(true);

  const { t } = useTranslation();

  useEffect(() => {
    if (id) {
      const patientId = parseInt(id, 10);
      setLoading(true);

      // Fetch patient data
      PatientService.getPatient(patientId)
        .then((data) => {
          setPatient(data);
          setLoading(false);
        })
        .catch((error) => {
          console.error('Error fetching patient:', error);
          setLoading(false);
        });

      // Fetch exam configurations
      fetchExamConfigs(patientId);

      // Fetch exercise assignments
      fetchExerciseAssignments(patientId);
    }
  }, [id]);

  const fetchExamConfigs = async (patientId: number) => {
    try {
      setExamConfigLoading(true);

      // Fetch exam configurations
      const response = await ExamAssignmentService.getExamAssignmentsByPatient(patientId);
      setExamConfigs(response.rows);
    } catch (error) {
      console.error('Error fetching exam configs:', error);
      setExamConfigs([]);
    } finally {
      setExamConfigLoading(false);
    }
  };

  const fetchExerciseAssignments = async (patientId: number) => {
    try {
      setAssignmentLoading(true);

      // Fetch exercise assignments for the patient
      const response = await PatientService.getPatientAdminAssignments(patientId);
      setAssignments(response.rows || []);
    } catch (error) {
      console.error('Error fetching exercise assignments:', error);
      setAssignments([]);
    } finally {
      setAssignmentLoading(false);
    }
  };

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleBack = () => {
    navigate('/admin/patients');
  };

  const handleConfigSuccess = () => {
    // Refresh the exam configs and metrics after successful form submission
    if (id) {
      const patientId = parseInt(id, 10);
      fetchExamConfigs(patientId);
    }
  };

  const getExamTypeName = (type: string) => {
    switch (type) {
      case 'far':
        return t('patient.farVision', 'Thị lực xa');
      case 'near':
        return t('patient.nearVision', 'Thị lực gần');
      case 'contrast':
        return t('patient.contrastSensitivity', 'Độ tương phản');
      case 'stereopsis':
        return t('patient.stereoscopicVision', 'Thị giác lập thể');
      default:
        return type;
    }
  };

  return (
    <PageContainer
      title={t('patient.patientDetail', 'Chi tiết bệnh nhân')}
      description={t('patient.information', 'Thông tin chi tiết bệnh nhân')}
    >
      <Box sx={{ mb: 2 }}>
        <Button variant="outlined" startIcon={<ArrowBack />} onClick={handleBack} sx={{ mb: 2 }}>
          {t('patient.detail.backToList', 'Quay lại danh sách')}
        </Button>
        <Typography variant="h4" gutterBottom>
          {patient
            ? `${patient.user?.name} (${patient.code})`
            : t('patient.detail.loading', 'Đang tải...')}
        </Typography>
      </Box>

      <LoadingBoundary loading={loading} height="400px">
        <>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              aria-label="patient detail tabs"
              variant="scrollable"
              scrollButtons="auto"
            >
              <Tab label={t('admin.tabs.medicalRecord', 'BỆNH ÁN')} />
              <Tab label={t('admin.tabs.general', 'PHÁC ĐỒ ĐIỀU TRỊ')} />
              <Tab label={t('admin.tabs.treatmentPlan', 'THEO DÕI ĐIỀU TRỊ')} />
              <Tab label={t('admin.tabs.exerciseConfig', 'CẤU HÌNH BÀI TẬP')} />
              <Tab label={t('admin.tabs.examConfig', 'CẤU HÌNH BÀI KIỂM TRA')} />
            </Tabs>
          </Box>

          {/* Tab 0: BỆNH ÁN */}
          <TabPanel value={tabValue} index={0}>
            {patient && <MedicalRecordTab patient={patient} onPatientUpdated={setPatient} />}
          </TabPanel>

          {/* Tab 1: PHÁC ĐỒ ĐIỀU TRỊ */}
          <TabPanel value={tabValue} index={1}>
            <Grid container spacing={2}>
              <Grid size={12}>
                {patient && (
                  <ExamConfigTable
                    examConfigs={examConfigs}
                    patient={patient}
                    loading={examConfigLoading}
                  />
                )}
              </Grid>
              <Grid size={12} sx={{ mt: 2 }}>
                <ExerciseConfigTable assignments={assignments} loading={assignmentLoading} />
              </Grid>
            </Grid>
          </TabPanel>

          {/* Tab 2: THEO DÕI ĐIỀU TRỊ */}
          <TabPanel value={tabValue} index={2}>
            {patient && <TreatmentPlanTab patient={patient} getExamTypeName={getExamTypeName} />}
          </TabPanel>
          {/* Tab 3: CẤU HÌNH BÀI TẬP */}
          <TabPanel value={tabValue} index={3}>
            {patient && (
              <DataTableProvider
                endpoint={`exercise-assignments/patients/${patient.id}/assignments`}
              >
                <PatientExerciseDetail patient={patient} />
              </DataTableProvider>
            )}
          </TabPanel>

          {/* Tab 4: CẤU HÌNH BÀI KIỂM TRA */}
          <TabPanel value={tabValue} index={4}>
            {patient && <ExamAssignmentForm patient={patient} onSuccess={handleConfigSuccess} />}
          </TabPanel>
        </>
      </LoadingBoundary>
    </PageContainer>
  );
};

export default PatientDetailPage;
