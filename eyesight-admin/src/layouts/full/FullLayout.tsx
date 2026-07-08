import { FC, useContext } from 'react';
import { styled, Container, Box, useTheme } from '@mui/material';
import { Outlet } from 'react-router-dom';
import Header from './vertical/header/Header';
import Sidebar from './vertical/sidebar/Sidebar';
import Customizer from './shared/customizer/Customizer';
import Navigation from '../full/horizontal/navbar/Navigation';
import HorizontalHeader from '../full/horizontal/header/Header';
import ScrollToTop from 'src/components/shared/ScrollToTop';
import LoadingBar from 'src/LoadingBar';
import { ExercisePageHeaderProvider } from 'src/features/admin/views/manage/exercise-page/ExercisePageHeaderContext';
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
  paddingBottom: '60px',
  flexDirection: 'column',
  zIndex: 1,
  backgroundColor: 'transparent',
}));

const FullLayout: FC = () => {
  const { activeLayout, isLayout, activeMode, isCollapse } = useContext(CustomizerContext);
  const MiniSidebarWidth = config.miniSidebarWidth;

  const theme = useTheme();

  return (
    <>
      <LoadingBar />

      <MainWrapper className={activeMode === 'dark' ? 'darkbg mainwrapper' : 'mainwrapper'}>
        {/* ------------------------------------------- */}
        {/* Sidebar */}
        {/* ------------------------------------------- */}
        {activeLayout === 'horizontal' ? '' : <Sidebar />}
        {/* ------------------------------------------- */}
        {/* Main Wrapper */}
        {/* ------------------------------------------- */}
        <PageWrapper
          className="page-wrapper"
          sx={{
            ...(isCollapse === 'mini-sidebar' && {
              [theme.breakpoints.up('lg')]: { ml: `${MiniSidebarWidth}px` },
            }),
          }}
        >
          <ExercisePageHeaderProvider>
            {activeLayout === 'horizontal' ? <HorizontalHeader /> : <Header />}
            {activeLayout === 'horizontal' ? <Navigation /> : ''}
            <Container
              sx={{
                maxWidth: isLayout === 'boxed' ? 'lg' : '100%!important',
              }}
            >
              <Box sx={{ minHeight: 'calc(100vh - 170px)' }}>
                <ScrollToTop>
                  <Outlet />
                </ScrollToTop>
              </Box>
            </Container>
          </ExercisePageHeaderProvider>
          <Customizer />
        </PageWrapper>
      </MainWrapper>
    </>
  );
};

export default FullLayout;
