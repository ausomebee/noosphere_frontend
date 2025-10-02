
import React, { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import ReusableModal from "../ReusableModal";
import { SelectInput } from "../../Input/Inputs";
 // Adjust the import path as needed

const AddClaimModal = ({ isOpen, onClose, onSave, isLoading }) => {
  const { control, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      timeSheet: "",
    },
  });
  const [timesheets, setTimesheets] = useState([]);

  // Fetch timesheets for SelectInput options
//   useEffect(() => {
//     const fetchTimesheets = async () => {
//       try {

//         const response = await api.GetTimesheets();
//         const timesheetOptions = response.data.data.map((ts) => ({
//           value: ts.id,
//           label: ts.timeSheetNumber || `Timesheet ${ts.id}`,
//         }));
//         setTimesheets(timesheetOptions);
//       } catch (err) {
//         console.error("Error fetching timesheets:", err);
//       }
//     };

//     if (isOpen) {
//       fetchTimesheets();
//     }
//   }, [isOpen]);

  const onSubmit = (data) => {
    onSave(data);
  };

  const onError = (errors) => {
    console.log("Form errors:", errors);
  };

  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={onClose}
      title="New Claim"
      primaryButtonText="Continue"
      secondaryButtonText="Cancel"
      onPrimaryButtonClick={handleSubmit(onSubmit, onError)}
      onSecondaryButtonClick={onClose}
      primaryButtonLoading={isLoading}
      size="medium"
    >
      <div className="flex flex-col gap-4">
    
        <Controller
          name="timeSheet"
          control={control}
          rules={{ required: "Timesheet is required" }}
          render={({ field }) => (
            <SelectInput
                label="Select Timesheet *"
              value={field.value}
              onChange={(value) => field.onChange(value)}
              options={timesheets}
              className="rounded-20px"
              width="full"
              error={errors.timeSheet?.message}
              placeholder="Select a timesheet"
              {...field}
            />
          )}
        />
      </div>
    </ReusableModal>
  );
};

export default AddClaimModal;
