// import React from "react";
// import ErrorBoundary from "./Helper/ErrorBoundary";
// import AllRoutes from "./Components/Allroutes";
// import LoadingSpinner from "./Components/LoadingSpinner";
// function App() {
//   return (
//     <ErrorBoundary>
//       <AllRoutes />
//     </ErrorBoundary>
//   );
// }

// export default App;

// src/App.jsx
import React, { useEffect, Suspense } from "react";

import { useDispatch, useSelector } from "react-redux";
import { setSubdomain } from "./ReduxStore/features/tenantSlice";
import ErrorBoundary from "./Helper/ErrorBoundary";
import FullPageLoader from "./Components/FullPageLoader";
import getSubdomain from "./Helper/getSubdomain";
import { DocumentViewerProvider } from "./hooks/useDocumentViewer";

const AllRoutes = React.lazy(() => import("./Components/Allroutes"));

const AppContent = () => {
  const dispatch = useDispatch();
  const { loading } = useSelector((state) => state.subDomain);

  useEffect(() => {
    const detected = getSubdomain();
    dispatch(setSubdomain(detected));
  }, [dispatch]);

  if (loading) {
    return <FullPageLoader />;
  }

  return (
    <DocumentViewerProvider>
      <Suspense fallback={<FullPageLoader />}>
        <AllRoutes />
      </Suspense>
    </DocumentViewerProvider>
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
