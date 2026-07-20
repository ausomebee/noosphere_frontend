import { useMemo } from "react";
import useAuth from "./useAuth";

const usePermissions = () => {
  const { user } = useAuth();
  const moduleAccesses = user?.role?.roleModuleAccesses || [];

  // A logged-in user whose login returns no explicit access (no role, or an
  // empty roleModuleAccesses array) is treated as having FULL access — this is
  // the org owner / super-admin case. Only specific, non-empty permission sets
  // restrict the UI.
  const hasAllAccess = !!user && moduleAccesses.length === 0;

  // Set of module keys the user has access to: e.g. {"DASHBOARD", "SCHEDULER", ...}
  const userModules = useMemo(
    () => new Set(moduleAccesses.map((m) => m.module)),
    [moduleAccesses]
  );

  // Set of ALL permission keys across all modules
  const userPermissions = useMemo(() => {
    const perms = new Set();
    for (const access of moduleAccesses) {
      for (const perm of access.permissions || []) {
        perms.add(perm);
      }
    }
    return perms;
  }, [moduleAccesses]);

  const hasModule = (moduleKey) => hasAllAccess || userModules.has(moduleKey);

  const hasPermission = (permKey) => hasAllAccess || userPermissions.has(permKey);

  const hasAnyPermission = (...permKeys) =>
    hasAllAccess || permKeys.some((k) => userPermissions.has(k));

  const hasAllPermissions = (...permKeys) =>
    hasAllAccess || permKeys.every((k) => userPermissions.has(k));

  return {
    hasAllAccess,
    userModules,
    userPermissions,
    hasModule,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
  };
};

export default usePermissions;
