import { PERMISSIONS, ACTION_PERMISSIONS } from "../permissions";

const getStoredRole = () => (localStorage.getItem("role") || "worker").toLowerCase();

export function usePermissions() {
  const role = getStoredRole();

  const hasAccess = (permissionKey) => {
    const allowed = PERMISSIONS[permissionKey];
    return Array.isArray(allowed) && allowed.includes(role);
  };

  const can = (actionKey) => {
    const allowed = ACTION_PERMISSIONS[actionKey];
    return Array.isArray(allowed) && allowed.includes(role);
  };

  const isRole = (checkRole) => role === checkRole;

  return {
    role,
    hasAccess,
    can,
    isRole,
  };
}
