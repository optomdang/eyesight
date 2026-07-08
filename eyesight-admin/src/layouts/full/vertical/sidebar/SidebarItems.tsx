import React, { useContext } from 'react';
import Menuitems from './MenuItems';
import PortalMenuItems from './PortalMenuItems';
import { useLocation } from 'react-router-dom';
import { Box, List, useMediaQuery, Theme } from '@mui/material';
import NavItem from './NavItem';
import NavCollapse from './NavCollapse';
import NavGroup from './NavGroup/NavGroup';
import { usePermission } from 'src/hooks/usePermission';
import useAuth from 'src/contexts/authGuard/useAuth';

import { CustomizerContext } from 'src/contexts/CustomizerContext';

const SidebarItems = () => {
  const { pathname } = useLocation();
  const pathDirect = pathname;
  const pathWithoutLastPart = pathname.slice(0, pathname.lastIndexOf('/'));
  const { hasPermission } = usePermission();
  const { user } = useAuth();

  // Determine which menu to use based on current route
  const isPortalRoute = pathname.startsWith('/portal');
  const currentMenuItems = isPortalRoute ? PortalMenuItems : Menuitems;

  const { isSidebarHover, isCollapse, isMobileSidebar, setIsMobileSidebar } =
    useContext(CustomizerContext);

  const lgUp = useMediaQuery((theme: Theme) => theme.breakpoints.up('lg'));
  const hideMenu: boolean | string = lgUp ? isCollapse == 'mini-sidebar' && !isSidebarHover : '';

  // Filter menu items based on user permissions
  const filterMenuByPermission = (menuItems: any[]) => {
    return menuItems
      .filter((item) => {
        if (item.adminOnly && user?.userType !== 'admin') {
          return false;
        }
        // If item has permission requirement, check it
        if (item.permission) {
          return hasPermission(item.permission);
        }
        // No permission requirement means visible to all
        return true;
      })
      .map((item) => {
        // If item has children, filter them too
        if (item.children) {
          return {
            ...item,
            children: filterMenuByPermission(item.children),
          };
        }
        return item;
      })
      .filter((item) => {
        // Remove groups/subheaders with no visible children
        if (item.children) {
          return item.children.length > 0;
        }
        return true;
      });
  };

  const filteredMenuItems = filterMenuByPermission(currentMenuItems);

  return (
    <Box sx={{ px: 3 }}>
      <List sx={{ pt: 0 }} className="sidebarNav">
        {filteredMenuItems.map((item) => {
          // {/********SubHeader**********/}
          if (item.subheader) {
            return <NavGroup item={item} hideMenu={hideMenu} key={item.subheader} />;

            // {/********If Sub Menu**********/}
            /* eslint no-else-return: "off" */
          } else if (item.children) {
            return (
              <NavCollapse
                menu={item}
                pathDirect={pathDirect}
                hideMenu={hideMenu}
                pathWithoutLastPart={pathWithoutLastPart}
                level={1}
                key={item.id}
                onClick={() => setIsMobileSidebar(!isMobileSidebar)}
              />
            );

            // {/********If Sub No Menu**********/}
          } else {
            return (
              <NavItem
                item={item}
                key={item.id}
                pathDirect={pathDirect}
                hideMenu={hideMenu}
                onClick={() => setIsMobileSidebar(!isMobileSidebar)}
              />
            );
          }
        })}
      </List>
    </Box>
  );
};
export default SidebarItems;
