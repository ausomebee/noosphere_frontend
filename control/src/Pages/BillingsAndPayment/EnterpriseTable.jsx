import React, { useMemo } from "react";
import CustomTable from "../../Components/Table/CustomTable";

const EnterpriseTable = ({ plans, onStatusChange, onEdit, onDelete, onViewProfile }) => {
  const columns = [
    { key: "organization", header: "Organization" },
    { key: "dateAdded", header: "Date Added" },
    { key: "accountManager", header: "Account Manager" },
    { key: "active", header: "Active", type: "active" },
  ];

  const tableData = useMemo(
    () =>
      plans.map((plan) => ({
        ...plan,
        organization: plan.tenantName || plan.organization || "—",
        accountManager: plan.accountManagerName || "—",
        active: plan.status === "active",
        hasActions: true,
        _raw: plan,
      })),
    [plans]
  );

  const actions = [
    {
      label: "View Organization Profile",
      onClick: (row) => onViewProfile(row._raw),
    },
    {
      label: "Edit Plan",
      onClick: (row) => onEdit(row._raw, "enterprise"),
    },
    {
      label: "Remove Plan",
      className: "remove",
      onClick: (row) => onDelete(row._raw, "enterprise"),
    },
  ];

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
      onToggleActive={handleToggleActive}
    />
  );
};

export default EnterpriseTable;
