import { render, screen } from '@testing-library/react';
import { useForm } from 'react-hook-form';
import FormTextField from '../FormTextField';

// Test component wrapper
const TestFormTextField = ({
  type = 'text',
  InputLabelProps,
}: {
  type?: string;
  InputLabelProps?: any;
}) => {
  const { control } = useForm({
    defaultValues: { testField: '' },
  });

  return (
    <FormTextField
      name="testField"
      control={control}
      label="Test Field"
      type={type}
      InputLabelProps={InputLabelProps}
    />
  );
};

describe('FormTextField', () => {
  it('should render text input correctly', () => {
    render(<TestFormTextField />);
    expect(screen.getByLabelText('Test Field')).toBeInTheDocument();
  });

  it('should auto-shrink label for date inputs', () => {
    render(<TestFormTextField type="date" />);
    const input = screen.getByLabelText('Test Field');
    expect(input).toHaveAttribute('type', 'date');

    // Check if the label has shrink behavior by looking at data-shrink attribute
    const label = screen
      .getByLabelText('Test Field')
      .closest('.MuiFormControl-root')
      ?.querySelector('label');
    expect(label).toHaveAttribute('data-shrink', 'true');
  });

  it('should respect custom InputLabelProps for date inputs', () => {
    render(<TestFormTextField type="date" InputLabelProps={{ shrink: false }} />);
    const input = screen.getByLabelText('Test Field');
    expect(input).toHaveAttribute('type', 'date');

    // Custom shrink: false should override auto-shrink
    const label = screen
      .getByLabelText('Test Field')
      .closest('.MuiFormControl-root')
      ?.querySelector('label');
    expect(label).toHaveAttribute('data-shrink', 'false');
  });

  it('should not auto-shrink label for non-date inputs', () => {
    render(<TestFormTextField type="text" />);
    const label = screen
      .getByLabelText('Test Field')
      .closest('.MuiFormControl-root')
      ?.querySelector('label');
    expect(label).toHaveAttribute('data-shrink', 'false');
  });

  it('should pass through InputLabelProps for non-date inputs', () => {
    render(<TestFormTextField type="text" InputLabelProps={{ shrink: true }} />);
    const label = screen
      .getByLabelText('Test Field')
      .closest('.MuiFormControl-root')
      ?.querySelector('label');
    expect(label).toHaveAttribute('data-shrink', 'true');
  });
});
