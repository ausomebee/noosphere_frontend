import React, { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import ReusableModal from "../ReusableModal";
import { SelectInput, TextareaInput, TextInput } from "../../Input/Inputs";
import Button from "../../Button/Button";

// Validation schema
const roundingRuleSchema = yup.object().shape({
  parentRole: yup.string().when("mode", {
    is: "view",
    then: yup.string().optional(),
    otherwise: yup.string().required("Select Rounding Rule is required"),
  }),
  ruleName: yup.string().when("mode", {
    is: "view",
    then: yup.string().optional(),
    otherwise: yup.string().required("Rule Name is required"),
  }),
  description: yup.string().when("mode", {
    is: "view",
    then: yup.string().optional(),
    otherwise: yup.string().required("Description is required"),
  }),
  minutes: yup
    .number()
    .typeError("Must be a number")
    .min(1, "Must be 1 or greater")
    .when("mode", {
      is: "view",
      then: yup.number().optional(),
      otherwise: yup.number().required("Minutes is required"),
    }),
  hours: yup
    .number()
    .typeError("Must be a number")
    .min(0, "Must be 0 or greater")
    .when("mode", {
      is: "view",
      then: yup.number().optional(),
      otherwise: yup.number().required("Hours is required"),
    }),
  unit: yup
    .number()
    .typeError("Must be a number")
    .min(1, "Must be 1 or greater")
    .when("mode", {
      is: "view",
      then: yup.number().optional(),
      otherwise: yup.number().required("Unit is required"),
    }),
  unitMinutes: yup
    .number()
    .typeError("Must be a number")
    .min(1, "Must be 1 or greater")
    .when("mode", {
      is: "view",
      then: yup.number().optional(),
      otherwise: yup.number().required("Unit Minutes is required"),
    }),
});

// Dummy options
const parentRoleOptions = [
  { value: "15-Minute Increment Rounding", label: "15-Minute Increment Rounding" },
  { value: "30-Minute Increment Rounding", label: "30-Minute Increment Rounding" },
  { value: "1-Hour Increment Rounding", label: "1-Hour Increment Rounding" },
];

// Utility function to transform table data to form data
const transformRoundingRuleToFormData = (data, mode) => ({
  mode,
  parentRole: data.roundingRule || "",
  ruleName: data.ruleName || "",
  description: data.description || "",
  minutes: data.minutes || 0,
  hours: data.hours || 0,
  unit: data.unit || 0,
  unitMinutes: data.unitMinutes || 0,
});

const AddRoundingRule = ({
  isOpen,
  onClose,
  onSave,
  mode = "add",
  initialData = {},
  onDelete,
}) => {
  const [activeTab, setActiveTab] = useState("Standard Rules");
  const [submitting, setSubmitting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
    watch,
  } = useForm({
    resolver: yupResolver(roundingRuleSchema),
    defaultValues: transformRoundingRuleToFormData(initialData, mode),
  });

  useEffect(() => {
    if (isOpen) {
      reset(transformRoundingRuleToFormData(initialData, mode));
      setHasChanges(false);
    }
  }, [isOpen, mode, initialData, reset]);

  useEffect(() => {
    const subscription = watch((value, { name, type }) => {
      if (type === "change" && mode !== "view") {
        setHasChanges(true);
      }
    });
    return () => subscription.unsubscribe();
  }, [watch, mode]);

  const handleFormSubmit = async (data) => {
    setSubmitting(true);
    try {
      await onSave(data);
      reset(transformRoundingRuleToFormData(initialData, mode));
      onClose();
    } catch (error) {
      console.error("Error saving rounding rule:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    reset(transformRoundingRuleToFormData(initialData, mode));
    onClose();
  };

  const handleNext = () => {
    setActiveTab("Custom Rule");
  };

  const handlePrevious = () => {
    setActiveTab("Standard Rules");
  };

  const buildTabs = () => [
    ...(mode !== "view"
      ? [
          {
            name: "Standard Rules",
            content: (
              <div className="space-y-4">
                <Controller
                  name="parentRole"
                  control={control}
                  render={({ field }) => (
                    <SelectInput
                      label="Select Rounding Rules"
                      placeholder="Select Rounding Rule"
                      options={parentRoleOptions}
                      width="full"
                      className="rounded-12px"
                      error={errors.parentRole?.message}
                      disabled={mode === "view"}
                      {...field}
                    />
                  )}
                />
              </div>
            ),
          },
        ]
      : []),
    {
      name: "Custom Rule",
      content: (
        <div className="space-y-4">
          <TextInput
            label="Rule Name"
            {...register("ruleName")}
            error={errors.ruleName?.message}
            placeholder="Enter Rule Name"
            disabled={mode === "view"}
          />

          <TextareaInput
            label="Description"
            {...register("description")}
            error={errors.description?.message}
            placeholder="Enter Rule Description"
            disabled={mode === "view"}
          />

          <p className="text-sm text-gray-700 mt-6">Standard Unit</p>
          <div className="flex items-center gap-4 mt-2">
            <div style={{ marginBottom: "-14px" }}>
              <TextInput
                type="number"
                {...register("minutes")}
                width="70"
                className="rounded-20px"
                placeholder="0"
                error={errors.minutes?.message}
                disabled={mode === "view"}
              />
            </div>
            <p className="text-sm text-gray-700">minutes makes 1 standard unit</p>
          </div>

         
          <p className="text-sm text-gray-700 mt-6">Rounding rule</p>
          <div className="flex items-center gap-4 mt-2">
            <p className="text-sm text-gray-700">Approximate</p>
            <div style={{ marginBottom: "-14px" }}>
              <TextInput
                type="number"
                {...register("unit")}
                width="70"
                className="rounded-20px"
                placeholder="0"
                error={errors.unit?.message}
                disabled={mode === "view"}
              />
            </div>
            <p className="text-sm text-gray-700">unit after every</p>
            <div style={{ marginBottom: "-14px" }}>
              <TextInput
                type="number"
                {...register("unitMinutes")}
                width="70"
                className="rounded-20px"
                placeholder="0"
                error={errors.unitMinutes?.message}
                disabled={mode === "view"}
              />
            </div>
            <p className="text-sm text-gray-700">minutes</p>
          </div>
        </div>
      ),
    },
  ];

  const getPrimaryButtonText = () => {
    if (mode === "view") return "Close";
    if (mode === "edit" && hasChanges) return "Save Changes";
    if (mode === "edit" && !hasChanges) return "Next";
    return activeTab === "Custom Rule" ? "Save Rule" : "Next";
  };

  const getSecondaryButtonText = () => {
    if (mode === "view") return null;
    return activeTab === "Standard Rules" ? "Cancel" : "Previous";
  };

  const getPrimaryButtonAction = () => {
    if (mode === "view") return handleClose;
    if (activeTab === "Custom Rule") return handleSubmit(handleFormSubmit);
    return handleNext;
  };

  return (
    <ReusableModal
      key={isOpen ? "open" : "closed"}
      isOpen={isOpen}
      onClose={handleClose}
      title={
        mode === "view"
          ? "View Rounding Rule"
          : mode === "edit"
          ? "Edit Rounding Rule"
          : "Add a Rounding Rule"
      }
      primaryButtonText={getPrimaryButtonText()}
      secondaryButtonText={getSecondaryButtonText()}
      tabs={buildTabs()}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onPrimaryButtonClick={getPrimaryButtonAction()}
      onSecondaryButtonClick={
        activeTab === "Standard Rules" || mode === "view" ? handleClose : handlePrevious
      }
      size="md"
      primaryButtonLoading={submitting}
    />
  );
};

export default AddRoundingRule;