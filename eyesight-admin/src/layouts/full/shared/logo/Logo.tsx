import { FC, useContext } from 'react';

import { Link } from 'react-router-dom';

import DvisupLogo from 'src/assets/images/logos/dvisup-logo-wordmark.png';
import { Box, styled } from '@mui/material';
import config from 'src/contexts/config';
import { CustomizerContext } from 'src/contexts/CustomizerContext';

const Logo: FC = () => {
  const { isCollapse, isSidebarHover } = useContext(CustomizerContext);
  const TopbarHeight = config.topbarHeight;

  const LinkStyled = styled(Link)(() => ({
    height: TopbarHeight,
    width: isCollapse == 'mini-sidebar' && !isSidebarHover ? '40px' : '180px',
    overflow: 'hidden',
    display: 'block',
  }));

  return (
    <LinkStyled
      to="/"
      style={{
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <Box
        component="img"
        src={DvisupLogo}
        alt="D|VisUp"
        sx={{ height: 36, width: 'auto', maxWidth: '100%', objectFit: 'contain' }}
      />
    </LinkStyled>
  );
};

export default Logo;
