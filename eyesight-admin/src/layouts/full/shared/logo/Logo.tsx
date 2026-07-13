import { FC, useContext } from 'react';

import { Link } from 'react-router-dom';

import DvisupLogo from 'src/assets/images/logos/dvisup-logo-wordmark.png';
import { Box, styled } from '@mui/material';
import config from 'src/contexts/config';
import { CustomizerContext } from 'src/contexts/CustomizerContext';

const TopbarHeight = config.topbarHeight;

const LinkStyled = styled(Link)(() => ({
  height: TopbarHeight,
  width: '100%',
  overflow: 'hidden',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}));

const Logo: FC = () => {
  const { isCollapse, isSidebarHover } = useContext(CustomizerContext);

  return (
    <LinkStyled to="/">
      <Box
        component="img"
        src={DvisupLogo}
        alt="D|VisUp"
        sx={{
          height: 36,
          width: 'auto',
          maxWidth: isCollapse === 'mini-sidebar' && !isSidebarHover ? 32 : '100%',
          objectFit: 'contain',
        }}
      />
    </LinkStyled>
  );
};

export default Logo;
