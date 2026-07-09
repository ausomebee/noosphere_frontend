import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { FaPlus } from "react-icons/fa";
import CustomTable from "../../../Components/Table/CustomTable";
import ReusableModal from "../../../Components/ReusableModal/ReusableModal";
import { TextInput, SelectInput, MultiSelectInput } from "../../../Components/Input/Inputs";
import Button from "../../../Components/Button/Button";
import { showToast, showApiError } from "../../../Helper/ShowToast";
import useAuth from "../../../hooks/useAuth";
import departmentApi from "../../../api/departmentApis";
import { SkeletonTable } from "../../../Components/LoadingSpinner";

const schema = yup.object().shape({
  name: yup.string().required("Department name is required").trim(),
  teamLeadId: yup.string().required("Department lead is required"),
  members: yup.array().of(yup.string()).optional(),
});

const defaultValues = {
  name: "",
  teamLeadId: "",
  members: [],
};

const Departments = () => {
  const { userId, accessToken, refreshToken } = useAuth();
  const [departments, setDepartments] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterValue, setFilterValue] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues,
  });

  const membersValue = watch("members");

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [deptRes, adminRes] = await Promise.allSettled([
        departmentApi.GetAllDepartments({ accessToken, refreshToken }),
        departmentApi.GetAllAdmins({ accessToken, refreshToken }),
      ]);
      if (deptRes.status === "fulfilled") {
        setDepartments(deptRes.value.data || []);
      } else {
        showApiError(deptRes.reason, "LOAD_DEPARTMENTS");
      }
      if (adminRes.status === "fulfilled") {
        setAdmins(adminRes.value.data || []);
      } else {
        if (import.meta.env.DEV) console.warn("Admin list unavailable:", adminRes.reason?.message);
      }
    } catch (err) {
      showApiError(err, "LOAD_DEPARTMENTS");
    } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const adminMap = useMemo(() => {
    const map = {};
    admins.forEach((a) => {
      map[a.id] = `${a.firstName} ${a.lastName}`.trim();
    });
    return map;
  }, [admins]);

  const adminOptions = useMemo(
    () => [
      { value: "", label: "Select a lead" },
      ...admins.map((a) => ({ value: a.id, label: `${a.firstName} ${a.lastName}`.trim() })),
    ],
    [admins]
  );

  const memberOptions = useMemo(
    () => admins.map((a) => ({ value: a.id, label: `${a.firstName} ${a.lastName}`.trim() })),
    [admins]
  );

  const filters = useMemo(
    () => [
      {
        key: "filter_type",
        value: filterValue,
        options: [
          { value: "", label: "Filters" },
          { value: "teamLead", label: "Team Lead" },
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
      departments.map((dept) => ({
        id: dept.id,
        department: dept.name,
        teamLead: dept.teamLead
          ? `${dept.teamLead.firstName} ${dept.teamLead.lastName}`.trim()
          : adminMap[dept.teamLeadId] || "—",
        members: dept._count?.departmentMembers ?? 0,
        active: dept.isActive,
        hasActions: true,
        _raw: dept,
      })),
    [departments, adminMap]
  );

  const columns = [
    { key: "department", header: "Department" },
    { key: "teamLead", header: "Team Lead" },
    { key: "members", header: "Members" },
    { key: "active", header: "Active", type: "active" },
  ];

  const actions = [
    {
      label: "Edit Department",
      onClick: (row) => {
        const raw = row._raw;
        setEditingDepartment(raw);
        reset({
          name: raw.name,
          teamLeadId: raw.teamLeadId || "",
          members: raw.members || [],
        });
        setIsModalOpen(true);
      },
    },
    {
      label: "Remove Department",
      className: "remove",
      onClick: async (row) => {
        try {
          await departmentApi.DeleteDepartment({
            id: row.id,
            accessToken,
            refreshToken,
          });
          setDepartments((prev) => prev.filter((d) => d.id !== row.id));
          showToast("Department removed", "success");
        } catch (err) {
          showApiError(err, "DELETE_DEPARTMENT");
        }
      },
    },
  ];

  const handleToggleActive = async (rowIndex) => {
    const dept = tableData[rowIndex];
    if (!dept) return;
    const newActive = !dept.active;
    try {
      await departmentApi.ToggleDepartmentActive({
        id: dept.id,
        active: newActive,
        accessToken,
        refreshToken,
      });
      setDepartments((prev) =>
        prev.map((d) =>
          d.id === dept.id ? { ...d, isActive: newActive } : d
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
        name: formData.name,
        createdByAdminId: userId,
        teamLeadId: formData.teamLeadId,
        members: formData.members || [],
        accessToken,
        refreshToken,
      };

      if (editingDepartment) {
        await departmentApi.UpdateDepartment({
          id: editingDepartment.id,
          ...payload,
        });
        showToast("Department updated successfully", "success");
      } else {
        await departmentApi.CreateDepartment(payload);
        showToast("Department added successfully", "success");
      }
      handleCloseModal();
      fetchData();
    } catch (err) {
      showApiError(err, "SAVE_DEPARTMENT");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingDepartment(null);
    reset(defaultValues);
  };

  return (
    <div>
      <div className="settings-action-bar">
        <div className="settings-action-bar-left" />
        <div className="settings-action-bar-right">
          <Button
            label="Add new department"
            variant="dark"
            icon={<FaPlus />}
            iconPosition="left"
            width="auto"
            onClick={() => setIsModalOpen(true)}
          />
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
          onToggleActive={handleToggleActive}
          showCheckbox={false}
          itemsPerPage={10}
          tableName="Departments"
        />
      )}

      <ReusableModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingDepartment ? "Edit department" : "Add a new department"}
        primaryButtonText="Save"
        secondaryButtonText="Cancel"
        onPrimaryButtonClick={handleSubmit(handleSave)}
        onSecondaryButtonClick={handleCloseModal}
        primaryButtonLoading={isSubmitting}
      >
        <form>
          <TextInput
            required
            label="Department name"
            placeholder="Enter department name"
            error={errors.name?.message}
            {...register("name")}
          />
          <SelectInput
            required
            label="Department Lead"
            options={adminOptions}
            error={errors.teamLeadId?.message}
            {...register("teamLeadId")}
            emptyHint="No staff found. Create one in Settings → Staff."
          />
          <MultiSelectInput
            label="Members"
            options={memberOptions}
            value={membersValue || []}
            onChange={(val) => setValue("members", val)}
            placeholder="Select members..."
            error={errors.members?.message}
            usePortal
            dropDirection="up"
          />
        </form>
      </ReusableModal>
    </div>
  );
};

export default Departments;
