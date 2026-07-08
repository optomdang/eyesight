import dayjs from 'dayjs';

export const generateCode = (prefix: string): string => {
  // Use a prefix to indicate it's a product code
  // Format the current date as YYYYMMDD
  const datePart = dayjs().format('YYMMDD');
  // Generate a random string for uniqueness
  const uniquePart = Math.random().toString(36).substring(2, 5).toUpperCase();
  // Combine the prefix, date part, and the unique part
  return `${prefix}${datePart}${uniquePart}`;
};

export const formatAmount = (amount = 0): string => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const shouldShowFieldError = (
  fieldError: unknown,
  fieldTouched: unknown,
  isSubmitted = false
): boolean => Boolean(fieldError) && (Boolean(fieldTouched) || isSubmitted);

interface Address {
  specificAddress?: string;
  ward?: string;
  district?: string;
  province?: string;
  country?: string;
}

// Format address object to readable string
export const formatAddress = (address: string | Address | null | undefined): string => {
  if (!address) return '';

  let addressObj: Address = {};

  // If string, try to parse as JSON first
  if (typeof address === 'string') {
    try {
      addressObj = JSON.parse(address) as Address;
    } catch {
      // Not JSON, return as-is (legacy string format)
      return address;
    }
  } else {
    addressObj = address;
  }

  // Format object as readable address
  const parts: string[] = [];

  if (addressObj.specificAddress) parts.push(addressObj.specificAddress);
  if (addressObj.ward) parts.push(addressObj.ward);
  if (addressObj.district) parts.push(addressObj.district);
  if (addressObj.province) parts.push(addressObj.province);
  if (addressObj.country && addressObj.country !== 'Vietnam') parts.push(addressObj.country);

  return parts.join(', ') || '';
};
