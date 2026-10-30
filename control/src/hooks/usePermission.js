import { useMemo, useCallback } from "react";
import useAuth from "./useAuth";
import { permissionsConfig } from "../Data/permissionsConfig";

/**
 * Reads the logged-in admin's permissions from Redux.
 *
 * Actual login response shape (confirmed):
 *   user.role.roleModuleAccesses – array of:
 *     { id, roleId, module: "<BACKEND_KEY>", permissions: ["<perm_key>", ...] }
 *   i.e. `module` is the module backendKey (e.g. "TENANT", "BILLING") and
 *   `permissions` is a FLAT ARRAY of granted permission-key strings.
 *
 * Super-admins (explicit flag or no role) are granted everything.
 * A flat `user.permissions` (array or object) is accepted as a fallback.
 */
const usePermission = () => {
  const { user } = useAuth();

  const { permissionSet, moduleSet, isSuperAdmin } = useMemo(() => {
    const empty = {
      permissionSet: new Set(),
      moduleSet: new Set(),
      isSuperAdmin: false,
    };
    if (!user) return empty;

    // Super-admin: explicit flag OR no role assigned
    if (user.isSuperAdmin === true || !user.role) {
      return { ...empty, isSuperAdmin: true };
    }

    const accesses = user.role?.roleModuleAccesses || [];

    // An empty access list means "all access" — a role that returns no explicit
    // module/permission grants is treated as full access (org owner case).
    if (accesses.length === 0) {
      return { ...empty, isSuperAdmin: true };
    }

    const permissionSet = new Set();
    const moduleSet = new Set();

    accesses.forEach((access) => {
      if (access.module) moduleSet.add(access.module);
      const perms = access.permissions;
      if (Array.isArray(perms)) {
        // Real backend shape: flat array of permission-key strings.
        perms.forEach((key) => permissionSet.add(key));
      } else if (perms && typeof perms === "object") {
        // Defensive: object map { key: boolean }.
        Object.entries(perms).forEach(([key, value]) => {
          if (value) permissionSet.add(key);
        });
      }
    });

    // Fallback: flat permissions directly on the user object.
    if (permissionSet.size === 0 && user.permissions) {
      const flat = user.permissions;
      if (Array.isArray(flat)) {
        flat.forEach((key) => permissionSet.add(key));
      } else if (typeof flat === "object") {
        Object.entries(flat).forEach(([key, value]) => {
          if (value) permissionSet.add(key);
        });
      }
    }

    return { permissionSet, moduleSet, isSuperAdmin: false };
  }, [user]);

  /**
   * True if the current user was granted the given granular permission key.
   * Super-admins always return true.
   */
  const hasPermission = useCallback(
    (key) => {
      if (!user) return false;
      if (isSuperAdmin) return true;
      return permissionSet.has(key);
    },
    [user, isSuperAdmin, permissionSet],
  );

  const hasAnyPermission = useCallback(
    (...keys) => {
      if (!user) return false;
      if (isSuperAdmin) return true;
      return keys.some((k) => permissionSet.has(k));
    },
    [user, isSuperAdmin, permissionSet],
  );

  /**
   * True if the current user has access to the given top-level module
   * (e.g. "tenant", "billing"). Matches the module's backendKey against the
   * `module` field the backend returns. Super-admins always return true.
   */
  const hasModuleAccess = useCallback(
    (moduleKey) => {
      if (!user) return false;
      if (isSuperAdmin) return true;
      const configModule = permissionsConfig.find((m) => m.key === moduleKey);
      if (!configModule) return true; // unknown module — allow by default
      return moduleSet.has(configModule.backendKey);
    },
    [user, isSuperAdmin, moduleSet],
  );

  return { hasPermission, hasAnyPermission, hasModuleAccess, isSuperAdmin };
};

export default usePermission;
