import React, { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import ReusableModal from "../ReusableModal";
import { SelectInput } from "../../Input/Inputs";
// import api from "../../../../api/AppointmentApi"; // Adjust the import path as needed

const AddInsuranceTypeModal = ({ isOpen, onClose, onSave, mode = "add", initialData = {}, isLoading }) => {
  const { control, handleSubmit, formState: { errors }, reset } = useForm({
    defaultValues: {
      insuranceType: initialData.insureType || "",
    },
  });

  const [insuranceTypeOptions, setInsuranceTypeOptions] = useState([]);

  // Fetch insurance types for SelectInput options
//   useEffect(() => {
//     const fetchInsuranceTypes = async () => {
//       try {
//         // Mock API call (replace with actual API endpoint)
//         const response = await api.GetInsuranceType(); // Adjust endpoint
//         const options = response.data.data.map((type) => ({
//           value: type.id,
//           label: type.insureType || `Insurance Type ${type.id}`,
//         }));
//         setInsuranceTypeOptions(options);
//       } catch (err) {
//         console.error("Error fetching insurance types:", err);
//       }
//     };

//     if (isOpen) {
//       fetchInsuranceTypes();
//       reset({ insuranceType: initialData.insureType || "" });
//     }
//   }, [isOpen, initialData, reset]);

  const onSubmit = (data) => {
    onSave(data);
  };

  const onError = (errors) => {
    console.log("Form errors:", errors);
  };

  const handleClose = () => {
    reset({ insuranceType: initialData.insureType || "" });
    onClose();
  };

  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={handleClose}
      title={
        mode === "view"
          ? "View Insurance Type"
          : mode === "edit"
          ? "Edit Insurance Type"
          : "Add an Insurance Type"
      }
      primaryButtonText={mode === "view" ? "Close" : "Save"}
      secondaryButtonText={mode === "view" ? null : "Cancel"}
      onPrimaryButtonClick={handleSubmit(onSubmit, onError)}
      onSecondaryButtonClick={mode === "view" ? undefined : handleClose}
      primaryButtonLoading={isLoading}
      size="medium"
    >
      <div className="flex flex-col gap-4">
        <Controller
          name="insuranceType"
          control={control}
          rules={{ required: "Insurance Type is required" }}
          render={({ field }) => (
            <SelectInput
              label="Select Insurance Type *"
              value={field.value}
              onChange={(value) => field.onChange(value)}
              options={insuranceTypeOptions}
              className="rounded-20px"
              width="full"
              error={errors.insuranceType?.message}
              placeholder="Select a Insurance Type"
              disabled={mode === "view"}
              {...field}
            />
          )}
        />
      </div>
    </ReusableModal>
  );
};

export default AddInsuranceTypeModal;