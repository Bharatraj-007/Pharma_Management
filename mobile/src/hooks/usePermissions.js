/**
 * usePermissions — React Native equivalent of the web hook.
 *
 * The web version reads role synchronously from localStorage.
 * Here we receive the role as a prop/context value because AsyncStorage
 * is async.  The hook accepts an optional override; if omitted it reads
 * from the AuthContext (see navigation/AppNavigator).
 */
import { useContext } from 'react';
import { AuthContext } from '../navigation/AuthContext';
import { PERMISSIONS, ACTION_PERMISSIONS } from '../utils/permissions';

export function usePermissions() {
  const { session } = useContext(AuthContext);
  const role = (session?.role || 'worker').toLowerCase();

  const hasAccess = (permissionKey) => {
    const allowed = PERMISSIONS[permissionKey];
    return Array.isArray(allowed) && allowed.includes(role);
  };

  const can = (actionKey) => {
    const allowed = ACTION_PERMISSIONS[actionKey];
    return Array.isArray(allowed) && allowed.includes(role);
  };

  const isRole = (checkRole) => role === checkRole;

  return { role, hasAccess, can, isRole };
}
