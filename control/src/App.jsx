import AllRoutes from "./Components/Allroutes";
import ErrorBoundary from "./Helper/ErrorBoundary";

const App = () => {
  return (
    <ErrorBoundary>
      <div>
        <AllRoutes />
      </div>
    </ErrorBoundary>
  );
};

export default App;
