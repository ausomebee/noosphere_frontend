import React, { useState, useEffect } from "react";
import { FaArrowLeft, FaChevronDown } from "react-icons/fa";
import { useNavigate, useParams } from "react-router-dom";
import useAuth from "../../../hooks/useAuth";
import AccordionTable from "../../../Components/Table/AccordionTable";
import "../BillingPayment.css";
import api from "../../../api/billingAndPaymentsApi";
import { showToast } from "../../../Helper/ShowToast";
import LoadingSpinner from "../../../Components/LoadingSpinner";

// Helper functions
const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  try {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch (error) {
    return "Invalid date";
  }
};

const SingleClaim = () => {
  const navigate = useNavigate();
  const { claimId } = useParams();

  // Auth state
  const { accessToken, refreshToken } = useAuth();


  // State
  const [isOpen, setIsOpen] = useState(false);
  const [claimData, setClaimData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exportingPDF, setExportingPDF] = useState(false);

  // Fetch data
  useEffect(() => {
    fetchClaimData();
  }, [claimId]);

  const fetchClaimData = async () => {
    try {
      // Use the same API call pattern as timesheet
      const response = await api.GetSingleTimeSheetByTimesheetId({
        timeSheetId: claimId,
        accessToken,
        refreshToken,
      });
      setClaimData(response);
    } catch (error) {
      console.error("Error fetching claim:", error);
    } finally {
      setLoading(false);
    }
  };

  // PDF Export function - SIMPLIFIED
  const handleExportPDF = async () => {
    if (!claimData) return;

    setExportingPDF(true);
    try {
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;

      const doc = new jsPDF("p", "mm", "a4");

      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 15;
      let yPos = margin;

      // Header
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(44, 62, 80);
      doc.text("CLAIM REPORT", pageWidth / 2, yPos, { align: "center" });
      yPos += 10;

      // Metadata
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text(`Claim ID: ${claimData.id || "N/A"}`, margin, yPos);
      doc.text(
        `Generated: ${new Date().toLocaleDateString()}`,
        pageWidth - margin,
        yPos,
        { align: "right" }
      );
      yPos += 15;

      // General Information
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("GENERAL INFORMATION", margin, yPos);
      yPos += 10;

      const clientName = claimData.client
        ? `${claimData.client.firstName || ""} ${
            claimData.client.lastName || ""
          }`.trim()
        : claimData.appointment?.client
        ? `${claimData.appointment.client.firstName || ""} ${
            claimData.appointment.client.lastName || ""
          }`.trim()
        : "N/A";

      const generalInfo = [
        ["Date", formatDate(claimData.createdAt)],
        ["Client", clientName],
        ["Client Insurance ID", claimData.client?.insuranceId || "N/A"],
        ["Timesheet ID", claimData.timesheetId || "N/A"],
        ["Service Location", claimData.appointment?.serviceLocation || "N/A"],
        ["Practice NPI", claimData.practiceNPI || "N/A"],
      ];

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(0, 0, 0);

      generalInfo.forEach(([label, value]) => {
        doc.setFont("helvetica", "bold");
        doc.text(`${label}:`, margin, yPos);
        doc.setFont("helvetica", "normal");
        doc.text(value || "N/A", margin + 50, yPos);
        yPos += 7;
      });
      yPos += 10;

      // Service Information
      if (
        claimData.authorizationsUsed &&
        claimData.authorizationsUsed.length > 0
      ) {
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text("SERVICE INFORMATION", margin, yPos);
        yPos += 10;

        // Create table data with authorization name and date
        const tableData = claimData.authorizationsUsed.map((auth, index) => [
          index + 1,
          auth.title || "N/A",
          formatDate(auth.startDate),
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [["#", "Authorization Name", "Date"]],
          body: tableData,
          margin: { left: margin, right: margin },
          styles: { fontSize: 10 },
          headStyles: { fillColor: [66, 133, 244], textColor: [255, 255, 255] },
        });
        yPos = doc.lastAutoTable.finalY + 10;

        // Service details for each authorization
        claimData.authorizationsUsed.forEach((auth, authIndex) => {
          if (
            auth.clientAuthorizationServices &&
            auth.clientAuthorizationServices.length > 0
          ) {
            doc.setFontSize(11);
            doc.setFont("helvetica", "bold");
            doc.text(
              `Authorization ${authIndex + 1}: ${auth.title || "N/A"}`,
              margin,
              yPos
            );
            yPos += 8;

            const serviceTableData = auth.clientAuthorizationServices.map(
              (service, sIndex) => [
                sIndex + 1,
                service.serviceCode?.code || "N/A",
                service.modifiers || "N/A",
                service.units || "0",
                service.per || "N/A",
              ]
            );

            autoTable(doc, {
              startY: yPos,
              head: [["#", "Service Code", "Modifiers", "Units", "Per"]],
              body: serviceTableData,
              margin: { left: margin, right: margin },
              styles: { fontSize: 9 },
              headStyles: {
                fillColor: [59, 130, 246],
                textColor: [255, 255, 255],
              },
            });
            yPos = doc.lastAutoTable.finalY + 15;
          }
        });
      }

      // Footer
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Page ${i} of ${totalPages}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: "center" }
        );
      }

      // Save PDF
      const fileName = `Claim_${claimData.id || "unknown"}_${formatDate(
        claimData.createdAt
      ).replace(/\//g, "-")}.pdf`;
      doc.save(fileName);

      showToast("PDF exported successfully!", "success");
    } catch (error) {
      console.error("Error generating PDF:", error);
      showToast("Failed to export PDF.", "error");
    } finally {
      setExportingPDF(false);
    }
  };


  if (loading) {
    return (
      <>
        <div className="flex justify-center items-center h-64">
         <LoadingSpinner />
        </div>
      </>
    );
  }

 

  // Prepare data for display
  const clientName = claimData.client
    ? `${claimData.client.firstName || ""} ${
        claimData.client.lastName || ""
      }`.trim()
    : claimData.appointment?.client
    ? `${claimData.appointment.client.firstName || ""} ${
        claimData.appointment.client.lastName || ""
      }`.trim()
    : "N/A";

  const clinicians =
    claimData.clinicians || claimData.appointment?.clinicians || [];
  const clinicianNames = clinicians
    .map((c) => c.fullName || "Unknown")
    .join(", ");
  const clinicianNpis = clinicians.map((c) => c.npi || "N/A").join(", ");

  // Prepare table data (authorization name and date)
  const tableData =
    claimData.authorizationsUsed?.map((auth, index) => ({
      id: auth.id || index,
      authorization: auth.title || "N/A",
      date: formatDate(auth.startDate),
    })) || [];

  // Prepare service data for accordion
  const initialServiceData = {};
  claimData.authorizationsUsed?.forEach((auth, authIndex) => {
    if (auth.clientAuthorizationServices) {
      initialServiceData[authIndex] = auth.clientAuthorizationServices.map(
        (service) => ({
          serviceCode: service.serviceCode?.code || "N/A",
          modifiers: service.modifiers || "N/A",
          units: service.units || "0",
          per: service.per || "N/A",
        })
      );
    }
  });

  const columns = [
    { key: "authorization", header: "Authorization" },
    { key: "date", header: "Date" },
  ];

  const displayData = {
    clientName: clientName,
    clientInsID: claimData.client?.insuranceId || "N/A",
    clinicians: clinicianNames || "N/A",
    clinicianNPI: clinicianNpis || "N/A",
    date: formatDate(claimData.createdAt),
    timesheetId: claimData.timesheetId || claimData.appointment?.id || "N/A",
    serviceLocation: claimData.appointment?.serviceLocation || "N/A",
    location: claimData.practiceLocation || "N/A",
    practiceNPI: claimData.practiceNPI || "N/A",
  };

  return (
    <>
      <div className="manage-column-header">
        <button className="manage-back-button" onClick={() => navigate(-1)}>
          <FaArrowLeft />
          Back
        </button>
        <h2 className="text-2xl text-gray-400">Claim</h2>
        <button
          className="manage-back-button"
          style={{ opacity: 0, pointerEvents: "none" }}
        >
          <FaArrowLeft />
          Back
        </button>
      </div>

      <div className="flex justify-between items-center mt-6">
        <div className="flex border rounded-md items-center p-4 border-gray-200 w-fit"></div>

        <div className="relative inline-block">
          <button
            className="timesheet-actions-button flex items-center justify-center"
            onClick={() => setIsOpen(!isOpen)}
            disabled={exportingPDF}
          >
            {exportingPDF ? "Exporting..." : "Actions"}
            <FaChevronDown className="ml-2" />
          </button>
          {isOpen && (
            <div className="timesheet-dropdown">
              <div
                className="timesheet-dropdown-item"
                onClick={() => {
                  setIsOpen(false);
                  handleExportPDF();
                }}
                style={
                  exportingPDF ? { opacity: 0.5, cursor: "not-allowed" } : {}
                }
              >
                {exportingPDF ? "Exporting..." : "Export as PDF"}
              </div>
            </div>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4 text-gray-400 mt-6">
          General Information
        </h3>

        <div className="billing-info-card">
          <div className="billing-grid-3 mb-6">
            <div className="flex flex-col gap-2">
              <Field
                label="Client Name"
                value={displayData.clientName || "--"}
              />
              <Field
                label="Client Insurance ID"
                value={displayData.clientInsID || "--"}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Field
                label="Clinician(s) Name"
                value={displayData.clinicians || "--"}
              />
              <Field
                label="Clinician NPI(s)"
                value={displayData.clinicianNPI || "--"}
              />
            </div>
            <div className="flex flex-col gap-2">
               <Field label="Date" value={displayData.date || "--"} />
            
            </div>
          </div>
          <div className="flex flex-col gap-2 border-t ">
            <div className="mt-6">
              <Field
                label="Service Location"
                value={displayData.serviceLocation || "--"}
              />
              <Field label="Practice Location" value={displayData.location || "--"} />
              <Field label="Practice NPI" value={displayData.practiceNPI || "--"} />
            </div>
          </div>
        </div>
        {/* <div className="p-20 border border-gray-200 rounded-lg">
          <div className="grid grid-cols-3 gap-8">
            <div className="gap-4 flex flex-col">
              <Field label="Date" value={displayData.date} />
              <Field label="Client Name" value={displayData.clientName} />
              <Field
                label="Client Insurance ID"
                value={displayData.clientInsID}
              />
            </div>
            <div className="gap-4 flex flex-col">
              <Field label="Clinician(s) Name" value={displayData.clinicians} />
              <Field
                label="Clinician NPI(s)"
                value={displayData.clinicianNPI}
              />
            </div>
            <div className="gap-4 flex flex-col">
              <Field
                label="Service Location"
                value={displayData.serviceLocation}
              />
              <Field label="Practice Location" value={displayData.location} />
              <Field label="Practice NPI" value={displayData.practiceNPI} />
            </div>
          </div>
        </div> */}
      </div>

      <div className="mt-6">
        <div>
          <h3 className="text-lg font-semibold mb-6 text-gray-400 text-center">
            Service Information
          </h3>
          <div>
            <AccordionTable
              data={tableData}
              columns={columns}
              tableName="View Claims"
              itemsPerPage={10}
              initialServiceData={initialServiceData}
              isEditMode={false}
            />
          </div>
        </div>
      </div>
    </>
  );
};

const Field = ({ label, value, isLink }) => (
  <div>
    <span className="text-gray-400 font-bold">{label}</span>
    {isLink && value !== "N/A" ? (
      <a
        href={value}
        target="_blank"
        rel="noreferrer"
        className="ml-2 text-blue-600 font-bold"
      >
        {value}
      </a>
    ) : (
      <span className="ml-2 text-gray-700">{value}</span>
    )}
  </div>
);

export default SingleClaim;
