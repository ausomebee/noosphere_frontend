import React, { useState } from "react";
import ReusableModal from "../ReusableModal";
import { TextInput, TextareaInput, SelectInput, RadioInput, CheckboxInput, RequiredMark } from "../../Input/Inputs";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import useReduxFormDraft from "../../../hooks/useReduxFormDraft";

const ResumeSubscriptionModal = ({ isOpen, onClose, onSave, selectedItems }) => {
  const [loading, setLoading] = useState(false);

  const schema = yup.object().shape({
    resumptionType: yup.string().required("Resumption type is required"),
    reason: yup.string().required("Reason is required"),
    comment: yup.string().nullable().notRequired().max(1000, "Comment must not exceed 1000 characters"),
    specificDate: yup.string().when("resumptionType", {
      is: "specificDate",
      then: (schema) => schema.required("Specific date is required"),
      otherwise: (schema) => schema.nullable(),
    }),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm({
    mode: "onTouched",
    reValidateMode: "onBlur",
    resolver: yupResolver(schema),
    defaultValues: {
      resumptionType: "now",
      reason: "",
      comment: "",
      notifyTenant: false,
      specificDate: "",
    },
  });

  const clearDraft = useReduxFormDraft("resume-subscription", { watch, reset, isOpen, exclude: [] });

  const resumptionType = watch("resumptionType");

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await onSave({
        items: selectedItems,
        resumptionType: data.resumptionType,
        reason: data.reason,
        ...(data.comment ? { comment: data.comment } : {}),
        notifyTenant: data.notifyTenant,
        specificDate: data.specificDate || undefined,
      });
      clearDraft();
      reset();
      onClose();
    } catch {
      // Parent already shows error toast — modal stays open
    } finally {
      setLoading(false);
    }
  };

  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Resume Subscription"
      primaryButtonText="Resume"
      secondaryButtonText="Cancel"
      primaryButtonLoading={loading}
      onPrimaryButtonClick={handleSubmit(onSubmit)}
      onSecondaryButtonClick={() => {
        reset();
        onClose();
      }}
    >
      <form className="modal-form" onSubmit={handleSubmit(onSubmit)}>
        <label>
          Resumption Options
          <RequiredMark required />
        </label>
        <div style={{display: "flex", flexDirection: "column", gap: "10px", marginTop: "10px", marginBottom: "20px"}}>
          <RadioInput
            name="resumptionType"
            value="now"
            label="Resume now"
            {...register("resumptionType")}
            error={errors.resumptionType?.message}
          />
          <RadioInput
            name="resumptionType"
            value="specificDate"
            label="Resume on a specific date"
            {...register("resumptionType")}
            error={errors.resumptionType?.message}
          />
          {resumptionType === "specificDate" && (
            <TextInput
              required
              type="datetime-local"
              {...register("specificDate")}
              error={errors.specificDate?.message}
              placeholder="Select"
            />
          )}
        </div>

        <label>Select Reason</label>
        <SelectInput
          required
          {...register("reason")}
          error={errors.reason?.message}
          options={[
            { value: "", label: "Select" },
            { value: "Tenant Request", label: "Tenant Request" },
            { value: "Issue Resolution", label: "Issue Resolution" },
            { value: "other", label: "Other" },
          ]}
        />

        <label>Comment (optional)</label>
        <TextareaInput
          {...register("comment")}
          error={errors.comment?.message}
          placeholder="Type Something"
        />

        <CheckboxInput
          name="notifyTenant"
          label="Notify tenant via email"
          {...register("notifyTenant")}
        />

        <button type="submit" style={{ display: "none" }} />
      </form>
    </ReusableModal>
  );
};

export default ResumeSubscriptionModal;