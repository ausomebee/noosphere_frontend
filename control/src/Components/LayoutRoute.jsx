import { Outlet } from "react-router-dom";
import Layout from "../Pages/Layout/ControlLayout";

const LayoutRoute = () => (
  <Layout>
    <Outlet />
  </Layout>
);

export default LayoutRoute;
