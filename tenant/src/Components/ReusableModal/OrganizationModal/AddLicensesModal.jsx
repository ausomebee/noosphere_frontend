import React, { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import ReusableModal from "../ReusableModal";
import { TextInput, SelectInput } from "../../Input/Inputs";
import { showToast } from "../../../Helper/ShowToast";

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

// State options (sample US states)
const stateOptions = [
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" },
  { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" },
  { value: "DE", label: "Delaware" },
  { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" },
];


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
          label="License Name"
          {...register("licenseName")}
          error={errors.licenseName?.message}
          placeholder="Enter license name"
        />

        <TextInput
          label="License Number"
          {...register("licenseNumber")}
          error={errors.licenseNumber?.message}
          placeholder="Enter license number"
        />

        <div className="flex gap-4 w-full">
          <div className="flex-1">
            <TextInput
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