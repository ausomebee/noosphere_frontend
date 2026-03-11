import { useMemo } from "react";
import useAuth from "./useAuth";
import { permissionsConfig } from "../Data/permissionsConfig";

/**
 * Reads the logged-in admin's permissions from Redux.
 *
 * Expected user shape (from login response):
 *   user.isSuperAdmin            – boolean; if true, all permissions granted
 *   user.role.roleModuleAccesses – array of { module: string, permissions: Record<string, boolean> }
 *
 * Falls back to user.permissions as a flat object if roleModuleAccesses is absent.
 */
const usePermission = () => {
  const { user } = useAuth();

  const { flatPermissions, isSuperAdmin } = useMemo(() => {
    if (!user) return { flatPermissions: {}, isSuperAdmin: false };

    // Super-admin: explicit flag OR no role assigned
    const isSuper = user.isSuperAdmin === true || !user.role;
    if (isSuper) return { flatPermissions: {}, isSuperAdmin: true };

    // Flatten from role module accesses
    const accesses = user.role?.roleModuleAccesses || [];
    const perms = {};
    accesses.forEach((access) => {
      if (access.permissions && typeof access.permissions === "object") {
        Object.assign(perms, access.permissions);
      }
    });

    // Fallback: flat permissions object directly on user
    if (Object.keys(perms).length === 0 && user.permissions) {
      Object.assign(perms, user.permissions);
    }

    return { flatPermissions: perms, isSuperAdmin: false };
  }, [user]);

  /**
   * Returns true if the current user has the given permission key.
   * Super-admins always return true.
   */
  const hasPermission = (key) => {
    if (!user) return false;
    if (isSuperAdmin) return true;
    return flatPermissions[key] === true;
  };

  /**
   * Returns true if the current user has access to at least one section
   * within the given top-level module key (e.g. "tenant", "billing").
   * Super-admins always return true.
   */
  const hasModuleAccess = (moduleKey) => {
    if (!user) return false;
    if (isSuperAdmin) return true;

    const configModule = permissionsConfig.find((m) => m.key === moduleKey);
    if (!configModule) return true; // unknown module — allow by default

    const accesses = user.role?.roleModuleAccesses || [];
    return configModule.sections.some((section) =>
      accesses.some((a) => a.module === section.key)
    );
  };

  return { hasPermission, hasModuleAccess, isSuperAdmin };
};

export default usePermission;
