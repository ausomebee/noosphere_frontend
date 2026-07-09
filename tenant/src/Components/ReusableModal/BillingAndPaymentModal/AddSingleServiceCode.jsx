import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useForm, Controller, useFieldArray } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import ReusableModal from "../ReusableModal";
import {
  SelectInput,
  TextareaInput,
  TextInput,
  CheckboxInput,
} from "../../Input/Inputs";
import Button from "../../Button/Button";
import { FaPlus, FaTrash } from "react-icons/fa";
import { showToast, showApiError } from "../../../Helper/ShowToast";
import { currencyOptions, modifierOptions } from "../../../Data/selectOptions";
import useReduxFormDraft from "../../../hooks/useReduxFormDraft";

// Validation schema for single service code
const serviceCodeSchema = yup.object().shape({
  mode: yup.string(),
  codeSelection: yup.string().when("mode", {
    is: "view",
    then: (schema) => schema.optional(),
    otherwise: (schema) => schema.required("Service Code is required"),
  }),
  code: yup.string().when("mode", {
    is: "view",
    then: (schema) => schema.optional(),
    otherwise: (schema) => schema.required("Code is required"),
  }),
  description: yup.string().when("mode", {
    is: "view",
    then: (schema) => schema.optional(),
    otherwise: (schema) => schema.required("Description is required"),
  }),
  unitCurrency: yup.string().when("mode", {
    is: "view",
    then: (schema) => schema.optional(),
    otherwise: (schema) => schema.required("Unit Currency is required"),
  }),
  ratePerUnit: yup
    .number()
    .typeError("Must be a number")
    .min(0, "Must be 0 or greater")
    .when("mode", {
      is: "view",
      then: (schema) => schema.optional(),
      otherwise: (schema) => schema.required("Rate per Unit is required"),
    }),
  roundingRule: yup.string().when("mode", {
    is: "view",
    then: (schema) => schema.optional(),
    otherwise: (schema) => schema.required("Rounding Rule is required"),
  }),
  modifiers: yup.array().of(
    yup.object().shape({
      modifier: yup.string().when("mode", {
        is: "view",
        then: (schema) => schema.optional(),
        otherwise: (schema) => schema.required("Modifier is required"),
      }),
      ratePerUnit: yup
        .number()
        .typeError("Must be a number")
        .min(0, "Must be 0 or greater")
        .when("mode", {
          is: "view",
          then: (schema) => schema.optional(),
          otherwise: (schema) => schema.required("Rate per Unit is required"),
        }),
    })
  ),
  billable: yup.boolean().when("mode", {
    is: "view",
    then: (schema) => schema.optional(),
    otherwise: (schema) => schema.required("Billable is required"),
  }),
});

// Utility function to transform data to form data
const transformServiceCodeToFormData = (data, mode, serviceCodes = []) => {
  const matchingServiceCode = serviceCodes.find((sc) => sc.code === data.code);
  const codeSelection = matchingServiceCode ? data.code : "custom";
  const modifiers =
    Array.isArray(data.modifiers) && data.modifiers.length > 0
      ? data.modifiers.map((m) => ({
          modifier: m.modifier || "",
          ratePerUnit: m.ratePerUnit || 0,
        }))
      : [{ modifier: "", ratePerUnit: 0 }];

  const formData = {
    mode,
    codeSelection,
    code: data.code || "",
    description: data.description || "",
    unitCurrency: data.unitCurrency || "USD",
    ratePerUnit: data.ratePerUnit || 0,
    roundingRule: data.roundingRule || "",
    modifiers,
    billable: data.billable !== undefined ? data.billable : false,
  };

  return formData;
};

const AddSingleServiceCodeModal = ({
  isOpen,
  onClose,
  onSave,
  mode = "add",
  initialData = {},
  serviceCodes = [],
  roundingRules = [],
}) => {
  const [submitting, setSubmitting] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Memoize default values
  const defaultValues = useMemo(() => {
    try {
      return transformServiceCodeToFormData(initialData, mode, serviceCodes);
    } catch {
      return {
        mode,
        codeSelection: "custom",
        code: "",
        description: "",
        unitCurrency: "USD",
        ratePerUnit: 0,
        roundingRule: "",
        modifiers: [{ modifier: "", ratePerUnit: 0 }],
        billable: false,
      };
    }
  }, [initialData, mode, serviceCodes]);

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
    watch,
    setValue,
    getValues,
  } = useForm({
    mode: "onTouched",
    reValidateMode: "onBlur",
    resolver: yupResolver(serviceCodeSchema),
    defaultValues,
  });

  const clearDraft = useReduxFormDraft("add-service-code", { watch, reset, isOpen, exclude: [] });

  const {
    fields: modifierFields,
    append: appendModifier,
    remove: removeModifier,
  } = useFieldArray({
    control,
    name: "modifiers",
  });


  // Dynamic service code options
  const serviceCodeOptions = useMemo(() => {
    try {
      const options = [
        ...(Array.isArray(serviceCodes)
          ? serviceCodes.map((sc) => ({
              value: sc.code,
              label: `${sc.code} - ${sc.description.substring(0, 50)}${
                sc.description.length > 50 ? "..." : ""
              }`,
              description: sc.description,
              modifiers: Array.isArray(sc.modifiers) ? sc.modifiers : [],
            }))
          : []),
        {
          value: "custom",
          label: "Others (Custom)",
          description: "",
          modifiers: [],
        },
      ];

      return options;
    } catch {
      return [
        {
          value: "custom",
          label: "Others (Custom)",
          description: "",
          modifiers: [],
        },
      ];
    }
  }, [serviceCodes]);


  // Dynamic rounding rule options
  const roundingRuleOptions = useMemo(() => {
    try {
      const options = Array.isArray(roundingRules)
        ? roundingRules.map((rr) => ({
            value: rr.id,
            label: rr.ruleName,
          }))
        : [];

      return options;
    } catch {
      return [];
    }
  }, [roundingRules]);

  // Reset form and modifiers when modal opens
  useEffect(() => {
    if (!isOpen) return;

    try {
      const formData = transformServiceCodeToFormData(
        initialData,
        mode,
        serviceCodes
      );
      reset(formData);
      const modifiers =
        Array.isArray(formData.modifiers) && formData.modifiers.length > 0
          ? formData.modifiers
          : [{ modifier: "", ratePerUnit: 0 }];

      setValue("modifiers", modifiers);
      // Sync useFieldArray
      while (modifierFields.length > modifiers.length) {
        removeModifier(modifierFields.length - 1);
      }
      modifiers.forEach((mod, index) => {
        if (index >= modifierFields.length) {
          appendModifier({
            modifier: mod.modifier || "",
            ratePerUnit: mod.ratePerUnit || 0,
          });
        }
        // Explicitly set values to ensure SelectInput displays correctly
        setValue(`modifiers[${index}].modifier`, mod.modifier || "");
        setValue(`modifiers[${index}].ratePerUnit`, mod.ratePerUnit || 0);
      });

      setHasChanges(false);
    } catch {
      reset({
        mode,
        codeSelection: "custom",
        code: "",
        description: "",
        unitCurrency: "USD",
        ratePerUnit: 0,
        roundingRule: "",
        modifiers: [{ modifier: "", ratePerUnit: 0 }],
        billable: false,
      });
    }
  }, [
    isOpen,
    mode,
    initialData,
    serviceCodes,
    reset,
    setValue,
    modifierFields.length,
    removeModifier,
    appendModifier,
    getValues,
  ]);

  // Watch codeSelection for auto-population
  const handleCodeSelectionChange = useCallback(
    (value) => {
      if (mode === "view") return;
      setHasChanges(true);
      const selectedCode = value.codeSelection;

      try {
        const serviceCodeData = serviceCodeOptions.find(
          (opt) => opt.value === selectedCode
        );
        if (serviceCodeData && selectedCode !== "custom") {
          setValue("code", serviceCodeData.value);
          setValue("description", serviceCodeData.description);
          const populatedModifiers =
            Array.isArray(serviceCodeData.modifiers) &&
            serviceCodeData.modifiers.length > 0
              ? serviceCodeData.modifiers.map((m) => ({
                  modifier: m.modifier || "",
                  ratePerUnit: m.ratePerUnit || 0,
                }))
              : [{ modifier: "", ratePerUnit: 0 }];

          setValue("modifiers", populatedModifiers);
          while (modifierFields.length > populatedModifiers.length) {
            removeModifier(modifierFields.length - 1);
          }
          while (modifierFields.length < populatedModifiers.length) {
            appendModifier({ modifier: "", ratePerUnit: 0 });
          }
        } else if (selectedCode === "custom") {
          setValue("code", "");
          setValue("description", "");
          setValue("modifiers", [{ modifier: "", ratePerUnit: 0 }]);
          while (modifierFields.length > 1) {
            removeModifier(modifierFields.length - 1);
          }
        }
      } catch {
        // Non-critical — form validation handles invalid selections
      }
    },
    [
      mode,
      setValue,
      serviceCodeOptions,
      modifierFields.length,
      removeModifier,
      appendModifier,
    ]
  );

  useEffect(() => {
    const subscription = watch((value, { name, type }) => {
      if (name === "codeSelection" && type === "change") {
        handleCodeSelectionChange(value);
      }
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [watch, handleCodeSelectionChange]);

  const handleFormSubmit = async (data) => {
    setSubmitting(true);
    try {
      const cleanedData = {
        code: data.code,
        description: data.description,
        unitCurrency: data.unitCurrency,
        ratePerUnit: data.ratePerUnit,
        roundingRule: data.roundingRule,
        modifiers: data.modifiers.filter((m) => m.modifier.trim() !== ""),
        billable: data.billable,
        serviceCodeId:
          serviceCodeOptions.find((opt) => opt.value === data.codeSelection)
            ?.value !== "custom"
            ? serviceCodes.find((sc) => sc.code === data.codeSelection)?.id ||
              ""
            : "",
      };
      await onSave(cleanedData);
      clearDraft();
      onClose();
    } catch {
      showToast("Failed to save service code", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    try {
      if (hasChanges) {
        const formData = transformServiceCodeToFormData(
          initialData,
          mode,
          serviceCodes
        );
        reset(formData);
      }
      onClose();
    } catch (error) {
      showApiError(error, "SAVE_SERVICE_CODE");
    }
  };

  const getPrimaryButtonText = () => {
    if (mode === "view") return "Close";
    if (mode === "edit" && hasChanges) return "Save Changes";
    return "Save Service Code";
  };

  const getSecondaryButtonText = () => {
    if (mode === "view") return null;
    return "Cancel";
  };

  if (!isOpen) return null;

  return (
    <ReusableModal
      key={isOpen ? "open" : "closed"}
      isOpen={isOpen}
      onClose={handleClose}
      title={
        mode === "view"
          ? "View Service Code"
          : mode === "edit"
          ? "Edit Service Code"
          : "Add Service Code"
      }
      primaryButtonText={getPrimaryButtonText()}
      secondaryButtonText={getSecondaryButtonText()}
      onPrimaryButtonClick={
        mode === "view" ? handleClose : handleSubmit(handleFormSubmit)
      }
      onSecondaryButtonClick={handleClose}
      size="md"
      primaryButtonLoading={submitting}
    >
      <div className="space-y-6">
        <Controller
          name="codeSelection"
          control={control}
          render={({ field }) => (
            <SelectInput
              required={mode !== "view"}
              label="Service Code"
              options={serviceCodeOptions}
              error={errors.codeSelection?.message}
              placeholder="Select Service Code"
              disabled={mode === "view"}
              {...field}
            />
          )}
        />

        {watch("codeSelection") === "custom" && (
          <TextInput
            required
            label="Custom Code"
            {...register("code")}
            error={errors.code?.message}
            placeholder="Enter Custom Code"
            disabled={mode === "view"}
          />
        )}

        <TextareaInput
          required={mode !== "view"}
          label="Description"
          {...register("description")}
          error={errors.description?.message}
          placeholder="Enter a description"
          disabled={mode === "view"}
        />

        <Controller
          name="roundingRule"
          control={control}
          render={({ field }) => (
            <SelectInput
              required={mode !== "view"}
              label="Rounding Rule"
              options={roundingRuleOptions}
              emptyHint="No rounding rules found. Create one in Billing & Payments → Settings."
              error={errors.roundingRule?.message}
              placeholder="Select rounding rule"
              disabled={mode === "view"}
              {...field}
            />
          )}
        />

        <div className="flex gap-4 items-center">
          <div>
            <Controller
              name="unitCurrency"
              control={control}
              render={({ field }) => (
                <SelectInput
                  required={mode !== "view"}
                  label="Unit Currency"
                  options={currencyOptions}
                  error={errors.unitCurrency?.message}
                  disabled={mode === "view"}
                  {...field}
                />
              )}
            />
          </div>
          <div className="flex-1">
            <TextInput
              required={mode !== "view"}
              label="Rate per Unit"
              type="number"
              {...register("ratePerUnit")}
              error={errors.ratePerUnit?.message}
              placeholder="Enter Rate per Unit"
              disabled={mode === "view"}
            />
          </div>
        </div>

        <div>
          <p className="text-base text-gray-600 font-semibold mb-2">
            Modifiers
          </p>
          {modifierFields.map((field, index) => (
            <div key={field.id} className="flex gap-4 items-end mb-2">
              <div className="flex-1">
                <Controller
                  name={`modifiers[${index}].modifier`}
                  control={control}
                  render={({ field }) => (
                    <SelectInput
                      label="Modifier"
                      options={modifierOptions}
                      error={errors.modifiers?.[index]?.modifier?.message}
                      disabled={mode === "view"}
                      {...field}
                      value={field.value || ""}
                      onChange={(value) => {
                        field.onChange(value);
                        setHasChanges(true);
                      }}
                    />
                  )}
                />
              </div>
              <div className="flex-1">
                <TextInput
                  label="Rate per Unit"
                  type="number"
                  {...register(`modifiers[${index}].ratePerUnit`)}
                  error={errors.modifiers?.[index]?.ratePerUnit?.message}
                  placeholder="Enter Rate per Unit"
                  disabled={mode === "view"}
                />
              </div>
              {mode !== "view" && modifierFields.length > 1 && (
                <button
                  type="button"
                  className="modal-row-delete-btn"
                  onClick={() => removeModifier(index)}
                  aria-label="Remove Modifier"
                >
                  <FaTrash />
                </button>
              )}
            </div>
          ))}
          <Button
            icon={<FaPlus />}
            variant="secondary"
            label="Add Modifier"
            onClick={() => appendModifier({ modifier: "", ratePerUnit: 0 })}
            disabled={mode === "view"}
          />
        </div>

        <div className="py-2 px-2 rounded-md bg-gray-150 mt-6">
          <Controller
            name="billable"
            control={control}
            render={({ field }) => (
              <CheckboxInput
                label="This service is billable"
                checked={field.value}
                onChange={(e) => field.onChange(e.target.checked)}
                disabled={mode === "view"}
              />
            )}
          />
        </div>
      </div>
    </ReusableModal>
  );
};

export default AddSingleServiceCodeModal;
