import AllRoutes from "./Components/Allroutes";
import ErrorBoundary from "./Helper/ErrorBoundary";
import UpdateNotice from "./Components/UpdateNotice/UpdateNotice";
import { DocumentViewerProvider } from "./hooks/useDocumentViewer";

const App = () => {
  return (
    <ErrorBoundary>
      <DocumentViewerProvider>
        <div>
          <AllRoutes />
        </div>
      </DocumentViewerProvider>
      <UpdateNotice />
    </ErrorBoundary>
  );
};

export default App;
