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
import {
  RadioInput,
  SelectInput,
  SwitchInput,
  TextareaInput,
  TextInput,
} from "../../Input/Inputs";
import { showToast } from "../../../Helper/ShowToast";
import { teachingProcedureOptions as TeachingProcedureOptions, promptStrategyOptions as PromptStrategyOptions, dataCollectionTypeOptions as DataCollectionTypeOptions, masteryCriteriaOptions as MasteryCriteria, targetStatusOptions as StatusAndAdmin } from "../../../Data/selectOptions";
import { addTargetSchema as schema, MASTERY_OPTION_SLOTS } from "./addTargetSchema";
import useReduxFormDraft from "../../../hooks/useReduxFormDraft";

/* ---------- FileUploadArea Component ---------- */
const FileUploadArea = ({
  onFiles,
  accept = ".pdf,.jpg,.jpeg,.png,.gif",
  maxSizeMB = 50,
}) => {
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);

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
          <div className="file-item">
            <span>
              {file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)
            </span>
            <div className="progress-bar">
              <div className="progress" style={{ width: `${progress}%` }} />
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
  const customRecurrenceDay = watch("customRecurrenceDay");
  const consecutiveSessions = watch("consecutiveSessions");
  const totalSessions = watch("totalSessions");
  const sessionCount = watch("sessionCount");
  const customRecurrencePosition = watch("customRecurrencePosition");

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
        setValue("masteryMetric", mc.metric || "");
        setValue("masteryCriteriaOption", mc.optionOne || mc.optionTwo || mc.optionThree || "");
        setValue("customRecurrenceDay", mc.value || "");
        setValue("consecutiveSessions", mc.sessions || "");
        setValue("totalSessions", mc.totalSessions || "");
        setValue("sessionCount", mc.sessionCount || "");
        setValue("customRecurrencePosition", mc.unit || "");
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

  /* ---------- Mastery Criteria Logic ---------- */
  useEffect(() => {
    const criteria = {};
    if (masteryMetric) criteria.metric = masteryMetric;

    // Map selected radio option to the correct slot (optionOne/optionTwo/optionThree)
    if (masteryCriteriaOption) {
      const slots = MASTERY_OPTION_SLOTS[masteryMetric] || {};
      const slot = slots[masteryCriteriaOption];
      if (slot) criteria[slot] = masteryCriteriaOption;
    }

    if (customRecurrenceDay) criteria.value = Number(customRecurrenceDay);
    if (consecutiveSessions) criteria.sessions = Number(consecutiveSessions);
    if (totalSessions) criteria.totalSessions = Number(totalSessions);
    if (sessionCount) criteria.sessionCount = Number(sessionCount);
    if (customRecurrencePosition) criteria.unit = customRecurrencePosition;

    setValue("masteryCriteria", criteria);
  }, [
    masteryMetric,
    masteryCriteriaOption,
    customRecurrenceDay,
    consecutiveSessions,
    totalSessions,
    sessionCount,
    customRecurrencePosition,
    setValue,
  ]);

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
        ? ["name", "description"]
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
                    {...register("customRecurrenceDay")}
                    width="100"
                    className="rounded-20px"
                    placeholder="0%"
                    error={errors.customRecurrenceDay?.message}
                  />
                </div>
                <p className="text-sm text-gray-700 font-semibold">For</p>
                <div style={{ marginBottom: "-14px" }}>
                  <TextInput
                    type="number"
                    {...register("consecutiveSessions")}
                    width="100"
                    className="rounded-20px"
                    placeholder="0"
                    error={errors.consecutiveSessions?.message}
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
                    {...register("customRecurrenceDay")}
                    width="100"
                    className="rounded-20px"
                    placeholder="0%"
                    error={errors.customRecurrenceDay?.message}
                  />
                </div>
                <p className="text-sm text-gray-700 font-semibold">For</p>
                <div style={{ marginBottom: "-14px" }}>
                  <TextInput
                    type="number"
                    {...register("totalSessions")}
                    width="100"
                    className="rounded-20px"
                    placeholder="0"
                    error={errors.totalSessions?.message}
                  />
                </div>
                <p className="text-sm text-gray-700 font-semibold">of</p>
                <div style={{ marginBottom: "-14px" }}>
                  <TextInput
                    type="number"
                    {...register("sessionCount")}
                    width="100"
                    className="rounded-20px"
                    placeholder="0"
                    error={errors.sessionCount?.message}
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
                    {...register("customRecurrenceDay")}
                    width="100"
                    className="rounded-20px"
                    placeholder="0%"
                    error={errors.customRecurrenceDay?.message}
                  />
                </div>
                <p className="text-sm text-gray-700 font-semibold">across</p>
                <div style={{ marginBottom: "-14px" }}>
                  <TextInput
                    type="number"
                    {...register("sessionCount")}
                    width="100"
                    className="rounded-20px"
                    placeholder="0"
                    error={errors.sessionCount?.message}
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
                    {...register("customRecurrenceDay")}
                    width="100"
                    className="rounded-20px"
                    placeholder="0"
                    error={errors.customRecurrenceDay?.message}
                  />
                </div>
                <p className="text-sm text-gray-700 font-semibold">
                  Correct trials per session for
                </p>
                <div style={{ marginBottom: "-14px" }}>
                  <TextInput
                    type="number"
                    {...register("consecutiveSessions")}
                    width="100"
                    className="rounded-20px"
                    placeholder="0"
                    error={errors.consecutiveSessions?.message}
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
                    {...register("customRecurrenceDay")}
                    width="100"
                    className="rounded-20px"
                    placeholder="0"
                    error={errors.customRecurrenceDay?.message}
                  />
                </div>
                <p className="text-sm text-gray-700 font-semibold">
                  correct trials for
                </p>
                <div style={{ marginBottom: "-14px" }}>
                  <TextInput
                    type="number"
                    {...register("totalSessions")}
                    width="100"
                    className="rounded-20px"
                    placeholder="0"
                    error={errors.totalSessions?.message}
                  />
                </div>
                <p className="text-sm text-gray-700 font-semibold">of</p>
                <div style={{ marginBottom: "-14px" }}>
                  <TextInput
                    type="number"
                    {...register("sessionCount")}
                    width="100"
                    className="rounded-20px"
                    placeholder="0"
                    error={errors.sessionCount?.message}
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
                    {...register("consecutiveSessions")}
                    width="100"
                    className="rounded-20px"
                    placeholder="0"
                    error={errors.consecutiveSessions?.message}
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
                    {...register("totalSessions")}
                    width="100"
                    className="rounded-20px"
                    placeholder="0"
                    error={errors.totalSessions?.message}
                  />
                </div>
                <p className="text-sm text-gray-700 font-semibold">out of</p>
                <div style={{ marginBottom: "-14px" }}>
                  <TextInput
                    type="number"
                    {...register("sessionCount")}
                    width="100"
                    className="rounded-20px"
                    placeholder="0"
                    error={errors.sessionCount?.message}
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
                    {...register("customRecurrenceDay")}
                    width="100"
                    className="rounded-20px"
                    placeholder="0"
                    error={errors.customRecurrenceDay?.message}
                  />
                </div>
                <p className="text-sm text-gray-700 font-semibold">
                  occurrences per session for
                </p>
                <div style={{ marginBottom: "-14px" }}>
                  <TextInput
                    type="number"
                    {...register("consecutiveSessions")}
                    width="100"
                    className="rounded-20px"
                    placeholder="0"
                    error={errors.consecutiveSessions?.message}
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
                    {...register("customRecurrenceDay")}
                    width="100"
                    className="rounded-20px"
                    placeholder="0"
                    error={errors.customRecurrenceDay?.message}
                  />
                </div>
                <p className="text-sm text-gray-700 font-semibold">rate for</p>
                <div style={{ marginBottom: "-14px" }}>
                  <TextInput
                    type="number"
                    {...register("consecutiveSessions")}
                    width="100"
                    className="rounded-20px"
                    placeholder="0"
                    error={errors.consecutiveSessions?.message}
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
                    {...register("customRecurrenceDay")}
                    width="100"
                    className="rounded-20px"
                    placeholder="0"
                    error={errors.customRecurrenceDay?.message}
                  />
                </div>
                <div style={{ marginBottom: "-14px" }}>
                  <SelectInput
                    value={watch("customRecurrencePosition")}
                    onChange={(e) =>
                      setValue("customRecurrencePosition", e.target.value)
                    }
                    options={[
                      { value: "seconds", label: "Seconds" },
                      { value: "minutes", label: "Minutes" },
                      { value: "hour(s)", label: "Hour(s)" },
                    ]}
                    className="rounded-20px"
                    width="100"
                    error={errors.customRecurrencePosition?.message}
                  />
                </div>
                <p className="text-sm text-gray-700 font-semibold">over</p>
                <div style={{ marginBottom: "-14px" }}>
                  <TextInput
                    type="number"
                    {...register("consecutiveSessions")}
                    width="100"
                    className="rounded-20px"
                    placeholder="0"
                    error={errors.consecutiveSessions?.message}
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
                    {...register("customRecurrenceDay")}
                    width="100"
                    className="rounded-20px"
                    placeholder="0"
                    error={errors.customRecurrenceDay?.message}
                  />
                </div>
                <div style={{ marginBottom: "-14px" }}>
                  <SelectInput
                    value={watch("customRecurrencePosition")}
                    onChange={(e) =>
                      setValue("customRecurrencePosition", e.target.value)
                    }
                    options={[
                      { value: "seconds", label: "Seconds" },
                      { value: "minutes", label: "Minutes" },
                      { value: "hour(s)", label: "Hour(s)" },
                    ]}
                    className="rounded-20px"
                    width="100"
                    error={errors.customRecurrencePosition?.message}
                  />
                </div>
                <p className="text-sm text-gray-700 font-semibold">for</p>
                <div style={{ marginBottom: "-14px" }}>
                  <TextInput
                    type="number"
                    {...register("consecutiveSessions")}
                    width="100"
                    className="rounded-20px"
                    placeholder="0"
                    error={errors.consecutiveSessions?.message}
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
                    {...register("customRecurrenceDay")}
                    width="100"
                    className="rounded-20px"
                    placeholder="0"
                    error={errors.customRecurrenceDay?.message}
                  />
                </div>
                <p className="text-sm text-gray-700 font-semibold">
                  of task steps independent for
                </p>
                <div style={{ marginBottom: "-14px" }}>
                  <TextInput
                    type="number"
                    {...register("consecutiveSessions")}
                    width="100"
                    className="rounded-20px"
                    placeholder="0"
                    error={errors.consecutiveSessions?.message}
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
                    {...register("consecutiveSessions")}
                    width="100"
                    className="rounded-20px"
                    placeholder="0"
                    error={errors.consecutiveSessions?.message}
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
  fd.append("description", data.description || "");
  fd.append("programId", data.programId);
  fd.append("sd", data.sd || "");
  fd.append("expectedResponse", data.expectedResponse || "");
  fd.append("teachingProcedure", data.teachingProcedure || "");
  fd.append("dataCollectionType", data.dataCollectionType || "");
  fd.append("baselineDataRequired", Boolean(data.baselineDataRequired));
  fd.append("initialStatus", data.statusAndAdmin || "");
  fd.append("notes", data.note || "");
  fd.append("masteryMetric", data.masteryMetric || "");

  (data.promptingStrategy || []).forEach((str) =>
    fd.append("promptingStrategy", JSON.stringify({ label: str, value: str }))
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

  fd.append("masteryCriteria", JSON.stringify(data.masteryCriteria || {}));

  if (data.attachment instanceof File) {
    fd.append("attachment", data.attachment, data.attachment.name);
  } else {
    fd.append("attachment", "");
  }

  return fd;
}