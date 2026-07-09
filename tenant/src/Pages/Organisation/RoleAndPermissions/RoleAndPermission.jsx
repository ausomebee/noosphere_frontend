import React, { useState, useCallback, useEffect } from "react";
import { useDispatch } from "react-redux";
import { FaPlus } from "react-icons/fa";
import CustomTable from "../../../Components/Table/CustomTable";
import Button from "../../../Components/Button/Button";
import RoleConfiguration from "./RoleConfiguration";
import useAuth from "../../../hooks/useAuth";
import usePermissions from "../../../hooks/usePermissions";
import roleApi from "../../../api/roleApi";
import { showToast } from "../../../Helper/ShowToast";
import {
  loadDraft,
  resetDraft,
} from "../../../ReduxStore/features/roleDraftSlice";
import {
  buildBlankPermissions,
  PERMISSIONS_CONFIG,
} from "../../../Data/permissionsConfig";
import "../Organisation.css";

const RoleAndPermission = () => {
  const dispatch = useDispatch();
  const { tenantId, accessToken, refreshToken } = useAuth();
  const { hasPermission } = usePermissions();

  const [view, setView] = useState("list"); // "list" | "config"
  const [configMode, setConfigMode] = useState("add"); // "add" | "edit" | "view"
  const [editRoleId, setEditRoleId] = useState(null);

  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  /* ─── Fetch roles ─── */
  const fetchRoles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await roleApi.GetAllRolesByTenantId({
        tenantId,
        accessToken,
        refreshToken,
      });
      const roles = res.data?.data || res.data || [];
      setTableData(
        roles.map((role) => ({
          id: role.id,
          roleName: role.name,
          toggleActive: role.isActive !== false,
          dataAccessLevel: role.dataAccessLevel || "",
          hasActions: true,
          // Store raw moduleAccesses for edit/view
          rawModuleAccesses: role.roleModuleAccesses || [],
          // Derive selectedModules from roleModuleAccesses
          selectedModules: (role.roleModuleAccesses || []).map((m) => m.module),
        })),
      );
    } catch {
      // No toast: empty/unavailable content is not an error.
    } finally {
      setLoading(false);
    }
  }, [tenantId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  /* ─── Table config ─── */
  const columns = [
    { header: "Role", key: "roleName", type: "text" },
    { header: "Active", key: "toggleActive", type: "active" },
  ];

  const actions = [
    {
      type: "dropdown",
      label: "More",
      className: "more-dropdown",
      items: [
        hasPermission("edit_a_role") && {
          label: "Edit Role",
          onClick: (row) => handleEditRole(row),
        },
        hasPermission("view_roles_permissions") && {
          label: "View Permissions",
          onClick: (row) => handleViewPermissions(row),
        },
        hasPermission("deactivate_a_role") && {
          label: (row) =>
            row.toggleActive ? "Deactivate Role" : "Activate Role",
          onClick: (row) => handleDeactivateRole(row),
          className: (row) => (row.toggleActive ? "remove" : ""),
        },
      ].filter(Boolean),
    },
  ];

  /* ─── Action handlers ─── */
  const handleCreateRole = () => {
    dispatch(resetDraft());
    setConfigMode("add");
    setEditRoleId(null);
    setView("config");
  };

  /** Convert API roleModuleAccesses → Redux permissions shape */
  const buildPermissionsFromApi = (moduleAccesses) => {
    const perms = buildBlankPermissions();
    for (const access of moduleAccesses) {
      const moduleKey = access.module; // e.g. "DASHBOARD"
      const apiPerms = access.permissions || []; // flat array of permission strings
      const moduleConfig = PERMISSIONS_CONFIG[moduleKey];
      if (!moduleConfig) continue;
      for (const subcat of moduleConfig.subcategories) {
        for (const perm of subcat.permissions) {
          if (apiPerms.includes(perm.key)) {
            perms[moduleKey][subcat.key][perm.key] = true;
          }
        }
      }
    }
    return perms;
  };

  const handleEditRole = async (row) => {
    try {
      const res = await roleApi.GetSingleRole({
        roleId: row.id,
        accessToken,
        refreshToken,
      });
      const role = res.data?.data || res.data;
      const moduleAccesses = role.roleModuleAccesses || [];
      dispatch(
        loadDraft({
          roleName: role.name || row.roleName || "",
          selectedModules: moduleAccesses.map((m) => m.module),
          dataAccessLevel: role.dataAccessLevel || "",
          permissions: buildPermissionsFromApi(moduleAccesses),
          // Store raw accesses so we can send `id` on existing modules during update
          rawModuleAccesses: moduleAccesses,
        }),
      );
    } catch {
      // Fallback to row data if single fetch fails
      dispatch(
        loadDraft({
          roleName: row.roleName || "",
          selectedModules: row.selectedModules || [],
          dataAccessLevel: row.dataAccessLevel || "",
          permissions: buildPermissionsFromApi(row.rawModuleAccesses || []),
          rawModuleAccesses: row.rawModuleAccesses || [],
        }),
      );
    }
    setConfigMode("edit");
    setEditRoleId(row.id);
    setView("config");
  };

  const handleViewPermissions = async (row) => {
    try {
      const res = await roleApi.GetSingleRole({
        roleId: row.id,
        accessToken,
        refreshToken,
      });
      const role = res.data?.data || res.data;
      const moduleAccesses = role.roleModuleAccesses || [];
      dispatch(
        loadDraft({
          roleName: role.name || row.roleName || "",
          selectedModules: moduleAccesses.map((m) => m.module),
          dataAccessLevel: role.dataAccessLevel || "",
          permissions: buildPermissionsFromApi(moduleAccesses),
          rawModuleAccesses: moduleAccesses,
        }),
      );
    } catch {
      dispatch(
        loadDraft({
          roleName: row.roleName || "",
          selectedModules: row.selectedModules || [],
          dataAccessLevel: row.dataAccessLevel || "",
          permissions: buildPermissionsFromApi(row.rawModuleAccesses || []),
          rawModuleAccesses: row.rawModuleAccesses || [],
        }),
      );
    }
    setConfigMode("view");
    setEditRoleId(row.id);
    setView("config");
  };

  const handleDeactivateRole = async (row) => {
    try {
      await roleApi.DeactivateRole({
        roleId: row.id,
        accessToken,
        refreshToken,
      });
      showToast("Role deactivated", "success");
      fetchRoles();
    } catch (e) {
      showToast(e.message || "Failed to deactivate role", "error");
    }
  };

  const handleToggleActive = async (row) => {
    try {
      await roleApi.DeactivateRole({
        roleId: row.id,
        accessToken,
        refreshToken,
      });
      showToast(
        row.toggleActive ? "Role deactivated" : "Role activated",
        "success",
      );
      fetchRoles();
    } catch (e) {
      showToast(e.message || "Failed to update role status", "error");
    }
  };

  /** Convert Redux draft permissions → API moduleAccesses array */
  const buildModuleAccessesPayload = (draft) => {
    const { selectedModules, permissions, rawModuleAccesses } = draft;
    return selectedModules.map((moduleKey) => {
      // Collect all true permission keys for this module across subcategories
      const modulePerms = permissions[moduleKey] || {};
      const permKeys = [];
      for (const subcatPerms of Object.values(modulePerms)) {
        for (const [key, value] of Object.entries(subcatPerms)) {
          if (value) permKeys.push(key);
        }
      }
      const access = { module: moduleKey, permissions: permKeys };
      // For edit mode, attach `id` if this module already existed on the role
      if (configMode === "edit" && rawModuleAccesses) {
        const existing = rawModuleAccesses.find((m) => m.module === moduleKey);
        if (existing?.id) {
          access.id = existing.id;
        }
      }
      return access;
    });
  };

  /* ─── Submit role from config view ─── */
  const handleSubmitRole = async (draft) => {
    setSubmitting(true);
    try {
      const moduleAccesses = buildModuleAccessesPayload(draft);

      if (configMode === "edit") {
        await roleApi.UpdateRole({
          id: editRoleId,
          name: draft.roleName,
          dataAccessLevel: draft.dataAccessLevel,
          moduleAccesses,
          accessToken,
          refreshToken,
        });
        showToast("Role updated successfully", "success");
      } else {
        await roleApi.CreateRole({
          name: draft.roleName,
          dataAccessLevel: draft.dataAccessLevel,
          createdByTenantId: tenantId,
          moduleAccesses,
          accessToken,
          refreshToken,
        });
        showToast("Role created successfully", "success");
      }
      dispatch(resetDraft());
      setView("list");
      fetchRoles();
    } catch (e) {
      showToast(e.message || "Failed to save role", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelConfig = () => {
    dispatch(resetDraft());
    setView("list");
  };

  /* ─── Render ─── */
  if (view === "config") {
    return (
      <div className="p-6">
        <RoleConfiguration
          mode={configMode}
          onCancel={handleCancelConfig}
          onSubmit={handleSubmitRole}
          submitting={submitting}
        />
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="appointment-sched-title mb-4">Roles & Permissions</h1>
      <h3 className="text-base text-gray-700 font-500">
        Manage user roles and permissions securely within your organization
      </h3>

      {hasPermission("create_new_role") && (
        <div className="justify-end flex mt-6">
          <Button
            label="Create a new role"
            variant="secondary"
            icon={<FaPlus />}
            onClick={handleCreateRole}
          />
        </div>
      )}

      <div className="mt-6">
        <CustomTable
          data={tableData}
          loading={loading}
          columns={columns}
          actions={actions}
          showActions={true}
          showCheckbox={false}
          itemsPerPage={10}
          tableName="Roles & Permissions"
          hideSearch
          hideTableActions
          onToggleActive={handleToggleActive}
        />
      </div>
    </div>
  );
};

export default RoleAndPermission;
