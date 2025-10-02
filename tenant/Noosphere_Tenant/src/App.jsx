import React, { useState, useMemo } from "react";
import ErrorBoundary from "./Helper/ErrorBoundary";
import CustomTable from "./Components/Table/CustomTable";
import AllRoutes from "./Components/Allroutes";
function App() {
  const [loading, setLoading] = useState(false);


  const currencyOptions = [
    { value: "USD", label: "USD" },
    { value: "EUR", label: "EUR" },
    { value: "GBP", label: "GBP" },
  ];



  

const handleSelectionChange = (selectedRows, selectedItems) => {
    console.log("Selected Rows:", selectedRows, "Selected Items:", selectedItems);
  };

const columns = [
  { header: "Client", key: "client", type: "text" },
  { header: "ServiceType", key: "serviceType", type: "text" },
  { header: "Programs", key: "programs", type: "text" },
  { header: "Sessions", key: "sessions", type: "text" },
  { header: "Therapist", key: "therapist", type: "text" },
  { header: "Upload By", key: "uploadBy", type: "text" },
  { header: "Description", key: "description", type: "text" },
  { header: "Code", key: "code", type: "text" },
  { header: "Created By", key: "createdBy", type: "text" },
  { header: "TimeSheet Number", key: "timeSheetNumber", type: "text" },
  { header: "Approval", key: "approval", type: "approval" },
  { header: "Date and Time", key: "dateTime", type: "day_time" },
  { header: "Document", key: "document", type: "document" },
  { header: "Progress", key: "progress", type: "stage_completion" },
  { header: "ToggleActive", key: "ToggleActive", type: "active" },
];

const [filterValues, setFilterValues] = useState({
    dateAdded: "Date Added",
  });

const filters = useMemo(
  () => [
    {
      key: "filter_type",
      value: "",
      options: [
        { value: "", label: "Select Filter" },
        ...columns
          .filter(
            (col) =>
              col.type === "text" ||
              col.key === "dateTime" ||
              col.key === "approval" ||
              col.key === "ToggleActive"
          )
          .map((col) => ({ value: col.key, label: col.header })),
        { value: "clear_filters", label: "Clear Filters" },
      ],
    },
  ],
  [columns]
);

const data = [
  {
    item_id: 1,
    client: "John Doeh",
    serviceType: "Consulting",
    programs: "Program A",
    sessions: "5",
    therapist: "Dr. Smith",
    uploadBy: "Admin",
    description: "Initial consultation",
    code: "C001",
    createdBy: "Jane Doe",
    timeSheetNumber: "TS001",
    approval: "Approved",
    dateTime: { date: "2025-06-21", time: "10:00 AM" },
    document: "report.pdf",
    progress: 85,
    ToggleActive: true,
    hasCheckbox: true,
    hasActions: true,
    actionType: "link",
  },
  {
    item_id: 2,
    client: "John Doei",
    serviceType: "Consulting",
    programs: "Program A",
    sessions: "5",
    therapist: "Dr. Smith",
    uploadBy: "Admin",
    description: "Initial consultation",
    code: "C001",
    createdBy: "Jane Doe",
    timeSheetNumber: "TS001",
    approval: "Approved",
    dateTime: { date: "2025-06-21", time: "10:00 AM" },
    document: "report.pdf",
    progress: 85,
    ToggleActive: true,
    hasCheckbox: true,
    hasActions: true,
    actionType: "link",
  },
  {
    item_id: 3,
    client: "John Doeh",
    serviceType: "Consulting",
    programs: "Program A",
    sessions: "5",
    therapist: "Dr. Smith",
    uploadBy: "Admin",
    description: "Initial consultation",
    code: "C001",
    createdBy: "Jane Doe",
    timeSheetNumber: "TS001",
    approval: "Approved",
    dateTime: { date: "2025-06-21", time: "10:00 AM" },
    document: "report.pdf",
    progress: 60,
    ToggleActive: true,
    hasCheckbox: true,
    hasActions: true,
    actionType: "link",
  },
  {
    item_id: 4,
    client: "John Doej",
    serviceType: "Consulting",
    programs: "Program A",
    sessions: "5",
    therapist: "Dr. Smith",
    uploadBy: "Admin",
    description: "Initial consultation",
    code: "C001",
    createdBy: "Jane Doe",
    timeSheetNumber: "TS001",
    approval: "Approved",
    dateTime: { date: "2025-06-21", time: "10:00 AM" },
    document: "report.pdf",
    progress: 85,
    ToggleActive: true,
    hasCheckbox: true,
    hasActions: true,
    actionType: "link",
  },
  {
    item_id: 5,
    client: "John Doe",
    serviceType: "Consulting",
    programs: "Program A",
    sessions: "5",
    therapist: "Dr. Smith",
    uploadBy: "Admin",
    description: "Initial consultation",
    code: "C001",
    createdBy: "Jane Doe",
    timeSheetNumber: "TS001",
    approval: "Approved",
    dateTime: { date: "2025-06-21", time: "10:00 AM" },
    document: "report.pdf",
    progress: 85,
    ToggleActive: true,
    hasCheckbox: true,
    hasActions: true,
    actionType: "link",
  },
  // More data...
];

const actions = [
  { label: "Edit", onClick: (row) => console.log("Edit", row), icon: <svg>...</svg> },
  { label: "Delete", onClick: (row) => console.log("Delete", row), className: "remove", icon: <svg>...</svg> },
];

  const handleFilterChange = (key, value) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
    // Add filtering logic here if needed
  };

   
  return (
    <ErrorBoundary>
    
      
     

{/* 
      <JiraBoard /> */}
     
 
    <AllRoutes />



{/* <CustomTable
      data={data}
      columns={columns}
     filters={filters}
      onFilterChange={(key, value) => console.log(key, value)}
      actions={actions}
      showActions={true}
      showCheckbox={true}
      itemsPerPage={5}
      tableName="Your Table"
      onSelectionChange={handleSelectionChange}
      hasStatusDot={true}
      actionLinkPrefix="/custom-details/"
      actionText="See More"
    /> */}

    </ErrorBoundary>
  );
}

export default App;

