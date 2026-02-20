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
  firstName: yup.string().required("First name is required").trim(),
  lastName: yup.string().required("Last name is required").trim(),
  email: yup.string().email("Invalid email").required("Email is required").trim(),
  phone: yup.string().optional(),
  department: yup.string().required("Department is required"),
  role: yup.string().required("Role is required"),
});

const defaultValues = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  department: "",
  role: "",
};

const initialStaff = [
  { id: "1", name: "Terry G", email: "terry@email.com", role: "Super Admin", dateAdded: "12/10/2024", status: "Active", hasActions: true },
  { id: "2", name: "Jackson Wilford", email: "jacck@email.com", role: "Admin", dateAdded: "12/3/2024", status: "Invite pending", hasActions: true },
  { id: "3", name: "Ola Reese", email: "ola@gmail.com", role: "Sales Officer", dateAdded: "1/10/2024", status: "Invite pending", hasActions: true },
  { id: "4", name: "Jerry McTom", email: "Jerry@gmail.com", role: "Support Officer", dateAdded: "2/1/2024", status: "Deactivated", hasActions: true },
  { id: "5", name: "Kathleeen Ndongmo", email: "kat@gmail.com", role: "Account Officer", dateAdded: "2/1/2024", status: "Active", hasActions: true },
  { id: "6", name: "Joseph Babanawa", email: "jo@gmail.com", role: "Billing Officer", dateAdded: "2/1/2024", status: "Active", hasActions: true },
];

const departmentOptions = [
  { value: "", label: "Select" },
  { value: "Admin", label: "Admin" },
  { value: "Business Development", label: "Business Development" },
  { value: "Customer Service", label: "Customer Service" },
  { value: "Finance", label: "Finance" },
];

const roleOptions = [
  { value: "", label: "Select" },
  { value: "Super Admin", label: "Super Admin" },
  { value: "Admin", label: "Admin" },
  { value: "Account Officer", label: "Account Officer" },
  { value: "Support Officer", label: "Support Officer" },
  { value: "Billing Officer", label: "Billing Officer" },
  { value: "Sales Officer", label: "Sales Officer" },
];

const Staff = () => {
  const [staff, setStaff] = useState(initialStaff);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
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
    { key: "name", header: "Name" },
    { key: "email", header: "Email" },
    { key: "role", header: "Role" },
    { key: "dateAdded", header: "Date Added" },
    { key: "status", header: "Status", type: "status" },
  ];

  const filters = useMemo(
    () => [
      {
        key: "filter_type",
        value: filterValue,
        options: [
          { value: "", label: "Filters" },
          { value: "dateAdded", label: "Date Created" },
          { value: "status", label: "Status" },
          { value: "clear_filters", label: "Clear Filters" },
        ],
      },
    ],
    [filterValue]
  );

  const actions = [
    {
      label: "View Staff",
      onClick: (row) => {
        showToast(`Viewing ${row.name}`, "info");
      },
    },
    {
      label: "Edit Staff information",
      onClick: (row) => {
        const [firstName, ...lastParts] = (row.name || "").split(" ");
        setEditingStaff(row);
        setValue("firstName", firstName);
        setValue("lastName", lastParts.join(" "));
        setValue("email", row.email);
        setValue("phone", row.phone || "");
        setValue("department", row.department || "");
        setValue("role", row.role);
        setIsModalOpen(true);
      },
    },
    {
      label: "Deactivate Staff",
      className: "remove",
      onClick: (row) => {
        setStaff((prev) =>
          prev.map((s) =>
            s.id === row.id ? { ...s, status: "Deactivated" } : s
          )
        );
        showToast(`${row.name} deactivated`, "success");
      },
    },
  ];

  const handleFilterChange = (key, value) => {
    setFilterValue(value);
  };

  const handleSave = (formData) => {
    const fullName = `${formData.firstName} ${formData.lastName}`.trim();

    if (editingStaff) {
      setStaff((prev) =>
        prev.map((s) =>
          s.id === editingStaff.id
            ? {
                ...s,
                name: fullName,
                email: formData.email,
                phone: formData.phone,
                department: formData.department,
                role: formData.role,
              }
            : s
        )
      );
      showToast("Staff updated successfully", "success");
    } else {
      const newStaff = {
        id: String(Date.now()),
        name: fullName,
        email: formData.email,
        phone: formData.phone,
        department: formData.department,
        role: formData.role,
        dateAdded: new Date().toLocaleDateString("en-US"),
        status: "Invite pending",
        hasActions: true,
      };
      setStaff((prev) => [...prev, newStaff]);
      showToast("Staff added successfully", "success");
    }
    handleCloseModal();
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingStaff(null);
    reset(defaultValues);
  };

  return (
    <div>
      <div className="settings-action-bar">
        <div className="settings-action-bar-left" />
        <div className="settings-action-bar-right">
          <Button
            label="Add new staff"
            variant="dark"
            icon={<FaPlus />}
            iconPosition="left"
            width="auto"
            onClick={() => setIsModalOpen(true)}
          />
        </div>
      </div>

      <CustomTable
        data={staff}
        columns={columns}
        actions={actions}
        filters={filters}
        onFilterChange={handleFilterChange}
        showCheckbox={false}
        itemsPerPage={5}
        tableName="Staff"
        hasStatusDot={false}
      />

      <ReusableModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingStaff ? "Edit staff" : "Add a new staff"}
        primaryButtonText="Save"
        secondaryButtonText="Cancel"
        onPrimaryButtonClick={handleSubmit(handleSave)}
        onSecondaryButtonClick={handleCloseModal}
      >
        <form>
          <TextInput
            label="First name"
            placeholder="Type something"
            error={errors.firstName?.message}
            {...register("firstName")}
          />
          <TextInput
            label="Last name"
            placeholder="Type something"
            error={errors.lastName?.message}
            {...register("lastName")}
          />
          <TextInput
            label="Email"
            type="email"
            placeholder="Type something"
            error={errors.email?.message}
            {...register("email")}
          />
          <TextInput
            label="Phone"
            placeholder="Type something"
            error={errors.phone?.message}
            {...register("phone")}
          />
          <SelectInput
            label="Department"
            options={departmentOptions}
            error={errors.department?.message}
            {...register("department")}
          />
          <SelectInput
            label="Role"
            options={roleOptions}
            error={errors.role?.message}
            {...register("role")}
          />
        </form>
      </ReusableModal>
    </div>
  );
};

export default Staff;
