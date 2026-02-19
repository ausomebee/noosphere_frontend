import React, { useState, useEffect } from "react";
import useAuth from "../../../hooks/useAuth";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import UploadTenantStaffDocumentModal from "../../../Components/ReusableModal/OrganizationModal/UploadTenantStaffDocumentModal";
import DeleteModal from "../../../Components/ReusableModal/OrganizationModal/DeleteModal";
import AddLicensesModal from "../../../Components/ReusableModal/OrganizationModal/AddLicensesModal";
import BasicInfoModal from "../../../Components/ReusableModal/OrganizationModal/EditBasicInfoModal";
import Profile from "./StaffSingleTabs/StaffProfile";
import Appointment from "./StaffSingleTabs/Appointment";
import Client from "./StaffSingleTabs/Client";
import Payroll from "./StaffSingleTabs/Payroll";
import api from "../../../api/organisationStaffApis";
import { showToast } from "../../../Helper/ShowToast";
import "../Organisation.css";

const SingleStaffByAdmin = () => {
  const navigate = useNavigate();
  const { accessToken, refreshToken, user } = useAuth();
  const { tenantStaffId } = useParams();
  const [searchParams] = useSearchParams();
  const staffName = searchParams.get("name");

  const [staff, setStaff] = useState(null);
  const [licenses, setLicenses] = useState([]);
  const [files, setFiles] = useState([]);
  const [view, setView] = useState("staffProfile");
  const [showLicenseModal, setShowLicenseModal] = useState(false);
  const [licenseToEdit, setLicenseToEdit] = useState(null);
  const [licenseView, setLicenseView] = useState("card");
  const [showFileModal, setShowFileModal] = useState(false);
  const [fileToEdit, setFileToEdit] = useState(null);
  const [showBasicInfoModal, setShowBasicInfoModal] = useState(false);
  const [deleteCfg, setDeleteCfg] = useState({
    isOpen: false,
    title: "",
    message: "",
    icon: null,
    onConfirm: () => {},
  });

  // Fetch staff data, licenses, and documents on mount
  useEffect(() => {
    fetchStaffData();
    fetchLicenses();
    fetchDocuments();
  }, [tenantStaffId, accessToken, refreshToken]);

  const fetchStaffData = async () => {
    try {
      const res = await api.GetSingleTenantStaffById({
        id: tenantStaffId,
        accessToken,
        refreshToken,
      });
      const staffData = res.data?.data;
      setStaff({
        id: staffData.staff.id,
        name: staffData.staff.fullName,
        fullName: staffData.staff.fullName,
        email: staffData.staff.email,
        phoneNumber: staffData.staff.phoneNumber,
        DOB: staffData.staff.dob
          ? new Date(staffData.staff.dob).toISOString().split("T")[0]
          : "",
        dob: staffData.staff.dob,
        gender: staffData.staff.gender,
        practiceNPI: staffData.staff.npi,
        npi: staffData.staff.npi,
        address: staffData.staff.address,
        city: staffData.staff.city,
        state: staffData.staff.state,
        zip: staffData.staff.zip,
        country: staffData.staff.country,
        active: staffData.staff.active,
        dateJoined: staffData.staff.createdAt
          ? new Date(staffData.staff.createdAt).toLocaleDateString()
          : "",
        staffRole: staffData.staff.roleId,
        roleId: staffData.staff.roleId,
      });
    } catch (e) {
      console.error("Failed to fetch staff data:", e.message);
    }
  };

  const fetchLicenses = async () => {
    try {
      const res = await api.GetAllStaffLicenseById({
        id: tenantStaffId,
        accessToken,
        refreshToken,
      });
      setLicenses(
        res.data?.data?.map((l) => ({
          id: l.id,
          licenseName: l.licenseName,
          licenseType: l.licenseName,
          licenseNumber: l.licenseNumber,
          expirationDate: new Date(l.expiryDate).toLocaleDateString(),
          expiryDate: l.expiryDate,
          state: l.issueState,
          issueState: l.issueState,
          tenantStaffId: l.tenantStaffId || tenantStaffId,
          hasActions: true,
        })) || []
      );
    } catch (e) {
      console.error("Failed to fetch licenses:", e.message);
    }
  };

  const fetchDocuments = async () => {
    try {
      const res = await api.GetAllStaffDocumentById({
        id: tenantStaffId,
        accessToken,
        refreshToken,
      });
      setFiles(
        res.data?.data?.map((d) => ({
          id: d.id,
          documentName:
            d.documentName || d.documentsUrl?.filename || "Unknown File",
          date: d.date
            ? new Date(d.date).toLocaleDateString()
            : new Date().toLocaleDateString(),
          uploadBy: d.uploadedBy || "Unknown User",
          documentsUrl: d.documentsUrl,
          tenantStaffId: d.tenantStaffId,
          hasActions: true,
        })) || []
      );
    } catch (e) {
      console.error("Failed to fetch documents:", e.message);
    }
  };

  const openDelete = ({ title, message, icon, onConfirm }) =>
    setDeleteCfg({ isOpen: true, title, message, icon, onConfirm });

  const closeDelete = () =>
    setDeleteCfg({
      isOpen: false,
      title: "",
      message: "",
      icon: null,
      onConfirm: () => {},
    });

  const saveLicense = async (payload) => {
    try {
      if (payload.id) {
        await api.UpdateTenantStaffLicense({
          id: payload.id,
          tenantId: user?.tenantId,
          licenseName: payload.licenseName,
          licenseNumber: payload.licenseNumber,
          issueState: payload.issueState,
          expiryDate: payload.expiryDate,
          tenantStaffId,
          accessToken,
          refreshToken,
        });
        fetchLicenses();
      } else {
        const response = await api.CreateLicenseForStaff({
          tenantStaffId,
          licenseName: payload.licenseName,
          licenseNumber: payload.licenseNumber,
          issueState: payload.issueState,
          expiryDate: payload.expiryDate,
          accessToken,
          refreshToken,
        });
        fetchLicenses();
        setLicenses((prev) => [
          ...prev,
          {
            id: response.data?.data?.id || Date.now(),
            licenseName: payload.licenseName,
            licenseNumber: payload.licenseNumber,
            expirationDate: new Date(
              payload.expirationDate
            ).toLocaleDateString(),
            state: payload.state,
            hasActions: true,
          },
        ]);
      }
    } catch (e) {
      console.error("Failed to save license:", e.message);
      showToast({
        message: e.response?.data?.message || "Failed to save license",
        type: "error",
      });
    }
  };

  const saveFile = async (payload) => {
    try {
      if (payload.id && !payload.documentsUrl) {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === payload.id
              ? {
                  ...f,
                  documentName: payload.documentName,
                  uploadBy: payload.uploadBy,
                }
              : f
          )
        );
      } else {
        const response = await api.CreateDocumentForStaff({
          tenantId: user?.tenantId,
          documentName: payload.documentName,
          uploadedBy: user.fullName,
          documentsUrl: payload.documentsUrl,
          tenantStaffId: payload.tenantStaffId,
          accessToken,
          refreshToken,
        });
        fetchDocuments();
        setFiles((prev) => {
          const newFile = {
            id: response.data?.data?.id || payload.id,
            documentName: payload.documentName,
            date: new Date().toLocaleDateString(),
            uploadBy: user.fullName,
            documentsUrl:
              response.data?.data?.documentsUrl || payload.documentsUrl,
            tenantStaffId: payload.tenantStaffId,
            hasActions: true,
          };
          if (payload.id) {
            return prev.map((f) => (f.id === payload.id ? newFile : f));
          }
          return [...prev, newFile];
        });
      }
    } catch (e) {
      console.error("Failed to save document:", e.message);
      showToast({
        message: e.response?.data?.message || "Failed to save document",
        type: "error",
      });
    }
  };

  const deleteLicense = async (id) => {
    try {
      await api.DeleteLicenseByTenantStaff({
        id,
        isDeleted: true,
        accessToken,
        refreshToken,
      });
      fetchLicenses();
      closeDelete();
    } catch (e) {
      console.error("Failed to delete license:", e.message);
      showToast({
        message: e.response?.data?.message || "Failed to delete license",
        type: "error",
      });
    }
  };

  const deleteFile = async (id) => {
    try {
      await api.DeleteDocumentByTenantStaff({
        id,
        isDeleted: true,
        accessToken,
        refreshToken,
      });
      fetchDocuments();
      closeDelete();
    } catch (e) {
      console.error("Failed to delete document:", e.message);
      showToast({
        message: e.response?.data?.message || "Failed to delete document",
        type: "error",
      });
    }
  };

  const handleSaveBasicInfo = async (payload) => {
    try {
      console.log("Saving Basic Info Payload:", payload);
      await api.UpdateTenantStaffBasicInfo({
        id: tenantStaffId,
        fullName: payload.fullName,
        email: payload.email,
        roleId: "8285a9a5-0455-447d-9dbe-00ad68d6a0e5",
        tenantId: user?.tenantId,
        dob: payload.DOB,
        gender: payload.gender,
        npi: payload.practiceNPI,
        address: payload.address,
        city: payload.city,
        state: payload.state,
        zip: payload.zip,
        country: payload.country,
        phoneNumber: payload.phoneNumber,
        active: payload.active,
        accessToken,
        refreshToken,
      });
      fetchStaffData();
      fetchLicenses();
      fetchDocuments();
    } catch (e) {
      console.error("Failed to save basic info:", e.message);
      showToast({
        message:
          e.response?.data?.message || "Failed to update basic information",
        type: "error",
      });
      throw new Error(
        e.response?.data?.message || "Failed to update basic information"
      );
    }
  };

  const onBack = () => {
    navigate("/organization/staff-and-teams");
  };

  const renderContent = () => {
    switch (view) {
      case "staffProfile":
        return (
          <Profile
            staff={staff}
            licenses={licenses}
            files={files}
            licenseView={licenseView}
            setLicenseView={setLicenseView}
            setShowLicenseModal={setShowLicenseModal}
            setShowFileModal={setShowFileModal}
            setLicenseToEdit={setLicenseToEdit}
            setFileToEdit={setFileToEdit}
            openDelete={openDelete}
            saveLicense={saveLicense}
            saveFile={saveFile}
            deleteLicense={deleteLicense}
            deleteFile={deleteFile}
            openBasicInfoModal={() => setShowBasicInfoModal(true)}
          />
        );
      case "appointmentSchedule":
        return (
          <Appointment
            staffId={tenantStaffId}
            accessToken={accessToken}
            refreshToken={refreshToken}
            tenantId={user?.tenantId}
          />
        );
      case "staffClient":
        return (
          <Client
            staffId={tenantStaffId}
            accessToken={accessToken}
            refreshToken={refreshToken}
            tenantId={user?.tenantId}
          />
        );
      case "payrollSettings":
        return <Payroll />;
      default:
        return null;
    }
  };

  return (
    <>
      <div className="program-column-header flex gap-4 items-center">
        <button className="back-button" onClick={onBack}>
          <FaArrowLeft />
          <span className="primary-text">Back</span>
        </button>
        <div className="breadcrumb-trail">
          <span className="breadcrumb-segment">Staff & Teams </span>
          <span className="breadcrumb-separator">›</span>
          <span className="breadcrumb-segment">
            {staffName || "Staff Details"}
          </span>
        </div>
      </div>
      <div className="appointment-sched-view-switcher">
        <button
          onClick={() => setView("staffProfile")}
          className={`appointment-sched-view-button flex items-center ${
            view === "staffProfile"
              ? "appointment-sched-view-button-active"
              : "appointment-sched-view-button-inactive"
          }`}
        >
          <span>Profile</span>
        </button>
        <button
          onClick={() => setView("appointmentSchedule")}
          className={`appointment-sched-view-button flex items-center ${
            view === "appointmentSchedule"
              ? "appointment-sched-view-button-active"
              : "appointment-sched-view-button-inactive"
          }`}
        >
          <span>Appointment & Schedule</span>
        </button>
        <button
          onClick={() => setView("staffClient")}
          className={`appointment-sched-view-button flex items-center ${
            view === "staffClient"
              ? "appointment-sched-view-button-active"
              : "appointment-sched-view-button-inactive"
          }`}
        >
          <span>Clients</span>
        </button>
        <button
          onClick={() => setView("payrollSettings")}
          className={`appointment-sched-view-button flex items-center ${
            view === "payrollSettings"
              ? "appointment-sched-view-button-active"
              : "appointment-sched-view-button-inactive"
          }`}
        >
          <span>Payroll Settings</span>
        </button>
      </div>
      {renderContent()}
      <AddLicensesModal
        isOpen={showLicenseModal}
        onClose={() => {
          setShowLicenseModal(false);
          setLicenseToEdit(null);
        }}
        onSave={saveLicense}
        initialValues={licenseToEdit}
      />
      <UploadTenantStaffDocumentModal
        isOpen={showFileModal}
        onClose={() => {
          setShowFileModal(false);
          setFileToEdit(null);
        }}
        onSave={saveFile}
        tenantStaffId={tenantStaffId}
        initialValues={fileToEdit}
      />
      <BasicInfoModal
        isOpen={showBasicInfoModal}
        onClose={() => setShowBasicInfoModal(false)}
        onSave={handleSaveBasicInfo}
        initialData={staff}
        tenantStaffId={tenantStaffId}
      />
      <DeleteModal {...deleteCfg} onClose={closeDelete} />
    </>
  );
};

export default SingleStaffByAdmin;