import React, { useMemo } from "react";
import CustomTable from "../../Components/Table/CustomTable";
import usePermission from "../../hooks/usePermission";

const EnterpriseTable = ({ plans, onStatusChange, onEdit, onDelete }) => {
  const { hasPermission } = usePermission();
  const columns = [
    { key: "enterpriseName", header: "Enterprise Name" },
    { key: "dateAdded", header: "Date Added" },
    { key: "accountManager", header: "Manager" },
    { key: "active", header: "Active", type: "active" },
  ];

  const tableData = useMemo(
    () =>
      plans.map((plan) => ({
        ...plan,
        enterpriseName: plan.name || plan.organization || "—",
        accountManager: plan.accountManagerName || "—",
        active: plan.status === "active",
        hasActions: true,
        _raw: plan,
      })),
    [plans]
  );

  const actions = [
    hasPermission("edit_plan") && {
      label: "Edit Plan",
      onClick: (row) => onEdit(row._raw, "enterprise"),
    },
    hasPermission("delete_plan") && {
      label: "Remove Plan",
      className: "remove",
      onClick: (row) => onDelete(row._raw, "enterprise"),
    },
  ].filter(Boolean);

  const handleToggleActive = (rowIndex) => {
    const row = tableData[rowIndex];
    if (!row) return;
    const action = row.active ? "deactivate" : "activate";
    onStatusChange(row._raw, action, "enterprise");
  };

  return (
    <CustomTable
      data={tableData}
      columns={columns}
      actions={actions}
      showCheckbox={false}
      itemsPerPage={10}
      tableName="Enterprise Plans"
      onToggleActive={
        hasPermission("activate_plan") && hasPermission("deactivate_plan")
          ? handleToggleActive
          : undefined
      }
    />
  );
};

export default EnterpriseTable;
