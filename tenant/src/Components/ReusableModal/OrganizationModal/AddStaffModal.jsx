import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { useDispatch, useSelector } from "react-redux";
import useAuth from "../../../hooks/useAuth";
import debounce from "lodash/debounce";
import {
  setDraftField,
  resetDraft,
} from "../../../ReduxStore/features/AddStaffDraftSlice";
import ReusableModal from "../ReusableModal";
import {
  BsCloudUpload,
  BsFileEarmarkPdf,
  BsFileEarmarkPlay,
} from "react-icons/bs";
import {
  FaRegFile,
  FaPhotoVideo,
  FaImage,
  FaCheckCircle,
  FaPlus,
} from "react-icons/fa";
import { RiDeleteBin6Line } from "react-icons/ri";
import { IoMdRefresh } from "react-icons/io";
import { SelectInput, TextInput, SwitchInput } from "../../Input/Inputs";
import Button from "../../Button/Button";
import uploadApi from "../../../api/ImageUpload";
import api from "../../../api/payrollApi";
import roleApi from "../../../api/roleApi";
import { showToast } from "../../../Helper/ShowToast";
import { RxCross2 } from "react-icons/rx";
import { addStaffSchema as schema } from "./addStaffSchema";
import {
  countryOptions,
  getStateOptions,
  normalizeCountryCode,
  normalizeStateCode,
} from "../../../Helper/geoOptions";
import useReduxFormDraft from "../../../hooks/useReduxFormDraft";

const FileUploadArea = React.memo(
  ({
    onFiles,
    onRemove = () => {},
    accept = ".pdf,.jpg,.jpeg,.png,.gif,.mp4,.avi,.mov",
    maxSizeMB = 50,
    initialFiles = [],
  }) => {
    const [files, setFiles] = useState([]);
    const fileInputRef = useRef(null);

    useEffect(() => {
      const validFiles = initialFiles
        .filter((f) => f && (f.documentsUrl || f.filename))
        .map((f) => ({
          name: f.documentsUrl?.filename || f.filename || "Unknown File",
          url: f.documentsUrl?.url || f.url,
          size: "Unknown",
          progress: 100,
          error: false,
        }));
      setFiles(validFiles);
    }, [initialFiles]);

    const getFileIcon = (fileName) => {
      if (!fileName || typeof fileName !== "string") {
        return <FaRegFile size={16} className="file-icon" />;
      }
      const ext = fileName.split(".").pop()?.toLowerCase();
      if (ext === "pdf")
        return <BsFileEarmarkPdf size={16} className="file-icon" />;
      if (["mp4", "avi", "mov"].includes(ext))
        return <FaPhotoVideo size={16} className="file-icon" />;
      if (["gif"].includes(ext))
        return <BsFileEarmarkPlay size={16} className="file-icon" />;
      if (["png", "jpg", "jpeg", "webp"].includes(ext))
        return <FaImage size={16} className="file-icon" />;
      return <FaRegFile size={16} className="file-icon" />;
    };

    const handleFileChange = (e) => {
      e.preventDefault();
      const selectedFiles = Array.from(e.target.files);
      if (!selectedFiles.length) return;

      const newFiles = selectedFiles.map((file) => {
        const sizeInMB = file.size / 1024 / 1024;
        const sizeDisplay =
          sizeInMB < 1
            ? (file.size / 1024).toFixed(0) + " KB"
            : sizeInMB.toFixed(1) + " MB";

        if (sizeInMB > maxSizeMB) {
          showToast({
            message: `File ${file.name} exceeds ${maxSizeMB}MB limit`,
            type: "error",
          });
          return {
            file,
            name: file.name || "Unknown File",
            size: sizeDisplay,
            progress: 0,
            error: true,
            errorMessage: "File size exceeds 50MB limit",
          };
        }
        return {
          file,
          name: file.name || "Unknown File",
          size: sizeDisplay,
          progress: 0,
          error: false,
        };
      });

      setFiles((prev) => [...prev, ...newFiles]);
      onFiles(newFiles);
      showToast({
        message: `${newFiles.length} file(s) selected`,
        type: "info",
      });

      newFiles.forEach((fileObj, idx) => {
        if (fileObj.error) return;
        let progress = 0;
        const interval = setInterval(() => {
          progress += 10;
          setFiles((prev) =>
            prev.map((f, i) =>
              i === prev.length - newFiles.length + idx
                ? { ...f, progress }
                : f,
            ),
          );
          if (progress >= 100) clearInterval(interval);
        }, 300);
      });

      if (fileInputRef.current) fileInputRef.current.value = null;
    };

    const handleRemoveFile = (idx) => {
      setFiles((prev) => {
        const removedFile = prev[idx];
        showToast({
          message: `File ${removedFile.name} removed`,
          type: "info",
        });
        // Let the parent drop this file from the submit sources (fileResults +
        // the documents form value). Without this the file lingers in
        // fileResults and gets sent even though it was removed from view.
        onRemove(removedFile);
        return prev.filter((_, i) => i !== idx);
      });
    };

    const handleRetryFile = (idx) => {
      setFiles((prev) => {
        const retryFile = prev[idx];
        showToast({
          message: `Retrying upload for ${retryFile.name}`,
          type: "info",
        });
        return prev.map((f, i) =>
          i === idx
            ? { ...f, progress: 0, error: false, errorMessage: null }
            : f,
        );
      });

      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        setFiles((prev) =>
          prev.map((f, i) => (i === idx ? { ...f, progress } : f)),
        );
        if (progress >= 100) {
          clearInterval(interval);
          showToast({
            message: `Retry upload simulation completed`,
            type: "success",
          });
        }
      }, 300);
    };

    return (
      <div className="mb-6">
        <p className="text-sm text-gray-700 font-semibold mb-2">
          Upload Documents
        </p>
        <div className="upload-area">
          <div className="upload-icon">
            <BsCloudUpload size={24} />
          </div>
          <p>Click to upload or drag and drop</p>
          <p className="text-xs text-gray-500">
            PDF, JPG, PNG, GIF, MP4, AVI, MOV (max. {maxSizeMB} MB)
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleFileChange}
            className="upload-input"
            multiple
          />
        </div>

        {files.length > 0 && (
          <div className="file-list mt-3">
            {files.map((file, idx) => (
              <div key={idx} className="file-item">
                <div className="file-header">
                  <div className="file-info">
                    {getFileIcon(file.name)}
                    <span className="file-name">
                      {file.name} • {file.size}
                    </span>
                  </div>
                  <div className="file-actions">
                    {file.progress === 100 && !file.error && (
                      <FaCheckCircle size={16} className="file-success" />
                    )}
                    <button
                      className="remove-file"
                      onClick={() => handleRemoveFile(idx)}
                    >
                      <RiDeleteBin6Line size={16} />
                    </button>
                    {file.error && (
                      <button
                        className="retry-file"
                        onClick={() => handleRetryFile(idx)}
                      >
                        <IoMdRefresh size={16} />
                      </button>
                    )}
                  </div>
                </div>
                {file.error ? (
                  <span className="file-error">{file.errorMessage}</span>
                ) : (
                  <div className="progress-bar">
                    <div
                      className="progress"
                      style={{ width: `${file.progress}%` }}
                    ></div>
                    <span className="progress-text">{file.progress}%</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  },
);

const AddStaffModal = ({ isOpen, onClose, onSubmit, mode, initialData }) => {
  const [activeTab, setActiveTab] = useState("Basic Information");
  const [submitting, setSubmitting] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [fileResults, setFileResults] = useState([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Dynamic payroll options
  const [incomeOptions, setIncomeOptions] = useState([]);
  const [deductionOptions, setDeductionOptions] = useState([]);

  const dispatch = useDispatch();
  const reduxDraft = useSelector((s) => s.staffFormDraft?.formData);
  const { accessToken, refreshToken, tenantId } = useAuth();

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    control,
    trigger,
    formState: { errors },
  } = useForm({
    mode: "onTouched",
    reValidateMode: "onBlur",
    resolver: yupResolver(schema),
    defaultValues: {
      licenses: [],
      otherPays: [],
      deductions: [],
      documents: [],
      programId: "",
      staffId: "",
      active: true,
      phoneNumber: "",
      paymentSchedule: "",
      ratePerHour: "",
      minimumHours: "",
    },
  });

  // Keep the freshest errors so validateTab can name the failing fields right
  // after an async trigger() (the closure's `errors` would otherwise be stale).
  const errorsRef = useRef(errors);
  errorsRef.current = errors;

  // Exclude documents and licenses from the draft so the Licenses tab always
  // starts empty (a row only appears via the "Add License" button), and file
  // uploads aren't persisted across reopens.
  const clearDraft = useReduxFormDraft("add-staff", {
    watch,
    reset,
    isOpen,
    exclude: ["documents", "licenses"],
  });

  const values = useWatch({ control });
  const paymentSchedule = watch("paymentSchedule");

  // Fetch income items (other pays) & deductions — silently on modal open
  const fetchIncomeItems = useCallback(async () => {
    if (!tenantId || !accessToken) return;
    try {
      const data = await api.GetIncomeItemsByTenantId({
        tenantId,
        accessToken,
        refreshToken,
      });
      const options = (data.data || []).map((item) => ({
        value: item.id,
        label: item.name || "Unknown Income",
      }));
      setIncomeOptions(options);
    } catch (error) {
      console.error("Error fetching income items:", error);
      // Silent fail — no toast shown as requested
      setIncomeOptions([]);
    }
  }, [tenantId, accessToken, refreshToken]);

  const fetchDeductions = useCallback(async () => {
    if (!tenantId || !accessToken) return;
    try {
      const data = await api.GetDeductionsByTenantId({
        tenantId,
        accessToken,
        refreshToken,
      });
      const options = (data.data || []).map((item) => ({
        value: item.id,
        label: item.name || "Unknown Deduction",
      }));
      setDeductionOptions(options);
    } catch (error) {
      console.error("Error fetching deductions:", error);
      // Silent fail — no toast shown as requested
      setDeductionOptions([]);
    }
  }, [tenantId, accessToken, refreshToken]);

  // ─── Fetch roles ───
  const [staffRoleOptions, setStaffRoleOptions] = useState([]);
  const fetchRoles = useCallback(async () => {
    try {
      const res = await roleApi.GetAllRolesByTenantId({
        tenantId,
        accessToken,
        refreshToken,
      });
      const roles = res.data?.data || res.data || [];
      setStaffRoleOptions(
        roles.map((role) => ({ value: role.id, label: role.name })),
      );
    } catch {
      setStaffRoleOptions([]);
    }
  }, [tenantId, accessToken, refreshToken]);

  // Fetch once when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchIncomeItems();
      fetchDeductions();
      fetchRoles();
    }
  }, [isOpen, fetchIncomeItems, fetchDeductions, fetchRoles]);

  const compensationTypeOptions = useMemo(
    () => [
      { value: "HOURLY", label: "Hourly" },
      { value: "DAILY", label: "Daily" },
      { value: "SALARIED", label: "Salaried" },
    ],
    [],
  );

  const genderOptions = useMemo(
    () => [
      { value: "male", label: "Male" },
      { value: "female", label: "Female" },
    ],
    [],
  );

  const country = watch("country");
  const stateOptions = useMemo(() => getStateOptions(country), [country]);
  // Professional licences are issued by US states regardless of the staff
  // member's mailing address, so this list does not follow the country field.
  const licenseStateOptions = useMemo(() => getStateOptions("US"), []);


  const handleFileUpload = useCallback(
    async (fileObjects) => {
      setUploadingFiles(true);
      const validFiles = fileObjects.filter((f) => !f.error);
      const newResults = [];

      if (!validFiles.length) {
        fileObjects.forEach((f) =>
          newResults.push({
            filename: f.name,
            url: null,
            error: f.errorMessage,
          }),
        );
        setFileResults((prev) => [...prev, ...newResults]);
        setUploadingFiles(false);
        return;
      }

      if (!accessToken || !refreshToken) {
        showToast({ message: "Authentication tokens missing.", type: "error" });
        setUploadingFiles(false);
        return;
      }

      try {
        const formData = new FormData();
        validFiles.forEach((f) => formData.append("images", f.file));
        const res = await uploadApi.UploadImage({
          formData,
          accessToken,
          refreshToken,
        });
        if (res.success) {
          const ups = res.data.map((item) => ({
            filename: item.filename,
            url: item.url,
            error: null,
          }));
          newResults.push(...ups);
          setValue("documents", [...(values.documents || []), ...ups], {
            shouldDirty: true,
          });
          showToast({
            message: `${ups.length} file(s) uploaded successfully`,
            type: "success",
          });
        } else throw new Error(res.error || "Upload failed");
      } catch (e) {
        validFiles.forEach((f) =>
          newResults.push({ filename: f.name, url: null, error: e.message }),
        );
        showToast({
          message: `Failed to upload file(s): ${e.message}`,
          type: "error",
        });
      }

      fileObjects.forEach((f) => {
        if (f.error)
          newResults.push({
            filename: f.name,
            url: null,
            error: f.errorMessage,
          });
      });

      setFileResults((prev) => [...prev, ...newResults]);
      setUploadingFiles(false);
    },
    [accessToken, refreshToken, setValue, values.documents],
  );

  const debouncedUpdateRef = useRef(
    debounce((vals) => {
      const clone = JSON.parse(JSON.stringify(vals));
      clone.documents = (clone.documents || []).map((d) => ({
        id: d.id,
        documentsUrl: d.documentsUrl || { filename: d.filename, url: d.url },
        tenantStaffId: d.tenantStaffId,
      }));
      dispatch(setDraftField(clone));
    }, 500),
  );

  useEffect(() => {
    if (!isOpen) {
      dispatch(resetDraft());
      reset({
        licenses: [],
        otherPays: [],
        deductions: [],
        documents: [],
        programId: "",
        staffId: "",
        active: true,
        phoneNumber: "",
        DOB: "",
        paymentSchedule: "",
        ratePerHour: "",
        minimumHours: "",
      });
      setActiveTab("Basic Information");
      setHasChanges(false);
      setFileResults([]);
      setIncomeOptions([]);
      setDeductionOptions([]);
      return;
    }

    const src = mode === "edit" && initialData ? initialData : reduxDraft;
    if (src && Object.keys(src).length) {
      const clone = JSON.parse(JSON.stringify(src));
      // Only restore licenses when editing an existing staff member. For new
      // staff the Licenses tab starts empty — rows are added via "Add License".
      clone.licenses =
        mode === "edit" &&
        Array.isArray(clone.licenses) &&
        clone.licenses.length
          ? clone.licenses
          : [];
      clone.otherPays =
        Array.isArray(clone.payroll?.otherPays) &&
        clone.payroll.otherPays.length
          ? clone.payroll.otherPays.map((p) => ({
              type: p.type || p || "",
            }))
          : [];
      clone.deductions =
        Array.isArray(clone.payroll?.deductions) &&
        clone.payroll.deductions.length
          ? clone.payroll.deductions.map((d) => ({
              type: d.type || d || "",
            }))
          : [];
      clone.documents = Array.isArray(clone.documents)
        ? clone.documents.map((d) => ({
            id: d.id,
            documentsUrl: d.documentsUrl || {
              filename: d.filename || "Unknown File",
              url: d.url,
            },
            tenantStaffId: d.tenantStaffId,
          }))
        : [];
      clone.active = clone.active ?? true;
      clone.phoneNumber = clone.phoneNumber ?? "";
      clone.DOB = clone.DOB
        ? new Date(clone.DOB).toISOString().split("T")[0]
        : "";
      clone.country = normalizeCountryCode(clone.country);
      clone.state = normalizeStateCode(clone.state, clone.country);
      clone.paymentSchedule = clone.payroll?.paymentSchedule || "";
      clone.ratePerHour = clone.payroll?.ratePerHour || "";
      clone.minimumHours = clone.payroll?.minimumHours || "";

      reset(clone);
      setFileResults(
        clone.documents.map((d) => ({
          filename: d.documentsUrl.filename || "Unknown File",
          url: d.documentsUrl.url,
          error: null,
        })),
      );
    } else {
      reset({
        licenses: [],
        otherPays: [],
        deductions: [],
        documents: [],
        programId: "",
        staffId: "",
        active: true,
        phoneNumber: "",
        DOB: "",
        paymentSchedule: "",
        ratePerHour: "",
        minimumHours: "",
      });
    }
    setHasChanges(false);
  }, [isOpen, mode, initialData, reduxDraft, reset, dispatch]);

  const tabsList = useMemo(
    () => ["Basic Information", "Licenses", "Payroll Settings", "Documents"],
    [],
  );

  const tabFieldMap = useMemo(
    () => ({
      "Basic Information": [
        "fullName",
        "email",
        "phoneNumber",
        "DOB",
        "gender",
        "staffRole",
        "address",
        "city",
        "state",
        "zip",
        "country",
        "active",
      ],
      Licenses: ["licenses"],
      "Payroll Settings": ["paymentSchedule", "ratePerHour", "minimumHours"],
      Documents: ["documents"],
    }),
    [],
  );

  // Actively run validation for the tab's fields (trigger) instead of reading
  // the stale `errors` object — otherwise required fields can be skipped past.
  const validateTab = useCallback(
    async (tabName) => {
      const valid = await trigger(tabFieldMap[tabName]);
      if (!valid) {
        // Name the specific fields that failed (e.g. "Staff Role is required")
        // instead of a generic "fix the errors in this tab" message.
        const messages = tabFieldMap[tabName]
          .map((f) => errorsRef.current?.[f]?.message)
          .filter(Boolean);
        const detail = messages.length
          ? messages.join(", ")
          : `Please fix errors in the ${tabName} tab`;
        showToast({ message: detail, type: "error" });
        return false;
      }
      return true;
    },
    [trigger, tabFieldMap],
  );

  const handleNext = useCallback(async () => {
    const idx = tabsList.indexOf(activeTab);
    if (idx < tabsList.length - 1 && (await validateTab(activeTab))) {
      setActiveTab(tabsList[idx + 1]);
    }
  }, [activeTab, tabsList, validateTab]);

  // On a failed final submit, jump to the first tab that has an error and tell
  // the user — instead of silently doing nothing while errors sit off-screen.
  const handleInvalidSubmit = useCallback(
    (formErrors) => {
      const firstTab = tabsList.find((tab) =>
        tabFieldMap[tab].some((field) => formErrors[field]),
      );
      if (firstTab) setActiveTab(firstTab);
      showToast({
        message: "Please fix the highlighted errors before submitting",
        type: "error",
      });
    },
    [tabsList, tabFieldMap],
  );

  const handlePrevious = useCallback(() => {
    const idx = tabsList.indexOf(activeTab);
    if (idx > 0) {
      setActiveTab(tabsList[idx - 1]);
    }
  }, [activeTab, tabsList]);

  const handleClose = useCallback(() => {
    dispatch(resetDraft());
    reset({
      licenses: [],
      otherPays: [{ type: "" }],
      deductions: [{ type: "" }],
      documents: [],
      programId: "",
      staffId: "",
      active: true,
      phoneNumber: "",
      DOB: "",
      dataAccessLevel: "",
      paymentSchedule: "",
      ratePerHour: "",
      minimumHours: "",
    });
    setActiveTab("Basic Information");
    setHasChanges(false);
    setFileResults([]);
    setIncomeOptions([]);
    setDeductionOptions([]);
    onClose();
  }, [dispatch, reset, onClose]);

  // const handleFormSubmit = useCallback(
  //   async (data) => {
  //     if (Object.keys(errors).length) {
  //       showToast({ message: "Please fix form errors before submitting", type: "error" });
  //       return;
  //     }
  //     if (uploadingFiles) {
  //       showToast({ message: "Please wait until uploads finish", type: "error" });
  //       return;
  //     }

  //     // Transform otherPays and deductions to array of IDs (strings)
  //     const transformedData = {
  //       ...data,
  //       payroll: {
  //         paymentSchedule: data.paymentSchedule,
  //         ratePerHour: Number(data.ratePerHour),
  //         minimumHours: data.minimumHours ? Number(data.minimumHours) : null,
  //         otherPays: (data.otherPays || [])
  //           .filter(p => p.type && p.type.trim() !== "")
  //           .map(p => p.type),   // extract just the IDs
  //         deductions: (data.deductions || [])
  //           .filter(d => d.type && d.type.trim() !== "")
  //           .map(d => d.type),   // extract just the IDs
  //       },
  //       documents: fileResults,
  //       // remove payroll from root level if backend doesn't want it there
  //       // delete data.payroll; // ← optional
  //     };


  //     setSubmitting(true);
  //     setSubmitError("");

  //     try {
  //       await onSubmit(transformedData);
  //       // ... reset logic ...
  //     } catch (e) {
  //       setSubmitError(e.message || "Save failed");
  //     } finally {
  //       setSubmitting(false);
  //     }
  //   },
  //   [errors, uploadingFiles, fileResults, onSubmit, dispatch, reset, onClose]
  // );

  const handleFormSubmit = useCallback(
    async (data) => {
      if (Object.keys(errors).length) {
        showToast({
          message: "Please fix form errors before submitting",
          type: "error",
        });
        return;
      }
      if (uploadingFiles) {
        showToast({
          message: "Please wait until uploads finish",
          type: "error",
        });
        return;
      }

      // Optional fields the backend rejects when sent empty ("not allowed to be
      // empty"). Drop any that the user left blank so they're simply omitted.
      const OPTIONAL_FIELDS = [
        "DOB",
        "gender",
        "practiceNPI",
        "address",
        "city",
        "state",
        "zip",
        "country",
      ];
      const cleanedData = { ...data };
      OPTIONAL_FIELDS.forEach((field) => {
        const value = cleanedData[field];
        if (value === "" || value === null || value === undefined) {
          delete cleanedData[field];
        }
      });

      const payroll = {
        paymentSchedule: data.paymentSchedule,
        ratePerHour: Number(data.ratePerHour),
        ...(data.paymentSchedule === "SALARIED" && data.minimumHours != null
          ? { minimumHours: Number(data.minimumHours) }
          : {}),
      };
      // Only include the optional pay collections when they actually have rows.
      const otherPays = (data.otherPays || [])
        .filter((p) => p.type && p.type.trim() !== "")
        .map((p) => ({ id: p.type }));
      const deductions = (data.deductions || [])
        .filter((d) => d.type && d.type.trim() !== "")
        .map((d) => ({ id: d.type }));
      if (otherPays.length) payroll.otherPays = otherPays;
      if (deductions.length) payroll.deductions = deductions;

      const transformedData = { ...cleanedData, payroll };

      // Optional collections — omit entirely when empty instead of sending [].
      if (Array.isArray(fileResults) && fileResults.length > 0) {
        transformedData.documents = fileResults;
      } else {
        delete transformedData.documents;
      }
      if (
        !Array.isArray(transformedData.licenses) ||
        transformedData.licenses.length === 0
      ) {
        delete transformedData.licenses;
      }

      setSubmitting(true);

      try {
        await onSubmit(transformedData);
        // reset logic...
        dispatch(resetDraft());
        clearDraft();
        reset({
          /* your defaults */
        });
        setActiveTab("Basic Information");
        setHasChanges(false);
        setFileResults([]);
        onClose();
      } catch (e) {
        showToast({ message: e.message || "Save failed", type: "error" });
      } finally {
        setSubmitting(false);
      }
    },
    [errors, uploadingFiles, fileResults, onSubmit, dispatch, reset, onClose, clearDraft],
  );

  const basicInfoTab = useMemo(
    () => (
      <div className="space-y-4">
        <TextInput
          required
          label="Full Name"
          {...register("fullName")}
          error={errors.fullName?.message}
          placeholder="Enter Full Name"
        />
        <TextInput
          required
          label="Email"
          type="email"
          {...register("email")}
          error={errors.email?.message}
          placeholder="Enter Email"
        />
        <TextInput
          required
          label="Phone Number"
          type="tel"
          {...register("phoneNumber")}
          error={errors.phoneNumber?.message}
          placeholder="Enter Phone Number"
        />
        <TextInput
          label="Date of Birth"
          type="date"
          {...register("DOB")}
          error={errors.DOB?.message}
        />
        <Controller
          name="gender"
          control={control}
          render={({ field }) => (
            <SelectInput
              label="Gender"
              placeholder="Select gender"
              options={genderOptions}
              width="full"
              isSearchable={false}
              error={errors.gender?.message}
              {...field}
            />
          )}
        />
        <TextInput
          label="NPI"
          {...register("practiceNPI")}
          error={errors.practiceNPI?.message}
          placeholder="Enter NPI"
        />
        <Controller
          name="staffRole"
          control={control}
          render={({ field }) => (
            <SelectInput
              required
              label="Staff Role"
              placeholder="Select staff role"
              options={staffRoleOptions}
              emptyHint="No roles found. Create one in Organisation → Role & Permissions."
              width="full"
              isSearchable={false}
              error={errors.staffRole?.message}
              {...field}
            />
          )}
        />
        <div className="flex gap-4">
          <div className="flex-1">
            <TextInput
              label="Address"
              {...register("address")}
              error={errors.address?.message}
              placeholder="Enter Address"
            />
          </div>
          <TextInput
            label="City"
            {...register("city")}
            error={errors.city?.message}
            placeholder="Enter City"
          />
        </div>
        <div className="flex gap-4">
          <div className="flex-1">
            <Controller
              name="state"
              control={control}
              render={({ field }) => (
                <SelectInput
                  label="State"
                  options={stateOptions}
                  disabled={!country}
                  emptyHint={
                    country
                      ? "This country has no states/provinces."
                      : "Select a country first."
                  }
                  error={errors.state?.message}
                  placeholder="Select state"
                  {...field}
                />
              )}
            />
          </div>
          <div className="flex-1">
            <TextInput
              label="ZIP"
              {...register("zip")}
              error={errors.zip?.message}
              placeholder="Enter ZIP"
            />
          </div>
          <div className="flex-1">
            <Controller
              name="country"
              control={control}
              render={({ field }) => (
                <SelectInput
                  label="Country"
                  options={countryOptions}
                  error={errors.country?.message}
                  placeholder="Select country"
                  {...field}
                  onChange={(e) => {
                    field.onChange(e);
                    // The old state belongs to the old country.
                    setValue("state", "");
                  }}
                />
              )}
            />
          </div>
        </div>
        <Controller
          name="active"
          control={control}
          render={({ field }) => (
            <SwitchInput
              label="Active Status"
              checked={field.value}
              onChange={(e) => field.onChange(e.target.checked)}
              error={errors.active?.message}
            />
          )}
        />
      </div>
    ),
    [
      register,
      errors,
      control,
      genderOptions,
      staffRoleOptions,
      stateOptions,
      countryOptions,
      country,
      setValue,
    ],
  );

  const licensesTab = useMemo(
    () => (
      <div className="space-y-4">
        {values.licenses?.map((l, idx) => (
          <div key={idx} className="p-4 border-b mb-6">
            <TextInput
              required
              label="License Name"
              {...register(`licenses.${idx}.licenseName`)}
              error={errors.licenses?.[idx]?.licenseName?.message}
              placeholder="Enter license name"
            />
            <TextInput
              required
              label="License Number"
              {...register(`licenses.${idx}.licenseNumber`)}
              error={errors.licenses?.[idx]?.licenseNumber?.message}
              placeholder="Enter license number"
            />
            <div className="flex gap-4">
              <div className="flex-1">
                <TextInput
                  required
                  label="Expiration Date"
                  type="date"
                  {...register(`licenses.${idx}.expiryDate`)}
                  error={errors.licenses?.[idx]?.expiryDate?.message}
                />
              </div>
              <div className="flex-1">
                <Controller
                  name={`licenses.${idx}.state`}
                  control={control}
                  render={({ field }) => (
                    <SelectInput
                      required
                      label="State"
                      options={licenseStateOptions}
                      error={errors.licenses?.[idx]?.state?.message}
                      placeholder="Select state"
                      {...field}
                    />
                  )}
                />
              </div>
            </div>
            {/* Licenses are optional — every row (including the first) can be
                removed so a staff member can have no licenses at all. */}
            <div className="justify-end flex">
              <Button
                type="button"
                variant="danger"
                label="Remove License"
                onClick={() => {
                  setValue(
                    "licenses",
                    values.licenses.filter((_, i) => i !== idx),
                    { shouldDirty: true },
                  );
                  showToast({ message: "License removed", type: "info" });
                }}
                className="mt-2"
              />
            </div>
          </div>
        ))}
        <Button
          icon={<FaPlus />}
          variant="secondary"
          label="Add License"
          className="mb-6"
          onClick={() => {
            setValue(
              "licenses",
              [
                ...(values.licenses || []),
                {
                  licenseName: "",
                  licenseNumber: "",
                  expiryDate: "",
                  state: "",
                },
              ],
              { shouldDirty: true },
            );
          }}
        />
      </div>
    ),
    [
      values.licenses,
      errors.licenses,
      register,
      control,
      stateOptions,
      setValue,
    ],
  );

  const payrollTab = useMemo(
    () => (
      <div className="space-y-6">
        <Controller
          name="paymentSchedule"
          control={control}
          render={({ field }) => (
            <SelectInput
              required
              label="Compensation Type"
              options={compensationTypeOptions}
              error={errors.paymentSchedule?.message}
              placeholder="Select compensation type"
              {...field}
            />
          )}
        />

        {paymentSchedule && (
          <TextInput
            required
            label={
              paymentSchedule === "HOURLY"
                ? "Pay Rate (per hour)"
                : paymentSchedule === "DAILY"
                  ? "Pay Rate (per day)"
                  : "Pay Rate (Salary)"
            }
            type="number"
            step="0.01"
            {...register("ratePerHour")}
            error={errors.ratePerHour?.message}
            placeholder={
              paymentSchedule === "HOURLY"
                ? "e.g. 45.50"
                : paymentSchedule === "DAILY"
                  ? "e.g. 320.00"
                  : "e.g. 5200.00"
            }
          />
        )}

        {paymentSchedule === "SALARIED" && (
          <TextInput
            required
            label="Minimum Number of Hours per Month"
            type="number"
            step="0.5"
            {...register("minimumHours")}
            error={errors.minimumHours?.message}
            placeholder="e.g. 160"
          />
        )}

        {/* Other Pay Section */}
        <div className="space-y-4 mt-8">
          <h4 className="font-medium">Other Pay</h4>

          {values.otherPays?.map((p, idx) => (
            <div key={idx} className="flex items-center gap-16 p-3 ">
              <div className="flex-1">
                <Controller
                  name={`otherPays.${idx}.type`}
                  control={control}
                  render={({ field }) => (
                    <SelectInput
                      label="Pay Type"
                      options={incomeOptions}
                      emptyHint="No income items found. Create one in Payroll → Payroll Settings."
                      error={errors.otherPays?.[idx]?.type?.message}
                      placeholder="Select pay type"
                      {...field}
                    />
                  )}
                />
              </div>

              {/* Remove button beside EVERY row */}
              <button
                type="button"
                onClick={() => {
                  setValue(
                    "otherPays",
                    values.otherPays.filter((_, i) => i !== idx),
                    { shouldDirty: true },
                  );
                  showToast({ message: "Other pay removed", type: "info" });
                }}
                className="text-red-500 hover:text-red-700 transition-colors p-1 rounded-full hover:bg-red-50"
                title="Remove this pay item"
              >
                <RxCross2 size={20} />
              </button>
            </div>
          ))}

          <Button
            icon={<FaPlus />}
            variant="secondary"
            label="Add Other Pay"
            className="mb-6"
            onClick={() => {
              setValue(
                "otherPays",
                [...(values.otherPays || []), { type: "" }],
                { shouldDirty: true },
              );
            }}
          />
        </div>

        {/* Deductions Section */}
        <div className="space-y-4 mt-8">
          <h4 className="font-medium">Deductions</h4>

          {values.deductions?.map((d, idx) => (
            <div key={idx} className="flex items-center gap-16 p-3 ">
              <div className="flex-1">
                <Controller
                  name={`deductions.${idx}.type`}
                  control={control}
                  render={({ field }) => (
                    <SelectInput
                      label="Deduction Type"
                      options={deductionOptions}
                      emptyHint="No deductions found. Create one in Payroll → Payroll Settings."
                      error={errors.deductions?.[idx]?.type?.message}
                      placeholder="Select deduction type"
                      {...field}
                    />
                  )}
                />
              </div>

              {/* Remove button beside EVERY row */}
              <button
                type="button"
                onClick={() => {
                  setValue(
                    "deductions",
                    values.deductions.filter((_, i) => i !== idx),
                    { shouldDirty: true },
                  );
                  showToast({ message: "Deduction removed", type: "info" });
                }}
                className="text-red-500 hover:text-red-700 transition-colors p-1 rounded-full hover:bg-red-50"
                title="Remove this deduction"
              >
                <RxCross2 size={20} />
              </button>
            </div>
          ))}

          <Button
            icon={<FaPlus />}
            variant="secondary"
            label="Add Deduction"
            className="mb-6"
            onClick={() => {
              setValue(
                "deductions",
                [...(values.deductions || []), { type: "" }],
                { shouldDirty: true },
              );
            }}
          />
        </div>
      </div>
    ),
    [
      paymentSchedule,
      values.otherPays,
      values.deductions,
      errors,
      control,
      register,
      setValue,
      compensationTypeOptions,
      incomeOptions,
      deductionOptions,
    ],
  );

  const documentsTab = (
    <div>
      <FileUploadArea
        onFiles={(fileObjects) => {
          // Upload only. handleFileUpload writes the uploaded results (which
          // have filename/url) into `documents`. Writing the raw selected
          // objects here would be filtered out by FileUploadArea's
          // initialFiles effect and wipe the just-added file from the list.
          handleFileUpload(fileObjects);
        }}
        onRemove={(removed) => {
          // Keep the submit sources in sync with what the user sees: drop the
          // removed file from both fileResults (used to build the payload) and
          // the documents form value (used to render the list).
          const removedUrl = removed?.url;
          const removedName = removed?.name;
          setFileResults((prev) =>
            prev.filter(
              (r) =>
                (removedUrl ? r.url !== removedUrl : true) &&
                (removedName ? r.filename !== removedName : true),
            ),
          );
          setValue(
            "documents",
            (values.documents || []).filter((d) => {
              const dUrl = d.documentsUrl?.url || d.url;
              const dName = d.documentsUrl?.filename || d.filename;
              return (
                (removedUrl ? dUrl !== removedUrl : true) &&
                (removedName ? dName !== removedName : true)
              );
            }),
            { shouldDirty: true },
          );
        }}
        accept=".pdf,.jpg,.jpeg,.png,.gif,.mp4,.avi,.mov"
        maxSizeMB={50}
        initialFiles={values.documents || []}
      />
    </div>
  );

  const buildTabs = useMemo(
    () => [
      { name: "Basic Information", content: basicInfoTab },
      { name: "Licenses", content: licensesTab },
      { name: "Payroll Settings", content: payrollTab },
      { name: "Documents", content: documentsTab },
    ],
    [basicInfoTab, licensesTab, payrollTab, documentsTab],
  );

  const getPrimaryButtonText = useCallback(() => {
    if (mode === "edit") return hasChanges ? "Save" : "Next";
    return activeTab === "Documents" ? "Save" : "Next";
  }, [mode, hasChanges, activeTab]);

  const getSecondaryButtonText = useCallback(
    () => (activeTab === "Basic Information" ? "Cancel" : "Previous"),
    [activeTab],
  );

  const getPrimaryButtonAction = useCallback(
    () =>
      activeTab === "Documents"
        ? handleSubmit(handleFormSubmit, handleInvalidSubmit)
        : handleNext,
    [activeTab, handleSubmit, handleFormSubmit, handleInvalidSubmit, handleNext],
  );

  useEffect(() => () => debouncedUpdateRef.current.cancel(), []);

  return (
    <ReusableModal
      key={isOpen ? "open" : "closed"}
      isOpen={isOpen}
      onClose={handleClose}
      title={mode === "edit" ? "Edit Staff" : "New Staff"}
      primaryButtonText={getPrimaryButtonText()}
      secondaryButtonText={getSecondaryButtonText()}
      tabs={buildTabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onPrimaryButtonClick={getPrimaryButtonAction()}
      onSecondaryButtonClick={
        activeTab === "Basic Information" ? handleClose : handlePrevious
      }
      size="lg"
      primaryButtonLoading={submitting || uploadingFiles}
      primaryButtonDisabled={uploadingFiles || fileResults.some((r) => r.error)}
    />
  );
};

export default React.memo(AddStaffModal);
