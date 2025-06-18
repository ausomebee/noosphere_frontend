import React, { useMemo, useEffect } from "react";
import ReusableModal from "../ReusableModal";
import { SelectInput } from "../../Input/Inputs"; // Adjust the import path as needed
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";

const ChangeCategoryModal = ({ isOpen, onClose, onSave, initialCategory }) => {
    console.log(initialCategory)
  // Define validation schema with yup
  const schema = yup.object().shape({
    categoryFrom: yup.string().trim().required("Current category is required"),
    categoryTo: yup.string().trim().required("New category is required").notOneOf([yup.ref("categoryFrom")], "New category must be different from the current category"),
  });

  // Initialize useForm with yup resolver and initial values
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      categoryFrom: "",
      categoryTo: "",
    },
  });

  // Memoized category options
  const categoryOptions = useMemo(
    () => [
      { value: "", label: "Select" },
      { value: "Account & Access", label: "Account & Access" },
      { value: "Billing & Payments", label: "Billing & Payments" },
      { value: "Subscription & Plans", label: "Subscription & Plans" },
      { value: "Data Issues", label: "Data Issues" },
      { value: "User Management & Roles", label: "User Management & Roles" },
      { value: "Client/Patient Management Issues", label: "Client/Patient Management Issues" },
      { value: "Bug Report", label: "Bug Report" },
      { value: "Performance", label: "Performance" },
      { value: "Compliance & Security", label: "Compliance & Security" },
      { value: "Notifications & Emails", label: "Notifications & Emails" },
      { value: "Analytics & Reporting", label: "Analytics & Reporting" },
      { value: "Customization & Settings", label: "Customization & Settings" },
      { value: "Third-Party Integrations", label: "Third-Party Integrations" },
      { value: "Training & Onboarding", label: "Training & Onboarding" },
      { value: "Feature Request", label: "Feature Request" },
      { value: "Other / Miscellaneous", label: "Other / Miscellaneous" },
    ],
    []
  );

  // Set initial category value when the modal opens or initialCategory changes
  useEffect(() => {
    if (isOpen && initialCategory) {
      setValue("categoryFrom", initialCategory, { shouldValidate: true });
    } else {
      reset({ categoryFrom: "", categoryTo: "" });
    }
  }, [isOpen, initialCategory, setValue, reset]);

  // Handle form submission
  const onSubmit = (data) => {
    if (data.categoryFrom && data.categoryTo) {
      onSave(data.categoryTo); // Only send the "to" value as per your requirement
      reset(); // Reset form
      onClose();
    }
  };

  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={() => {
        reset(); // Reset form on close
        onClose();
      }}
      title="Change category"
      primaryButtonText="Save"
      secondaryButtonText="Cancel"
      onPrimaryButtonClick={handleSubmit(onSubmit)}
      onSecondaryButtonClick={() => {
        reset(); // Reset form on cancel
        onClose();
      }}
    >
      <form className="modal-form" onSubmit={handleSubmit(onSubmit)}>
        <SelectInput
          label="Change from"
          {...register("categoryFrom")}
          options={categoryOptions}
          error={errors.categoryFrom?.message}
          disabled={!!initialCategory} // Disable if initialCategory is provided
        />
        <SelectInput
          label="Change To"
          {...register("categoryTo")}
          options={categoryOptions}
          error={errors.categoryTo?.message}
        />
      </form>
    </ReusableModal>
  );
};

export default ChangeCategoryModal;