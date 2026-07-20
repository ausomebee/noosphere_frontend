import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { FaPlus } from "react-icons/fa";
import CustomTable from "../../../Components/Table/CustomTable";
import Button from "../../../Components/Button/Button";
import { showToast, showApiError } from "../../../Helper/ShowToast";
import useAuth from "../../../hooks/useAuth";
import usePermission from "../../../hooks/usePermission";
import roleApi from "../../../api/roleApis";
import { SkeletonTable } from "../../../Components/LoadingSpinner";

const Roles = () => {
  const navigate = useNavigate();
  const { accessToken, refreshToken } = useAuth();
  const { hasPermission } = usePermission();
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterValue, setFilterValue] = useState("");

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const res = await roleApi.GetRolesByModule({ accessToken, refreshToken });
      const mapped = (res.data || []).map((role) => ({
        id: role.id,
        role: role.name,
        dataAccessLevel: role.dataAccessLevel,
        active: role.isActive,
        status: role.isActive ? "Active" : "Inactive",
        hasActions: true,
      }));
      setRoles(mapped);
    } catch (err) {
      showApiError(err, "LOAD_ROLES");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const columns = [
    { key: "role", header: "Role" },
    { key: "dataAccessLevel", header: "Data Access" },
    { key: "status", header: "Status", type: "status" },
  ];

  const filters = useMemo(
    () => [
      {
        key: "filter_type",
        value: filterValue,
        options: [
          { value: "", label: "Filters" },
          { value: "dataAccessLevel", label: "Data Access" },
          { value: "active", label: "Status" },
          { value: "clear_filters", label: "Clear Filters" },
        ],
      },
    ],
    [filterValue]
  );

  const actions = [
    hasPermission("edit_role") && {
      label: "Edit Role",
      onClick: (row) => {
        navigate(`/settings/roles-permissions/configure/${row.id}`);
      },
    },
  ].filter(Boolean);

  const handleToggleActive = async (rowIndex) => {
    const role = roles[rowIndex];
    if (!role) return;

    try {
      // Active roles deactivate; inactive roles activate — separate endpoints.
      const toggle = role.active
        ? roleApi.DeactivateRole
        : roleApi.ActivateRole;
      await toggle({ id: role.id, accessToken, refreshToken });
      setRoles((prev) =>
        prev.map((r, i) =>
          i === rowIndex
            ? { ...r, active: !r.active, status: !r.active ? "Active" : "Inactive" }
            : r
        )
      );
      showToast(
        role.active ? "Role deactivated" : "Role activated",
        "success"
      );
    } catch (err) {
      showApiError(err, "UPDATE_ROLE_STATUS");
    }
  };

  const handleFilterChange = (key, value) => {
    setFilterValue(value);
  };

  return (
    <div>
      <div className="settings-action-bar">
        <div className="settings-action-bar-left" />
        <div className="settings-action-bar-right">
          {hasPermission("create_role") && (
            <Button
              label="Add new role"
              variant="dark"
              icon={<FaPlus />}
              iconPosition="left"
              width="auto"
              onClick={() => navigate("/settings/roles-permissions/configure")}
            />
          )}
        </div>
      </div>

      {loading ? (
        <SkeletonTable rows={5} cols={columns.length} />
      ) : (
        <CustomTable
          data={roles}
          columns={columns}
          actions={actions}
          filters={filters}
          onFilterChange={handleFilterChange}
          showCheckbox={false}
          itemsPerPage={10}
          tableName="Roles"
          onToggleActive={
            hasPermission("activate_role") && hasPermission("deactivate_role")
              ? handleToggleActive
              : undefined
          }
        />
      )}
    </div>
  );
};

export default Roles;
