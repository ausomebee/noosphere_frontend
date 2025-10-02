import React, { useMemo, useState } from "react";
import DashboardLayout from "../../../Layout/TenantLayout";
import Button from "../../../Components/Button/Button";
import { FaPlus } from "react-icons/fa";
import CustomTable from "../../../Components/Table/CustomTable";
import { useNavigate } from "react-router-dom";
import NewPayrollModal from "../../../Components/ReusableModal/PayrollModal/NewPayrollModal";

const Payroll = () => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [tableData, setTableData] = useState([
    {
      id: "1",
      date: "12/10/2024",
      payPeriod: "12/10/24 - 11/11/24",
      noOfStaff: "8",
      totalPayrollValue: "$18200",
      hasActions: true,
    },
    {
      id: "2",
      date: "12/10/2024",
      payPeriod: "12/10/24 - 11/11/24",
      noOfStaff: "8",
      totalPayrollValue: "$18200",
      hasActions: true,
    },
    {
      id: "3",
      date: "12/10/2024",
      payPeriod: "12/10/24 - 11/11/24",
      noOfStaff: "8",
      totalPayrollValue: "$18200",
      hasActions: true,
    },
    {
      id: "4",
      date: "12/10/2024",
      payPeriod: "12/10/24 - 11/11/24",
      noOfStaff: "8",
      totalPayrollValue: "$18200",
      hasActions: true,
    },
    {
      id: "5",
      date: "12/10/2024",
      payPeriod: "12/10/24 - 11/11/24",
      noOfStaff: "8",
      totalPayrollValue: "$18200",
      hasActions: true,
    },
    {
      id: "6",
      date: "12/10/2024",
      payPeriod: "12/10/24 - 11/11/24",
      noOfStaff: "8",
      totalPayrollValue: "$18200",
      hasActions: true,
    },
    {
      id: "7",
      date: "12/10/2024",
      payPeriod: "12/10/24 - 11/11/24",
      noOfStaff: "8",
      totalPayrollValue: "$18200",
      hasActions: true,
    },
    {
      id: "8",
      date: "12/10/2024",
      payPeriod: "12/10/24 - 11/11/24",
      noOfStaff: "8",
      totalPayrollValue: "$18200",
      hasActions: true,
    },
  ]);

  const handleActionClick = (row) => {
    navigate(`/billing/claims/view/${row.id}`);
  };

  const columns = [
    { header: "Payroll Date", key: "date", type: "dateTime" },
    { header: "Pay Period", key: "payPeriod", type: "text" },
    { header: "No of Staff in Payroll", key: "noOfStaff", type: "text" },
    { header: "Total Payroll Value", key: "totalPayrollValue", type: "text" },
  ];

  const handleNewPayroll = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSavePayroll = (payrollData) => {
    setIsLoading(true);
    setTimeout(() => {
      const fromDate = new Date(payrollData.from).toLocaleDateString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "2-digit",
      });
      const toDate = new Date(payrollData.to).toLocaleDateString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "2-digit",
      });

      const totalPayrollValue = payrollData.employees.reduce((sum, emp) => {
        const baseGross = emp.paymentSchedule === "Hourly"
          ? emp.hourlyRate * emp.numberOfHours
          : emp.basicPay;
        const gross = baseGross + emp.fixedBonus +
          emp.additionalIncomes.reduce((sum, inc) => {
            if (inc.unitType === "percentage_based") {
              return sum + (baseGross * (inc.amount / 100));
            } else if (inc.unitType === "hourly_rate" || inc.unitType === "hourly_rate_with_overtime") {
              return sum + (inc.amount * emp.numberOfHours);
            }
            return sum + inc.amount;
          }, 0);
        const deductions = emp.taxDeduction + emp.pensionDeduction +
          emp.additionalDeductions.reduce((sum, ded) => {
            if (ded.unitType === "percentage_based") {
              return sum + (gross * (ded.amount / 100));
            }
            return sum + ded.amount;
          }, 0);
        return sum + (gross - deductions);
      }, 0);

      const newPayroll = {
        id: (tableData.length + 1).toString(),
        date: new Date().toLocaleDateString("en-US", {
          month: "2-digit",
          day: "2-digit",
          year: "numeric",
        }),
        payPeriod: `${fromDate} - ${toDate}`,
        noOfStaff: payrollData.employees.length.toString(),
        totalPayrollValue: `$${totalPayrollValue.toLocaleString()}`,
        hasActions: true,
        employees: payrollData.employees,
      };

      setTableData((prev) => [newPayroll, ...prev]);
      setIsLoading(false);
      setIsModalOpen(false);
      console.log("Payroll created successfully:", newPayroll);
    }, 2000);
  };

  return (
    <DashboardLayout>
      <div>
        <h1 className="appointment-sched-title">Payroll</h1>
        <h3 className="text-xl text-gray-700 font-500">
          Run your payroll seamlessly
        </h3>
      </div>

      <div className="justify-end flex mt-6">
        <Button
          label="New Payroll"
          variant="primary"
          icon={<FaPlus />}
          onClick={handleNewPayroll}
          loading={isLoading}
        />
      </div>

      <div className="mt-32">
        <CustomTable
          data={tableData}
          columns={columns}
          tableName="Payroll Setup"
          itemsPerPage={10}
          showActions={true}
          showCheckbox={false}
          actionText="View Breakdown"
          actionLinkPrefix="/claims/view/"
          onActionClick={handleActionClick}
        />
      </div>

      <NewPayrollModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSavePayroll}
      />
    </DashboardLayout>
  );
};

export default Payroll;