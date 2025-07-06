import React from "react";
import Button from "../../../Components/Button/Button";
import "../Dashboard.css";

const IntakePipeline = ({ hasData }) => {
  const dummyData = {
    stages: [
      { name: "Consultation", count: 45 },
      { name: "Assessment", count: 12 },
      { name: "Authorization", count: 8 },
      { name: "Documentation", count: 5 },
      { name: "Treatment setup", count: 3 },
    ],
  };

  return (
    <>
      {hasData ? (
        <div>
          <div className="intake-stages flex justify-between">
            {dummyData.stages.map((stage, index) => (
              <div key={stage.name} className="intake-stage">
                <span className="stage-name">{stage.name}</span>
                <div className={`stage-divider stage-color-${index + 1}`}></div>
                <span className="stage-count">
                  {stage.count} <span className="stage-value">Candidates</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          <Button label="Setup Intake Pipeline" variant="primary" />
        </>
      )}
    </>
  );
};

export default IntakePipeline;
