import React, { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import ReusableModal from "../ReusableModal";
import { SelectInput, TextInput } from "../../Input/Inputs";
import { showToast } from "../../../Helper/ShowToast";

const schema = yup.object().shape({
  teamName: yup.string().required("Team Name is required"),
  // Team members and team lead are optional — a team can be created without them.
  teamMember: yup.array().optional(),
  teamLead: yup.string().optional(),
});

const defaultValues = {
  teamName: "",
  teamMember: [],
  teamLead: "",
};

const AddTeamsModal = ({
  isOpen,
  onClose,
  onSubmit,
  mode,
  initialData,
  memberOptions = [],
  teamLeadOptions = [],
}) => {
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm({
    mode: "onTouched",
    reValidateMode: "onBlur",
    resolver: yupResolver(schema),
    defaultValues: mode === "edit" && initialData
      ? { teamName: initialData.teamName || "", teamMember: initialData.teamMember || [], teamLead: initialData.teamLead || "" }
      : defaultValues,
  });

  useEffect(() => {
    if (isOpen) {
      if (mode === "edit" && initialData) {
        reset({
          teamName: initialData.teamName || "",
          teamMember: initialData.teamMember || [],
          teamLead: initialData.teamLead || "",
        });
      } else {
        reset(defaultValues);
      }
    }
  }, [isOpen, mode, initialData, reset]);

  const onValidationError = (errs) => {
    const firstError = Object.values(errs)[0];
    showToast(firstError?.message || "Please fill in all required fields", "error");
  };

  const handleFormSubmit = async (data) => {
    setSubmitting(true);
    try {
      await onSubmit({
        id: mode === "edit" && initialData?.id ? initialData.id : undefined,
        teamName: data.teamName,
        teamMember: data.teamMember,
        teamLead: data.teamLead,
      });
      reset(defaultValues);
      onClose();
    } catch (e) {
      console.error("Submit failed:", e);
      showToast(e.message || "Save failed. Please try again.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    reset(defaultValues);
    onClose();
  };

  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={handleClose}
      title={mode === "edit" ? "Edit Team" : "Add a new Team"}
      primaryButtonText={submitting ? "Saving..." : mode === "edit" ? "Save Changes" : "Save Team"}
      secondaryButtonText="Cancel"
      onPrimaryButtonClick={handleSubmit(handleFormSubmit, onValidationError)}
      onSecondaryButtonClick={handleClose}
      primaryButtonDisabled={submitting}
      primaryButtonLoading={submitting}
      size="md"
    >
      <div className="mt-5 space-y-4">
        <TextInput
          required
          label="Team Name"
          {...register("teamName")}
          error={errors.teamName?.message}
          placeholder="Enter Team Name"
          disabled={mode === "view"}
        />
        <Controller
          name="teamMember"
          control={control}
          render={({ field }) => (
            <SelectInput
              label="Team Members"
              placeholder="Select Team Members"
              options={memberOptions}
              emptyHint="No staff found. Create one in Organisation → Staff & Teams."
              width="full"
              isSearchable={true}
              isMulti={true}
              error={errors.teamMember?.message}
              disabled={mode === "view"}
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
              emptyHint="No staff found. Create one in Organisation → Staff & Teams."
              width="full"
              isSearchable={true}
              error={errors.teamLead?.message}
              disabled={mode === "view"}
              {...field}
            />
          )}
        />
      </div>
    </ReusableModal>
  );
};

export default AddTeamsModal;
