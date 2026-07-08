import useAuth from 'src/contexts/authGuard/useAuth';

/**
 * Hook to check user permissions based on role rights
 */
export const usePermission = () => {
  const { user } = useAuth();

  /**
   * Check if user has a specific permission
   * @param permission - The permission code to check (e.g., 'getUsers', 'managePatients')
   * @returns boolean
   */
  const hasPermission = (permission: string | string[]): boolean => {
    if (!user || !user.role || !user.role.rights) {
      return false;
    }

    // Admin always has all permissions
    if (user.userType === 'admin') {
      return true;
    }

    // Get user's permission codes
    const userRights = user.role.rights.map((right: any) =>
      typeof right === 'string' ? right : right.code || right.name
    );

    // Check if user has the required permission(s)
    if (Array.isArray(permission)) {
      // User needs at least one of the permissions (OR logic)
      const result = permission.some((p) => userRights.includes(p));
      return result;
    }

    const result = userRights.includes(permission);
    return result;
  };

  /**
   * Check if user has all specified permissions
   * @param permissions - Array of permission codes
   * @returns boolean
   */
  const hasAllPermissions = (permissions: string[]): boolean => {
    if (!user || !user.role || !user.role.rights) {
      return false;
    }

    if (user.userType === 'admin') {
      return true;
    }

    const userRights = user.role.rights.map((right: any) =>
      typeof right === 'string' ? right : right.code || right.name
    );

    return permissions.every((p) => userRights.includes(p));
  };

  return {
    hasPermission,
    hasAllPermissions,
  };
};
