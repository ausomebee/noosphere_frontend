import React from "react";
import Button from "../../../Components/Button/Button";
import "../Dashboard.css";
import api from "../../../api/DashboardApis";
import useAuth from "../../../hooks/useAuth";
import DashboardEmptyState from "./DashboardEmptyState";

const IntakePipeline = ({ hasData }) => {
  const [stages, setStages] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);

  const { tenantId, accessToken, refreshToken } = useAuth();

  const fetchIntakePipeline = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(false);

      const response = await api.GetDashboardIntakeByTenantId({
        tenantId,
        accessToken,
        refreshToken,
      });

      const pipelineStages = response?.data?.data?.pipelineStages || [];

      const transformed = pipelineStages
        .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0))
        .slice(0, 6) // Maximum 6 stages
        .map((stage) => ({
          name: stage.name || "Unnamed Stage",
          count: Number(stage._count?.pipelineItem) || 0,
        }));

      setStages(transformed);
    } catch (err) {
      console.error("Failed to load intake pipeline:", err);
      setError(true);
      setStages([]);
    } finally {
      setLoading(false);
    }
    // Token lifecycle is owned by the axios interceptor; depending on it here
    // causes an infinite refetch loop when a 401 triggers a token refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId, hasData]);

  React.useEffect(() => {
    if (!hasData) {
      setLoading(false);
      return;
    }
    fetchIntakePipeline();
  }, [hasData, fetchIntakePipeline]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32 text-gray-500">
        Loading pipeline...
      </div>
    );
  }

  // Endpoint errored — show the friendly state with a retry instead of a blank card.
  if (error) {
    return (
      <DashboardEmptyState description="We couldn't load your intake pipeline. Please try again.">
        <Button
          label="Try again"
          variant="primary"
          className="mx-auto block"
          onClick={fetchIntakePipeline}
        />
      </DashboardEmptyState>
    );
  }

  // No data yet (or no stages configured) — consistent empty state + CTA.
  if (!hasData || stages.length === 0) {
    return (
      <DashboardEmptyState description="You have not set up your intake pipeline yet. Your pipeline stages will be shown here.">
        <Button
          label="Set up intake pipeline"
          variant="primary"
          className="mx-auto block"
        />
      </DashboardEmptyState>
    );
  }

  return (
    <div>
      <div className="intake-stages flex justify-between">
        {stages.map((stage, index) => (
          <div key={stage.name} className="intake-stage">
            <span className="stage-name">{stage.name}</span>
            <div className={`stage-divider stage-color-${index + 1}`}></div>
            <span className="stage-count">
              {stage.count}{" "}
              <span className="stage-value">
                {stage.count === 1 ? "Candidate" : "Candidates"}
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default IntakePipeline;
