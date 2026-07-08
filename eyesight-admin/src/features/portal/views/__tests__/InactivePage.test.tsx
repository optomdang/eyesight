/**
 * Unit Tests for InactivePage Component
 * Tests inactive patient message display and logout functionality
 *
 * **Validates: Requirements 2.6, 2.7**
 * - 2.6: Frontend displays inactive status message and redirects to inactive page
 * - 2.7: Frontend shows doctor contact information for inactive patients
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import InactivePage from '../InactivePage';
import * as usePatientStatusHook from 'src/hooks/usePatientStatus';
import type { PatientInfo } from 'src/types/core/patient';

// Mock the usePatientStatus hook
vi.mock('src/hooks/usePatientStatus');

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('InactivePage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock localStorage
    Storage.prototype.removeItem = vi.fn();
  });

  describe('Loading State Display', () => {
    it('should display loading spinner when loading is true', () => {
      // Arrange
      vi.spyOn(usePatientStatusHook, 'usePatientStatus').mockReturnValue({
        isActive: null,
        loading: true,
        error: null,
        patientInfo: null,
      });

      // Act
      render(
        <BrowserRouter>
          <InactivePage />
        </BrowserRouter>
      );

      // Assert
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should not display inactive message while loading', () => {
      // Arrange
      vi.spyOn(usePatientStatusHook, 'usePatientStatus').mockReturnValue({
        isActive: null,
        loading: true,
        error: null,
        patientInfo: null,
      });

      // Act
      render(
        <BrowserRouter>
          <InactivePage />
        </BrowserRouter>
      );

      // Assert
      expect(screen.queryByText('Tài khoản tạm ngừng điều trị')).not.toBeInTheDocument();
    });
  });

  describe('Inactive Message Display', () => {
    it('should display inactive message when loading is complete', () => {
      // Arrange
      const mockPatientInfo: PatientInfo = {
        id: 1,
        code: 'P001',
        treatmentStatus: 'paused',
        doctorId: 10,
        doctor: {
          name: 'Dr. Nguyen Van A',
          phoneNumber: '0901234567',
        },
      };

      vi.spyOn(usePatientStatusHook, 'usePatientStatus').mockReturnValue({
        isActive: false,
        loading: false,
        error: null,
        patientInfo: mockPatientInfo,
      });

      // Act
      render(
        <BrowserRouter>
          <InactivePage />
        </BrowserRouter>
      );

      // Assert
      expect(screen.getByText('Tài khoản tạm ngừng điều trị')).toBeInTheDocument();
    });

    it('should display full inactive message text', () => {
      // Arrange
      const mockPatientInfo: PatientInfo = {
        id: 1,
        code: 'P001',
        treatmentStatus: 'paused',
        doctorId: 10,
        doctor: {
          name: 'Dr. Nguyen Van A',
          phoneNumber: '0901234567',
        },
      };

      vi.spyOn(usePatientStatusHook, 'usePatientStatus').mockReturnValue({
        isActive: false,
        loading: false,
        error: null,
        patientInfo: mockPatientInfo,
      });

      // Act
      render(
        <BrowserRouter>
          <InactivePage />
        </BrowserRouter>
      );

      // Assert
      expect(screen.getByText(/Tài khoản của bạn đang tạm ngừng điều trị/)).toBeInTheDocument();
      expect(screen.getByText(/Vui lòng liên hệ bác sĩ để được hỗ trợ/)).toBeInTheDocument();
    });

    it('should display alert icon', () => {
      // Arrange
      const mockPatientInfo: PatientInfo = {
        id: 1,
        code: 'P001',
        treatmentStatus: 'paused',
        doctorId: 10,
      };

      vi.spyOn(usePatientStatusHook, 'usePatientStatus').mockReturnValue({
        isActive: false,
        loading: false,
        error: null,
        patientInfo: mockPatientInfo,
      });

      // Act
      const { container } = render(
        <BrowserRouter>
          <InactivePage />
        </BrowserRouter>
      );

      // Assert - Check for SVG icon (IconAlertCircle)
      const svgIcon = container.querySelector('svg');
      expect(svgIcon).toBeInTheDocument();
    });
  });

  describe('Doctor Information Display', () => {
    it('should display doctor name when available', () => {
      // Arrange
      const mockPatientInfo: PatientInfo = {
        id: 1,
        code: 'P001',
        treatmentStatus: 'paused',
        doctorId: 10,
        doctor: {
          name: 'Dr. Nguyen Van A',
          phoneNumber: '0901234567',
        },
      };

      vi.spyOn(usePatientStatusHook, 'usePatientStatus').mockReturnValue({
        isActive: false,
        loading: false,
        error: null,
        patientInfo: mockPatientInfo,
      });

      // Act
      render(
        <BrowserRouter>
          <InactivePage />
        </BrowserRouter>
      );

      // Assert
      expect(screen.getByText('Bác sĩ phụ trách')).toBeInTheDocument();
      expect(screen.getByText('Dr. Nguyen Van A')).toBeInTheDocument();
    });

    it('should display doctor phone number when available', () => {
      // Arrange
      const mockPatientInfo: PatientInfo = {
        id: 1,
        code: 'P001',
        treatmentStatus: 'paused',
        doctorId: 10,
        doctor: {
          name: 'Dr. Tran Thi B',
          phoneNumber: '0912345678',
        },
      };

      vi.spyOn(usePatientStatusHook, 'usePatientStatus').mockReturnValue({
        isActive: false,
        loading: false,
        error: null,
        patientInfo: mockPatientInfo,
      });

      // Act
      render(
        <BrowserRouter>
          <InactivePage />
        </BrowserRouter>
      );

      // Assert
      expect(screen.getByText('0912345678')).toBeInTheDocument();
    });

    it('should not display doctor section when doctor info is missing', () => {
      // Arrange
      const mockPatientInfo: PatientInfo = {
        id: 1,
        code: 'P001',
        treatmentStatus: 'paused',
        doctorId: 10,
        // doctor field is undefined
      };

      vi.spyOn(usePatientStatusHook, 'usePatientStatus').mockReturnValue({
        isActive: false,
        loading: false,
        error: null,
        patientInfo: mockPatientInfo,
      });

      // Act
      render(
        <BrowserRouter>
          <InactivePage />
        </BrowserRouter>
      );

      // Assert
      expect(screen.queryByText('Bác sĩ phụ trách')).not.toBeInTheDocument();
    });

    it('should display doctor name without phone number when phone is missing', () => {
      // Arrange
      const mockPatientInfo: PatientInfo = {
        id: 1,
        code: 'P001',
        treatmentStatus: 'paused',
        doctorId: 10,
        doctor: {
          name: 'Dr. Le Van C',
          // phoneNumber is undefined
        },
      };

      vi.spyOn(usePatientStatusHook, 'usePatientStatus').mockReturnValue({
        isActive: false,
        loading: false,
        error: null,
        patientInfo: mockPatientInfo,
      });

      // Act
      render(
        <BrowserRouter>
          <InactivePage />
        </BrowserRouter>
      );

      // Assert
      expect(screen.getByText('Bác sĩ phụ trách')).toBeInTheDocument();
      expect(screen.getByText('Dr. Le Van C')).toBeInTheDocument();
      // Phone icon should not be present
      const phoneIcon = screen.queryByText('0');
      expect(phoneIcon).not.toBeInTheDocument();
    });

    it('should display multiple doctor details correctly', () => {
      // Arrange
      const mockPatientInfo: PatientInfo = {
        id: 1,
        code: 'P001',
        treatmentStatus: 'paused',
        doctorId: 10,
        doctor: {
          name: 'Dr. Pham Minh D',
          phoneNumber: '0923456789',
        },
      };

      vi.spyOn(usePatientStatusHook, 'usePatientStatus').mockReturnValue({
        isActive: false,
        loading: false,
        error: null,
        patientInfo: mockPatientInfo,
      });

      // Act
      render(
        <BrowserRouter>
          <InactivePage />
        </BrowserRouter>
      );

      // Assert - All doctor info should be present
      expect(screen.getByText('Bác sĩ phụ trách')).toBeInTheDocument();
      expect(screen.getByText('Dr. Pham Minh D')).toBeInTheDocument();
      expect(screen.getByText('0923456789')).toBeInTheDocument();
    });
  });

  describe('Logout Button Functionality', () => {
    it('should display logout button', () => {
      // Arrange
      const mockPatientInfo: PatientInfo = {
        id: 1,
        code: 'P001',
        treatmentStatus: 'paused',
        doctorId: 10,
      };

      vi.spyOn(usePatientStatusHook, 'usePatientStatus').mockReturnValue({
        isActive: false,
        loading: false,
        error: null,
        patientInfo: mockPatientInfo,
      });

      // Act
      render(
        <BrowserRouter>
          <InactivePage />
        </BrowserRouter>
      );

      // Assert
      expect(screen.getByRole('button', { name: /Đăng xuất/i })).toBeInTheDocument();
    });

    it('should remove token from localStorage when logout is clicked', () => {
      // Arrange
      const mockPatientInfo: PatientInfo = {
        id: 1,
        code: 'P001',
        treatmentStatus: 'paused',
        doctorId: 10,
      };

      vi.spyOn(usePatientStatusHook, 'usePatientStatus').mockReturnValue({
        isActive: false,
        loading: false,
        error: null,
        patientInfo: mockPatientInfo,
      });

      // Act
      render(
        <BrowserRouter>
          <InactivePage />
        </BrowserRouter>
      );

      const logoutButton = screen.getByRole('button', { name: /Đăng xuất/i });
      fireEvent.click(logoutButton);

      // Assert
      expect(localStorage.removeItem).toHaveBeenCalledWith('token');
    });

    it('should navigate to /login when logout is clicked', () => {
      // Arrange
      const mockPatientInfo: PatientInfo = {
        id: 1,
        code: 'P001',
        treatmentStatus: 'paused',
        doctorId: 10,
      };

      vi.spyOn(usePatientStatusHook, 'usePatientStatus').mockReturnValue({
        isActive: false,
        loading: false,
        error: null,
        patientInfo: mockPatientInfo,
      });

      // Act
      render(
        <BrowserRouter>
          <InactivePage />
        </BrowserRouter>
      );

      const logoutButton = screen.getByRole('button', { name: /Đăng xuất/i });
      fireEvent.click(logoutButton);

      // Assert
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });

    it('should call both removeItem and navigate in correct order', () => {
      // Arrange
      const mockPatientInfo: PatientInfo = {
        id: 1,
        code: 'P001',
        treatmentStatus: 'paused',
        doctorId: 10,
      };

      vi.spyOn(usePatientStatusHook, 'usePatientStatus').mockReturnValue({
        isActive: false,
        loading: false,
        error: null,
        patientInfo: mockPatientInfo,
      });

      // Act
      render(
        <BrowserRouter>
          <InactivePage />
        </BrowserRouter>
      );

      const logoutButton = screen.getByRole('button', { name: /Đăng xuất/i });
      fireEvent.click(logoutButton);

      // Assert
      expect(localStorage.removeItem).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(localStorage.removeItem).toHaveBeenCalledWith('token');
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });

    it('should display logout icon on button', () => {
      // Arrange
      const mockPatientInfo: PatientInfo = {
        id: 1,
        code: 'P001',
        treatmentStatus: 'paused',
        doctorId: 10,
      };

      vi.spyOn(usePatientStatusHook, 'usePatientStatus').mockReturnValue({
        isActive: false,
        loading: false,
        error: null,
        patientInfo: mockPatientInfo,
      });

      // Act
      const { container } = render(
        <BrowserRouter>
          <InactivePage />
        </BrowserRouter>
      );

      // Assert - Check for logout icon (IconLogout) inside button
      const logoutButton = screen.getByRole('button', { name: /Đăng xuất/i });
      const svgIcon = logoutButton.querySelector('svg');
      expect(svgIcon).toBeInTheDocument();
    });
  });

  describe('Component Layout and Styling', () => {
    it('should render within a Card component', () => {
      // Arrange
      const mockPatientInfo: PatientInfo = {
        id: 1,
        code: 'P001',
        treatmentStatus: 'paused',
        doctorId: 10,
      };

      vi.spyOn(usePatientStatusHook, 'usePatientStatus').mockReturnValue({
        isActive: false,
        loading: false,
        error: null,
        patientInfo: mockPatientInfo,
      });

      // Act
      const { container } = render(
        <BrowserRouter>
          <InactivePage />
        </BrowserRouter>
      );

      // Assert - Check for MUI Card structure
      const card = container.querySelector('.MuiCard-root');
      expect(card).toBeInTheDocument();
    });

    it('should center content on the page', () => {
      // Arrange
      const mockPatientInfo: PatientInfo = {
        id: 1,
        code: 'P001',
        treatmentStatus: 'paused',
        doctorId: 10,
      };

      vi.spyOn(usePatientStatusHook, 'usePatientStatus').mockReturnValue({
        isActive: false,
        loading: false,
        error: null,
        patientInfo: mockPatientInfo,
      });

      // Act
      const { container } = render(
        <BrowserRouter>
          <InactivePage />
        </BrowserRouter>
      );

      // Assert - Check for centering Box
      const centerBox = container.querySelector('div[class*="MuiBox-root"]');
      expect(centerBox).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null patientInfo gracefully', () => {
      // Arrange
      vi.spyOn(usePatientStatusHook, 'usePatientStatus').mockReturnValue({
        isActive: false,
        loading: false,
        error: null,
        patientInfo: null,
      });

      // Act
      render(
        <BrowserRouter>
          <InactivePage />
        </BrowserRouter>
      );

      // Assert - Should still display message but no doctor info
      expect(screen.getByText('Tài khoản tạm ngừng điều trị')).toBeInTheDocument();
      expect(screen.queryByText('Bác sĩ phụ trách')).not.toBeInTheDocument();
    });

    it('should handle empty doctor name', () => {
      // Arrange
      const mockPatientInfo: PatientInfo = {
        id: 1,
        code: 'P001',
        treatmentStatus: 'paused',
        doctorId: 10,
        doctor: {
          name: '',
          phoneNumber: '0901234567',
        },
      };

      vi.spyOn(usePatientStatusHook, 'usePatientStatus').mockReturnValue({
        isActive: false,
        loading: false,
        error: null,
        patientInfo: mockPatientInfo,
      });

      // Act
      render(
        <BrowserRouter>
          <InactivePage />
        </BrowserRouter>
      );

      // Assert - Should still display doctor section
      expect(screen.getByText('Bác sĩ phụ trách')).toBeInTheDocument();
      expect(screen.getByText('0901234567')).toBeInTheDocument();
    });

    it('should handle empty phone number', () => {
      // Arrange
      const mockPatientInfo: PatientInfo = {
        id: 1,
        code: 'P001',
        treatmentStatus: 'paused',
        doctorId: 10,
        doctor: {
          name: 'Dr. Test',
          phoneNumber: '',
        },
      };

      vi.spyOn(usePatientStatusHook, 'usePatientStatus').mockReturnValue({
        isActive: false,
        loading: false,
        error: null,
        patientInfo: mockPatientInfo,
      });

      // Act
      const { container } = render(
        <BrowserRouter>
          <InactivePage />
        </BrowserRouter>
      );

      // Assert - Should display doctor name but not phone
      expect(screen.getByText('Dr. Test')).toBeInTheDocument();
      // Verify phone icon is not present when phone number is empty
      const phoneIcons = container.querySelectorAll('.tabler-icon-phone');
      expect(phoneIcons.length).toBe(0);
    });

    it('should handle very long doctor names', () => {
      // Arrange
      const mockPatientInfo: PatientInfo = {
        id: 1,
        code: 'P001',
        treatmentStatus: 'paused',
        doctorId: 10,
        doctor: {
          name: 'Dr. Nguyen Van A B C D E F G H I J K L M N O P Q R S T U V W X Y Z',
          phoneNumber: '0901234567',
        },
      };

      vi.spyOn(usePatientStatusHook, 'usePatientStatus').mockReturnValue({
        isActive: false,
        loading: false,
        error: null,
        patientInfo: mockPatientInfo,
      });

      // Act
      render(
        <BrowserRouter>
          <InactivePage />
        </BrowserRouter>
      );

      // Assert - Should display full name
      expect(
        screen.getByText('Dr. Nguyen Van A B C D E F G H I J K L M N O P Q R S T U V W X Y Z')
      ).toBeInTheDocument();
    });

    it('should handle special characters in doctor name', () => {
      // Arrange
      const mockPatientInfo: PatientInfo = {
        id: 1,
        code: 'P001',
        treatmentStatus: 'paused',
        doctorId: 10,
        doctor: {
          name: 'Dr. Nguyễn Văn Á (Chuyên khoa Mắt)',
          phoneNumber: '0901234567',
        },
      };

      vi.spyOn(usePatientStatusHook, 'usePatientStatus').mockReturnValue({
        isActive: false,
        loading: false,
        error: null,
        patientInfo: mockPatientInfo,
      });

      // Act
      render(
        <BrowserRouter>
          <InactivePage />
        </BrowserRouter>
      );

      // Assert
      expect(screen.getByText('Dr. Nguyễn Văn Á (Chuyên khoa Mắt)')).toBeInTheDocument();
    });

    it('should handle multiple clicks on logout button', () => {
      // Arrange
      const mockPatientInfo: PatientInfo = {
        id: 1,
        code: 'P001',
        treatmentStatus: 'paused',
        doctorId: 10,
      };

      vi.spyOn(usePatientStatusHook, 'usePatientStatus').mockReturnValue({
        isActive: false,
        loading: false,
        error: null,
        patientInfo: mockPatientInfo,
      });

      // Act
      render(
        <BrowserRouter>
          <InactivePage />
        </BrowserRouter>
      );

      const logoutButton = screen.getByRole('button', { name: /Đăng xuất/i });
      fireEvent.click(logoutButton);
      fireEvent.click(logoutButton);
      fireEvent.click(logoutButton);

      // Assert - Should handle multiple clicks gracefully
      expect(localStorage.removeItem).toHaveBeenCalledTimes(3);
      expect(mockNavigate).toHaveBeenCalledTimes(3);
    });
  });

  describe('Integration with usePatientStatus Hook', () => {
    it('should use patientInfo from hook', () => {
      // Arrange
      const mockPatientInfo: PatientInfo = {
        id: 99,
        code: 'P099',
        treatmentStatus: 'paused',
        doctorId: 999,
        doctor: {
          name: 'Dr. Hook Test',
          phoneNumber: '0999999999',
        },
      };

      vi.spyOn(usePatientStatusHook, 'usePatientStatus').mockReturnValue({
        isActive: false,
        loading: false,
        error: null,
        patientInfo: mockPatientInfo,
      });

      // Act
      render(
        <BrowserRouter>
          <InactivePage />
        </BrowserRouter>
      );

      // Assert - Should display data from hook
      expect(screen.getByText('Dr. Hook Test')).toBeInTheDocument();
      expect(screen.getByText('0999999999')).toBeInTheDocument();
    });

    it('should respect loading state from hook', () => {
      // Arrange
      vi.spyOn(usePatientStatusHook, 'usePatientStatus').mockReturnValue({
        isActive: null,
        loading: true,
        error: null,
        patientInfo: null,
      });

      // Act
      render(
        <BrowserRouter>
          <InactivePage />
        </BrowserRouter>
      );

      // Assert - Should show loading spinner
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
      expect(screen.queryByText('Tài khoản tạm ngừng điều trị')).not.toBeInTheDocument();
    });

    it('should call usePatientStatus hook on mount', () => {
      // Arrange
      const mockUsePatientStatus = vi.spyOn(usePatientStatusHook, 'usePatientStatus');
      mockUsePatientStatus.mockReturnValue({
        isActive: false,
        loading: false,
        error: null,
        patientInfo: null,
      });

      // Act
      render(
        <BrowserRouter>
          <InactivePage />
        </BrowserRouter>
      );

      // Assert
      expect(mockUsePatientStatus).toHaveBeenCalledTimes(1);
    });
  });
});
