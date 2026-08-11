import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import Layout from "../Pages/Layout/ControlLayout";
import LoadingSpinner from "./LoadingSpinner";

const LayoutRoute = () => (
  <Layout>
    <Suspense fallback={<LoadingSpinner />}>
      <Outlet />
    </Suspense>
  </Layout>
);

export default LayoutRoute;
