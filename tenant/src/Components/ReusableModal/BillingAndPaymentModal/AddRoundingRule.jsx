import React, { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import PropTypes from "prop-types";
import ReusableModal from "../ReusableModal";
import {
  SelectInput,
  TextareaInput,
  TextInput,
  RadioInput,
  SwitchInput,
} from "../../Input/Inputs";
import { showToast } from "../../../Helper/ShowToast";
import { standardRuleOptions } from "../../../Data/selectOptions";
import useReduxFormDraft from "../../../hooks/useReduxFormDraft";

// ----------------- schema -----------------
const roundingRuleSchema = yup.object().shape({
  ruleType: yup.string().required("Rule Type is required"),
  parentRole: yup.string().when("ruleType", {
    is: "standard",
    then: (schema) => schema.required("Select Rounding Rule is required"),
    otherwise: (schema) => schema.nullable().notRequired(),
  }),
  ruleName: yup.string().required("Rule Name is required"),
  description: yup.string().when("ruleType", {
    is: "custom",
    then: (schema) => schema.required("Description is required"),
    otherwise: (schema) => schema.nullable().notRequired(),
  }),
  minutes: yup.number().when("ruleType", {
    is: "custom",
    then: (schema) =>
      schema
        .typeError("Must be a number")
        .min(1, "Must be 1 or greater")
        .required("Minutes is required"),
    otherwise: (schema) => schema.nullable().notRequired(),
  }),
  unit: yup.number().when("ruleType", {
    is: "custom",
    then: (schema) =>
      schema
        .typeError("Must be a number")
        .min(1, "Must be 1 or greater")
        .required("Unit is required"),
    otherwise: (schema) => schema.nullable().notRequired(),
  }),
  unitMinutes: yup.number().when("ruleType", {
    is: "custom",
    then: (schema) =>
      schema
        .typeError("Must be a number")
        .min(1, "Must be 1 or greater")
        .required("Unit Minutes is required"),
    otherwise: (schema) => schema.nullable().notRequired(),
  }),
  active: yup.boolean().default(true),
});

const standardRuleDescriptions = {
  "8 Minute Rule": "Round up when time is more than 8 min into the next 15 min block",
  "Midpoint Rule": "Round up when at least half of unit is completed",
  "Exact Time Reporting": "Bill only what was delivered",
};

// ----------------- transform API -> form data -----------------
const transformRoundingRuleToFormData = (data = {}) => {
  if (!data || Object.keys(data).length === 0) {
    return {
      ruleType: "standard",
      parentRole: "",
      ruleName: "",
      description: "",
      minutes: 0,
      unit: 0,
      unitMinutes: 0,
      active: true,
    };
  }

  const isStandard =
    data.ruleType === "standard" ||
    (typeof data.ruleName === "string" &&
      standardRuleOptions.some((opt) => opt.value === data.ruleName));

  return {
    ruleType: isStandard ? "standard" : "custom",
    parentRole: isStandard ? data.ruleName || data.parentRole || "" : "",
    ruleName: isStandard ? data.ruleName || data.parentRole || "" : data.ruleName || "",
    description: !isStandard ? data.description || "" : data.description || "",
    minutes: !isStandard
      ? data.standardUnit ?? data.minutes ?? 0
      : data.standardUnit ?? data.minutes ?? 0,
    unit: !isStandard ? data.roundingRule?.unit ?? 0 : data.roundingRule?.unit ?? 0,
    unitMinutes: !isStandard
      ? data.roundingRule?.unitMinute ?? 0
      : data.roundingRule?.unitMinute ?? 0,
    active: data.isActive ?? true,
  };
};

// ----------------- component -----------------
const AddRoundingRule = ({
  isOpen,
  onClose,
  onSave,
  mode = "add",
  initialData = {},
  loading = false,
}) => {
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(roundingRuleSchema),
    defaultValues: transformRoundingRuleToFormData(initialData),
  });

  const clearDraft = useReduxFormDraft("add-rounding-rule", { watch, reset, isOpen, exclude: [] });

  const ruleType = watch("ruleType");
  const parentRole = watch("parentRole");

  useEffect(() => {
    reset(transformRoundingRuleToFormData(initialData));
  }, [isOpen, initialData, reset]);

  useEffect(() => {
    if (ruleType === "standard" && parentRole) {
      setValue("ruleName", parentRole, { shouldValidate: true });
    }
  }, [ruleType, parentRole, setValue]);

  const onValidationError = (errors) => {
    const firstError = Object.values(errors)[0];
    showToast(firstError?.message || "Please fill in all required fields", "error");
  };

  const handleFormSubmit = async (data) => {
    setSubmitting(true);
    try {
      const cleaned = {
        ruleType: data.ruleType,
        ruleName: data.ruleName,
        active: data.active,
        ...(data.ruleType === "standard" && { parentRole: data.parentRole }),
        ...(data.ruleType === "custom" && {
          description: data.description,
          minutes: Number(data.minutes ?? 0),
          unit: Number(data.unit ?? 0),
          unitMinutes: Number(data.unitMinutes ?? 0),
        }),
      };

      await onSave(cleaned);
      clearDraft();
      reset(transformRoundingRuleToFormData({}));
      onClose();
    } catch (err) {
      console.error("Error saving rounding rule:", err);
      showToast("Failed to save rounding rule", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    reset(transformRoundingRuleToFormData({}));
    onClose();
  };

  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        mode === "view"
          ? "View Rounding Rule"
          : mode === "edit"
          ? "Edit Rounding Rule"
          : "Add a Rounding Rule"
      }
      // removed modal's internal save button, handled externally
      size="md"
      primaryButtonLoading={submitting || loading}
      primaryButtonDisabled={mode === "view"}
      onPrimaryButtonClick={handleSubmit(handleFormSubmit, onValidationError)}
      primaryButtonText={submitting ? "Saving..." : "Save Rule"}
      secondaryButtonText="Cancel"
      onSecondaryButtonClick={handleClose}
    >
      <div className="mt-5 space-y-6 flex flex-col gap-6">
        {/* Rule Type */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-700">Rule Type</label>
          <div className="flex flex-row gap-4 items-center">
            <Controller
              name="ruleType"
              control={control}
              render={({ field }) => (
                <>
                  <RadioInput
                    label="Standard"
                    name="ruleType"
                    value="standard"
                    checked={field.value === "standard"}
                    onChange={() => field.onChange("standard")}
                    disabled={mode === "view"}
                  />
                  <RadioInput
                    label="Custom"
                    name="ruleType"
                    value="custom"
                    checked={field.value === "custom"}
                    onChange={() => field.onChange("custom")}
                    disabled={mode === "view"}
                  />
                </>
              )}
            />
            {errors.ruleType && (
              <p className="text-red-500 text-xs">{errors.ruleType.message}</p>
            )}
          </div>
        </div>

        {/* Standard Rule selection */}
        {ruleType === "standard" && (
          <div className="space-y-4">
            <Controller
              name="parentRole"
              control={control}
              render={({ field }) => (
                <SelectInput
                  label="Select Rounding Rule"
                  placeholder="Select Rounding Rule"
                  options={standardRuleOptions}
                  error={errors.parentRole?.message}
                  disabled={mode === "view"}
                  {...field}
                />
              )}
            />
            {parentRole && (
              <p className="text-base text-gray-700 p-3 rounded-md text-center">
                {standardRuleDescriptions[parentRole] || ""}
              </p>
            )}
          </div>
        )}

        {/* Rule Name */}
          {ruleType === "custom" && (
        <div>
          <TextInput
            label="Rule Name"
            {...register("ruleName")}
            error={errors.ruleName?.message}
            placeholder="Rule Name"
            disabled={mode === "view" || ruleType === "standard"}
          />
        </div>
          )}

        {/* Custom-only description */}
        {ruleType === "custom" && (
          <TextareaInput
            label="Description"
            {...register("description")}
            error={errors.description?.message}
            placeholder="Enter Rule Description"
            disabled={mode === "view"}
          />
        )}

        {/* Custom-only numeric fields */}
        {ruleType === "custom" && (
          <div>
            <p className="text-base text-gray-600 font-semibold">Standard Unit</p>
            <div className="flex items-center gap-3 mb-4">
              <TextInput
                type="number"
                {...register("minutes")}
                placeholder="0"
                error={errors.minutes?.message}
                width="70"
                disabled={mode === "view"}
              />
              <span className="text-sm text-gray-700">
                minutes makes 1 standard unit
              </span>
            </div>

            <p className="text-base text-gray-600 font-semibold">Rounding rule</p>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-700">Approximate</span>
              <TextInput
                type="number"
                {...register("unit")}
                placeholder="0"
                error={errors.unit?.message}
                width="70"
                disabled={mode === "view"}
              />
              <span className="text-sm text-gray-700">unit after every</span>
              <TextInput
                type="number"
                {...register("unitMinutes")}
                placeholder="0"
                error={errors.unitMinutes?.message}
                width="70"
                disabled={mode === "view"}
              />
              <span className="text-sm text-gray-700">minutes</span>
            </div>
          </div>
        )}

        {/* SwitchInput for Status */}
        <div className="flex items-center justify-between">
          <Controller
            name="active"
            control={control}
            render={({ field }) => (
              <SwitchInput
                label="Rule Status"
                checked={field.value}
                onChange={(val) => field.onChange(val)}
                disabled={mode === "view"}
              />
            )}
          />
        </div>
      </div>
    </ReusableModal>
  );
};

AddRoundingRule.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  mode: PropTypes.oneOf(["add", "edit", "view"]),
  initialData: PropTypes.object,
  loading: PropTypes.bool,
};

export default AddRoundingRule;
