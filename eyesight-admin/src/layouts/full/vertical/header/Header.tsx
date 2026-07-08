import { useContext } from 'react';
import { useLocation } from 'react-router-dom';
import {
  IconButton,
  Box,
  AppBar,
  useMediaQuery,
  Toolbar,
  styled,
  Stack,
  Typography,
} from '@mui/material';
import { IconMenu2 } from '@tabler/icons-react';
import Notifications from './Notification';
import Profile from './Profile';
import Language from './Language';
import CenterSwitcher from 'src/components/shared/CenterSwitcher';
import MobileRightSidebar from './MobileRightSidebar';
import config from 'src/contexts/config';
import { CustomizerContext } from 'src/contexts/CustomizerContext';
import useAuth from 'src/contexts/authGuard/useAuth';
import { EXERCISE_PAGE_PATH } from 'src/features/admin/views/manage/exercise-page/exercisePageTabs';
import ExerciseHeaderTabs from 'src/features/admin/views/manage/exercise-page/ExerciseHeaderTabs';
import { ADMIN_SETTINGS_PATH_PREFIX } from 'src/features/admin/views/settings/useAdminSettingsVisibleTabs';
import AdminSettingsHeaderTabs from 'src/features/admin/views/settings/AdminSettingsHeaderTabs';

const ROUTE_PAGE_TITLES: Record<string, string> = {
  '/admin/dashboard': 'Dashboard',
};

const TopbarHeight = config.topbarHeight;

const AppBarStyled = styled(AppBar)(({ theme }) => ({
  boxShadow: 'none',
  background: theme.palette.background.paper,
  justifyContent: 'center',
  backdropFilter: 'blur(4px)',
  [theme.breakpoints.up('lg')]: {
    minHeight: TopbarHeight,
  },
}));

const ToolbarStyled = styled(Toolbar)(({ theme }) => ({
  width: '100%',
  color: theme.palette.text.secondary,
}));

const Header = () => {
  const { user } = useAuth();
  const location = useLocation();
  const isExercisePage = location.pathname === EXERCISE_PAGE_PATH;
  const isSettingsPage = location.pathname.startsWith(ADMIN_SETTINGS_PATH_PREFIX);
  const pageTitle = ROUTE_PAGE_TITLES[location.pathname];
  const lgUp = useMediaQuery((theme: any) => theme.breakpoints.up('lg'));
  const lgDown = useMediaQuery((theme: any) => theme.breakpoints.down('lg'));
  const { setIsCollapse, isCollapse, isMobileSidebar, setIsMobileSidebar } =
    useContext(CustomizerContext);

  return (
    <AppBarStyled position="sticky" color="default">
      <ToolbarStyled>
        <IconButton
          color="inherit"
          aria-label="menu"
          onClick={() => {
            if (lgUp) {
              setIsCollapse(isCollapse === 'full-sidebar' ? 'mini-sidebar' : 'full-sidebar');
            } else {
              setIsMobileSidebar(!isMobileSidebar);
            }
          }}
        >
          <IconMenu2 size="20" />
        </IconButton>

        {pageTitle && (
          <Typography
            variant="h5"
            sx={{
              fontWeight: 700,
              ml: 0.5,
              color: 'text.primary',
              whiteSpace: 'nowrap',
              lineHeight: 1.2,
            }}
          >
            {pageTitle}
          </Typography>
        )}

        {isExercisePage && (
          <Box
            sx={{
              ml: 1.5,
              minWidth: 0,
              display: 'flex',
              alignItems: 'center',
              flex: { xs: 1, md: '0 1 auto' },
              overflow: 'hidden',
            }}
          >
            <ExerciseHeaderTabs />
          </Box>
        )}

        {isSettingsPage && (
          <Box
            sx={{
              ml: 1.5,
              minWidth: 0,
              display: 'flex',
              alignItems: 'center',
              flex: { xs: 1, md: '0 1 auto' },
              overflow: 'hidden',
            }}
          >
            <AdminSettingsHeaderTabs />
          </Box>
        )}

        <Box flexGrow={1} />
        <Stack spacing={1} direction="row" alignItems="center">
          {user?.userType === 'admin' && <CenterSwitcher />}
          <Language />
          <Notifications />
          {lgDown ? <MobileRightSidebar /> : null}
          <Profile />
        </Stack>
      </ToolbarStyled>
    </AppBarStyled>
  );
};

export default Header;
