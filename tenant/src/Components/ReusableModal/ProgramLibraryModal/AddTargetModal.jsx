import React, { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { useDispatch, useSelector } from "react-redux";
import {
  setDraftField,
  resetDraft,
} from "../../../ReduxStore/features/AddTargetDraftSlice";
import ReusableModal from "../ReusableModal";
import { BsCloudUpload } from "react-icons/bs";
import { RiDeleteBin6Line } from "react-icons/ri";
import {
  RadioInput,
  SelectInput,
  SwitchInput,
  TextareaInput,
  TextInput,
} from "../../Input/Inputs";
import { showToast } from "../../../Helper/ShowToast";
import { teachingProcedureOptions as TeachingProcedureOptions, promptStrategyOptions as PromptStrategyOptions, dataCollectionTypeOptions as DataCollectionTypeOptions, masteryCriteriaOptions as MasteryCriteria, targetStatusOptions as StatusAndAdmin } from "../../../Data/selectOptions";
import { addTargetSchema as schema, MASTERY_OPTION_SLOTS, MASTERY_FIELDS } from "./addTargetSchema";
import useReduxFormDraft from "../../../hooks/useReduxFormDraft";

/* ---------- FileUploadArea Component ---------- */
const FileUploadArea = ({
  onFiles,
  onRemove = () => {},
  initialFile = null,
  accept = ".pdf,.jpg,.jpeg,.png,.gif",
  maxSizeMB = 50,
}) => {
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);

  // Show an already-saved attachment (edit mode) until the user replaces it.
  useEffect(() => {
    if (!initialFile) {
      setFile(null);
      return;
    }
    if (initialFile instanceof File) {
      setFile(initialFile);
      setProgress(100);
      return;
    }
    if (typeof initialFile === "string") {
      setFile({
        name: initialFile.split("/").pop() || "Attachment",
        url: initialFile,
        existing: true,
      });
      setProgress(100);
      return;
    }
    const url =
      initialFile.url || initialFile.fileUrl || initialFile.documentsUrl?.url;
    const nm =
      initialFile.filename ||
      initialFile.name ||
      initialFile.documentsUrl?.filename ||
      (url ? url.split("/").pop() : "Attachment");
    setFile({ name: nm || "Attachment", url, existing: true });
    setProgress(100);
  }, [initialFile]);

  const handleRemove = () => {
    setFile(null);
    setProgress(0);
    onRemove();
  };

  const handleChange = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    const sizeMB = selected.size / 1024 / 1024;
    if (sizeMB > maxSizeMB) {
      alert(`File must be ≤ ${maxSizeMB} MB`);
      return;
    }

    setFile(selected);
    setProgress(0);

    let p = 0;
    const t = setInterval(() => {
      p += 10;
      setProgress(p);
      if (p >= 100) {
        clearInterval(t);
        onFiles([selected]);
      }
    }, 200);
  };

  return (
    <div className="mb-6">
      <p className="text-sm text-gray-700 font-semibold mb-2">
        Upload Attachments
      </p>
      <div className="upload-area">
        <div className="upload-icon">
          <BsCloudUpload size={24} />
        </div>
        <p>Click to upload or drag and drop</p>
        <p className="text-xs text-gray-500">
          SVG, PNG, JPG, GIF (max. 800x400px, 50 MB)
        </p>
        <input
          type="file"
          accept={accept}
          onChange={handleChange}
          className="upload-input"
        />
      </div>

      {file && (
        <div className="file-list mt-3">
          <div
            className="file-item"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "8px",
            }}
          >
            <span>
              {file.url ? (
                <a href={file.url} target="_blank" rel="noreferrer">
                  {file.name}
                </a>
              ) : (
                file.name
              )}
              {typeof file.size === "number"
                ? ` (${(file.size / 1024 / 1024).toFixed(1)} MB)`
                : ""}
            </span>
            <div
              style={{ display: "flex", alignItems: "center", gap: "8px" }}
            >
              {!file.existing && (
                <div className="progress-bar">
                  <div className="progress" style={{ width: `${progress}%` }} />
                </div>
              )}
              <button
                type="button"
                onClick={handleRemove}
                className="remove-file"
                aria-label="Remove file"
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "#dc2626",
                }}
              >
                <RiDeleteBin6Line size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ---------- AddTargetModal Component ---------- */
const AddTargetModal = ({
  isOpen,
  onClose,
  onSubmit,
  mode,
  initialData,
  programId,
}) => {
 
  const [activeTab, setActiveTab] = useState("Basic Info");
  const [submitting, setSubmitting] = useState(false);
  const [taskStepCount, setTaskStepCount] = useState(0);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sd, setSd] = useState("");
  const [expectedResponse, setExpectedResponse] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  const dispatch = useDispatch();
  const reduxDraft = useSelector((s) => s.targetDraft);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
    control,
    setValue,
    watch,
    getValues,
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: reduxDraft,
  });

  const clearDraft = useReduxFormDraft("add-target", { watch, reset, isOpen, exclude: ["attachment"] });

  const teachingProcedure = watch("teachingProcedure");
  const promptingStrategy = watch("promptingStrategy");
  const dataCollectionType = watch("dataCollectionType");
  const masteryMetric = watch("masteryMetric");
  const trialOrOpportunitiesSession = watch("trialOrOpportunitiesSession");
  const masteryCriteriaOption = watch("masteryCriteriaOption");

  /* ---------- Auto-save to Redux and Track Changes ---------- */
  useEffect(() => {
    if (!isOpen) return;
    const subscription = watch((values) => {
      const clone = { ...values };
      clone.attachment = values.attachment?.name || null;
      dispatch(setDraftField(clone));

      // Check for changes in edit mode
      if (mode === "edit" && initialData) {
        const hasFormChanges = isDirty || JSON.stringify({
          name,
          description,
          sd,
          expectedResponse,
          ...values,
        }) !== JSON.stringify({
          name: initialData.name || "",
          description: initialData.description || "",
          sd: initialData.sd || "",
          expectedResponse: initialData.expectedResponse || "",
          ...initialData,
        });
        setHasChanges(hasFormChanges);
      }
    });
    return () => subscription.unsubscribe();
  }, [isOpen, watch, dispatch, mode, initialData, name, description, sd, expectedResponse, isDirty]);

  /* ---------- Load/Reset Form Data ---------- */
  useEffect(() => {
    if (!isOpen) {
      dispatch(resetDraft());
      reset({ programId });
      setName("");
      setDescription("");
      setSd("");
      setExpectedResponse("");
      setActiveTab("Basic Info");
      setTaskStepCount(0);
      setHasChanges(false);
      return;
    }

    const source = mode === "edit" && initialData ? initialData : reduxDraft;
    if (source) {
      setName(source.name || "");
      setDescription(source.description || "");
      setSd(source.sd || "");
      setExpectedResponse(source.expectedResponse || "");
      reset({ ...source, programId });
      if (source.masteryCriteria) {
        const mc = source.masteryCriteria;
        const metric = mc.metric || "";
        const option = mc.optionOne || mc.optionTwo || mc.optionThree || "";
        setValue("masteryMetric", metric);
        setValue("masteryCriteriaOption", option);
        // Load saved values into the SELECTED option's own unique inputs so the
        // numbers appear in the correct boxes when editing.
        const fields = (MASTERY_FIELDS[metric] || {})[option] || {};
        const criteriaValues = {
          value: mc.value,
          sessions: mc.sessions,
          totalSessions: mc.totalSessions,
          sessionCount: mc.sessionCount,
          unit: mc.unit,
        };
        Object.entries(fields).forEach(([key, fieldName]) => {
          setValue(fieldName, criteriaValues[key] ?? "");
        });
      }
    } else {
      reset({ programId });
      setName("");
      setDescription("");
      setSd("");
      setExpectedResponse("");
    }
    setActiveTab("Basic Info");
    setHasChanges(false);
  }, [isOpen, mode, initialData, programId, reduxDraft, reset, setValue, dispatch]);

  /* ---------- Mastery Criteria Builder ---------- */
  // Build the backend-shaped masteryCriteria object from the SELECTED option's
  // own unique inputs. Each option has independent field names, so only its
  // values are read — no cross-contamination. Output shape is unchanged:
  // { metric, optionOne|optionTwo|optionThree, value?, sessions?, totalSessions?,
  //   sessionCount?, unit? }. Computed at submit (and for the load round-trip).
  const buildMasteryCriteria = (values) => {
    const metric = values.masteryMetric;
    const option = values.masteryCriteriaOption;
    const criteria = {};
    if (metric) criteria.metric = metric;
    if (option) {
      const slot = (MASTERY_OPTION_SLOTS[metric] || {})[option];
      if (slot) criteria[slot] = option;
    }
    const fields = (MASTERY_FIELDS[metric] || {})[option] || {};
    Object.entries(fields).forEach(([key, fieldName]) => {
      const raw = values[fieldName];
      if (raw === "" || raw === undefined || raw === null) return;
      criteria[key] = key === "unit" ? raw : Number(raw);
    });
    return criteria;
  };

  /* ---------- Task Steps Logic ---------- */
  useEffect(() => {
    const count = parseInt(trialOrOpportunitiesSession) || 0;
    if (dataCollectionType === "Task Analysis" && count > 0) {
      setTaskStepCount(count);
      const steps = Array.from({ length: count }, (_, i) => {
        const existing = getValues("taskSteps")?.[i] || "";
        return existing;
      });
      setValue("taskSteps", steps);
    }
  }, [trialOrOpportunitiesSession, dataCollectionType, setValue, getValues]);

  /* ---------- Form Submission ---------- */
  const handleFormSubmit = async (data) => {
    if (Object.keys(errors).length) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const payload = {
        ...data,
        masteryCriteria: buildMasteryCriteria(data),
        name,
        description,
        sd,
        expectedResponse,
        programId,
      };
      const formData = await buildTargetFormData(payload, mode);
      await onSubmit(formData);
      dispatch(resetDraft());
      clearDraft();
      reset({ programId });
      setName("");
      setDescription("");
      setSd("");
      setExpectedResponse("");
      setActiveTab("Basic Info");
      setTaskStepCount(0);
      setHasChanges(false);
      onClose();
    } catch (e) {
      console.error("Submit failed:", e);
      setSubmitError(e.message || "Save failed. Check the data and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  /* ---------- Tab Navigation ---------- */
  const tabsList = [
    "Basic Info",
    "Teaching Details",
    "Data Collection",
    "Mastery Criteria",
    "Status & Admin",
  ];

  const validateTab = (tabName) => {
    const fields =
      tabName === "Basic Info"
        ? ["name"]
        : tabName === "Teaching Details"
        ? ["teachingProcedure", "promptingStrategy"]
        : tabName === "Data Collection"
        ? ["dataCollectionType"]
        : tabName === "Mastery Criteria"
        ? ["masteryMetric"]
        : ["statusAndAdmin"];
    const invalid = fields.find((f) => errors[f]);
    if (invalid) {
      setSubmitError(`Please fix: ${errors[invalid].message}`);
      return false;
    }
    setSubmitError("");
    return true;
  };

  const handleNext = () => {
    const idx = tabsList.indexOf(activeTab);
    if (idx < tabsList.length - 1) {
      if (validateTab(activeTab)) {
        setActiveTab(tabsList[idx + 1]);
      } else {
        showToast("Please fill in all required fields before proceeding", "error");
      }
    }
  };

  const onValidationError = (errors) => {
    const firstError = Object.values(errors)[0];
    showToast(firstError?.message || "Please fill in all required fields", "error");
  };

  const handlePrevious = () => {
    const idx = tabsList.indexOf(activeTab);
    if (idx > 0) {
      setActiveTab(tabsList[idx - 1]);
    }
  };

  const handleClose = () => {
    dispatch(resetDraft());
    reset({ programId });
    setName("");
    setDescription("");
    setSd("");
    setExpectedResponse("");
    setActiveTab("Basic Info");
    setTaskStepCount(0);
    setSubmitError("");
    setHasChanges(false);
    onClose();
  };

  /* ---------- Tabs Content ---------- */
  const buildTabs = () => [
    {
      name: "Basic Info",
      content: (
        <div>
          <TextInput
            label="Target Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter target name"
            width="full"
            error={errors.name?.message}
            autoComplete="new-target-name"
            name="target-name-field"
            id="target-name-field"
          />
          <TextareaInput
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter target description"
            width="full"
            error={errors.description?.message}
            autoComplete="new-target-description"
            name="target-description-field"
            id="target-description-field"
          />
        </div>
      ),
    },
    {
      name: "Teaching Details",
      content: (
        <div>
          <TextInput
            label="SD"
            value={sd}
            onChange={(e) => setSd(e.target.value)}
            placeholder="Enter SD"
            width="full"
            error={errors.sd?.message}
            autoComplete="new-sd-field"
            name="sd-field"
            id="sd-field"
          />
          <TextareaInput
            label="Expected Response"
            value={expectedResponse}
            onChange={(e) => setExpectedResponse(e.target.value)}
            placeholder="Enter expected response"
            width="full"
            error={errors.expectedResponse?.message}
            autoComplete="new-expected-response"
            name="expected-response-field"
            id="expected-response-field"
          />
          <Controller
            name="teachingProcedure"
            control={control}
            render={({ field }) => (
              <SelectInput
                label="Teaching Procedure"
                placeholder="Select a teaching procedure"
                options={TeachingProcedureOptions}
                width="full"
                className="rounded-12px"
                isSearchable={false}
                error={errors.teachingProcedure?.message}
                {...field}
              />
            )}
          />
          {teachingProcedure === "Other (specify)" && (
            <div className="mt-4">
              <TextInput
                label="Other Teaching Procedure"
                {...register("teachingOthers")}
                placeholder="Enter other teaching procedure"
                width="full"
                error={errors.teachingOthers?.message}
              />
            </div>
          )}
          <Controller
            name="promptingStrategy"
            control={control}
            render={({ field }) => (
              <SelectInput
                label="Prompting Strategy"
                placeholder="Select prompting strategies"
                options={PromptStrategyOptions}
                isSearchable={false}
                width="full"
                className="rounded-12px"
                error={errors.promptingStrategy?.message}
                isMulti
                {...field}
              />
            )}
          />
          {promptingStrategy?.includes("Other (specify)") && (
            <div className="mt-4">
              <TextInput
                label="Other Prompting Strategy"
                {...register("promptOthers")}
                placeholder="Enter other prompting strategy"
                width="full"
                error={errors.promptOthers?.message}
              />
            </div>
          )}
        </div>
      ),
    },
    {
      name: "Data Collection",
      content: (
        <div>
          <Controller
            name="dataCollectionType"
            control={control}
            render={({ field }) => (
              <SelectInput
                label="Data Collection Type"
                placeholder="Select data collection type"
                options={DataCollectionTypeOptions}
                width="full"
                className="rounded-12px"
                isSearchable={false}
                error={errors.dataCollectionType?.message}
                {...field}
              />
            )}
          />
          {dataCollectionType === "Latency" && (
            <div className="py-2 px-2 rounded-md bg-gray-150 mt-2">
              <p className="text-base text-gray-400 font-semibold">
                Trial Settings
              </p>
              <div className="flex items-center gap-4">
                <p className="text-base text-gray-700 font-semibold">
                  Number of trials per session
                </p>
                <div style={{ marginBottom: "-14px" }}>
                  <TextInput
                    type="number"
                    {...register("percentageCorrectTrialSession")}
                    width="100"
                    className="rounded-20px"
                    error={errors.percentageCorrectTrialSession?.message}
                  />
                </div>
              </div>
            </div>
          )}
          {dataCollectionType === "Percentage Correct" && (
            <div className="py-2 px-2 rounded-md bg-gray-150 mt-2">
              <p className="text-base text-gray-400 font-semibold">
                Trial Settings
              </p>
              <div className="flex items-center gap-4">
                <p className="text-base text-gray-700 font-semibold">
                  Number of trials per session
                </p>
                <div style={{ marginBottom: "-14px" }}>
                  <TextInput
                    type="number"
                    {...register("percentageCorrectTrialSession")}
                    width="100"
                    className="rounded-20px"
                    error={errors.percentageCorrectTrialSession?.message}
                  />
                </div>
              </div>
            </div>
          )}
          {dataCollectionType === "Trials/Opportunities" && (
            <div className="py-2 px-2 rounded-md bg-gray-150 mt-2">
              <p className="text-base text-gray-400 font-semibold">
                Trial Settings
              </p>
              <div className="flex items-center gap-4">
                <p className="text-base text-gray-700 font-semibold">
                  Number of trials per session
                </p>
                <div style={{ marginBottom: "-14px" }}>
                  <TextInput
                    type="number"
                    {...register("trialOrOpportunitiesSession")}
                    width="100"
                    className="rounded-20px"
                    error={errors.trialOrOpportunitiesSession?.message}
                  />
                </div>
              </div>
            </div>
          )}
          {dataCollectionType === "Task Analysis" && (
            <div className="py-2 px-2 rounded-md bg-gray-150 mt-2">
              <p className="text-base text-gray-400 font-semibold">
                Trial Settings
              </p>
              <div>
                <div className="flex items-center gap-4">
                  <p className="text-base text-gray-700 font-semibold">
                    Number of tasks per session
                  </p>
                  <div style={{ marginBottom: "-14px" }}>
                    <TextInput
                      type="number"
                      {...register("trialOrOpportunitiesSession")}
                      width="100"
                      className="rounded-20px"
                      error={errors.trialOrOpportunitiesSession?.message}
                    />
                  </div>
                </div>
                <p className="text-base text-gray-400 font-semibold mt-6">
                  Task Steps
                </p>
                {Array.from({ length: taskStepCount }, (_, i) => (
                  <div
                    className="flex justify-between items-center mt-4"
                    key={i}
                  >
                    <p className="text-base text-gray-400 font-semibold">
                      Step {i + 1}
                    </p>
                    <div style={{ marginBottom: "-14px", width: "80%" }}>
                      <TextInput
                        type="text"
                        {...register(`taskSteps.${i}`)}
                        width="full"
                        className="rounded-20px"
                        placeholder="Enter Task"
                        error={errors.taskSteps?.[i]?.message}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="flex justify-between mt-3">
            <p className="text-base text-sm text-gray-600">
              Baseline Data Required?
            </p>
            <SwitchInput {...register("baselineDataRequired")} />
          </div>
        </div>
      ),
    },
    {
      name: "Mastery Criteria",
      content: (
        <div>
          <Controller
            name="masteryMetric"
            control={control}
            render={({ field }) => (
              <SelectInput
                label="Mastery Metric"
                placeholder="Select an option"
                options={MasteryCriteria}
                width="full"
                className="rounded-12px"
                error={errors.masteryMetric?.message}
                {...field}
              />
            )}
          />
          {masteryMetric === "Percentage Accuracy" && (
            <div className="py-2 px-4 rounded-md bg-gray-150 mt-2">
              <p className="text-md text-gray-400 mt-2 font-semibold">
                Mastery Criteria
              </p>
              <div className="flex items-center gap-4 mt-4">
                <div style={{ marginBottom: "-14px" }}>
                  <RadioInput
                    {...register("masteryCriteriaOption")}
                    value="percentage"
                  />
                </div>
                <div style={{ marginBottom: "-14px" }}>
                  <TextInput
                    type="number"
                    {...register("mcPaPctValue")}
                    width="100"
                    className="rounded-20px"
                    placeholder="0%"
                    error={errors.mcPaPctValue?.message}
                  />
                </div>
                <p className="text-sm text-gray-700 font-semibold">For</p>
                <div style={{ marginBottom: "-14px" }}>
                  <TextInput
                    type="number"
                    {...register("mcPaPctSessions")}
                    width="100"
                    className="rounded-20px"
                    placeholder="0"
                    error={errors.mcPaPctSessions?.message}
                  />
                </div>
                <p className="text-sm text-gray-700 font-semibold">
                  Consecutive sessions
                </p>
              </div>
              <div className="flex items-center gap-4 mt-4">
                <div style={{ marginBottom: "-14px" }}>
                  <RadioInput
                    {...register("masteryCriteriaOption")}
                    value="percentageOf"
                  />
                </div>
                <div style={{ marginBottom: "-14px" }}>
                  <TextInput
                    type="number"
                    {...register("mcPaPofValue")}
                    width="100"
                    className="rounded-20px"
                    placeholder="0%"
                    error={errors.mcPaPofValue?.message}
                  />
                </div>
                <p className="text-sm text-gray-700 font-semibold">For</p>
                <div style={{ marginBottom: "-14px" }}>
                  <TextInput
                    type="number"
                    {...register("mcPaPofTotal")}
                    width="100"
                    className="rounded-20px"
                    placeholder="0"
                    error={errors.mcPaPofTotal?.message}
                  />
                </div>
                <p className="text-sm text-gray-700 font-semibold">of</p>
                <div style={{ marginBottom: "-14px" }}>
                  <TextInput
                    type="number"
                    {...register("mcPaPofCount")}
                    width="100"
                    className="rounded-20px"
                    placeholder="0"
                    error={errors.mcPaPofCount?.message}
                  />
                </div>
                <p className="text-sm text-gray-700 font-semibold">sessions</p>
              </div>
              <div className="flex items-center gap-4 mt-4">
                <div style={{ marginBottom: "-14px" }}>
                  <RadioInput
                    {...register("masteryCriteriaOption")}
                    value="average"
                  />
                </div>
                <p className="text-sm text-gray-700 font-semibold">
                  Average of{" "}
                </p>
                <div style={{ marginBottom: "-14px" }}>
                  <TextInput
                    type="number"
                    {...register("mcPaAvgValue")}
                    width="100"
                    className="rounded-20px"
                    placeholder="0%"
                    error={errors.mcPaAvgValue?.message}
                  />
                </div>
                <p className="text-sm text-gray-700 font-semibold">across</p>
                <div style={{ marginBottom: "-14px" }}>
                  <TextInput
                    type="number"
                    {...register("mcPaAvgCount")}
                    width="100"
                    className="rounded-20px"
                    placeholder="0"
                    error={errors.mcPaAvgCount?.message}
                  />
                </div>
                <p className="text-sm text-gray-700 font-semibold">sessions</p>
              </div>
            </div>
          )}
          {masteryMetric === "Trials Correct" && (
            <div className="py-2 px-4 rounded-md bg-gray-150 mt-2">
              <p className="text-md text-gray-400 mt-2 font-semibold">
                Mastery Criteria
              </p>
              <div className="flex items-center gap-4 mt-4">
                <div style={{ marginBottom: "-14px" }}>
                  <RadioInput
                    {...register("masteryCriteriaOption")}
                    value="consecutive"
                  />
                </div>
                <div style={{ marginBottom: "-14px" }}>
                  <TextInput
                    type="number"
                    {...register("mcTcConValue")}
                    width="100"
                    className="rounded-20px"
                    placeholder="0"
                    error={errors.mcTcConValue?.message}
                  />
                </div>
                <p className="text-sm text-gray-700 font-semibold">
                  Correct trials per session for
                </p>
                <div style={{ marginBottom: "-14px" }}>
                  <TextInput
                    type="number"
                    {...register("mcTcConSessions")}
                    width="100"
                    className="rounded-20px"
                    placeholder="0"
                    error={errors.mcTcConSessions?.message}
                  />
                </div>
                <p className="text-sm text-gray-700 font-semibold">
                  Consecutive sessions
                </p>
              </div>
              <div className="flex items-center gap-4 mt-4">
                <div style={{ marginBottom: "-14px" }}>
                  <RadioInput
                    {...register("masteryCriteriaOption")}
                    value="percentageOf"
                  />
                </div>
                <div style={{ marginBottom: "-14px" }}>
                  <TextInput
                    type="number"
                    {...register("mcTcPofValue")}
                    width="100"
                    className="rounded-20px"
                    placeholder="0"
                    error={errors.mcTcPofValue?.message}
                  />
                </div>
                <p className="text-sm text-gray-700 font-semibold">
                  correct trials for
                </p>
                <div style={{ marginBottom: "-14px" }}>
                  <TextInput
                    type="number"
                    {...register("mcTcPofTotal")}
                    width="100"
                    className="rounded-20px"
                    placeholder="0"
                    error={errors.mcTcPofTotal?.message}
                  />
                </div>
                <p className="text-sm text-gray-700 font-semibold">of</p>
                <div style={{ marginBottom: "-14px" }}>
                  <TextInput
                    type="number"
                    {...register("mcTcPofCount")}
                    width="100"
                    className="rounded-20px"
                    placeholder="0"
                    error={errors.mcTcPofCount?.message}
                  />
                </div>
                <p className="text-sm text-gray-700 font-semibold">sessions</p>
              </div>
            </div>
          )}
          {masteryMetric === "Independent Responses" && (
            <div className="py-2 px-4 rounded-md bg-gray-150 mt-2">
              <p className="text-md text-gray-400 mt-2 font-semibold">
                Mastery Criteria
              </p>
              <div className="flex items-center gap-4 mt-4">
                <div style={{ marginBottom: "-14px" }}>
                  <RadioInput
                    {...register("masteryCriteriaOption")}
                    value="consecutive"
                  />
                </div>
                <p className="text-sm text-gray-700 font-semibold">
                  Independent responding in
                </p>
                <div style={{ marginBottom: "-14px" }}>
                  <TextInput
                    type="number"
                    {...register("mcIrConSessions")}
                    width="100"
                    className="rounded-20px"
                    placeholder="0"
                    error={errors.mcIrConSessions?.message}
                  />
                </div>
                <p className="text-sm text-gray-700 font-semibold">
                  Consecutive sessions
                </p>
              </div>
              <div className="flex items-center gap-4 mt-4">
                <div style={{ marginBottom: "-14px" }}>
                  <RadioInput
                    {...register("masteryCriteriaOption")}
                    value="percentageOf"
                  />
                </div>
                <p className="text-sm text-gray-700 font-semibold">
                  Independent for
                </p>
                <div style={{ marginBottom: "-14px" }}>
                  <TextInput
                    type="number"
                    {...register("mcIrPofTotal")}
                    width="100"
                    className="rounded-20px"
                    placeholder="0"
                    error={errors.mcIrPofTotal?.message}
                  />
                </div>
                <p className="text-sm text-gray-700 font-semibold">out of</p>
                <div style={{ marginBottom: "-14px" }}>
                  <TextInput
                    type="number"
                    {...register("mcIrPofCount")}
                    width="100"
                    className="rounded-20px"
                    placeholder="0"
                    error={errors.mcIrPofCount?.message}
                  />
                </div>
                <p className="text-sm text-gray-700 font-semibold">sessions</p>
              </div>
            </div>
          )}
          {masteryMetric === "Frequency Count" && (
            <div className="py-2 px-4 rounded-md bg-gray-150 mt-2">
              <p className="text-md text-gray-400 mt-2 font-semibold">
                Mastery Criteria
              </p>
              <div className="flex items-center gap-4 mt-4">
                <div style={{ marginBottom: "-14px" }}>
                  <RadioInput
                    {...register("masteryCriteriaOption")}
                    value="greaterThan"
                  />
                </div>
                <p className="text-sm text-gray-700 font-semibold">
                  Greater than or equal to
                </p>
                <div style={{ marginBottom: "-14px" }}>
                  <TextInput
                    type="number"
                    {...register("mcFcGtValue")}
                    width="100"
                    className="rounded-20px"
                    placeholder="0"
                    error={errors.mcFcGtValue?.message}
                  />
                </div>
                <p className="text-sm text-gray-700 font-semibold">
                  occurrences per session for
                </p>
                <div style={{ marginBottom: "-14px" }}>
                  <TextInput
                    type="number"
                    {...register("mcFcGtSessions")}
                    width="100"
                    className="rounded-20px"
                    placeholder="0"
                    error={errors.mcFcGtSessions?.message}
                  />
                </div>
                <p className="text-sm text-gray-700 font-semibold">sessions</p>
              </div>
            </div>
          )}
          {masteryMetric === "Rate" && (
            <div className="py-2 px-4 rounded-md bg-gray-150 mt-2">
              <p className="text-md text-gray-400 mt-2 font-semibold">
                Mastery Criteria
              </p>
              <div className="flex items-center gap-4 mt-4">
                <div style={{ marginBottom: "-14px" }}>
                  <RadioInput
                    {...register("masteryCriteriaOption")}
                    value="greaterThan"
                  />
                </div>
                <p className="text-sm text-gray-700 font-semibold">
                  Greater than or equal to
                </p>
                <div style={{ marginBottom: "-14px" }}>
                  <TextInput
                    type="number"
                    {...register("mcRtGtValue")}
                    width="100"
                    className="rounded-20px"
                    placeholder="0"
                    error={errors.mcRtGtValue?.message}
                  />
                </div>
                <p className="text-sm text-gray-700 font-semibold">rate for</p>
                <div style={{ marginBottom: "-14px" }}>
                  <TextInput
                    type="number"
                    {...register("mcRtGtSessions")}
                    width="100"
                    className="rounded-20px"
                    placeholder="0"
                    error={errors.mcRtGtSessions?.message}
                  />
                </div>
                <p className="text-sm text-gray-700 font-semibold">
                  consecutive sessions
                </p>
              </div>
            </div>
          )}
          {masteryMetric === "Duration" && (
            <div className="py-2 px-4 rounded-md bg-gray-150 mt-2">
              <p className="text-md text-gray-400 mt-2 font-semibold">
                Mastery Criteria
              </p>
              <div className="flex items-center gap-4 mt-4">
                <div style={{ marginBottom: "-14px" }}>
                  <RadioInput
                    {...register("masteryCriteriaOption")}
                    value="duration"
                  />
                </div>
                <p className="text-sm text-gray-700 font-semibold">
                  Maintain behaviour for
                </p>
                <div style={{ marginBottom: "-14px" }}>
                  <TextInput
                    type="number"
                    {...register("mcDurValue")}
                    width="100"
                    className="rounded-20px"
                    placeholder="0"
                    error={errors.mcDurValue?.message}
                  />
                </div>
                <div style={{ marginBottom: "-14px" }}>
                  <SelectInput
                    value={watch("mcDurUnit")}
                    onChange={(e) => setValue("mcDurUnit", e.target.value)}
                    options={[
                      { value: "seconds", label: "Seconds" },
                      { value: "minutes", label: "Minutes" },
                      { value: "hour(s)", label: "Hour(s)" },
                    ]}
                    className="rounded-20px"
                    width="100"
                    error={errors.mcDurUnit?.message}
                  />
                </div>
                <p className="text-sm text-gray-700 font-semibold">over</p>
                <div style={{ marginBottom: "-14px" }}>
                  <TextInput
                    type="number"
                    {...register("mcDurSessions")}
                    width="100"
                    className="rounded-20px"
                    placeholder="0"
                    error={errors.mcDurSessions?.message}
                  />
                </div>
                <p className="text-sm text-gray-700 font-semibold">
                  consecutive sessions
                </p>
              </div>
            </div>
          )}
          {masteryMetric === "Latency" && (
            <div className="py-2 px-4 rounded-md bg-gray-150 mt-2">
              <p className="text-md text-gray-400 mt-2 font-semibold">
                Mastery Criteria
              </p>
              <div className="flex items-center gap-4 mt-4">
                <div style={{ marginBottom: "-14px" }}>
                  <RadioInput
                    {...register("masteryCriteriaOption")}
                    value="latency"
                  />
                </div>
                <p className="text-sm text-gray-700 font-semibold">
                  Response latency ≤
                </p>
                <div style={{ marginBottom: "-14px" }}>
                  <TextInput
                    type="number"
                    {...register("mcLatValue")}
                    width="100"
                    className="rounded-20px"
                    placeholder="0"
                    error={errors.mcLatValue?.message}
                  />
                </div>
                <div style={{ marginBottom: "-14px" }}>
                  <SelectInput
                    value={watch("mcLatUnit")}
                    onChange={(e) => setValue("mcLatUnit", e.target.value)}
                    options={[
                      { value: "seconds", label: "Seconds" },
                      { value: "minutes", label: "Minutes" },
                      { value: "hour(s)", label: "Hour(s)" },
                    ]}
                    className="rounded-20px"
                    width="100"
                    error={errors.mcLatUnit?.message}
                  />
                </div>
                <p className="text-sm text-gray-700 font-semibold">for</p>
                <div style={{ marginBottom: "-14px" }}>
                  <TextInput
                    type="number"
                    {...register("mcLatSessions")}
                    width="100"
                    className="rounded-20px"
                    placeholder="0"
                    error={errors.mcLatSessions?.message}
                  />
                </div>
                <p className="text-sm text-gray-700 font-semibold">
                  consecutive sessions
                </p>
              </div>
            </div>
          )}
          {masteryMetric === "Percentage of Steps Independent" && (
            <div className="py-2 px-4 rounded-md bg-gray-150 mt-2">
              <p className="text-md text-gray-400 mt-2 font-semibold">
                Mastery Criteria
              </p>
              <div className="flex items-center gap-4 mt-4">
                <div style={{ marginBottom: "-14px" }}>
                  <RadioInput
                    {...register("masteryCriteriaOption")}
                    value="percentageSteps"
                  />
                </div>
                <div style={{ marginBottom: "-14px" }}>
                  <TextInput
                    type="number"
                    {...register("mcPsiValue")}
                    width="100"
                    className="rounded-20px"
                    placeholder="0"
                    error={errors.mcPsiValue?.message}
                  />
                </div>
                <p className="text-sm text-gray-700 font-semibold">
                  of task steps independent for
                </p>
                <div style={{ marginBottom: "-14px" }}>
                  <TextInput
                    type="number"
                    {...register("mcPsiSessions")}
                    width="100"
                    className="rounded-20px"
                    placeholder="0"
                    error={errors.mcPsiSessions?.message}
                  />
                </div>
                <p className="text-sm text-gray-700 font-semibold">sessions</p>
              </div>
              <div className="flex items-center gap-4 mt-4">
                <div style={{ marginBottom: "-14px" }}>
                  <RadioInput
                    {...register("masteryCriteriaOption")}
                    value="allSteps"
                  />
                </div>
                <p className="text-sm text-gray-700 font-semibold">
                  All steps performed independently once or more
                </p>
              </div>
            </div>
          )}
          {masteryMetric === "Full Task Completion" && (
            <div className="py-2 px-4 rounded-md bg-gray-150 mt-2">
              <p className="text-md text-gray-400 mt-2 font-semibold">
                Mastery Criteria
              </p>
              <div className="flex items-center gap-4 mt-4">
                <div style={{ marginBottom: "-14px" }}>
                  <RadioInput
                    {...register("masteryCriteriaOption")}
                    value="completion"
                  />
                </div>
                <p className="text-sm text-gray-700 font-semibold">
                  Task completed independently for
                </p>
                <div style={{ marginBottom: "-14px" }}>
                  <TextInput
                    type="number"
                    {...register("mcFtcSessions")}
                    width="100"
                    className="rounded-20px"
                    placeholder="0"
                    error={errors.mcFtcSessions?.message}
                  />
                </div>
                <p className="text-sm text-gray-700 font-semibold">
                  consecutive sessions
                </p>
              </div>
            </div>
          )}
        </div>
      ),
    },
    {
      name: "Status & Admin",
      content: (
        <div>
          <Controller
            name="statusAndAdmin"
            control={control}
            render={({ field }) => (
              <SelectInput
                label="Initial Status"
                placeholder="Select an option"
                options={StatusAndAdmin}
                width="full"
                isSearchable={false}
                className="rounded-12px"
                error={errors.statusAndAdmin?.message}
                {...field}
              />
            )}
          />
          <FileUploadArea
            onFiles={(files) => setValue("attachment", files[0])}
            onRemove={() => setValue("attachment", null)}
            initialFile={mode === "edit" ? initialData?.attachment : null}
            accept=".pdf,.jpg,.jpeg,.png,.gif"
            maxSizeMB={50}
          />
          <div className="mt-4">
            <TextareaInput
              label="Note"
              {...register("note")}
              placeholder="Enter Note"
              width="full"
              error={errors.note?.message}
            />
          </div>
           {/* {submitError && (
            <div className="mb-4 px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded">
              {submitError}
            </div>
          )} */}
        </div>
      ),
    },
  ];

  /* ---------- Button Text Logic ---------- */
  const getPrimaryButtonText = () => {
    if (mode === "edit") {
      return hasChanges ? "Save" : "Next";
    }
    return activeTab === "Status & Admin" ? "Save" : "Next";
  };

  const getSecondaryButtonText = () => {
    if (mode === "edit") {
      return "Cancel";
    }
    return activeTab === "Basic Info" ? "Cancel" : "Previous";
  };

  const getPrimaryButtonAction = () => {
    if (mode === "edit") {
      return hasChanges ? handleSubmit(handleFormSubmit, onValidationError) : handleNext;
    }
    return activeTab === "Status & Admin" ? handleSubmit(handleFormSubmit, onValidationError) : handleNext;
  };

  return (
    <ReusableModal
      isOpen={isOpen}
      onClose={handleClose}
      title={mode === "edit" ? "Edit Target" : "Add a new Target"}
      primaryButtonText={getPrimaryButtonText()}
      secondaryButtonText={getSecondaryButtonText()}
      tabs={buildTabs()}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onPrimaryButtonClick={getPrimaryButtonAction()}
      onSecondaryButtonClick={activeTab === "Basic Info" || mode === "edit" ? handleClose : handlePrevious}
      size="lg"
      primaryButtonLoading={submitting}
    />
  );
};

export default AddTargetModal;

/* ---------- FormData Builder ---------- */
async function buildTargetFormData(data, mode) {
  const fd = new FormData();

  if (mode === "edit" && data.id) {
    fd.append("id", data.id.toString());
  }
  fd.append("name", data.name || "");
  // Optional text fields — only send when the user actually entered something.
  if (data.description?.trim())
    fd.append("description", data.description.trim());
  fd.append("programId", data.programId);
  if (data.sd?.trim()) fd.append("sd", data.sd.trim());
  if (data.expectedResponse?.trim())
    fd.append("expectedResponse", data.expectedResponse.trim());
  fd.append("teachingProcedure", data.teachingProcedure || "");
  fd.append("dataCollectionType", data.dataCollectionType || "");
  fd.append("baselineDataRequired", Boolean(data.baselineDataRequired));
  fd.append("initialStatus", data.statusAndAdmin || "");
  // Notes are optional — only send when the user actually typed something.
  if (data.note && data.note.trim()) fd.append("notes", data.note.trim());
  if (data.masteryMetric?.trim())
    fd.append("masteryMetric", data.masteryMetric.trim());

  // Use the array-form key so a single selection still arrives as an array
  // (the backend requires promptingStrategy to be an array).
  (data.promptingStrategy || []).forEach((str) =>
    fd.append("promptingStrategy[]", JSON.stringify({ label: str, value: str }))
  );
  if (data.promptOthers) fd.append("promptOthers", data.promptOthers);

  if (data.dataCollectionType === "Task Analysis" && data.taskSteps?.length) {
    data.taskSteps.forEach((step) => fd.append("taskSteps", step));
  }

  if (
    data.dataCollectionType === "Percentage Correct" &&
    data.percentageCorrectTrialSession
  ) {
    fd.append("numberOfTrials", Number(data.percentageCorrectTrialSession));
  }
  if (
    data.dataCollectionType === "Latency" &&
    data.percentageCorrectTrialSession
  ) {
    fd.append("numberOfTrials", Number(data.percentageCorrectTrialSession));
  }
  if (
    data.dataCollectionType === "Task Analysis" &&
    data.trialOrOpportunitiesSession
  ) {
    fd.append("numberOfTasks", Number(data.trialOrOpportunitiesSession));
  }
  if (
    data.trialOrOpportunitiesSession &&
    data.dataCollectionType !== "Task Analysis"
  ) {
    fd.append("numberOfTrials", Number(data.trialOrOpportunitiesSession));
    fd.append("numberOfTasks", Number(data.trialOrOpportunitiesSession));
  }

  // Only send mastery criteria when the user actually configured some.
  if (data.masteryCriteria && Object.keys(data.masteryCriteria).length > 0) {
    fd.append("masteryCriteria", JSON.stringify(data.masteryCriteria));
  }

  // Attachment is optional — only send when a real file was chosen.
  if (data.attachment instanceof File) {
    fd.append("attachment", data.attachment, data.attachment.name);
  }

  return fd;
}