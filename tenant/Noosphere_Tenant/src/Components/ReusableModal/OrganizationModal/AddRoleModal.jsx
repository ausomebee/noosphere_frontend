import React, { useState, useEffect, useCallback } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { debounce } from "lodash";
import ReusableModal from "../ReusableModal";
import { SelectInput, TextInput, CheckboxInput, SwitchInput } from "../../Input/Inputs";
import Button from "../../Button/Button";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";

// Schema definition for form validation
const schema = yup.object().shape({
  roleName: yup.string().required("Role Name is required"),
  parentRole: yup.string().nullable(),
  permissions: yup.object().shape({
    Dashboard: yup.object().shape({
      enabled: yup.boolean(),
      view: yup.boolean(),
      manage: yup.boolean(),
    }).default({ enabled: false, view: false, manage: false }),
    Scheduler: yup.object().shape({
      enabled: yup.boolean(),
      view: yup.boolean(),
      create: yup.boolean(),
      edit: yup.boolean(),
      cancel: yup.boolean(),
      reschedule: yup.boolean(),
    }).default({ enabled: false, view: false, create: false, edit: false, cancel: false, reschedule: false }),
    Clients: yup.object().shape({
      enabled: yup.boolean(),
      view: yup.boolean(),
      create: yup.boolean(),
      edit: yup.boolean(),
      pipeline: yup.boolean(),
      documents: yup.boolean(),
    }).default({ enabled: false, view: false, create: false, edit: false, pipeline: false, documents: false }),
    MyOrganization: yup.object().shape({
      enabled: yup.boolean(),
      view: yup.boolean(),
      manage: yup.boolean(),
      settings: yup.boolean(),
    }).default({ enabled: false, view: false, manage: false, settings: false }),
    BillingsPayments: yup.object().shape({
      enabled: yup.boolean(),
      view: yup.boolean(),
      process: yup.boolean(),
      generate: yup.boolean(),
      reports: yup.boolean(),
    }).default({ enabled: false, view: false, process: false, generate: false, reports: false }),
    Programs: yup.object().shape({
      enabled: yup.boolean(),
      view: yup.boolean(),
      create: yup.boolean(),
      edit: yup.boolean(),
      assign: yup.boolean(),
    }).default({ enabled: false, view: false, create: false, edit: false, assign: false }),
    CustomForms: yup.object().shape({
      enabled: yup.boolean(),
      view: yup.boolean(),
      create: yup.boolean(),
      edit: yup.boolean(),
      assign: yup.boolean(),
    }).default({ enabled: false, view: false, create: false, edit: false, assign: false }),
    Reports: yup.object().shape({
      enabled: yup.boolean(),
      view: yup.boolean(),
      generate: yup.boolean(),
      export: yup.boolean(),
      schedule: yup.boolean(),
    }).default({ enabled: false, view: false, generate: false, export: false, schedule: false }),
  }).default({
    Dashboard: { enabled: false, view: false, manage: false },
    Scheduler: { enabled: false, view: false, create: false, edit: false, cancel: false, reschedule: false },
    Clients: { enabled: false, view: false, create: false, edit: false, pipeline: false, documents: false },
    MyOrganization: { enabled: false, view: false, manage: false, settings: false },
    BillingsPayments: { enabled: false, view: false, process: false, generate: false, reports: false },
    Programs: { enabled: false, view: false, create: false, edit: false, assign: false },
    CustomForms: { enabled: false, view: false, create: false, edit: false, assign: false },
    Reports: { enabled: false, view: false, generate: false, export: false, schedule: false },
  }),
});

const AddRoleModal = ({
  isOpen,
  onClose,
  onSubmit,
  mode,
  initialData,
}) => {
  const [activeTab, setActiveTab] = useState("Basic");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  const [expandedAccordions, setExpandedAccordions] = useState({
    Dashboard: false,
    Scheduler: false,
    Clients: false,
    MyOrganization: false,
    BillingsPayments: false,
    Programs: false,
    CustomForms: false,
    Reports: false,
  });

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    control,
    formState: { errors, isDirty },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      roleName: "",
      parentRole: "",
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
      ...(mode === "edit" && initialData ? initialData : {}),
    },
  });

  const values = useWatch({ control });

  // Debounced function to save form data to localStorage
  const saveDraftToLocalStorage = useCallback(
    debounce((formData) => {
      localStorage.setItem("roleFormDraft", JSON.stringify(formData));
    }, 500),
    []
  );

  // Auto-save to localStorage and track changes
  useEffect(() => {
    if (!isOpen) return;

    if (isDirty) {
      saveDraftToLocalStorage(values);
    }

    if (mode === "edit" && initialData) {
      const hasFormChanges =
        isDirty || JSON.stringify(values) !== JSON.stringify(initialData);
      setHasChanges(hasFormChanges);
    }
  }, [isOpen, values, mode, initialData, isDirty, saveDraftToLocalStorage]);

  // Load/Reset form data
  useEffect(() => {
    if (!isOpen) {
      localStorage.removeItem("roleFormDraft");
      reset({
        roleName: "",
        parentRole: "",
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
      });
      setActiveTab("Basic");
      setHasChanges(false);
      setExpandedAccordions({
        Dashboard: false,
        Scheduler: false,
        Clients: false,
        MyOrganization: false,
        BillingsPayments: false,
        Programs: false,
        CustomForms: false,
        Reports: false,
      });
      return;
    }

    const storedDraft = localStorage.getItem("roleFormDraft");
    const source = mode === "edit" || mode === "view" ? initialData : storedDraft ? JSON.parse(storedDraft) : {};

    if (source && Object.keys(source).length > 0) {
      reset(source);
    } else {
      reset({
        roleName: "",
        parentRole: "",
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
      });
    }

    setHasChanges(false);
  }, [isOpen, mode, initialData, reset]);

  // Tab navigation
  const tabsList = mode === "view" ? ["Team Permission"] : ["Basic", "Team Permission"];

  const validateTab = (tabName) => {
    if (mode === "view") return true;
    const fields = {
      Basic: ["roleName", "parentRole"],
      "Team Permission": ["permissions"],
    };

    const tabFields = fields[tabName];
    if (!tabFields) return true;
    const invalid = tabFields.find((field) => errors[field]);

    if (invalid) {
      setSubmitError(`Please fix errors in the ${tabName} tab`);
      return false;
    }
    setSubmitError("");
    return true;
  };

  const handleNext = () => {
    const idx = tabsList.indexOf(activeTab);
    if (idx < tabsList.length - 1 && validateTab(activeTab)) {
      setActiveTab(tabsList[idx + 1]);
    }
  };

  const handleFormSubmit = async (data) => {
    if (Object.keys(errors).length) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const payload = {
        id: mode === "edit" && data.id ? data.id : undefined,
        roleName: data.roleName || "",
        parentRole: data.parentRole || "",
        permissions: data.permissions || {},
      };
      await onSubmit(payload);
      localStorage.removeItem("roleFormDraft");
      reset({
        roleName: "",
        parentRole: "",
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
      });
      setActiveTab("Basic");
      setHasChanges(false);
      setExpandedAccordions({
        Dashboard: false,
        Scheduler: false,
        Clients: false,
        MyOrganization: false,
        BillingsPayments: false,
        Programs: false,
        CustomForms: false,
        Reports: false,
      });
      onClose();
    } catch (e) {
      console.error("Submit failed:", e);
      setSubmitError(e.message || "Save failed. Check the data and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrevious = () => {
    const idx = tabsList.indexOf(activeTab);
    if (idx > 0) {
      setActiveTab(tabsList[idx - 1]);
    }
  };

  const handleClose = () => {
    localStorage.removeItem("roleFormDraft");
    reset({
      roleName: "",
      parentRole: "",
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
    });
    setActiveTab("Basic");
    setSubmitError("");
    setHasChanges(false);
    setExpandedAccordions({
      Dashboard: false,
      Scheduler: false,
      Clients: false,
      MyOrganization: false,
      BillingsPayments: false,
      Programs: false,
      CustomForms: false,
      Reports: false,
    });
    onClose();
  };

  // Dummy parent role options
  const parentRoleOptions = [
    { value: "Agency Admin", label: "Agency Admin" },
    { value: "Manager", label: "Manager" },
    { value: "Supervisor", label: "Supervisor" },
    { value: "-", label: "None" },
  ];

  // Toggle accordion state
  const toggleAccordion = (moduleName) => {
    setExpandedAccordions((prev) => ({
      ...prev,
      [moduleName]: !prev[moduleName],
    }));
  };

  // Permission modules configuration with descriptions
  const permissionModules = [
    {
      name: "Dashboard",
      description: "Control access to the organization dashboard and analytics",
      actions: [
        { name: "view", label: "View Dashboard Cards", description: "Allow viewing of summary cards and metrics" },
        { name: "manage", label: "Manage Dashboard Layout", description: "Allow rearranging and customizing dashboard widgets" },
      ],
    },
    {
      name: "Scheduler",
      description: "Manage appointment scheduling and calendar access",
      actions: [
        { name: "view", label: "View Appointments", description: "Allow viewing all team appointments" },
        { name: "create", label: "Create Appointments", description: "Allow creating new appointments for team members" },
        { name: "edit", label: "Edit Appointments", description: "Allow modifying existing appointments" },
        { name: "cancel", label: "Cancel Appointments", description: "Allow canceling scheduled appointments" },
        { name: "reschedule", label: "Approve Reschedule Requests", description: "Allow approving client reschedule requests" },
      ],
    },
    {
      name: "Clients",
      description: "Manage client information and pipeline access",
      actions: [
        { name: "view", label: "View Client Information", description: "Allow viewing client details and history" },
        { name: "create", label: "Add New Clients", description: "Allow adding new clients to the system" },
        { name: "edit", label: "Edit Client Information", description: "Allow modifying client details and documents" },
        { name: "pipeline", label: "Manage Client Pipeline", description: "Allow moving clients between pipeline stages" },
        { name: "documents", label: "Request Client Documents", description: "Allow requesting documents from clients" },
      ],
    },
    {
      name: "MyOrganization",
      description: "Manage organization settings and staff information",
      actions: [
        { name: "view", label: "View Organization Info", description: "Allow viewing organization details and settings" },
        { name: "manage", label: "Manage Staff Information", description: "Allow adding/editing staff members and teams" },
        { name: "settings", label: "Edit Organization Settings", description: "Allow modifying organization-wide settings" },
      ],
    },
    {
      name: "BillingsPayments",
      description: "Handle billing, payments, and financial operations",
      actions: [
        { name: "view", label: "View Billing Information", description: "Allow viewing invoices and payment history" },
        { name: "process", label: "Process Payments", description: "Allow processing payments and refunds" },
        { name: "generate", label: "Generate Invoices", description: "Allow creating new invoices for clients" },
        { name: "reports", label: "View Financial Reports", description: "Allow accessing financial reports and analytics" },
      ],
    },
    {
      name: "Programs",
      description: "Manage therapy programs and service offerings",
      actions: [
        { name: "view", label: "View Programs", description: "Allow viewing available programs" },
        { name: "create", label: "Create New Programs", description: "Allow creating new therapy programs" },
        { name: "edit", label: "Edit Existing Programs", description: "Allow modifying program details and settings" },
        { name: "assign", label: "Assign Programs to Clients", description: "Allow assigning programs to specific clients" },
      ],
    },
    {
      name: "CustomForms",
      description: "Create and manage custom forms and assessments",
      actions: [
        { name: "view", label: "View Custom Forms", description: "Allow viewing available custom forms" },
        { name: "create", label: "Create New Forms", description: "Allow creating new custom forms" },
        { name: "edit", label: "Edit Existing Forms", description: "Allow modifying existing form templates" },
        { name: "assign", label: "Assign Forms to Clients", description: "Allow assigning forms to clients for completion" },
      ],
    },
    {
      name: "Reports",
      description: "Access and generate system reports",
      actions: [
        { name: "view", label: "View Reports", description: "Allow viewing available report templates" },
        { name: "generate", label: "Generate Reports", description: "Allow generating new reports with current data" },
        { name: "export", label: "Export Reports", description: "Allow exporting reports to PDF/Excel formats" },
        { name: "schedule", label: "Schedule Reports", description: "Allow scheduling automatic report generation" },
      ],
    },
  ];

  const buildTabs = () => [
    ...(mode !== "view" ? [{
      name: "Basic",
      content: (
        <div className="space-y-4">
          <TextInput
            label="Role Name"
            {...register("roleName")}
            error={errors.roleName?.message}
            placeholder="Enter Role Name"
            disabled={mode === "view"}
          />
          <Controller
            name="parentRole"
            control={control}
            render={({ field }) => (
              <SelectInput
                label="Parent Role"
                placeholder="Select Parent Role"
                options={parentRoleOptions}
                width="full"
                className="rounded-12px"
                isSearchable={true}
                isMulti={false}
                error={errors.parentRole?.message}
                disabled={mode === "view"}
                {...field}
              />
            )}
          />
        </div>
      ),
    }] : []),
    {
      name: "Team Permission",
      content: (
        <div className="space-y-4">
          {permissionModules.map((module) => (
            <div key={module.name} className="overflow-hidden shadow-sm">
              <div
                className="p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => toggleAccordion(module.name)}
              >
                <div className="flex items-center gap-3">
                  <CheckboxInput
                    checked={values.permissions?.[module.name]?.enabled || false}
                    onChange={(e) => {
                      if (mode === "view") return;
                      const checked = e.target.checked;
                      setValue(`permissions.${module.name}.enabled`, checked, { shouldDirty: true });
                      module.actions.forEach((action) => {
                        setValue(`permissions.${module.name}.${action.name}`, checked, {
                          shouldDirty: true,
                        });
                      });
                    }}
                    disabled={mode === "view"}
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-600 my-3">{module.name.replace(/([A-Z])/g, ' $1').trim()}</div>
                  </div>
                  <button
                    type="button"
                    className="text-blue-500 hover:text-blue-700 ml-2"
                  >
                    {expandedAccordions[module.name] ? (
                      <FaChevronUp className="text-lg" color="#004ABA" />
                    ) : (
                      <FaChevronDown className="text-lg" color="#004ABA" />
                    )}
                  </button>
                </div>
              </div>
              {expandedAccordions[module.name] && (
                <div className="p-4 border-t bg-white">
                  <div className="text-sm text-gray-600 mb-3">
                    Configure specific permissions for this module
                  </div>
                  <div className="space-y-3">
                    {module.actions.map((action) => (
                      <div key={action.name} className="flex items-start gap-3">
                        <div className="mt-1">
                          <SwitchInput
                            checked={values.permissions?.[module.name]?.[action.name] || false}
                            onChange={(e) => {
                              if (mode === "view") return;
                              setValue(`permissions.${module.name}.${action.name}`, e.target.checked, {
                                shouldDirty: true,
                              });
                            }}
                            disabled={mode === "view" || !values.permissions?.[module.name]?.enabled}
                          />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-700">{action.label}</div>
                          <div className="text-xs text-gray-500">{action.description}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ),
    },
  ];

  // Button text logic
  const getPrimaryButtonText = () => {
    if (mode === "view") return "Close";
    if (mode === "edit") {
      return hasChanges ? "Save Changes" : "Next";
    }
    return activeTab === "Team Permission" ? "Save Role" : "Next";
  };

  const getSecondaryButtonText = () => {
    if (mode === "view") return null;
    return activeTab === "Basic" ? "Cancel" : "Previous";
  };

  const getPrimaryButtonAction = () => {
    if (mode === "view") return handleClose;
    if (activeTab === "Team Permission") {
      return handleSubmit(handleFormSubmit);
    }
    return handleNext;
  };

  return (
    <ReusableModal
      key={isOpen ? "open" : "closed"}
      isOpen={isOpen}
      onClose={handleClose}
      title={mode === "view" ? "View Permissions" : mode === "edit" ? "Edit Role" : "Add a new Role"}
      primaryButtonText={getPrimaryButtonText()}
      secondaryButtonText={getSecondaryButtonText()}
      tabs={buildTabs()}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onPrimaryButtonClick={getPrimaryButtonAction()}
      onSecondaryButtonClick={activeTab === "Basic" || mode === "view" ? handleClose : handlePrevious}
      size="lg"
      primaryButtonLoading={submitting}
    />
  );
};

export default AddRoleModal;