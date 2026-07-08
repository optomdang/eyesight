import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmProvider, useConfirm } from '../useConfirm';

// Test component that uses useConfirm hook
const TestComponent = () => {
  const { confirm } = useConfirm();

  const handleClick = async () => {
    const result = await confirm({
      title: 'Test Confirmation',
      message: 'Are you sure?',
      confirmText: 'Yes',
      cancelText: 'No',
    });

    // Display result for testing
    const resultDiv = document.createElement('div');
    resultDiv.setAttribute('data-testid', 'result');
    resultDiv.textContent = String(result);
    document.body.appendChild(resultDiv);
  };

  return (
    <button onClick={handleClick} data-testid="trigger-button">
      Trigger Confirm
    </button>
  );
};

describe('useConfirm Hook', () => {
  beforeEach(() => {
    // Clean up any leftover elements
    document.body.innerHTML = '';
  });

  it('should show confirmation dialog when triggered', async () => {
    // Arrange
    render(
      <ConfirmProvider>
        <TestComponent />
      </ConfirmProvider>
    );

    // Act
    const triggerButton = screen.getByTestId('trigger-button');
    await userEvent.click(triggerButton);

    // Assert
    await waitFor(() => {
      expect(screen.getByText('Test Confirmation')).toBeInTheDocument();
      expect(screen.getByText('Are you sure?')).toBeInTheDocument();
      expect(screen.getByText('Yes')).toBeInTheDocument();
      expect(screen.getByText('No')).toBeInTheDocument();
    });
  });

  it('should resolve true when confirm button is clicked', async () => {
    // Arrange
    render(
      <ConfirmProvider>
        <TestComponent />
      </ConfirmProvider>
    );

    // Act
    const triggerButton = screen.getByTestId('trigger-button');
    await userEvent.click(triggerButton);

    await waitFor(() => {
      expect(screen.getByText('Yes')).toBeInTheDocument();
    });

    const confirmButton = screen.getByText('Yes');
    await userEvent.click(confirmButton);

    // Assert
    await waitFor(() => {
      const result = screen.getByTestId('result');
      expect(result.textContent).toBe('true');
    });
  });

  it('should resolve false when cancel button is clicked', async () => {
    // Arrange
    render(
      <ConfirmProvider>
        <TestComponent />
      </ConfirmProvider>
    );

    // Act
    const triggerButton = screen.getByTestId('trigger-button');
    await userEvent.click(triggerButton);

    await waitFor(() => {
      expect(screen.getByText('No')).toBeInTheDocument();
    });

    const cancelButton = screen.getByText('No');
    await userEvent.click(cancelButton);

    // Assert
    await waitFor(() => {
      const result = screen.getByTestId('result');
      expect(result.textContent).toBe('false');
    });
  });

  it('should close dialog after confirmation', async () => {
    // Arrange
    render(
      <ConfirmProvider>
        <TestComponent />
      </ConfirmProvider>
    );

    // Act
    const triggerButton = screen.getByTestId('trigger-button');
    await userEvent.click(triggerButton);

    await waitFor(() => {
      expect(screen.getByText('Test Confirmation')).toBeInTheDocument();
    });

    const confirmButton = screen.getByText('Yes');
    await userEvent.click(confirmButton);

    // Assert
    await waitFor(() => {
      expect(screen.queryByText('Test Confirmation')).not.toBeInTheDocument();
    });
  });
});
