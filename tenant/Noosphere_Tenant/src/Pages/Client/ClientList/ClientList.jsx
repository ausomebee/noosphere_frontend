import React, { useState, useRef, useEffect, useMemo } from "react";
import DashboardLayout from "../../../Layout/TenantLayout";
import CustomTable from "../../../Components/Table/CustomTable";
import Button from "../../../Components/Button/Button";
import "./ClientList.css";
import { useNavigate } from "react-router-dom";

const ClientList = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(event.target) &&
        menuRef.current &&
        !menuRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleItemClick = (action) => {
    console.log("Action:", action);
    setIsOpen(false);
  };

  // Wrap tableData in useMemo - prevents recreating on every render
  const tableData = useMemo(
    () => [
      {
        id: "1",
        name: "Michael Marthars",
        dateAdded: "2024-10-01",
        email: "michael@example.com",
        emergencyContact: "Michael Scofield",
        phone: "123 456 7890",
        ToggleActive: true,
        hasActions: true,
      },
      {
        id: "2",
        name: "John Doe",
        dateAdded: "2024-09-15",
        email: "john@example.com",
        emergencyContact: "Jane Doe",
        phone: "987 654 3210",
        ToggleActive: true,
        hasActions: true,
      },
      {
        id: "3",
        name: "Sarah Connor",
        dateAdded: "2024-11-10",
        email: "sarah@example.com",
        emergencyContact: "Kyle Reese",
        phone: "555 123 4567",
        ToggleActive: false,
        hasActions: true,
      },
      {
        id: "4",
        name: "Emma Watson",
        dateAdded: "2024-11-17",
        email: "emma@example.com",
        emergencyContact: "Hermione Granger",
        phone: "444 555 6666",
        ToggleActive: true,
        hasActions: true,
      },
      {
        id: "5",
        name: "David Beckham",
        dateAdded: "2024-08-20",
        email: "david@example.com",
        emergencyContact: "Victoria Beckham",
        phone: "777 888 9999",
        ToggleActive: true,
        hasActions: true,
      },
      {
        id: "6",
        name: "Ada Lovelace",
        dateAdded: "2024-11-17",
        email: "ada@example.com",
        emergencyContact: "Charles Babbage",
        phone: "111 222 3333",
        ToggleActive: true,
        hasActions: true,
      },
    ],
    []
  );

  const columns = [
    { header: "Name", key: "name", type: "text" },
    { header: "Date added", key: "dateAdded", type: "dateTime" },
    { header: "Email", key: "email", type: "text" },
    { header: "Emergency contact", key: "emergencyContact", type: "text" },
    { header: "Phone", key: "phone", type: "text" },
    { header: "Status", key: "ToggleActive", type: "active" },
  ];

  const actions = [
    {
      type: "dropdown",
      label: "More",
      items: [
        {
          label: "View client",
          onClick: (row) => navigate(`/client/view-client/${row.id}`),
        },
        { label: "Edit client Information", onClick: () => {} },
        { label: "Deactivate client", onClick: () => {} },
      ],
      className: "more-dropdown",
    },
  ];

  const filters = useMemo(() => {
    const uniqueDates = [...new Set(tableData.map((f) => f.dateAdded))]
      .filter(Boolean)
      .sort()
      .reverse()
      .map((d) => ({ value: d, label: d }));

    return [
      {
        value: "dateTime",
        label: "Date Added",
        filterValues: uniqueDates,
        filterFunction: (row, value) => !value || row.dateAdded === value,
      },
    ];
  }, [tableData]);

  return (
    <DashboardLayout>
      <div className="client-list-container">
        <div className="client-list-header">
          <h1 className="client-list-title">Clients</h1>

          {/* Manage Dropdown */}
          <div className="client-dropdown-wrapper">
            <div
              ref={triggerRef}
              onClick={() => setIsOpen((prev) => !prev)}
              style={{ cursor: "pointer" }}
            >
              <Button
                label="Manage candidate"
                variant="primary"
                icon={
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <g clipPath="url(#clip0_3803_8078)">
                      <path
                        opacity="0.3"
                        d="M12.8584 12.9C11.9417 12.4917 10.9751 12.2917 10.0001 12.2917C9.01673 12.2917 8.0584 12.5 7.14173 12.9C6.95006 12.9834 6.8084 13.1417 6.7334 13.3334H13.2751C13.1917 13.1417 13.0501 12.9834 12.8584 12.9Z"
                        fill="white"
                      />
                      <path
                        opacity="0.3"
                        d="M10.7831 7.32502C10.7165 6.94169 10.3915 6.66669 9.9998 6.66669C9.60814 6.66669 9.28314 6.94169 9.21647 7.32502L9.0498 8.33335H10.9498L10.7831 7.32502Z"
                        fill="white"
                      />
                      <path
                        d="M8.55836 10H11.4417C12.2167 10 12.8 9.30833 12.675 8.54167L12.425 7.05C12.225 5.86667 11.2 5 10 5C8.80002 5 7.77502 5.86667 7.57502 7.05833L7.32502 8.55C7.20002 9.30833 7.78336 10 8.55836 10ZM9.21669 7.325C9.28336 6.94167 9.60836 6.66667 10 6.66667C10.3917 6.66667 10.7167 6.94167 10.7834 7.325L10.95 8.33333H9.05002L9.21669 7.325Z"
                        fill="white"
                      />
                      <path
                        d="M1.38311 9.25835C1.27478 9.47502 1.23311 9.73335 1.29978 9.99169C1.43311 10.5667 1.93311 10.85 2.57478 10.825C2.57478 10.825 3.81644 10.825 4.19978 10.825C4.89144 10.825 5.45811 10.3417 5.45811 9.75002C5.45811 9.63335 5.43311 9.52502 5.39978 9.41669C5.39144 9.39169 5.39144 9.37502 5.40811 9.35002C5.48311 9.21669 5.52478 9.06669 5.52478 8.90835C5.52478 8.65002 5.40811 8.40835 5.22478 8.22502C5.19978 8.20002 5.19978 8.17502 5.20811 8.14169C5.26644 7.97502 5.26644 7.78335 5.21644 7.60002C5.08311 7.24169 4.75811 7.00002 4.39144 6.98335C4.36644 6.98335 4.34978 6.97502 4.33311 6.95835C4.19144 6.78335 3.93311 6.66669 3.64144 6.66669C3.39144 6.66669 3.16644 6.75002 3.01644 6.88335C2.99144 6.90835 2.96644 6.90835 2.94144 6.90002C2.82478 6.85002 2.69144 6.82502 2.55811 6.82502C2.01644 6.82502 1.57478 7.23335 1.52478 7.75835C1.52478 7.77502 1.51644 7.79169 1.49978 7.80835C1.25811 8.02502 1.11644 8.35002 1.15811 8.68335C1.18311 8.86669 1.25811 9.04169 1.36644 9.18335C1.39144 9.20002 1.39144 9.23335 1.38311 9.25835Z"
                        fill="white"
                      />
                      <path
                        d="M13.5333 11.375C12.5583 10.9417 11.3583 10.625 10 10.625C8.64167 10.625 7.44167 10.95 6.46667 11.375C5.56667 11.775 5 12.675 5 13.6583V15H15V13.6583C15 12.675 14.4333 11.775 13.5333 11.375ZM6.725 13.3333C6.8 13.1417 6.95 12.9833 7.13333 12.9C8.05 12.4917 9.01667 12.2917 9.99167 12.2917C10.975 12.2917 11.9333 12.5 12.85 12.9C13.0417 12.9833 13.1833 13.1417 13.2583 13.3333H6.725Z"
                        fill="white"
                      />
                      <path
                        d="M1.01667 12.15C0.4 12.4167 0 13.0167 0 13.6917V15H3.75V13.6584C3.75 12.9667 3.94167 12.3167 4.275 11.75C3.96667 11.7 3.65833 11.6667 3.33333 11.6667C2.50833 11.6667 1.725 11.8417 1.01667 12.15Z"
                        fill="white"
                      />
                      <path
                        d="M18.9834 12.15C18.2751 11.8417 17.4918 11.6667 16.6668 11.6667C16.3418 11.6667 16.0334 11.7 15.7251 11.75C16.0584 12.3167 16.2501 12.9667 16.2501 13.6584V15H20.0001V13.6917C20.0001 13.0167 19.6001 12.4167 18.9834 12.15Z"
                        fill="white"
                      />
                      <path
                        d="M18.3334 9.16665V8.74998C18.3334 7.83331 17.5834 7.08331 16.6667 7.08331H15.0001C14.6501 7.08331 14.4584 7.48331 14.6751 7.75831L15.2584 8.28331C15.1001 8.54165 15.0001 8.84165 15.0001 9.16665C15.0001 10.0833 15.7501 10.8333 16.6667 10.8333C17.5834 10.8333 18.3334 10.0833 18.3334 9.16665Z"
                        fill="white"
                      />
                    </g>
                    <defs>
                      <clipPath id="clip0_3803_8078">
                        <rect width="20" height="20" fill="white" />
                      </clipPath>
                    </defs>
                  </svg>
                }
              />
            </div>

            {/* Dropdown Menu */}
            {isOpen && (
              <div ref={menuRef} className="client-dropdown-menu">
                <button
                  className="client-dropdown-item"
                  onClick={() => handleItemClick("Add to Onboarding Pipeline")}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 16 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M13.3335 4.00002H8.00016L6.66683 2.66669H2.66683C1.9335 2.66669 1.3335 3.26669 1.3335 4.00002V12C1.3335 12.7334 1.9335 13.3334 2.66683 13.3334H13.3335C14.0668 13.3334 14.6668 12.7334 14.6668 12V5.33335C14.6668 4.60002 14.0668 4.00002 13.3335 4.00002ZM13.3335 12H2.66683V4.00002H6.1135L7.44683 5.33335H13.3335V12ZM8.94016 10.3934L8.00016 11.3334L5.3335 8.66669L8.00016 6.00002L8.94016 6.94002L7.88683 8.00002H10.6668V9.33335H7.88683L8.94016 10.3934Z"
                      fill="#004ABA"
                    />
                  </svg>
                  <span>Add to Onboarding Pipeline</span>
                </button>

                <button
                  className="client-dropdown-item"
                  onClick={() =>
                    handleItemClick("Import from Onboarding Pipeline")
                  }
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 16 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M8 9.99998H5.33333V7.33331H8V5.33331L11.3333 8.66665L8 12V9.99998ZM3.33333 2.66665H6.12C6.4 1.89331 7.13333 1.33331 8 1.33331C8.86667 1.33331 9.6 1.89331 9.88 2.66665H12.6667C12.76 2.66665 12.8467 2.67331 12.9333 2.69331C13.1933 2.74665 13.4267 2.87998 13.6067 3.05998C13.7267 3.17998 13.8267 3.32665 13.8933 3.48665C13.96 3.63998 14 3.81331 14 3.99998V13.3333C14 13.5133 13.96 13.6933 13.8933 13.8533C13.8267 14.0133 13.7267 14.1533 13.6067 14.28C13.4267 14.46 13.1933 14.5933 12.9333 14.6466C12.8467 14.66 12.76 14.6666 12.6667 14.6666H3.33333C2.6 14.6666 2 14.0666 2 13.3333V3.99998C2 3.26665 2.6 2.66665 3.33333 2.66665ZM8 2.49998C7.72667 2.49998 7.5 2.72665 7.5 2.99998C7.5 3.27331 7.72667 3.49998 8 3.49998C8.27333 3.49998 8.5 3.27331 8.5 2.99998C8.5 2.72665 8.27333 2.49998 8 2.49998ZM3.33333 13.3333H12.6667V3.99998H3.33333V13.3333Z"
                      fill="#004ABA"
                    />
                  </svg>
                  <span>Import from Onboarding Pipeline</span>
                </button>

                <button
                  className="client-dropdown-item client-dropdown-item-bold"
                  onClick={() => handleItemClick("Add a Client directly")}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 16 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M9.99984 8.00002C11.4732 8.00002 12.6665 6.80669 12.6665 5.33335C12.6665 3.86002 11.4732 2.66669 9.99984 2.66669C8.5265 2.66669 7.33317 3.86002 7.33317 5.33335C7.33317 6.80669 8.5265 8.00002 9.99984 8.00002ZM9.99984 4.00002C10.7332 4.00002 11.3332 4.60002 11.3332 5.33335C11.3332 6.06669 10.7332 6.66669 9.99984 6.66669C9.2665 6.66669 8.6665 6.06669 8.6665 5.33335C8.6665 4.60002 9.2665 4.00002 9.99984 4.00002ZM9.99984 9.33335C8.21984 9.33335 4.6665 10.2267 4.6665 12V13.3334H15.3332V12C15.3332 10.2267 11.7798 9.33335 9.99984 9.33335ZM5.99984 12C6.1465 11.52 8.2065 10.6667 9.99984 10.6667C11.7998 10.6667 13.8665 11.5267 13.9998 12H5.99984ZM3.99984 10V8.00002H5.99984V6.66669H3.99984V4.66669H2.6665V6.66669H0.666504V8.00002H2.6665V10H3.99984Z"
                      fill="#004ABA"
                    />
                  </svg>
                  <span>Add a Client directly</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="table-wrapper">
          <CustomTable
            data={tableData}
            columns={columns}
            filters={filters} // Only Date Added filter
            actions={actions}
            tableName="Clients"
            itemsPerPage={10}
            showActions={true}
            showCheckbox={false}
            enableGlobalSearch={true}
            globalSearchPlaceholder="Search clients..."
          />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ClientList;
