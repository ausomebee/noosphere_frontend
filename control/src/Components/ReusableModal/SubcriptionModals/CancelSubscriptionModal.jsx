import React, { useState } from "react";
import ReusableModal from "../ReusableModal";
import { TextareaInput, SelectInput, RadioInput, CheckboxInput, RequiredMark } from "../../Input/Inputs";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";

const CancelSubscriptionModal = ({ isOpen, onClose, onSave, selectedItems }) => {
  const [loading, setLoading] = useState(false);

  const schema = yup.object().shape({
    cancellationType: yup.string().required("Cancellation type is required"),
    reason: yup.string().required("Reason is required"),
    comment: yup.string().nullable().notRequired().max(1000, "Comment must not exceed 1000 characters"),
    understandIrreversible: yup.bool().oneOf([true], "You must acknowledge this action"),
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      cancellationType: "immediately",
      reason: "",
      comment: "",
      understandIrreversible: false,
    },
  });

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await onSave({
        items: selectedItems,
        cancellationType: data.cancellationType,
        reason: data.reason,
        ...(data.comment ? { comment: data.comment } : {}),
        notifyTenant: data.notifyTenant || false,
      });
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
      title="Cancel Subscription"
      primaryButtonText="Cancel"
      secondaryButtonText="Cancel"
      primaryButtonLoading={loading}
      onPrimaryButtonClick={handleSubmit(onSubmit)}
      primaryButtonColor="#D92D20"
      onSecondaryButtonClick={() => {
        reset();
        onClose();
      }}
    >
      <form className="modal-form" onSubmit={handleSubmit(onSubmit)}>
        <label>
          Cancellation Options
          <RequiredMark required />
        </label>
        <div style={{display: "flex", flexDirection: "column", gap: "10px", marginTop: "10px", marginBottom: "20px"}}>
          <RadioInput
            name="cancellationType"
            value="immediately"
            label="Cancel immediately"
            {...register("cancellationType")}
            error={errors.cancellationType?.message}
          />
          <RadioInput
            name="cancellationType"
            value="endOfCycle"
            label="Cancel at the end of the billing cycle"
            {...register("cancellationType")}
            error={errors.cancellationType?.message}
          />
        </div>

        <label>Select Reason</label>
        <SelectInput
          required
          {...register("reason")}
          error={errors.reason?.message}
          options={[
            { value: "", label: "Select" },
            { value: "Tenant Request", label: "Tenant Request" },
            { value: "Terms Violation", label: "Terms Violation" },
            { value: "No Usage/Inactivity", label: "No Usage/Inactivity" },
            { value: "Compliance Requirement", label: "Compliance Requirement" },
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
          required
          name="understandIrreversible"
          label="I understand that this action is irreversible"
          {...register("understandIrreversible")}
          error={errors.understandIrreversible?.message}
        />

        <button type="submit" style={{ display: "none" }} />
      </form>
    </ReusableModal>
  );
};

export default CancelSubscriptionModal;