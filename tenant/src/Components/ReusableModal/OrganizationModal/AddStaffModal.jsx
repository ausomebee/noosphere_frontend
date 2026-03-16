import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useDispatch, useSelector } from "react-redux";
import useAuth from "../../../hooks/useAuth";
import { debounce } from "lodash";
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

const schema = yup.object().shape({
  fullName: yup.string().required("Full Name is required"),
  email: yup.string().email("Invalid email").required("Email is required"),
  phoneNumber: yup
    .string()
    .matches(/^\+?[\d\s-]{10,}$/, "Invalid phone number")
    .required("Phone Number is required"),
  DOB: yup
    .date()
    .required("Date of Birth is required")
    .max(new Date(), "Date of Birth cannot be in the future"),
  gender: yup.string().required("Gender is required"),
  practiceNPI: yup
    .string()
    .matches(/^\d{10}$/, "NPI must be a 10-digit number")
    .optional(),
  staffRole: yup.string().required("Staff Role is required"),
  address: yup.string().required("Address is required"),
  city: yup.string().required("City is required"),
  state: yup.string().required("State is required"),
  zip: yup.string().required("ZIP code is required"),
  country: yup.string().required("Country is required"),
  active: yup.boolean().required("Active status is required"),
  licenses: yup.array().of(
    yup.object().shape({
      licenseName: yup.string().required("License Name is required"),
      licenseNumber: yup.string().required("License Number is required"),
      expiryDate: yup.date().required("Expiration Date is required"),
      state: yup.string().required("State is required"),
    }),
  ),
  paymentSchedule: yup
    .string()
    .oneOf(["HOURLY", "DAILY", "SALARIED"])
    .required("Compensation type is required"),
  ratePerHour: yup
    .number()
    .typeError("Must be a valid number")
    .positive("Rate must be positive")
    .required("Pay rate is required"),

  minimumHours: yup
    .number()
    .typeError("Must be a valid number")
    .positive("Must be positive")
    .nullable()
    .transform((value, originalValue) =>
      originalValue === "" || originalValue == null ? null : value,
    )
    .when("paymentSchedule", {
      is: "SALARIED",
      then: (schema) =>
        schema.required(
          "Minimum hours per month is required for Salaried staff",
        ),
      otherwise: (schema) => schema.notRequired().nullable(),
    }),
  otherPays: yup.array().of(
    yup.object().shape({
      type: yup.string().required("Pay type is required"),
    }),
  ),
  deductions: yup.array().of(
    yup.object().shape({
      type: yup.string().required("Deduction type is required"),
    }),
  ),
  documents: yup.array().optional(),
});

const FileUploadArea = React.memo(
  ({
    onFiles,
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
  const [submitError, setSubmitError] = useState("");
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
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      licenses: [
        { licenseName: "", licenseNumber: "", expiryDate: "", state: "" },
      ],
      otherPays: [{ type: "" }],
      deductions: [{ type: "" }],
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

  const countryOptions = useMemo(
    () => [
      { value: "US", label: "United States" },
      { value: "UK", label: "United Kingdom" },
    ],
    [],
  );

  const stateOptions = useMemo(
    () => [
      { value: "AL", label: "Alabama" },
      { value: "AK", label: "Alaska" },
      { value: "AZ", label: "Arizona" },
      { value: "AR", label: "Arkansas" },
      { value: "CA", label: "California" },
      { value: "CO", label: "Colorado" },
      { value: "CT", label: "Connecticut" },
      { value: "DE", label: "Delaware" },
      { value: "FL", label: "Florida" },
      { value: "GA", label: "Georgia" },
      { value: "HI", label: "Hawaii" },
      { value: "ID", label: "Idaho" },
      { value: "IL", label: "Illinois" },
      { value: "IN", label: "Indiana" },
      { value: "IA", label: "Iowa" },
      { value: "KS", label: "Kansas" },
      { value: "KY", label: "Kentucky" },
      { value: "LA", label: "Louisiana" },
      { value: "ME", label: "Maine" },
      { value: "MD", label: "Maryland" },
      { value: "MA", label: "Massachusetts" },
      { value: "MI", label: "Michigan" },
      { value: "MN", label: "Minnesota" },
      { value: "MS", label: "Mississippi" },
      { value: "MO", label: "Missouri" },
      { value: "MT", label: "Montana" },
      { value: "NE", label: "Nebraska" },
      { value: "NV", label: "Nevada" },
      { value: "NH", label: "New Hampshire" },
      { value: "NJ", label: "New Jersey" },
      { value: "NM", label: "New Mexico" },
      { value: "NY", label: "New York" },
      { value: "NC", label: "North Carolina" },
      { value: "ND", label: "North Dakota" },
      { value: "OH", label: "Ohio" },
      { value: "OK", label: "Oklahoma" },
      { value: "OR", label: "Oregon" },
      { value: "PA", label: "Pennsylvania" },
      { value: "RI", label: "Rhode Island" },
      { value: "SC", label: "South Carolina" },
      { value: "SD", label: "South Dakota" },
      { value: "TN", label: "Tennessee" },
      { value: "TX", label: "Texas" },
      { value: "UT", label: "Utah" },
      { value: "VT", label: "Vermont" },
      { value: "VA", label: "Virginia" },
      { value: "WA", label: "Washington" },
      { value: "WV", label: "West Virginia" },
      { value: "WI", label: "Wisconsin" },
      { value: "WY", label: "Wyoming" },
    ],
    [],
  );

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
        setSubmitError("Authentication tokens missing.");
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
        licenses: [
          { licenseName: "", licenseNumber: "", expiryDate: "", state: "" },
        ],
        otherPays: [{ type: "" }],
        deductions: [{ type: "" }],
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
      setSubmitError("");
      setFileResults([]);
      setIncomeOptions([]);
      setDeductionOptions([]);
      return;
    }

    const src = mode === "edit" && initialData ? initialData : reduxDraft;
    if (src && Object.keys(src).length) {
      const clone = JSON.parse(JSON.stringify(src));
      clone.licenses =
        Array.isArray(clone.licenses) && clone.licenses.length
          ? clone.licenses
          : [
              {
                licenseName: "",
                licenseNumber: "",
                expiryDate: "",
                state: "",
              },
            ];
      clone.otherPays =
        Array.isArray(clone.payroll?.otherPays) &&
        clone.payroll.otherPays.length
          ? clone.payroll.otherPays.map((p) => ({
              type: p.type || p || "",
            }))
          : [{ type: "" }];
      clone.deductions =
        Array.isArray(clone.payroll?.deductions) &&
        clone.payroll.deductions.length
          ? clone.payroll.deductions.map((d) => ({
              type: d.type || d || "",
            }))
          : [{ type: "" }];
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
        licenses: [
          { licenseName: "", licenseNumber: "", expiryDate: "", state: "" },
        ],
        otherPays: [{ type: "" }],
        deductions: [{ type: "" }],
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

  const validateTab = useCallback(
    (tabName) => {
      const fields = {
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
      };
      const tabFields = fields[tabName];
      const invalid = tabFields.find((field) => {
        if (field === "licenses")
          return values.licenses?.some((l, i) => errors.licenses?.[i]);
        if (field === "documents")
          return errors.documents?.some((d, i) => errors.documents?.[i]);
        return errors[field];
      });
      if (invalid) {
        setSubmitError(`Please fix errors in the ${tabName} tab`);
        showToast({
          message: `Please fix errors in the ${tabName} tab`,
          type: "error",
        });
        return false;
      }
      setSubmitError("");
      return true;
    },
    [errors, values.licenses],
  );

  const handleNext = useCallback(() => {
    const idx = tabsList.indexOf(activeTab);
    if (idx < tabsList.length - 1 && validateTab(activeTab)) {
      setActiveTab(tabsList[idx + 1]);
    }
  }, [activeTab, tabsList, validateTab]);

  const handlePrevious = useCallback(() => {
    const idx = tabsList.indexOf(activeTab);
    if (idx > 0) {
      setActiveTab(tabsList[idx - 1]);
    }
  }, [activeTab, tabsList]);

  const handleClose = useCallback(() => {
    dispatch(resetDraft());
    reset({
      licenses: [
        { licenseName: "", licenseNumber: "", expiryDate: "", state: "" },
      ],
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
    setSubmitError("");
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

      const payroll = {
        paymentSchedule: data.paymentSchedule,
        ratePerHour: Number(data.ratePerHour),
        // Only include minimumHours if it's Monthly
        ...(data.paymentSchedule === "SALARIED" && data.minimumHours != null
          ? { minimumHours: Number(data.minimumHours) }
          : {}),
        otherPays: (data.otherPays || [])
          .filter((p) => p.type && p.type.trim() !== "")
          .map((p) => p.type),
        deductions: (data.deductions || [])
          .filter((d) => d.type && d.type.trim() !== "")
          .map((d) => d.type),
      };

      const transformedData = {
        ...data,
        payroll: {
          paymentSchedule: data.paymentSchedule,
          ratePerHour: Number(data.ratePerHour),
          // minimumHours conditional (your previous logic)
          ...(data.paymentSchedule === "SALARIED" && data.minimumHours != null
            ? { minimumHours: Number(data.minimumHours) }
            : {}),
          otherPays: (data.otherPays || [])
            .filter((p) => p.type && p.type.trim() !== "")
            .map((p) => ({ id: p.type })), // ← changed to { id: ... }
          deductions: (data.deductions || [])
            .filter((d) => d.type && d.type.trim() !== "")
            .map((d) => ({ id: d.type })), // ← changed to { id: ... }
        },
        documents: fileResults,
      };

      setSubmitting(true);
      setSubmitError("");

      try {
        await onSubmit(transformedData);
        // reset logic...
        dispatch(resetDraft());
        reset({
          /* your defaults */
        });
        setActiveTab("Basic Information");
        setHasChanges(false);
        setFileResults([]);
        onClose();
      } catch (e) {
        setSubmitError(e.message || "Save failed");
      } finally {
        setSubmitting(false);
      }
    },
    [errors, uploadingFiles, fileResults, onSubmit, dispatch, reset, onClose],
  );

  const basicInfoTab = useMemo(
    () => (
      <div className="space-y-4">
        <TextInput
          label="Full Name"
          {...register("fullName")}
          error={errors.fullName?.message}
          placeholder="Enter Full Name"
        />
        <TextInput
          label="Email"
          type="email"
          {...register("email")}
          error={errors.email?.message}
          placeholder="Enter Email"
        />
        <TextInput
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
              label="Staff Role"
              placeholder="Select staff role"
              options={staffRoleOptions}
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
    ],
  );

  const licensesTab = useMemo(
    () => (
      <div className="space-y-4">
        {values.licenses?.map((l, idx) => (
          <div key={idx} className="p-4 border-b mb-6">
            <TextInput
              label="License Name"
              {...register(`licenses.${idx}.licenseName`)}
              error={errors.licenses?.[idx]?.licenseName?.message}
              placeholder="Enter license name"
            />
            <TextInput
              label="License Number"
              {...register(`licenses.${idx}.licenseNumber`)}
              error={errors.licenses?.[idx]?.licenseNumber?.message}
              placeholder="Enter license number"
            />
            <div className="flex gap-4">
              <div className="flex-1">
                <TextInput
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
                      label="State"
                      options={stateOptions}
                      error={errors.licenses?.[idx]?.state?.message}
                      placeholder="Select state"
                      {...field}
                    />
                  )}
                />
              </div>
            </div>
            {idx > 0 && (
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
            )}
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
                  if (values.otherPays.length === 1) {
                    // Optional: clear instead of remove last one
                    setValue(`otherPays.${idx}.type`, "", {
                      shouldDirty: true,
                    });
                  } else {
                    setValue(
                      "otherPays",
                      values.otherPays.filter((_, i) => i !== idx),
                      { shouldDirty: true },
                    );
                  }
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
                  if (values.deductions.length === 1) {
                    // Optional: clear instead of remove last one
                    setValue(`deductions.${idx}.type`, "", {
                      shouldDirty: true,
                    });
                  } else {
                    setValue(
                      "deductions",
                      values.deductions.filter((_, i) => i !== idx),
                      { shouldDirty: true },
                    );
                  }
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
      <div className="mb-4 px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded text-sm">
        <pre>
          {JSON.stringify(
            errors,
            (k, v) => (v instanceof HTMLElement ? "[DOM]" : v),
            2,
          )}
        </pre>
      </div>
      <FileUploadArea
        onFiles={(fileObjects) => {
          setValue("documents", [...(values.documents || []), ...fileObjects], {
            shouldDirty: true,
          });
          handleFileUpload(fileObjects);
        }}
        accept=".pdf,.jpg,.jpeg,.png,.gif,.mp4,.avi,.mov"
        maxSizeMB={50}
        initialFiles={values.documents || []}
      />
      {submitError && (
        <div className="mb-4 px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded">
          {submitError}
        </div>
      )}
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
      activeTab === "Documents" ? handleSubmit(handleFormSubmit) : handleNext,
    [activeTab, handleSubmit, handleFormSubmit, handleNext],
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
