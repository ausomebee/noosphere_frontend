import React, { useEffect, Suspense } from "react";

import { useDispatch, useSelector } from "react-redux";
import { setSubdomain } from "./ReduxStore/features/tenantSlice";
import ErrorBoundary from "./Helper/ErrorBoundary";
import LoadingSpinner from "./Components/LoadingSpinner";
import getSubdomain from "./Helper/getSubdomain";

const AllRoutes = React.lazy(() => import("./Components/AllRoutes"));

const AppContent = () => {
  const dispatch = useDispatch();
  const {  loading } = useSelector((state) => state.subDomain);

  useEffect(() => {
    const detected = getSubdomain();
    dispatch(setSubdomain(detected));
  }, [dispatch]);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <AllRoutes />
    </Suspense>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}

export default App;
