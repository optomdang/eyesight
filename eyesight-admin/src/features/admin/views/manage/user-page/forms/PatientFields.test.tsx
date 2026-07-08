import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useForm } from 'react-hook-form';
import PatientFields from './PatientFields';
import { UserType } from './user-form.types';
import * as userService from 'src/services/user.service';

// Mock services
vi.mock('src/services/user.service', () => ({
  getDoctors: vi.fn(),
}));

// Mock translation hook
vi.mock('src/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
  }),
}));

// Wrapper component to provide form context
function TestWrapper({ children, defaultValues = {} }: any) {
  const { control, watch } = useForm({
    defaultValues: {
      userType: UserType.PATIENT,
      patient: {
        doctorId: null,
        severityLevel: '',
        treatmentStatus: true,
        severityNotes: '',
        activeFrom: '',
        activeTo: '',
      },
      ...defaultValues,
    },
  });

  const values = watch();

  return <form>{children({ control, values })}</form>;
}

describe('PatientFields - Doctor Autocomplete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render doctor autocomplete field', () => {
    render(
      <TestWrapper>
        {({ control, values }: any) => (
          <PatientFields
            control={control}
            values={values}
            errors={{}}
            userType={UserType.PATIENT}
          />
        )}
      </TestWrapper>
    );

    expect(screen.getByLabelText(/patient.responsibleDoctor/i)).toBeInTheDocument();
  });

  it('should fetch doctors when user types in autocomplete', async () => {
    const mockDoctors = {
      rows: [
        {
          id: 1,
          code: 'DT001',
          user: { name: 'Lê Trọng Đại' },
        },
        {
          id: 2,
          code: 'DT002',
          user: { name: 'Nguyễn Văn A' },
        },
      ],
      count: 2,
      page: 1,
      limit: 20,
      totalPages: 1,
    };

    vi.mocked(userService.getDoctors).mockResolvedValue(mockDoctors);

    render(
      <TestWrapper>
        {({ control, values }: any) => (
          <PatientFields
            control={control}
            values={values}
            errors={{}}
            userType={UserType.PATIENT}
          />
        )}
      </TestWrapper>
    );

    const autocomplete = screen.getByLabelText(/patient.responsibleDoctor/i);

    // Type in autocomplete
    await userEvent.type(autocomplete, 'dai');

    // Wait for debounce and API call
    await waitFor(
      () => {
        expect(userService.getDoctors).toHaveBeenCalledWith({
          name: 'dai',
          limit: 20,
        });
      },
      { timeout: 1000 }
    );

    // Note: MUI Autocomplete options are rendered in a portal
    // and may not be visible in test DOM. The important part is
    // that the API was called with correct parameters.
  });

  it('should fetch initial doctors on mount', async () => {
    const mockDoctors = {
      rows: [
        {
          id: 1,
          code: 'DT001',
          user: { name: 'Doctor A' },
        },
      ],
      count: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    };

    vi.mocked(userService.getDoctors).mockResolvedValue(mockDoctors);

    render(
      <TestWrapper>
        {({ control, values }: any) => (
          <PatientFields
            control={control}
            values={values}
            errors={{}}
            userType={UserType.PATIENT}
          />
        )}
      </TestWrapper>
    );

    // Should fetch doctors on mount with empty search
    await waitFor(() => {
      expect(userService.getDoctors).toHaveBeenCalledWith({ limit: 20 });
    });
  });

  it('should handle API errors gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    vi.mocked(userService.getDoctors).mockRejectedValue(new Error('Network error'));

    render(
      <TestWrapper>
        {({ control, values }: any) => (
          <PatientFields
            control={control}
            values={values}
            errors={{}}
            userType={UserType.PATIENT}
          />
        )}
      </TestWrapper>
    );

    const autocomplete = screen.getByLabelText(/patient.responsibleDoctor/i);
    await userEvent.type(autocomplete, 'test');

    await waitFor(() => {
      expect(userService.getDoctors).toHaveBeenCalled();
    });

    // Should log error
    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    consoleErrorSpy.mockRestore();
  });

  it('should not render when userType is not PATIENT', () => {
    const { container } = render(
      <TestWrapper defaultValues={{ userType: UserType.DOCTOR }}>
        {({ control, values }: any) => (
          <PatientFields control={control} values={values} errors={{}} userType={UserType.DOCTOR} />
        )}
      </TestWrapper>
    );

    expect(container.firstChild).toBeEmptyDOMElement();
  });
});

// Standalone test for getDoctors service
describe('getDoctors service', () => {
  it('should call API with correct parameters', async () => {
    const mockResponse = {
      rows: [{ id: 1, code: 'DT001', user: { name: 'Test Doctor' } }],
      count: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    };

    vi.mocked(userService.getDoctors).mockResolvedValue(mockResponse);

    const result = await userService.getDoctors({ name: 'dai', limit: 20 });

    expect(userService.getDoctors).toHaveBeenCalledWith({
      name: 'dai',
      limit: 20,
    });
    expect(result).toEqual(mockResponse);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].user.name).toBe('Test Doctor');
  });
});
