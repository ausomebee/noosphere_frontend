import { useMemo } from "react";
import useAuth from "./useAuth";

// Some permission keys used to be shared across modules for different actions
// (e.g. "create_form" meant both "create a client form" and "create a custom
// form template"). Those were split into distinct keys. This maps a legacy
// shared key + the module that granted it → the new module-specific key, so a
// role saved BEFORE the split keeps working on the next login without any
// backend migration.
export const LEGACY_KEY_ALIASES = {
  create_form: {
    CLIENTS: "create_client_form",
    CUSTOM_FORMS: "create_custom_form",
  },
  view_document: {
    CLIENTS: "view_client_document",
    MY_ORGANIZATION: "view_org_document",
  },
  delete_document: {
    CLIENTS: "delete_client_document",
    MY_ORGANIZATION: "delete_org_document",
  },
  edit_program: {
    CLIENTS: "edit_client_program",
    PROGRAM_LIBRARY: "edit_library_program",
  },
  delete_program: {
    CLIENTS: "delete_client_program",
    PROGRAM_LIBRARY: "delete_library_program",
  },
};

/** Expand an array of granted permission keys from one module, adding the new
 *  module-specific key for any legacy shared key. Used by both the runtime hook
 *  and the role editor so old roles read consistently. */
export const expandModulePermissions = (moduleKey, permissions = []) => {
  const set = new Set(permissions);
  for (const perm of permissions) {
    const alias = LEGACY_KEY_ALIASES[perm]?.[moduleKey];
    if (alias) set.add(alias);
  }
  return set;
};

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
        // Translate a legacy shared key to its new module-specific key so roles
        // saved before the key split keep working.
        const alias = LEGACY_KEY_ALIASES[perm]?.[access.module];
        if (alias) perms.add(alias);
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
