import React, { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import ReusableModal from "../ReusableModal";
import { TextInput, SelectInput } from "../../Input/Inputs";
import { showToast } from "../../../Helper/ShowToast";
import { getStateOptions } from "../../../Helper/geoOptions";

// Professional licences are issued by US states.
const stateOptions = getStateOptions("US");

// Validation schema
const licenseSchema = yup.object({
  licenseName: yup.string().required("License name is required"),
  licenseNumber: yup.string().required("License number is required"),
  issueState: yup.string().required("State is required"),
  expiryDate: yup
    .date()
    .required("Expiry date is required")
    .typeError("Please select a valid date"),
});

const AddLicensesModal = ({ isOpen, onClose, onSave, initialValues }) => {

  const [isLoading, setIsLoading] = useState(false);
  const isEdit = Boolean(initialValues?.id);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm({
    mode: "onTouched",
    reValidateMode: "onBlur",
    resolver: yupResolver(licenseSchema),
    defaultValues: {
      licenseName: "",
      licenseNumber: "",
      issueState: "",
      expiryDate: "",
    },
  });

  useEffect(() => {
    if (initialValues) {
      reset({
        licenseName: initialValues.licenseName || initialValues.licenseName || "",
        licenseNumber: initialValues.licenseNumber || initialValues.licenseNumber || "",
        issueState: initialValues.issueState || initialValues.state || "",
       expiryDate: initialValues.expiryDate
  ? new Date(initialValues.expiryDate).toISOString().split("T")[0]
  : initialValues.expirationDate
  ? new Date(initialValues.expirationDate).toISOString().split("T")[0]
  : "",
      });
    }
  }, [initialValues, reset]);

  const onValidationError = (errors) => {
    const firstError = Object.values(errors)[0];
    showToast(firstError?.message || "Please fill in all required fields", "error");
  };

  const handleSave = async (data) => {
    setIsLoading(true);
    try {
      // Format expiryDate to YYYY-MM-DD for API
      const payload = {
        ...data,
        id: initialValues?.id,
        expiryDate: new Date(data.expiryDate).toISOString().split("T")[0],
      };
      await onSave(payload);
      reset({
        licenseName: "",
        licenseNumber: "",
        issueState: "",
        expiryDate: "",
      });
      onClose();
    } catch (error) {
      console.error("Error saving license:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={() => {
        reset();
        onClose();
      }}
      title={`${isEdit ? "Edit" : "Add"} License`}
      primaryButtonText={isLoading ? "Saving..." : "Save License"}
      secondaryButtonText="Cancel"
      primaryButtonDisabled={isLoading}
      onPrimaryButtonClick={handleSubmit(handleSave, onValidationError)}
      onSecondaryButtonClick={() => {
        reset();
        onClose();
      }}
      size="lg"
      primaryButtonLoading={isLoading}
    >
      <div className="mt-5 space-y-4">
        <TextInput
          required
          label="License Name"
          {...register("licenseName")}
          error={errors.licenseName?.message}
          placeholder="Enter license name"
        />

        <TextInput
          required
          label="License Number"
          {...register("licenseNumber")}
          error={errors.licenseNumber?.message}
          placeholder="Enter license number"
        />

        <div className="flex gap-4 w-full">
          <div className="flex-1">
            <TextInput
              required
              label="Expiration Date"
              type="date"
              {...register("expiryDate")}
              error={errors.expiryDate?.message}
              placeholder="Select expiration date"
            />
          </div>
          <div className="flex-1">
            <Controller
              name="issueState"
              control={control}
              render={({ field }) => (
                <SelectInput
                  required
                  label="State"
                  options={stateOptions}
                  error={errors.issueState?.message}
                  placeholder="Select state"
                  {...field}
                />
              )}
            />
          </div>
        </div>
      </div>
    </ReusableModal>
  );
};

export default AddLicensesModal;