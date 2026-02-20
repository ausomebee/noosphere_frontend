import React, { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { FaPlus } from "react-icons/fa";
import CustomTable from "../../../Components/Table/CustomTable";
import ReusableModal from "../../../Components/ReusableModal/ReusableModal";
import { TextInput, SelectInput } from "../../../Components/Input/Inputs";
import Button from "../../../Components/Button/Button";
import { showToast } from "../../../Helper/ShowToast";

const schema = yup.object().shape({
  roleName: yup.string().required("Role name is required").trim(),
  department: yup.string().required("Department is required"),
});

const defaultValues = {
  roleName: "",
  department: "",
};

const initialRoles = [
  { id: "1", role: "Super Admin", department: "All", active: true, status: "Active", hasActions: true },
  { id: "2", role: "Admin", department: "All", active: true, status: "Active", hasActions: true },
  { id: "3", role: "Account Officer", department: "Business Development", active: true, status: "Active", hasActions: true },
  { id: "4", role: "Support Officer", department: "Customer Service", active: true, status: "Active", hasActions: true },
  { id: "5", role: "Billing Officer", department: "Finance", active: true, status: "Active", hasActions: true },
  { id: "6", role: "Sales Officer", department: "Finance", active: true, status: "Active", hasActions: true },
];

const departmentOptions = [
  { value: "", label: "Select" },
  { value: "All", label: "All" },
  { value: "Admin", label: "Admin" },
  { value: "Business Development", label: "Business Development" },
  { value: "Customer Service", label: "Customer Service" },
  { value: "Finance", label: "Finance" },
];

const Roles = () => {
  const [roles, setRoles] = useState(initialRoles);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [filterValue, setFilterValue] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues,
  });

  const columns = [
    { key: "role", header: "Role" },
    { key: "department", header: "Department" },
    { key: "status", header: "Status", type: "status" },
  ];

  const filters = useMemo(
    () => [
      {
        key: "filter_type",
        value: filterValue,
        options: [
          { value: "", label: "Filters" },
          { value: "department", label: "Department" },
          { value: "active", label: "Status" },
          { value: "clear_filters", label: "Clear Filters" },
        ],
      },
    ],
    [filterValue]
  );

  const actions = [
    {
      label: "Edit Role",
      onClick: (row) => {
        setEditingRole(row);
        setValue("roleName", row.role);
        setValue("department", row.department);
        setIsModalOpen(true);
      },
    },
    {
      label: "Remove Role",
      className: "remove",
      onClick: (row) => {
        setRoles((prev) => prev.filter((r) => r.id !== row.id));
        showToast("Role removed", "success");
      },
    },
  ];

  const handleToggleActive = (rowIndex) => {
    setRoles((prev) =>
      prev.map((role, i) =>
        i === rowIndex
          ? { ...role, active: !role.active, status: !role.active ? "Active" : "Inactive" }
          : role
      )
    );
  };

  const handleFilterChange = (key, value) => {
    setFilterValue(value);
  };

  const handleSave = (formData) => {
    if (editingRole) {
      setRoles((prev) =>
        prev.map((r) =>
          r.id === editingRole.id
            ? { ...r, role: formData.roleName, department: formData.department }
            : r
        )
      );
      showToast("Role updated successfully", "success");
    } else {
      const newRole = {
        id: String(Date.now()),
        role: formData.roleName,
        department: formData.department,
        active: true,
        status: "Active",
        hasActions: true,
      };
      setRoles((prev) => [...prev, newRole]);
      showToast("Role added successfully", "success");
    }
    handleCloseModal();
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingRole(null);
    reset(defaultValues);
  };

  return (
    <div>
      <div className="settings-action-bar">
        <div className="settings-action-bar-left" />
        <div className="settings-action-bar-right">
          <Button
            label="Add new role"
            variant="dark"
            icon={<FaPlus />}
            iconPosition="left"
            width="auto"
            onClick={() => setIsModalOpen(true)}
          />
        </div>
      </div>

      <CustomTable
        data={roles}
        columns={columns}
        actions={actions}
        filters={filters}
        onFilterChange={handleFilterChange}
        showCheckbox={false}
        itemsPerPage={10}
        tableName="Roles"
        onToggleActive={handleToggleActive}
      />

      <ReusableModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingRole ? "Edit role" : "Add a new role"}
        primaryButtonText="Save"
        secondaryButtonText="Cancel"
        onPrimaryButtonClick={handleSubmit(handleSave)}
        onSecondaryButtonClick={handleCloseModal}
      >
        <form>
          <TextInput
            label="Role Name"
            placeholder="Type something"
            error={errors.roleName?.message}
            {...register("roleName")}
          />
          <SelectInput
            label="Department"
            options={departmentOptions}
            error={errors.department?.message}
            {...register("department")}
          />
        </form>
      </ReusableModal>
    </div>
  );
};

export default Roles;
