import React from "react";
import DashboardLayout from "../../../Layout/TenantLayout";
import JiraBoard from "../../../Components/JiraBoard/JiraBoard";

const Pipeline = () => {
  return (
    <DashboardLayout>
      <JiraBoard />
    </DashboardLayout>
  );
};

export default Pipeline;
