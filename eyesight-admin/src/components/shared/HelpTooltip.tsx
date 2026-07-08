import React from 'react';
import { Box, Tooltip, TooltipProps, SxProps, Theme, Typography } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

export interface HelpTooltipProps {
  title: React.ReactNode;
  variant?: 'info' | 'help';
  placement?: TooltipProps['placement'];
  /** Extra sx on the icon */
  iconSx?: SxProps<Theme>;
}

/**
 * Inline help icon with tooltip — use for field/label explanations (not validation errors).
 */
export const HelpTooltip: React.FC<HelpTooltipProps> = ({
  title,
  variant = 'info',
  placement = 'top',
  iconSx,
}) => {
  const Icon = variant === 'help' ? HelpOutlineIcon : InfoOutlinedIcon;

  return (
    <Tooltip
      title={title}
      arrow
      placement={placement}
      enterTouchDelay={0}
      slotProps={{
        tooltip: { sx: { maxWidth: 280 } },
      }}
    >
      <Box
        component="span"
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          verticalAlign: 'middle',
          lineHeight: 0,
          flexShrink: 0,
        }}
      >
        <Icon
          fontSize="small"
          sx={{
            color: 'text.secondary',
            cursor: 'help',
            display: 'block',
            ...iconSx,
          }}
          aria-label="Trợ giúp"
        />
      </Box>
    </Tooltip>
  );
};

export interface LabelWithHelpProps {
  children: React.ReactNode;
  help: React.ReactNode;
  variant?: 'info' | 'help';
  placement?: TooltipProps['placement'];
  /** Gap between label and icon (theme spacing units) */
  gap?: number;
}

/**
 * Flex row: label text + HelpTooltip — for InputLabel, FormLabel, section titles.
 */
export const LabelWithHelp: React.FC<LabelWithHelpProps> = ({
  children,
  help,
  variant = 'info',
  placement = 'top',
  gap = 0.5,
}) => (
  <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap }}>
    {children}
    <HelpTooltip title={help} variant={variant} placement={placement} />
  </Box>
);

export interface TableHeaderWithHelpProps {
  children: React.ReactNode;
  help: React.ReactNode;
  placement?: TooltipProps['placement'];
}

/**
 * Table column header with tooltip on hover over the label text.
 */
export const TableHeaderWithHelp: React.FC<TableHeaderWithHelpProps> = ({
  children,
  help,
  placement = 'top',
}) => (
  <Tooltip
    title={
      typeof help === 'string' ? (
        <Typography
          variant="caption"
          sx={{ whiteSpace: 'normal', lineHeight: 1.45, display: 'block', maxWidth: 280 }}
        >
          {help}
        </Typography>
      ) : (
        help
      )
    }
    arrow
    placement={placement}
    enterTouchDelay={0}
    slotProps={{
      tooltip: { sx: { maxWidth: 280 } },
    }}
  >
    <Box
      component="span"
      sx={{
        display: 'inline-block',
        cursor: 'help',
        borderBottom: '1px dotted',
        borderColor: 'text.disabled',
        lineHeight: 1.2,
      }}
    >
      {children}
    </Box>
  </Tooltip>
);

export default HelpTooltip;
