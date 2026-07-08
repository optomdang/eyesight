import { FC, useContext } from 'react';
import { styled, Box, useTheme } from '@mui/material';
import { Outlet } from 'react-router-dom';
import Header from '../full/vertical/header/Header';
import Sidebar from '../full/vertical/sidebar/Sidebar';
import ScrollToTop from 'src/components/shared/ScrollToTop';
import LoadingBar from 'src/LoadingBar';
import { CustomizerContext } from 'src/contexts/CustomizerContext';
import config from 'src/contexts/config';

const MainWrapper = styled('div')(() => ({
  display: 'flex',
  minHeight: '100vh',
  width: '100%',
}));

const PageWrapper = styled('div')(() => ({
  display: 'flex',
  flexGrow: 1,
  paddingBottom: '0px',
  flexDirection: 'column',
  zIndex: 1,
  backgroundColor: 'transparent',
}));

const PortalLayout: FC = () => {
  const { activeMode, isCollapse } = useContext(CustomizerContext);
  const MiniSidebarWidth = config.miniSidebarWidth;
  const theme = useTheme();

  return (
    <>
      <LoadingBar />
      <MainWrapper className={activeMode === 'dark' ? 'darkbg mainwrapper' : 'mainwrapper'}>
        <Sidebar />
        <PageWrapper
          className="page-wrapper"
          sx={{
            ...(isCollapse === 'mini-sidebar' && {
              [theme.breakpoints.up('lg')]: { ml: `${MiniSidebarWidth}px` },
            }),
          }}
        >
          <Header />
          <Box
            sx={{
              minHeight: 'calc(100vh - 70px)',
              padding: 0,
              margin: 0,
              width: '100%',
            }}
          >
            <ScrollToTop>
              <Outlet />
            </ScrollToTop>
          </Box>
        </PageWrapper>
      </MainWrapper>
    </>
  );
};

export default PortalLayout;
