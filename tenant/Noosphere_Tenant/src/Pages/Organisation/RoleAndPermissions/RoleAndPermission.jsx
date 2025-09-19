import React, { useState } from "react";
import DashboardLayout from "../../../Layout/TenantLayout";
import { FaPlus } from "react-icons/fa";
import CustomTable from "../../../Components/Table/CustomTable";
import Button from "../../../Components/Button/Button";
import AddRoleModal from "../../../Components/ReusableModal/OrganizationModal/AddRoleModal";

const RoleAndPermission = () => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add"); // "add", "edit", or "view"
  const [modalType, setModalType] = useState("editRole"); // "editRole" or "viewPermissions"
  const [selectedRow, setSelectedRow] = useState(null);

  const columns = [
    { header: "Role", key: "roleName", type: "text" },
    { header: "Parent", key: "parentRole", type: "text" },
    { header: "Active", key: "toggleActive", type: "active" },
  ];

  const tableData = [
    {
      id: 1,
      roleName: "Michael Jackson",
      parentRole: "Agency Admin",
      toggleActive: true,
      hasActions: true,
      permissions: {
        Dashboard: { enabled: true, view: true, manage: false },
        Scheduler: { enabled: true, view: true, create: true, edit: false, cancel: false, reschedule: false },
        Clients: { enabled: false, view: false, create: false, edit: false, pipeline: false, documents: false },
        MyOrganization: { enabled: false, view: false, manage: false, settings: false },
        BillingsPayments: { enabled: false, view: false, process: false, generate: false, reports: false },
        Programs: { enabled: false, view: false, create: false, edit: false, assign: false },
        CustomForms: { enabled: false, view: false, create: false, edit: false, assign: false },
        Reports: { enabled: false, view: false, generate: false, export: false, schedule: false },
      },
    },
    {
      id: 2,
      roleName: "Michael Jackson",
      parentRole: "-",
      toggleActive: true,
      hasActions: true,
      permissions: {
        Dashboard: { enabled: false, view: false, manage: false },
        Scheduler: { enabled: false, view: false, create: false, edit: false, cancel: false, reschedule: false },
        Clients: { enabled: true, view: true, create: true, edit: true, pipeline: false, documents: false },
        MyOrganization: { enabled: false, view: false, manage: false, settings: false },
        BillingsPayments: { enabled: false, view: false, process: false, generate: false, reports: false },
        Programs: { enabled: false, view: false, create: false, edit: false, assign: false },
        CustomForms: { enabled: false, view: false, create: false, edit: false, assign: false },
        Reports: { enabled: false, view: false, generate: false, export: false, schedule: false },
      },
    },
    {
      id: 3,
      roleName: "Michael Jackson",
      parentRole: "Agency Admin",
      toggleActive: true,
      hasActions: true,
      permissions: {
        Dashboard: { enabled: true, view: true, manage: true },
        Scheduler: { enabled: true, view: true, create: true, edit: true, cancel: true, reschedule: true },
        Clients: { enabled: true, view: true, create: true, edit: true, pipeline: true, documents: true },
        MyOrganization: { enabled: true, view: true, manage: true, settings: true },
        BillingsPayments: { enabled: true, view: true, process: true, generate: true, reports: true },
        Programs: { enabled: true, view: true, create: true, edit: true, assign: true },
        CustomForms: { enabled: true, view: true, create: true, edit: true, assign: true },
        Reports: { enabled: true, view: true, generate: true, export: true, schedule: true },
      },
    },
    {
      id: 4,
      roleName: "Michael Jackson",
      parentRole: "Agency Admin",
      toggleActive: true,
      hasActions: true,
      permissions: {
        Dashboard: { enabled: false, view: false, manage: false },
        Scheduler: { enabled: false, view: false, create: false, edit: false, cancel: false, reschedule: false },
        Clients: { enabled: false, view: false, create: false, edit: false, pipeline: false, documents: false },
        MyOrganization: { enabled: false, view: false, manage: false, settings: false },
        BillingsPayments: { enabled: false, view: false, process: false, generate: false, reports: false },
        Programs: { enabled: false, view: false, create: false, edit: false, assign: false },
        CustomForms: { enabled: false, view: false, create: false, edit: false, assign: false },
        Reports: { enabled: false, view: false, generate: false, export: false, schedule: false },
      },
    },
    {
      id: 5,
      roleName: "Michael Jackson",
      parentRole: "Agency Admin",
      toggleActive: true,
      hasActions: true,
      permissions: {
        Dashboard: { enabled: true, view: true, manage: false },
        Scheduler: { enabled: true, view: true, create: false, edit: false, cancel: false, reschedule: false },
        Clients: { enabled: true, view: true, create: false, edit: false, pipeline: false, documents: false },
        MyOrganization: { enabled: false, view: false, manage: false, settings: false },
        BillingsPayments: { enabled: false, view: false, process: false, generate: false, reports: false },
        Programs: { enabled: false, view: false, create: false, edit: false, assign: false },
        CustomForms: { enabled: false, view: false, create: false, edit: false, assign: false },
        Reports: { enabled: false, view: false, generate: false, export: false, schedule: false },
      },
    },
  ];

  const actions = [
    {
      type: "dropdown",
      label: "Actions",
      items: (row) => [
        {
          label: "Edit Role",
          onClick: () => {
            setSelectedRow(row);
            setModalMode("edit");
            setModalType("editRole");
            setIsAddModalOpen(true);
          },
        },
        {
          label: "View Permissions",
          onClick: () => {
            setSelectedRow(row);
            setModalMode("view");
            setModalType("viewPermissions");
            setIsAddModalOpen(true);
          },
        },
        {
          label: "Deactivate Role",
          onClick: () => {
            // Placeholder for deactivate role functionality
            console.log(`Deactivating role with id: ${row.id}`);
          },
          className: "remove",
        },
      ],
    },
  ];

  const handleAddRoleCreation = () => {
    setSelectedRow(null);
    setModalMode("add");
    setModalType("editRole");
    setIsAddModalOpen(true);
  };

  const handleSubmitRole = async (data) => {
    // Simulate API call to save role
    console.log("Submitting role:", data);
    // Update tableData here with the new or edited role
    setIsAddModalOpen(false);
  };

  return (
    <DashboardLayout>
      <h1 className="appointment-sched-title mb-4">Roles & Permissions</h1>
      <h3 className="text-xl text-gray-700 font-500">
        Manage user roles and permissions securely within your organization
      </h3>

      <div className="justify-end flex mt-6">
        <Button
          label="Create a new role"
          variant="primary"
          icon={<FaPlus />}
          onClick={handleAddRoleCreation}
        />
      </div>

      <div className="mt-6">
        <CustomTable
          data={tableData}
          columns={columns}
          actions={actions}
          showActions={true}
          showCheckbox={false}
          itemsPerPage={10}
          tableName="Role Creation"
        />
      </div>

      <AddRoleModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleSubmitRole}
        mode={modalMode}
        initialData={selectedRow}
      />
    </DashboardLayout>
  );
};

export default RoleAndPermission;