import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { FaPlus } from "react-icons/fa";
import CustomTable from "../../../Components/Table/CustomTable";
import ReusableModal from "../../../Components/ReusableModal/ReusableModal";
import { TextInput, SelectInput } from "../../../Components/Input/Inputs";
import Button from "../../../Components/Button/Button";
import { showToast, showApiError } from "../../../Helper/ShowToast";
import useAuth from "../../../hooks/useAuth";
import usePermission from "../../../hooks/usePermission";
import staffApi from "../../../api/staffApis";
import departmentApi from "../../../api/departmentApis";
import roleApi from "../../../api/roleApis";
import { SkeletonTable } from "../../../Components/LoadingSpinner";
import { formatDate } from "../../../Helper/Formatters";

import { showValidationErrors } from "../../../Helper/formErrors";
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const schema = yup.object().shape({
  firstName: yup
    .string()
    .trim()
    .required("First name is required")
    .min(3, "First name must be at least 3 characters")
    .max(20, "First name must be at most 20 characters"),
  lastName: yup
    .string()
    .trim()
    .required("Last name is required")
    .min(3, "Last name must be at least 3 characters")
    .max(20, "Last name must be at most 20 characters"),
  email: yup
    .string()
    .trim()
    .lowercase()
    .required("Email is required")
    .email("Invalid email")
    .matches(/\.(com|net)$/, "Email must end in .com or .net"),
  phoneNumber: yup
    .string()
    .trim()
    .optional()
    .test(
      "phone-length",
      "Phone number must be between 10 and 15 characters",
      (v) => !v || (v.length >= 10 && v.length <= 15)
    ),
  departmentId: yup
    .string()
    .trim()
    .optional()
    .matches(UUID_REGEX, {
      message: "Invalid department",
      excludeEmptyString: true,
    }),
  roleId: yup
    .string()
    .trim()
    .required("Role is required")
    .matches(UUID_REGEX, "Invalid role"),
});

const defaultValues = {
  firstName: "",
  lastName: "",
  email: "",
  phoneNumber: "",
  departmentId: "",
  roleId: "",
};

const Staff = () => {
  const { accessToken, refreshToken } = useAuth();
  const { hasPermission } = usePermission();
  const [staff, setStaff] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterValue, setFilterValue] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    mode: "onTouched",
    reValidateMode: "onBlur",
    resolver: yupResolver(schema),
    defaultValues,
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [staffRes, deptRes, roleRes] = await Promise.allSettled([
        staffApi.GetAllAdmins({ accessToken, refreshToken }),
        departmentApi.GetAllDepartments({ accessToken, refreshToken }),
        roleApi.GetRolesByModule({ accessToken, refreshToken }),
      ]);
      if (staffRes.status === "fulfilled") {
        setStaff(staffRes.value.data || []);
      } else {
        showApiError(staffRes.reason, "LOAD_STAFF");
      }
      if (deptRes.status === "fulfilled") {
        setDepartments(deptRes.value.data || []);
      } else {
        if (import.meta.env.DEV) console.warn("Departments unavailable:", deptRes.reason?.message);
      }
      if (roleRes.status === "fulfilled") {
        setRoles(roleRes.value.data || []);
      } else {
        if (import.meta.env.DEV) console.warn("Roles unavailable:", roleRes.reason?.message);
      }
    } catch (err) {
      showApiError(err, "LOAD_STAFF");
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const roleMap = useMemo(() => {
    const map = {};
    roles.forEach((r) => {
      map[r.id] = r.name;
    });
    return map;
  }, [roles]);

  const departmentOptions = useMemo(
    () => [
      { value: "", label: "Select department" },
      ...departments.map((d) => ({ value: d.id, label: d.name })),
    ],
    [departments]
  );

  const roleOptions = useMemo(
    () => [
      { value: "", label: "Select role" },
      ...roles.map((r) => ({ value: r.id, label: r.name })),
    ],
    [roles]
  );

  const filters = useMemo(
    () => [
      {
        key: "filter_type",
        value: filterValue,
        options: [
          { value: "", label: "Filters" },
          { value: "role", label: "Role" },
          { value: "active", label: "Status" },
          { value: "clear_filters", label: "Clear Filters" },
        ],
      },
    ],
    [filterValue]
  );

  const handleFilterChange = (key, value) => {
    setFilterValue(value);
  };

  const tableData = useMemo(
    () =>
      staff.map((s) => ({
        id: s.id,
        name: `${s.firstName || ""} ${s.lastName || ""}`.trim() || s.fullName || s.email,
        email: s.email,
        role: roleMap[s.roleId] || s.roles?.name || "—",
        dateAdded: s.createdAt
          ? formatDate(s.createdAt)
          : "—",
        active: s.active,
        hasActions: true,
        _raw: s,
      })),
    [staff, roleMap]
  );

  const columns = [
    { key: "name", header: "Name" },
    { key: "email", header: "Email" },
    { key: "role", header: "Role" },
    { key: "dateAdded", header: "Date Added" },
    { key: "active", header: "Active", type: "active" },
  ];

  const actions = [
    hasPermission("edit_staff") && {
      label: "Edit Staff",
      onClick: (row) => {
        const raw = row._raw;
        const deptId = raw.departmentMembers?.[0]?.departmentId || "";
        setEditingStaff(raw);
        reset({
          firstName: raw.firstName || "",
          lastName: raw.lastName || "",
          email: raw.email || "",
          phoneNumber: raw.phoneNumber || "",
          departmentId: deptId,
          roleId: raw.roleId || "",
        });
        setIsModalOpen(true);
      },
    },
    hasPermission("delete_staff") && {
      label: "Deactivate Staff",
      className: "remove",
      onClick: async (row) => {
        const raw = row._raw;
        const newActive = !raw.active;
        try {
          await staffApi.ToggleAdminActive({
            id: raw.id,
            active: newActive,
            accessToken,
            refreshToken,
          });
          setStaff((prev) =>
            prev.map((s) =>
              s.id === raw.id ? { ...s, active: newActive } : s
            )
          );
          showToast(
            `${row.name} ${newActive ? "activated" : "deactivated"}`,
            "success"
          );
        } catch (err) {
          showApiError(err, "UPDATE_STATUS");
        }
      },
    },
  ].filter(Boolean);

  const handleToggleActive = async (rowIndex) => {
    const row = tableData[rowIndex];
    if (!row) return;
    const newActive = !row.active;
    try {
      await staffApi.ToggleAdminActive({
        id: row.id,
        active: newActive,
        accessToken,
        refreshToken,
      });
      setStaff((prev) =>
        prev.map((s) =>
          s.id === row.id ? { ...s, active: newActive } : s
        )
      );
    } catch (err) {
      showApiError(err, "UPDATE_STATUS");
    }
  };

  const handleSave = async (formData) => {
    try {
      setIsSubmitting(true);
      const payload = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        roleId: formData.roleId,
        accessToken,
        refreshToken,
      };

      // Only send optional fields when the user actually provided them.
      const phoneNumber = formData.phoneNumber?.trim();
      if (phoneNumber) payload.phoneNumber = phoneNumber;
      const departmentId = formData.departmentId?.trim();
      if (departmentId) payload.departmentId = departmentId;

      if (editingStaff) {
        await staffApi.UpdateAdmin({ id: editingStaff.id, ...payload });
        showToast("Staff updated successfully", "success");
      } else {
        await staffApi.CreateAdmin(payload);
        showToast("Staff added successfully", "success");
      }
      handleCloseModal();
      fetchData();
    } catch (err) {
      showApiError(err, "SAVE_STAFF");
    } finally {
      setIsSubmitting(false);
    }
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
          {hasPermission("create_staff") && (
            <Button
              label="Add new staff"
              variant="dark"
              icon={<FaPlus />}
              iconPosition="left"
              width="auto"
              onClick={() => setIsModalOpen(true)}
            />
          )}
        </div>
      </div>

      {loading ? (
        <SkeletonTable rows={5} cols={columns.length} />
      ) : (
        <CustomTable
          data={tableData}
          columns={columns}
          actions={actions}
          filters={filters}
          onFilterChange={handleFilterChange}
          showCheckbox={false}
          itemsPerPage={10}
          tableName="Staff"
          onToggleActive={
            hasPermission("delete_staff") ? handleToggleActive : undefined
          }
        />
      )}

      <ReusableModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingStaff ? "Edit staff" : "Add a new staff"}
        primaryButtonText="Save"
        secondaryButtonText="Cancel"
        onPrimaryButtonClick={handleSubmit(handleSave, showValidationErrors)}
        onSecondaryButtonClick={handleCloseModal}
        primaryButtonLoading={isSubmitting}
      >
        <form>
          <TextInput
            required
            label="First name"
            placeholder="Enter first name"
            error={errors.firstName?.message}
            {...register("firstName")}
          />
          <TextInput
            required
            label="Last name"
            placeholder="Enter last name"
            error={errors.lastName?.message}
            {...register("lastName")}
          />
          <TextInput
            required
            label="Email"
            type="email"
            placeholder="Enter email address"
            error={errors.email?.message}
            {...register("email")}
          />
          <TextInput
            label="Phone"
            placeholder="Enter phone number"
            error={errors.phoneNumber?.message}
            {...register("phoneNumber")}
          />
          <SelectInput
            label="Department"
            options={departmentOptions}
            error={errors.departmentId?.message}
            {...register("departmentId")}
            emptyHint="No departments found. Create one in Settings → Departments."
          />
          <SelectInput
            required
            label="Role"
            options={roleOptions}
            error={errors.roleId?.message}
            {...register("roleId")}
            emptyHint="No roles found. Create one in Settings → Roles & Permissions."
          />
        </form>
      </ReusableModal>
    </div>
  );
};

export default Staff;
