import React from 'react';
import { Box, IconButton, Menu, MenuItem, Typography, Tooltip } from '@mui/material';
import { Language as LanguageIcon } from '@mui/icons-material';
import { useTranslation, SUPPORTED_LANGUAGES } from 'src/hooks/useTranslation';

export const LanguageSwitcher: React.FC = () => {
  const { changeLanguage, currentLanguage } = useTranslation();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLanguageChange = (language: 'en' | 'vi') => {
    changeLanguage(language);
    handleClose();
  };

  const currentLang = SUPPORTED_LANGUAGES.find((lang) => lang.code === currentLanguage);

  return (
    <Box>
      <Tooltip title={`Current: ${currentLang?.nativeName}`}>
        <IconButton
          onClick={handleClick}
          size="small"
          sx={{
            ml: 1,
            color: 'text.primary',
            '&:hover': {
              backgroundColor: 'action.hover',
            },
          }}
          aria-controls={anchorEl ? 'language-menu' : undefined}
          aria-haspopup="true"
          aria-expanded={anchorEl ? 'true' : undefined}
        >
          <LanguageIcon fontSize="small" />
          <Typography
            variant="body2"
            sx={{
              ml: 0.5,
              fontSize: '16px',
              minWidth: '20px',
              textAlign: 'center',
            }}
          >
            {currentLang?.flag}
          </Typography>
        </IconButton>
      </Tooltip>

      <Menu
        id="language-menu"
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        MenuListProps={{
          'aria-labelledby': 'language-button',
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {SUPPORTED_LANGUAGES.map((language) => (
          <MenuItem
            key={language.code}
            onClick={() => handleLanguageChange(language.code)}
            selected={language.code === currentLanguage}
            sx={{
              minWidth: 140,
              '&.Mui-selected': {
                backgroundColor: 'primary.light',
                color: 'primary.contrastText',
                '&:hover': {
                  backgroundColor: 'primary.main',
                },
              },
            }}
          >
            <Typography
              variant="body2"
              sx={{
                mr: 1,
                fontSize: '16px',
                minWidth: '20px',
              }}
            >
              {language.flag}
            </Typography>
            <Typography variant="body2">{language.nativeName}</Typography>
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
};
