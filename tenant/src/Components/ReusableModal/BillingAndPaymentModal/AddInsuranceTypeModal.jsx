import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import ReusableModal from "../ReusableModal";
import { TextInput, TextareaInput } from "../../Input/Inputs";

// Validation schema
const insuranceTypeSchema = yup.object().shape({
  name: yup.string().required("Name is required"),
  description: yup.string().notRequired().nullable(),
});

const AddInsuranceTypeModal = ({ isOpen, onClose, onSave, mode = "add", initialData = {}, isLoading }) => {
  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    resolver: yupResolver(insuranceTypeSchema),
    defaultValues: {
      name: initialData.name || "",
      description: initialData.description || "",
    },
  });

  useEffect(() => {
    if (isOpen) {
      reset({
        name: initialData.name || "",
        description: initialData.description || "",
      });
    }
  }, [isOpen, initialData, reset]);

  const onSubmit = (data) => {
    onSave(data);
  };

  const onError = (errors) => {
    console.log("Form errors:", errors);
  };

  const handleClose = () => {
    reset({
      name: initialData.name || "",
      description: initialData.description || "",
    });
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
        <TextInput
          label="Name *"
          {...register("name")}
          error={errors.name?.message}
          placeholder="Enter Insurance Type Name"
          disabled={mode === "view"}
      
        />
        <TextareaInput
          label="Description"
          {...register("description")}
          error={errors.description?.message}
          placeholder="Enter Insurance Type Description"
          disabled={mode === "view"}
         
        />
      </div>
    </ReusableModal>
  );
};

export default AddInsuranceTypeModal;