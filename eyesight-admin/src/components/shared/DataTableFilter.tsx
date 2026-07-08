import React, { useState, ReactNode } from 'react';
import {
  Accordion,
  AccordionActions,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Grid,
  Typography,
  SxProps,
  Theme,
} from '@mui/material';
import { IconChevronDown } from '@tabler/icons-react';
import useDataTable from 'src/contexts/data-context/useDataTable';
import { useTranslation } from 'src/hooks/useTranslation';
import { FilterTable } from 'src/types/core';

export interface FilterField<T = any> {
  name: keyof T;
  component: ReactNode;
  /** Optional wrapper sx when `inline` is true */
  sx?: SxProps<Theme>;
}

interface DataTableFilterProps<T extends Record<string, any>> {
  fields: FilterField<T>[];
  initialValues: T;
  title?: string;
  defaultExpanded?: boolean;
  inline?: boolean;
  onBeforeSubmit?: (values: T) => FilterTable;
  gridColumns?: {
    xs?: number;
    sm?: number;
    md?: number;
  };
  /** Extra controls rendered after Reset (inline mode only) */
  trailingActions?: ReactNode;
}

export function DataTableFilter<T extends Record<string, any>>({
  fields,
  initialValues,
  title,
  defaultExpanded = false,
  inline = false,
  onBeforeSubmit,
  gridColumns = { xs: 12, sm: 6 },
  trailingActions,
}: DataTableFilterProps<T>) {
  const { t } = useTranslation();
  const { searchData } = useDataTable<any>();
  const [filters, setFilters] = useState<T>(initialValues);

  const handleChange = (name: keyof T, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const buildCleanFilters = (): FilterTable => {
    const clean: FilterTable = {};

    Object.entries(filters).forEach(([key, value]) => {
      const trimmedValue = typeof value === 'string' ? value.trim() : value;
      if (trimmedValue !== '' && trimmedValue != null) {
        clean[key] = trimmedValue;
      }
    });

    return onBeforeSubmit ? onBeforeSubmit(filters) : clean;
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e?.preventDefault) e.preventDefault();
    searchData(buildCleanFilters());
  };

  const handleReset = () => {
    setFilters(initialValues);
    searchData({});
  };

  const renderField = (field: FilterField<T>) => {
    if (!React.isValidElement(field.component)) return field.component;

    const element = field.component as React.ReactElement<any>;
    const componentProps = element.props ?? {};
    const isAutocomplete =
      Array.isArray(componentProps.options) &&
      typeof componentProps.getOptionLabel === 'function';

    const componentValue = isAutocomplete
      ? componentProps.options.find(
          (option: any) => option?.value === filters[field.name]
        ) || null
      : filters[field.name];

    return React.cloneElement(element, {
      value: componentValue,
      onChange: (event: any, selectedOption: any) => {
        if (isAutocomplete) {
          const selectedValue = selectedOption?.value ?? '';
          handleChange(field.name, selectedValue);
          return;
        }
        const value = event?.target?.value ?? selectedOption ?? event;
        handleChange(field.name, value);
      },
    });
  };

  if (inline) {
    return (
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          mb: 2,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-end',
          gap: 1.5,
          width: '100%',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'flex-end',
            gap: 1.5,
            flex: 1,
            minWidth: 0,
          }}
        >
          {fields.map((field) => (
            <Box
              key={String(field.name)}
              sx={{
                pt: 1.25,
                overflow: 'visible',
                ...(field.sx ?? { flex: '1 1 160px', minWidth: 140 }),
              }}
            >
              {renderField(field)}
            </Box>
          ))}
          <Button variant="contained" color="primary" size="small" type="submit" sx={{ mb: 0.25 }}>
            {t('common.search', 'Tìm kiếm')}
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            size="small"
            onClick={handleReset}
            sx={{ mb: 0.25 }}
          >
            {t('filter.reset', 'Đặt lại')}
          </Button>
        </Box>
        {trailingActions && (
          <Box
            sx={{
              flexShrink: 0,
              ml: { xs: 0, sm: 'auto' },
              width: { xs: '100%', sm: 'auto' },
              display: 'flex',
              justifyContent: { xs: 'flex-start', sm: 'flex-end' },
              pb: 0.25,
            }}
          >
            {trailingActions}
          </Box>
        )}
      </Box>
    );
  }

  return (
    <Accordion sx={{ mb: 1 }} disableGutters defaultExpanded={defaultExpanded}>
      <AccordionSummary
        expandIcon={<IconChevronDown size="16" />}
        aria-controls="filter-content"
        id="filter-header"
      >
        <Typography variant="h6">{title || t('filter.search', 'Tìm kiếm')}</Typography>
      </AccordionSummary>

      <AccordionDetails>
        <Grid container spacing={2}>
          {fields.map((field) => (
            <Grid key={String(field.name)} size={gridColumns}>
              {renderField(field)}
            </Grid>
          ))}
        </Grid>
      </AccordionDetails>

      <AccordionActions>
        <Grid container justifyContent="flex-end" spacing={1}>
          <Grid>
            <Button variant="contained" color="primary" size="small" onClick={handleSubmit}>
              {t('common.search', 'Tìm kiếm')}
            </Button>
          </Grid>
          <Grid>
            <Button variant="outlined" color="secondary" size="small" onClick={handleReset}>
              {t('filter.reset', 'Đặt lại')}
            </Button>
          </Grid>
        </Grid>
      </AccordionActions>
    </Accordion>
  );
}
