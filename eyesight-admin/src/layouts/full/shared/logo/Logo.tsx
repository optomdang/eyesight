import { FC, useContext } from 'react';

import { Link } from 'react-router-dom';

import LogoDark from 'src/assets/images/logos/dark-logo.svg?react';
import LogoDarkRTL from 'src/assets/images/logos/dark-rtl-logo.svg?react';
import LogoLight from 'src/assets/images/logos/light-logo.svg?react';
import LogoLightRTL from 'src/assets/images/logos/light-logo-rtl.svg?react';
import { styled } from '@mui/material';
import config from 'src/contexts/config';
import { CustomizerContext } from 'src/contexts/CustomizerContext';

const Logo: FC = () => {
  const { isCollapse, isSidebarHover, activeDir, activeMode } = useContext(CustomizerContext);
  const TopbarHeight = config.topbarHeight;

  const LinkStyled = styled(Link)(() => ({
    height: TopbarHeight,
    width: isCollapse == 'mini-sidebar' && !isSidebarHover ? '40px' : '180px',
    overflow: 'hidden',
    display: 'block',
  }));

  if (activeDir === 'ltr') {
    return (
      <LinkStyled
        to="/"
        style={{
          display: 'flex',
          alignItems: 'center',
        }}
      >
        {activeMode === 'dark' ? <LogoLight /> : <LogoDark />}
      </LinkStyled>
    );
  }

  return (
    <LinkStyled
      to="/"
      style={{
        display: 'flex',
        alignItems: 'center',
      }}
    >
      {activeMode === 'dark' ? <LogoDarkRTL /> : <LogoLightRTL />}
    </LinkStyled>
  );
};

export default Logo;
