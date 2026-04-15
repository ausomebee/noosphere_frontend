import AllRoutes from "./Components/Allroutes";
import ErrorBoundary from "./Helper/ErrorBoundary";
import { DocumentViewerProvider } from "./hooks/useDocumentViewer";

const App = () => {
  return (
    <ErrorBoundary>
      <DocumentViewerProvider>
        <div>
          <AllRoutes />
        </div>
      </DocumentViewerProvider>
    </ErrorBoundary>
  );
};

export default App;
