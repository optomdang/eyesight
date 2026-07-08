import React, { useState, useEffect, ChangeEvent } from 'react';
import { Grid, Autocomplete, TextField } from '@mui/material';
import CustomTextField from 'src/components/forms/theme-elements/CustomTextField';
import { useTranslation } from 'src/hooks/useTranslation';
import { shouldShowFieldError } from 'src/utils';
import { useCountries } from 'src/hooks/useCountries';

// Vietnam Provinces API: https://provinces.open-api.vn/api/
const PROVINCES_API = 'https://provinces.open-api.vn/api';

interface Province {
  code: number;
  name: string;
  name_en?: string;
  full_name?: string;
  full_name_en?: string;
  code_name?: string;
}

interface Ward {
  code: number;
  name: string;
  name_en?: string;
  full_name?: string;
  full_name_en?: string;
  code_name?: string;
  district_code: number;
}

export interface AddressValue {
  country?: string;
  province?: string;
  provinceCode?: number;
  ward?: string;
  wardCode?: number;
  specificAddress?: string;
}

interface AddressFieldsProps {
  value?: AddressValue | string; // Support both object and legacy string
  onChange: (address: AddressValue) => void;
  errors?: {
    country?: string;
    province?: string;
    ward?: string;
    specificAddress?: string;
  };
  touched?: {
    country?: boolean;
    province?: boolean;
    ward?: boolean;
    specificAddress?: boolean;
  };
  isSubmitted?: boolean;
  disabled?: boolean;
}

export const AddressFields: React.FC<AddressFieldsProps> = ({
  value,
  onChange,
  errors = {},
  touched = {},
  isSubmitted = false,
  disabled = false,
}) => {
  const { t } = useTranslation();

  // Parse value - support legacy string format
  const addressValue: AddressValue =
    typeof value === 'string'
      ? { specificAddress: value, country: 'Vietnam' }
      : value || { country: 'Vietnam' };

  const { options: countryOptions, loading: countriesLoading } = useCountries();
  const [provinces, setProvinces] = useState<Province[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch provinces on mount if Vietnam
  useEffect(() => {
    if (addressValue.country === 'Vietnam') {
      fetchProvinces();
    }
  }, [addressValue.country]);

  // Fetch wards when province changes
  useEffect(() => {
    if (addressValue.country === 'Vietnam' && addressValue.provinceCode) {
      fetchWards(addressValue.provinceCode);
    } else {
      setWards([]);
    }
  }, [addressValue.provinceCode]);

  const fetchProvinces = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${PROVINCES_API}/v2/p/`);
      const data = await response.json();
      setProvinces(data);
    } catch (error) {
      console.error('Error fetching provinces:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWards = async (provinceCode: number) => {
    try {
      setLoading(true);
      const response = await fetch(`${PROVINCES_API}/v2/p/${provinceCode}?depth=2`);
      const data = await response.json();

      // API v2 returns wards directly at root level
      setWards(data.wards || []);
    } catch (error) {
      console.error('Error fetching wards:', error);
      setWards([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCountryChange = (country: string) => {
    onChange({
      country,
      province: undefined,
      provinceCode: undefined,
      ward: undefined,
      wardCode: undefined,
      specificAddress: addressValue.specificAddress,
    });
  };

  const handleProvinceChange = (provinceCode: number) => {
    const province = provinces.find((p) => p.code === provinceCode);
    onChange({
      ...addressValue,
      province: province?.name,
      provinceCode,
      ward: undefined,
      wardCode: undefined,
    });
  };

  const handleWardChange = (wardCode: number) => {
    const ward = wards.find((w) => w.code === wardCode);
    onChange({
      ...addressValue,
      ward: ward?.name,
      wardCode,
    });
  };

  const handleSpecificAddressChange = (specificAddress: string) => {
    onChange({
      ...addressValue,
      specificAddress,
    });
  };

  return (
    <>
      {/* Country Selection - Autocomplete */}
      <Grid size={{ xs: 12, sm: 6 }}>
        <Autocomplete
          id="address.country"
          options={countryOptions}
          getOptionLabel={(opt) => opt.label}
          value={countryOptions.find((o) => o.value === addressValue.country) || null}
          onChange={(_, newValue) => handleCountryChange(newValue?.value || '')}
          disabled={disabled || loading || countriesLoading}
          renderInput={(params) => (
            <TextField
              {...params}
              label={t('address.country', 'Quốc gia')}
              size="small"
              error={shouldShowFieldError(errors.country, touched.country)}
              helperText={
                shouldShowFieldError(errors.country, touched.country) ? errors.country : ''
              }
            />
          )}
          renderOption={(props, opt) => {
            const { key, ...otherProps } = props as React.HTMLAttributes<HTMLLIElement> & {
              key: string;
            };
            return (
              <li key={opt.cca2} {...otherProps}>
                {opt.cca2 === 'VN' ? <strong>{opt.label}</strong> : opt.label}
              </li>
            );
          }}
          isOptionEqualToValue={(opt, val) => opt.cca2 === val.cca2}
          noOptionsText={t('common.noOptions', 'Không có dữ liệu')}
          loadingText={t('common.loading', 'Đang tải...')}
          loading={countriesLoading}
        />
      </Grid>

      {/* Vietnam - Province/City */}
      {addressValue.country === 'Vietnam' && (
        <Grid size={{ xs: 12, sm: 6 }}>
          <Autocomplete
            id="address.province"
            options={provinces}
            getOptionLabel={(option) => {
              if (typeof option === 'number') {
                return provinces.find((p) => p.code === option)?.name || '';
              }
              return option.name;
            }}
            value={provinces.find((p) => p.code === addressValue.provinceCode) || null}
            onChange={(_, newValue) => {
              if (newValue) {
                handleProvinceChange(newValue.code);
              }
            }}
            disabled={disabled || loading}
            renderInput={(params) => (
              <TextField
                {...params}
                label={t('address.province', 'Tỉnh/Thành phố')}
                size="small"
                error={shouldShowFieldError(errors.province, touched.province)}
                helperText={
                  shouldShowFieldError(errors.province, touched.province) ? errors.province : ''
                }
              />
            )}
            isOptionEqualToValue={(option, value) => option.code === value.code}
            noOptionsText={t('common.noOptions', 'Không có dữ liệu')}
            loadingText={t('common.loading', 'Đang tải...')}
            loading={loading}
          />
        </Grid>
      )}

      {/* Vietnam - Ward (filter by Province) */}
      {addressValue.country === 'Vietnam' && addressValue.provinceCode && (
        <Grid size={{ xs: 12, sm: 6 }}>
          <Autocomplete
            id="address.ward"
            options={wards}
            getOptionLabel={(option) => {
              if (typeof option === 'number') {
                return wards.find((w) => w.code === option)?.name || '';
              }
              return option.name;
            }}
            value={wards.find((w) => w.code === addressValue.wardCode) || null}
            onChange={(_, newValue) => {
              if (newValue) {
                handleWardChange(newValue.code);
              }
            }}
            disabled={disabled || loading}
            renderInput={(params) => (
              <TextField
                {...params}
                label={t('address.ward', 'Phường/Xã')}
                size="small"
                error={shouldShowFieldError(errors.ward, touched.ward)}
                helperText={shouldShowFieldError(errors.ward, touched.ward) ? errors.ward : ''}
              />
            )}
            isOptionEqualToValue={(option, value) => option.code === value.code}
            noOptionsText={t('common.noOptions', 'Không có dữ liệu')}
            loadingText={t('common.loading', 'Đang tải...')}
            loading={loading}
          />
        </Grid>
      )}

      {/* Specific Address (Street, House Number) */}
      <Grid size={{ xs: 12 }}>
        <CustomTextField
          fullWidth
          id="address.specificAddress"
          size="small"
          label={t('address.specificAddress', 'Địa chỉ cụ thể (Số nhà, đường...)')}
          value={addressValue.specificAddress || ''}
          onChange={(e: ChangeEvent<HTMLInputElement>) =>
            handleSpecificAddressChange(e.target.value)
          }
          disabled={disabled}
          error={shouldShowFieldError(errors.specificAddress, touched.specificAddress)}
          helperText={
            shouldShowFieldError(errors.specificAddress, touched.specificAddress)
              ? errors.specificAddress
              : ''
          }
          placeholder={
            addressValue.country === 'Vietnam'
              ? t('address.specificAddressPlaceholder', 'VD: 123 Nguyễn Văn Linh')
              : t('address.fullAddressPlaceholder', 'Nhập địa chỉ đầy đủ')
          }
        />
      </Grid>
    </>
  );
};

export default AddressFields;
