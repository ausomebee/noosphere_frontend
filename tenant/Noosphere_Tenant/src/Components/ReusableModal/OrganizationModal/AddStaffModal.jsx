import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useForm, Controller, useWatch } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useDispatch, useSelector } from "react-redux";
import { debounce } from "lodash";
import { setDraftField, resetDraft } from "../../../ReduxStore/features/AddStaffDraftSlice";
import ReusableModal from "../ReusableModal";
import { BsCloudUpload, BsFileEarmarkPdf, BsFileEarmarkPlay } from "react-icons/bs";
import { FaRegFile, FaPhotoVideo, FaImage, FaCheckCircle, FaPlus } from "react-icons/fa";
import { RiDeleteBin6Line } from "react-icons/ri";
import { IoMdRefresh } from "react-icons/io";
import { SelectInput, TextInput, SwitchInput } from "../../Input/Inputs";
import Button from "../../Button/Button";
import uploadApi from "../../../api/ImageUpload";
import { showToast } from "../../../Helper/ShowToast";

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
    })
  ),
  paymentSchedule: yup.string().required("Payment Schedule is required"),
  ratePerHour: yup
    .number()
    .typeError("Must be a valid number")
    .when("paymentSchedule", {
      is: (s) => !!s,
      then: (s) => s.required("Pay Rate is required"),
      otherwise: (s) => s.nullable(),
    }),
  minimumHours: yup
    .number()
    .typeError("Must be a valid number")
    .when("paymentSchedule", {
      is: (s) => ["Daily", "Weekly", "Bi-Weekly"].includes(s),
      then: (s) => s.required("Minimum hours are required"),
      otherwise: (s) => s.nullable(),
    }),
  otherPays: yup.array().of(
    yup.object().shape({
      type: yup.string().required("Pay type is required"),
      rate: yup
        .number()
        .typeError("Must be a valid number")
        .when("type", {
          is: (t) => !!t,
          then: (s) => s.required("Pay rate is required"),
          otherwise: (s) => s.nullable(),
        }),
    })
  ),
  deductions: yup.array().of(
    yup.object().shape({
      type: yup.string().required("Deduction type is required"),
      rate: yup
        .number()
        .typeError("Must be a valid number")
        .when("type", {
          is: (t) => !!t,
          then: (s) => s.required("Deduction rate is required"),
          otherwise: (s) => s.nullable(),
        }),
    })
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
          showToast({ message: `File ${file.name} exceeds ${maxSizeMB}MB limit`, type: "error" });
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
      showToast({ message: `${newFiles.length} file(s) selected`, type: "info" });

      newFiles.forEach((fileObj, idx) => {
        if (fileObj.error) return;
        let progress = 0;
        const interval = setInterval(() => {
          progress += 10;
          setFiles((prev) =>
            prev.map((f, i) =>
              i === prev.length - newFiles.length + idx ? { ...f, progress } : f
            )
          );
          if (progress >= 100) {
            clearInterval(interval);

          }
        }, 300);
      });

      // Trigger the upload after rendering files in the UI
      if (newFiles.some((f) => !f.error)) {
        onFiles(newFiles); // Call onFiles again to ensure parent has the latest file objects
      }

      if (fileInputRef.current) fileInputRef.current.value = null;
    };

    const handleRemoveFile = (idx) => {
      setFiles((prev) => {
        const removedFile = prev[idx];
        showToast({ message: `File ${removedFile.name} removed`, type: "info" });
        return prev.filter((_, i) => i !== idx);
      });
    };

    const handleRetryFile = (idx) => {
      setFiles((prev) => {
        const retryFile = prev[idx];
        showToast({ message: `Retrying upload for ${retryFile.name}`, type: "info" });
        return prev.map((f, i) =>
          i === idx ? { ...f, progress: 0, error: false, errorMessage: null } : f
        );
      });
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        setFiles((prev) =>
          prev.map((f, i) => (i === idx ? { ...f, progress } : f))
        );
        if (progress >= 100) {
          clearInterval(interval);
          showToast({ message: `Retry upload simulation completed for ${files[idx].name}`, type: "success" });
        }
      }, 300);
    };

    return (
      <div className="mb-6">
        <p className="text-sm text-gray-700 font-semibold mb-2">Upload Documents</p>
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
  }
);

const AddStaffModal = ({ isOpen, onClose, onSubmit, mode, initialData }) => {
  const [activeTab, setActiveTab] = useState("Basic Information");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [fileResults, setFileResults] = useState([]);
  const [hasChanges, setHasChanges] = useState(false);

  const dispatch = useDispatch();
  const reduxDraft = useSelector((s) => s.staffFormDraft.formData);
  const accessToken = useSelector((s) => s.authentication?.token);
  const refreshToken = useSelector((s) => s.authentication?.token);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    control,
    formState: { errors, isDirty },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      licenses: [
        { licenseName: "", licenseNumber: "", expiryDate: "", state: "" },
      ],
      otherPays: [{ type: "", rate: "" }],
      deductions: [{ type: "", rate: "" }],
      documents: [],
      programId: "",
      staffId: "",
      active: true,
      phoneNumber: "",
      paymentSchedule: "",
      ratePerHour: "",
      minimumHours: "",
      ...(mode === "edit" && initialData
        ? {
            fullName: initialData.fullName || "",
            email: initialData.email || "",
            phoneNumber: initialData.phoneNumber || "",
            DOB: initialData.DOB || "",
            gender: initialData.gender || "",
            practiceNPI: initialData.practiceNPI || "",
            staffRole: initialData.staffRole || "",
            address: initialData.address || "",
            city: initialData.city || "",
            state: initialData.state || "",
            zip: initialData.zip || "",
            country: initialData.country || "",
            active: initialData.active ?? true,
            licenses: initialData.licenses?.length
              ? initialData.licenses
              : [
                  {
                    licenseName: "",
                    licenseNumber: "",
                    expiryDate: "",
                    state: "",
                  },
                ],
            paymentSchedule: initialData.payroll?.paymentSchedule || "",
            ratePerHour: initialData.payroll?.ratePerHour || "",
            minimumHours: initialData.payroll?.minimumHours || "",
            otherPays: initialData.payroll?.otherPays?.length
              ? initialData.payroll.otherPays.map((p) => ({
                  type: p.type,
                  rate: p.rate,
                }))
              : [{ type: "", rate: "" }],
            deductions: initialData.payroll?.deductions?.length
              ? initialData.payroll.deductions.map((d) => ({
                  type: d.type,
                  rate: d.rate,
                }))
              : [{ type: "", rate: "" }],
            documents: initialData.documents?.length
              ? initialData.documents
              : [],
          }
        : {}),
    },
  });

  const values = useWatch({ control });
  const paymentSchedule = watch("paymentSchedule");

  const genderOptions = useMemo(
    () => [
      { value: "male", label: "Male" },
      { value: "female", label: "Female" },
     
    ],
    []
  );
  const staffRoleOptions = useMemo(
    () => [
      { value: "8285a9a5-0455-447d-9dbe-00ad68d6a0e5", label: "Admin" },
      { value: "a1b2c3d4-e5f6-7890-abcd-ef1234567890", label: "Therapist" },
      { value: "b2c3d4e5-f6a7-8901-bcde-f23456789012", label: "Supervisor" },
      { value: "d4e5f6a7-b8c9-0123-def0-456789012345", label: "Assistant" },
    ],
    []
  );
  const countryOptions = useMemo(
    () => [
      { value: "US", label: "United States" },
      { value: "UK", label: "United Kingdom" },
    ],
    []
  );
  const paymentScheduleOptions = useMemo(
    () => [
      { value: "Hourly", label: "Hourly" },
      { value: "Daily", label: "Daily" },
      { value: "Weekly", label: "Weekly" },
      { value: "Bi-Weekly", label: "Bi-Weekly" },
      { value: "Monthly", label: "Monthly" },
      { value: "Bi-Monthly", label: "Bi-Monthly" },
      { value: "Quarterly", label: "Quarterly" },
      { value: "Annually", label: "Annually" },
    ],
    []
  );
  const otherPayOptions = useMemo(
    () => [
      { value: "overtime", label: "Overtime" },
      { value: "commission", label: "Commission" },
      { value: "bonus", label: "Bonus" },
      { value: "allowance", label: "Allowance" },
    ],
    []
  );
  const deductionsOptions = useMemo(
    () => [
      { value: "tax", label: "Tax" },
      { value: "insurance", label: "Insurance" },
      { value: "retirement", label: "Retirement" },
      { value: "other", label: "Other" },
    ],
    []
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
    []
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
          })
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
          showToast({ message: `${ups.length} file(s) uploaded successfully`, type: "success" });
        } else throw new Error(res.error || "Upload failed");
      } catch (e) {
        validFiles.forEach((f) =>
          newResults.push({ filename: f.name, url: null, error: e.message })
        );
        showToast({ message: `Failed to upload file(s): ${e.message}`, type: "error" });
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
    [accessToken, refreshToken, setValue, values.documents]
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
    }, 500)
  );

  useEffect(() => {
    if (!isOpen) {
      dispatch(resetDraft());
      reset({
        licenses: [
          { licenseName: "", licenseNumber: "", expiryDate: "", state: "" },
        ],
        otherPays: [{ type: "", rate: "" }],
        deductions: [{ type: "", rate: "" }],
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
      return;
    }

    const src = mode === "edit" && initialData ? initialData : reduxDraft;
    if (src && Object.keys(src).length) {
      const clone = JSON.parse(JSON.stringify(src));
      clone.licenses =
        Array.isArray(clone.licenses) && clone.licenses.length
          ? clone.licenses
          : [{ licenseName: "", licenseNumber: "", expiryDate: "", state: "" }];
      clone.otherPays =
        Array.isArray(clone.payroll?.otherPays) &&
        clone.payroll.otherPays.length
          ? clone.payroll.otherPays
          : [{ type: "", rate: "" }];
      clone.deductions =
        Array.isArray(clone.payroll?.deductions) &&
        clone.payroll.deductions.length
          ? clone.payroll.deductions
          : [{ type: "", rate: "" }];
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
        }))
      );
    } else {
      const def = {
        licenses: [
          { licenseName: "", licenseNumber: "", expiryDate: "", state: "" },
        ],
        otherPays: [{ type: "", rate: "" }],
        deductions: [{ type: "", rate: "" }],
        documents: [],
        programId: "",
        staffId: "",
        active: true,
        phoneNumber: "",
        DOB: "",
        paymentSchedule: "",
        ratePerHour: "",
        minimumHours: "",
      };
      reset(def);
    }
    setHasChanges(false);
  }, [isOpen, mode, initialData, reduxDraft, reset, dispatch]);

  const tabsList = useMemo(
    () => ["Basic Information", "Licenses", "Payroll Settings", "Documents"],
    []
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
        showToast({ message: `Please fix errors in the ${tabName} tab`, type: "error" });
        return false;
      }
      setSubmitError("");
      return true;
    },
    [errors, values.licenses]
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
      otherPays: [{ type: "", rate: "" }],
      deductions: [{ type: "", rate: "" }],
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
    setSubmitError("");
    setHasChanges(false);
    setFileResults([]);
    onClose();

  }, [dispatch, reset, onClose]);

  const handleFormSubmit = useCallback(
    async (data) => {
      if (Object.keys(errors).length) {
        showToast({ message: "Please fix form errors before submitting", type: "error" });
        return;
      }
      if (uploadingFiles) {
        setSubmitError("Please wait until uploads finish");
        showToast({ message: "Please wait until uploads finish", type: "error" });
        return;
      }
      // if (fileResults.some((r) => r.error)) {
      //   // setSubmitError("Some files failed to upload");
      //   showToast({ message: "Some files failed to upload", type: "error" });
      //   return;
      // }

      setSubmitting(true);
      setSubmitError("");

      try {
        await onSubmit({
          ...data,
          documents: fileResults,
        });
        dispatch(resetDraft());
        reset({
          licenses: [
            { licenseName: "", licenseNumber: "", expiryDate: "", state: "" },
          ],
          otherPays: [{ type: "", rate: "" }],
          deductions: [{ type: "", rate: "" }],
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
        onClose();

      } catch (e) {
        setSubmitError(e.message || "Save failed");

      } finally {
        setSubmitting(false);
      }
    },
    [errors, uploadingFiles, fileResults, onSubmit, dispatch, reset, onClose, mode]
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
    ]
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
                      { shouldDirty: true }
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
              { shouldDirty: true }
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
    ]
  );

  const payrollTab = useMemo(
    () => (
      <div className="space-y-4">
        <Controller
          name="paymentSchedule"
          control={control}
          render={({ field }) => (
            <SelectInput
              label="Payment Schedule"
              options={paymentScheduleOptions}
              error={errors.paymentSchedule?.message}
              placeholder="Select payment schedule"
              {...field}
            />
          )}
        />
        {paymentSchedule && (
          <TextInput
            label="Pay Rate"
            type="number"
            step="0.01"
            {...register("ratePerHour")}
            error={errors.ratePerHour?.message}
            placeholder="Enter per hour rate"
          />
        )}
        {paymentSchedule &&
          ![
            "Hourly",
            "Monthly",
            "Bi-Monthly",
            "Quarterly",
            "Annually",
          ].includes(paymentSchedule) && (
            <TextInput
              label={`Minimum Hours per ${paymentSchedule.toLowerCase()}`}
              type="number"
              step="0.5"
              {...register("minimumHours")}
              error={errors.minimumHours?.message}
              placeholder={`Enter minimum hours per ${paymentSchedule.toLowerCase()}`}
            />
          )}
        <div className="space-y-4 items-center">
          <h4 className="font-medium">Other Pay</h4>
          {values.otherPays?.map((p, idx) => (
            <div
              key={idx}
              className="flex gap-4 items-center p-3 border-b mb-6"
            >
              <div className="flex-1">
                <Controller
                  name={`otherPays.${idx}.type`}
                  control={control}
                  render={({ field }) => (
                    <SelectInput
                      label="Pay Type"
                      options={otherPayOptions}
                      error={errors.otherPays?.[idx]?.type?.message}
                      placeholder="Select pay type"
                      {...field}
                    />
                  )}
                />
              </div>
              {p.type && (
                <div>
                  <TextInput
                    label="Pay Rate"
                    type="number"
                    step="0.01"
                    {...register(`otherPays.${idx}.rate`)}
                    error={errors.otherPays?.[idx]?.rate?.message}
                    placeholder="Enter rate"
                  />
                </div>
              )}
              {idx > 0 && (
                <Button
                  type="button"
                  variant="danger"
                  label="Remove"
                  onClick={() => {
                    setValue(
                      "otherPays",
                      values.otherPays.filter((_, i) => i !== idx),
                      { shouldDirty: true }
                    );
                    showToast({ message: "Other pay removed", type: "info" });
                  }}
                />
              )}
            </div>
          ))}
          <Button
            icon={<FaPlus />}
            variant="secondary"
            label="Add"
            className="mb-6"
            onClick={() => {
              setValue(
                "otherPays",
                [...(values.otherPays || []), { type: "", rate: "" }],
                { shouldDirty: true }
              );
              
            }}
          />
        </div>
        <div className="space-y-4">
          <h4 className="font-medium">Deductions</h4>
          {values.deductions?.map((d, idx) => (
            <div key={idx} className="flex gap-4 items-center p-3 border-b mb-6">
              <div className="flex-1">
                <Controller
                  name={`deductions.${idx}.type`}
                  control={control}
                  render={({ field }) => (
                    <SelectInput
                      label="Deduction Type"
                      options={deductionsOptions}
                      error={errors.deductions?.[idx]?.type?.message}
                      placeholder="Select deduction type"
                      {...field}
                    />
                  )}
                />
              </div>
              {d.type && (
                <div>
                  <TextInput
                    label="Deduction Rate"
                    type="number"
                    step="0.01"
                    {...register(`deductions.${idx}.rate`)}
                    error={errors.deductions?.[idx]?.rate?.message}
                    placeholder="Enter rate"
                  />
                </div>
              )}
              {idx > 0 && (
                <Button
                  type="button"
                  variant="danger"
                  label="Remove"
                  onClick={() => {
                    setValue(
                      "deductions",
                      values.deductions.filter((_, i) => i !== idx),
                      { shouldDirty: true }
                    );
                    showToast({ message: "Deduction removed", type: "info" });
                  }}
                />
              )}
            </div>
          ))}
          <Button
            icon={<FaPlus />}
            variant="secondary"
            label="Add"
            className="mb-6"
            onClick={() => {
              setValue(
                "deductions",
                [...(values.deductions || []), { type: "", rate: "" }],
                { shouldDirty: true }
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
      paymentScheduleOptions,
      otherPayOptions,
      deductionsOptions,
    ]
  );

  const documentsTab = (
    <div>
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
      {/* {submitError && (
        <div className="mb-4 px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded">
          {submitError}
        </div>
      )} */}
    </div>
  );

  const buildTabs = useMemo(
    () => [
      { name: "Basic Information", content: basicInfoTab },
      { name: "Licenses", content: licensesTab },
      { name: "Payroll Settings", content: payrollTab },
      { name: "Documents", content: documentsTab },
    ],
    [basicInfoTab, licensesTab, payrollTab]
  );

  const getPrimaryButtonText = useCallback(() => {
    if (mode === "edit") return hasChanges ? "Save" : "Next";
    return activeTab === "Documents" ? "Save" : "Next";
  }, [mode, hasChanges, activeTab]);

  const getSecondaryButtonText = useCallback(
    () => (activeTab === "Basic Information" ? "Cancel" : "Previous"),
    [activeTab]
  );

  const getPrimaryButtonAction = useCallback(
    () =>
      activeTab === "Documents" ? handleSubmit(handleFormSubmit) : handleNext,
    [activeTab, handleSubmit, handleFormSubmit, handleNext]
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