import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import Layout from "../Pages/Layout/ControlLayout";
import { SectionSpinner } from "./LoadingSpinner";

const LayoutRoute = () => (
  <Layout>
    <Suspense fallback={<SectionSpinner />}>
      <Outlet />
    </Suspense>
  </Layout>
);

export default LayoutRoute;
