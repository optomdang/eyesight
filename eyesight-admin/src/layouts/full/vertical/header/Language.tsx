import React, { useContext, useEffect } from 'react';
import { Avatar, IconButton, Menu, MenuItem, Typography, Stack } from '@mui/material';
import FlagEn from 'src/assets/images/flag/icon-flag-en.svg';
import FlagVi from 'src/assets/images/flag/icon-flag-vn.svg';
import { useTranslation } from 'src/hooks/useTranslation';

import { CustomizerContext } from 'src/contexts/CustomizerContext';

const Languages = [
  {
    flagname: 'Tiếng Việt',
    icon: FlagVi,
    value: 'vi',
  },
  {
    flagname: 'English',
    icon: FlagEn,
    value: 'en',
  },
];

const Language = () => {
  const [anchorEl, setAnchorEl] = React.useState(null);

  const open = Boolean(anchorEl);
  const { isLanguage, setIsLanguage } = useContext(CustomizerContext);

  const currentLang = Languages.find((_lang) => _lang.value === isLanguage) || Languages[0]; // Default to Vietnamese
  const { i18n } = useTranslation();

  const handleClick = (event: any) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLanguageChange = (langValue: string) => {
    setIsLanguage(langValue);
    i18n.changeLanguage(langValue);
    // Save to localStorage
    localStorage.setItem('language', langValue);
    handleClose();
  };

  useEffect(() => {
    // Get language from localStorage or default to Vietnamese
    const savedLang = localStorage.getItem('language') || 'vi';
    if (savedLang !== isLanguage) {
      setIsLanguage(savedLang);
    }
    i18n.changeLanguage(savedLang);
  }, []);

  return (
    <>
      <IconButton
        aria-label="language"
        id="language-button"
        aria-controls={open ? 'language-menu' : undefined}
        aria-expanded={open ? 'true' : undefined}
        aria-haspopup="true"
        onClick={handleClick}
        sx={{
          '&:hover': {
            backgroundColor: 'action.hover',
          },
        }}
      >
        <Avatar src={currentLang.icon} alt={currentLang.flagname} sx={{ width: 20, height: 20 }} />
      </IconButton>
      <Menu
        id="language-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        sx={{
          '& .MuiMenu-paper': {
            width: '200px',
            mt: 1,
          },
        }}
      >
        {Languages.map((option, index) => (
          <MenuItem
            key={index}
            sx={{
              py: 2,
              px: 3,
              '&.Mui-selected': {
                backgroundColor: 'primary.light',
              },
            }}
            onClick={() => handleLanguageChange(option.value)}
            selected={option.value === isLanguage}
          >
            <Stack direction="row" spacing={1} alignItems="center">
              <Avatar src={option.icon} alt={option.flagname} sx={{ width: 20, height: 20 }} />
              <Typography variant="body2">{option.flagname}</Typography>
            </Stack>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

export default Language;
