import React, { useState, useEffect, useCallback } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { debounce } from "lodash";
import ReusableModal from "../ReusableModal";
import { SelectInput, TextInput, CheckboxInput, SwitchInput } from "../../Input/Inputs";
import Button from "../../Button/Button";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";
import { showToast } from "../../../Helper/ShowToast";


// Schema definition for form validation
const schema = yup.object().shape({
  teamName: yup.string().required("Team Name is required"),
  teamMember: yup.array().min(1, "At least one Team Member is required"),
  teamLead: yup.string().required("Team Lead is required"),
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

const AddTeamsModal = ({
  isOpen,
  onClose,
  onSubmit,
  mode,
  initialData,
  staffId,
}) => {
  const [activeTab, setActiveTab] = useState("Basic Setup");
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
    Reports: false
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
      teamName: "",
      teamMember: [],
      teamLead: "",
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
      localStorage.setItem("teamFormDraft", JSON.stringify(formData));
    }, 500),
    []
  );

  /* ---------- Auto-save to localStorage and Track Changes ---------- */
  useEffect(() => {
    if (!isOpen) return;

    // Save to localStorage with debounce
    if (isDirty) {
      saveDraftToLocalStorage(values);
    }

    // Track changes for edit mode
    if (mode === "edit" && initialData) {
      const hasFormChanges =
        isDirty || JSON.stringify(values) !== JSON.stringify(initialData);
      setHasChanges(hasFormChanges);
    }
  }, [isOpen, values, mode, initialData, isDirty, saveDraftToLocalStorage]);

  /* ---------- Load/Reset Form Data ---------- */
  useEffect(() => {
    if (!isOpen) {
      localStorage.removeItem("teamFormDraft");
      reset({
        teamName: "",
        teamMember: [],
        teamLead: "",
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
      setActiveTab("Basic Setup");
      setHasChanges(false);
      setExpandedAccordions({
        Dashboard: false,
        Scheduler: false,
        Clients: false,
        MyOrganization: false,
        BillingsPayments: false,
        Programs: false,
        CustomForms: false,
        Reports: false
      });
      return;
    }

    // Load from localStorage or initialData
    const storedDraft = localStorage.getItem("teamFormDraft");
    const source = mode === "edit" && initialData ? initialData : storedDraft ? JSON.parse(storedDraft) : {};
    
    if (source && Object.keys(source).length > 0) {
      reset(source);
      setValue("staffId", staffId, {
        shouldValidate: false,
        shouldDirty: false,
      });
    } else {
      reset({
        teamName: "",
        teamMember: [],
        teamLead: "",
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
        staffId,
      });
    }

    setHasChanges(false);
  }, [isOpen, mode, initialData, staffId, reset, setValue]);

  /* ---------- Tab Navigation ---------- */
  const tabsList = ["Basic Setup", "Team Permission"];

  const validateTab = (tabName) => {
    const fields = {
      "Basic Setup": ["teamName", "teamMember", "teamLead"],
      "Team Permission": ["permissions"],
    };

    const tabFields = fields[tabName];
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
    if (idx < tabsList.length - 1) {
      if (validateTab(activeTab)) {
        setActiveTab(tabsList[idx + 1]);
      } else {
        showToast("Please fill in all required fields before proceeding", "error");
      }
    }
  };

  const onValidationError = (errors) => {
    const firstError = Object.values(errors)[0];
    showToast(firstError?.message || "Please fill in all required fields", "error");
  };

  const handleFormSubmit = async (data) => {
    if (Object.keys(errors).length) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const payload = {
        id: mode === "edit" && data.id ? data.id : undefined,
        teamName: data.teamName || "",
        teamMember: data.teamMember || [],
        teamLead: data.teamLead || "",
        permissions: data.permissions || {},
        staffId: data.staffId || "",
      };
      await onSubmit(payload);
      localStorage.removeItem("teamFormDraft");
      reset({
        teamName: "",
        teamMember: [],
        teamLead: "",
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
      setActiveTab("Basic Setup");
      setHasChanges(false);
      setExpandedAccordions({
        Dashboard: false,
        Scheduler: false,
        Clients: false,
        MyOrganization: false,
        BillingsPayments: false,
        Programs: false,
        CustomForms: false,
        Reports: false
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
    localStorage.removeItem("teamFormDraft");
    reset({
      teamName: "",
      teamMember: [],
      teamLead: "",
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
    setActiveTab("Basic Setup");
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
      Reports: false
    });
    onClose();
  };

  // Dummy staff list for teamMember and teamLead
  const staffOptions = [
    { value: "john_doe", label: "John Doe" },
    { value: "jane_smith", label: "Jane Smith" },
    { value: "alex_johnson", label: "Alex Johnson" },
    { value: "emily_brown", label: "Emily Brown" },
    { value: "michael_chen", label: "Michael Chen" },
  ];

  // Filter teamLead options to only include selected teamMembers
  const teamMemberValues = watch("teamMember") || [];
  const teamLeadOptions = staffOptions.filter((staff) =>
    teamMemberValues.includes(staff.value) || teamMemberValues.length === 0
  );

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
        { name: "manage", label: "Manage Dashboard Layout", description: "Allow rearranging and customizing dashboard widgets" }
      ]
    },
    {
      name: "Scheduler",
      description: "Manage appointment scheduling and calendar access",
      actions: [
        { name: "view", label: "View Appointments", description: "Allow viewing all team appointments" },
        { name: "create", label: "Create Appointments", description: "Allow creating new appointments for team members" },
        { name: "edit", label: "Edit Appointments", description: "Allow modifying existing appointments" },
        { name: "cancel", label: "Cancel Appointments", description: "Allow canceling scheduled appointments" },
        { name: "reschedule", label: "Approve Reschedule Requests", description: "Allow approving client reschedule requests" }
      ]
    },
    {
      name: "Clients",
      description: "Manage client information and pipeline access",
      actions: [
        { name: "view", label: "View Client Information", description: "Allow viewing client details and history" },
        { name: "create", label: "Add New Clients", description: "Allow adding new clients to the system" },
        { name: "edit", label: "Edit Client Information", description: "Allow modifying client details and documents" },
        { name: "pipeline", label: "Manage Client Pipeline", description: "Allow moving clients between pipeline stages" },
        { name: "documents", label: "Request Client Documents", description: "Allow requesting documents from clients" }
      ]
    },
    {
      name: "MyOrganization",
      description: "Manage organization settings and staff information",
      actions: [
        { name: "view", label: "View Organization Info", description: "Allow viewing organization details and settings" },
        { name: "manage", label: "Manage Staff Information", description: "Allow adding/editing staff members and teams" },
        { name: "settings", label: "Edit Organization Settings", description: "Allow modifying organization-wide settings" }
      ]
    },
    {
      name: "BillingsPayments",
      description: "Handle billing, payments, and financial operations",
      actions: [
        { name: "view", label: "View Billing Information", description: "Allow viewing invoices and payment history" },
        { name: "process", label: "Process Payments", description: "Allow processing payments and refunds" },
        { name: "generate", label: "Generate Invoices", description: "Allow creating new invoices for clients" },
        { name: "reports", label: "View Financial Reports", description: "Allow accessing financial reports and analytics" }
      ]
    },
    {
      name: "Programs",
      description: "Manage therapy programs and service offerings",
      actions: [
        { name: "view", label: "View Programs", description: "Allow viewing available programs" },
        { name: "create", label: "Create New Programs", description: "Allow creating new therapy programs" },
        { name: "edit", label: "Edit Existing Programs", description: "Allow modifying program details and settings" },
        { name: "assign", label: "Assign Programs to Clients", description: "Allow assigning programs to specific clients" }
      ]
    },
    {
      name: "CustomForms",
      description: "Create and manage custom forms and assessments",
      actions: [
        { name: "view", label: "View Custom Forms", description: "Allow viewing available custom forms" },
        { name: "create", label: "Create New Forms", description: "Allow creating new custom forms" },
        { name: "edit", label: "Edit Existing Forms", description: "Allow modifying existing form templates" },
        { name: "assign", label: "Assign Forms to Clients", description: "Allow assigning forms to clients for completion" }
      ]
    },
    {
      name: "Reports",
      description: "Access and generate system reports",
      actions: [
        { name: "view", label: "View Reports", description: "Allow viewing available report templates" },
        { name: "generate", label: "Generate Reports", description: "Allow generating new reports with current data" },
        { name: "export", label: "Export Reports", description: "Allow exporting reports to PDF/Excel formats" },
        { name: "schedule", label: "Schedule Reports", description: "Allow scheduling automatic report generation" }
      ]
    }
  ];

  const buildTabs = () => [
    {
      name: "Basic Setup",
      content: (
        <div className="space-y-4">
          <TextInput
            label="Team Name"
            {...register("teamName")}
            error={errors.teamName?.message}
            placeholder="Enter Team Name"
          />
          <Controller
            name="teamMember"
            control={control}
            render={({ field }) => (
              <SelectInput
                label="Team Members"
                placeholder="Select Team Members"
                options={staffOptions}
                width="full"
                className="rounded-12px"
                isSearchable={true}
                isMulti={true}
                error={errors.teamMember?.message}
                {...field}
              />
            )}
          />
          <Controller
            name="teamLead"
            control={control}
            render={({ field }) => (
              <SelectInput
                label="Team Lead"
                placeholder="Select Team Lead"
                options={teamLeadOptions}
                width="full"
                className="rounded-12px"
                isSearchable={true}
                error={errors.teamLead?.message}
                {...field}
              />
            )}
          />
        </div>
      ),
    },
    {
      name: "Team Permission",
      content: (
        <div className="space-y-4">
          {permissionModules.map((module) => (
            <div key={module.name} className=" overflow-hidden shadow-sm">
              <div
                className="p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => toggleAccordion(module.name)}
              >
                <div className="flex items-center gap-3">
                  <CheckboxInput
                    checked={values.permissions?.[module.name]?.enabled || false}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setValue(`permissions.${module.name}.enabled`, checked, { shouldDirty: true });

                      // Enable/disable all sub-permissions when module is toggled
                      module.actions.forEach((action) => {
                        setValue(`permissions.${module.name}.${action.name}`, checked, {
                          shouldDirty: true,
                        });
                      });
                    }}
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
                      <FaChevronDown className="text-lg" color="#004ABA"/>
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
                              setValue(`permissions.${module.name}.${action.name}`, e.target.checked, {
                                shouldDirty: true,
                              });
                            }}
                            disabled={!values.permissions?.[module.name]?.enabled}
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

  /* ---------- Button Text Logic ---------- */
  const getPrimaryButtonText = () => {
    if (mode === "edit") {
      return hasChanges ? "Save Changes" : "Next";
    }
    return activeTab === "Team Permission" ? "Save Team" : "Next";
  };

  const getSecondaryButtonText = () => {
    return activeTab === "Basic Setup" ? "Cancel" : "Previous";
  };

  const getPrimaryButtonAction = () => {
    if (activeTab === "Team Permission") {
      return handleSubmit(handleFormSubmit, onValidationError);
    }
    return handleNext;
  };

  return (
    <ReusableModal
      key={isOpen ? "open" : "closed"}
      isOpen={isOpen}
      onClose={handleClose}
      title={mode === "edit" ? "Edit Team" : "Add a new Team"}
      primaryButtonText={getPrimaryButtonText()}
      secondaryButtonText={getSecondaryButtonText()}
      tabs={buildTabs()}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onPrimaryButtonClick={getPrimaryButtonAction()}
      onSecondaryButtonClick={
        activeTab === "Basic Setup" ? handleClose : handlePrevious
      }
      size="lg"
      primaryButtonLoading={submitting}
    />
  );
};

export default AddTeamsModal;