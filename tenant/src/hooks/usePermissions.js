import { useMemo } from "react";
import useAuth from "./useAuth";

const usePermissions = () => {
  const { user } = useAuth();
  const moduleAccesses = user?.role?.roleModuleAccesses || [];

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

  const hasModule = (moduleKey) => userModules.has(moduleKey);

  const hasPermission = (permKey) => userPermissions.has(permKey);

  const hasAnyPermission = (...permKeys) =>
    permKeys.some((k) => userPermissions.has(k));

  const hasAllPermissions = (...permKeys) =>
    permKeys.every((k) => userPermissions.has(k));

  return {
    userModules,
    userPermissions,
    hasModule,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
  };
};

export default usePermissions;
