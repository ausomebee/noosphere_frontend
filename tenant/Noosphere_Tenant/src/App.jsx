import React, { useState, useMemo } from "react";
import LoadingSpinner from "./Components/LoadingSpinner";
import {
  CheckboxInput,
  PasswordInput,
  RadioInput,
  SearchInput,
  SelectInput,
  SwitchInput,
  TextareaInput,
  TextInput,
} from "./Components/Input/Inputs";
import Button from "./Components/Button/Button";
import JiraBoard from "./Components/JiraBoard/JiraBoard"
import ErrorBoundary from "./Helper/ErrorBoundary";
import CalendarScheduler from "./Components/CalendarScheduler/CalendarScheduler";
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
    {/* <div className="  flex flex-col px-[24px] p-[24px] sm:p-[32px] md:p-[48px]">
      <h2 className="text-[32px] font-semibold mb-[16px] sm:mb-[24px] md:mb-[32px]">
        Welcome to Our Platform
      </h2>
      <p className="text-[16px] sm:text-[18px] md:text-[20px] text-muted w-[90%] sm:w-[80%] md:w-[700px] mb-[24px] sm:mb-[32px]">
        Build responsive, modern web applications with our custom utility
        framework.
      </p>
      <button className="btn bg-[#4f46e5] text-white px-[24px] py-[12px] sm:px-[32px] sm:py-[16px] text-[16px] sm:text-[18px] hover:bg-[#6366f1] rounded-[8px] transition-all">
        Get Started
      </button>

      
      <LoadingSpinner />

      <SearchInput />
      <SelectInput options={currencyOptions} label="first name" />
      <TextInput label="first name" />
      <TextareaInput label="first name"/>
      <SwitchInput />
      <CheckboxInput />
      <RadioInput />
      <PasswordInput />

      <div className="container p-[24px]">
        <Button
          label="Primary"
          variant="primary"
          size="medium"
          width="150px"
          onClick={() => alert("Clicked!")}
        />
        <Button
          label="Secondary"
          variant="secondary"
          size="small"
          width="120px"
          icon={
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          }
          iconSize={16}
          iconPosition="right"
          className="mt-[16px]"
        />
        <Button
          label="Loading"
          variant="primary"
          size="large"
          width="200px"
          loading={loading}
          onClick={() => setLoading(!loading)}
          className="mt-[16px]"
        />
        <Button
          label="Danger"
          variant="danger"
          size="medium"
          width="150px"
          className="mt-[16px]"
        />
        <Button
          label="Ghost"
          variant="ghost"
          size="medium"
          width="150px"
          className="mt-[16px]"
        />
      </div>


      <JiraBoard />
     
    </div> */}
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
