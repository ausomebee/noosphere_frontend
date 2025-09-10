import React, { useState } from "react";
import DashboardLayout from "../../../Layout/TenantLayout";
import FrequencyModal from "./FrequencyModal";
import DurationModal from "./DurationModal";
import RateModal from "./RateModal";
import PercentageCorrect from "./PercentageCorrectModal";
import TaskAnalysisModal from "./TaskAnalysisModal";
import TrialsOpportunities from "./TrialsOpportunitiesModal";
import LatencyModal from "./LatencyModal";

const DataDummy = () => {
  const [activeModal, setActiveModal] = useState(null);
  const [modalData, setModalData] = useState({});
  const [savedData, setSavedData] = useState({});
  const [trialCount, setTrialCount] = useState(3);
  const [steps, setSteps] = useState([
    { id: 1, description: "Pick up toothbrush" },
    { id: 2, description: "Apply toothpaste to brush" },
    { id: 3, description: "Brush for 2 minutes" },
  ]);

  const handleOpenModal = (modalName, data = {}) => {
    setActiveModal(modalName);
    setModalData(data);
  };

  const handleCloseModal = () => {
    setActiveModal(null);
    setModalData({});
  };

  const handleSaveData = (data) => {
    setSavedData(prev => ({
      ...prev,
      [activeModal]: data
    }));
    console.log("Saved data for", activeModal, ":", data);
    handleCloseModal();
  };

  // Helper function to format time
  const formatTime = (seconds) => {
    if (!seconds && seconds !== 0) return "Not set";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <DashboardLayout>
      <div className="app p-6">
        <header className="app-header mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Data Collection Modals</h1>
          <p className="text-gray-600 mt-2">Test all data collection modals in one place</p>
        </header>

        <main className="app-main">
          {/* Controls Section */}
          <div className="controls mb-8 p-6 bg-white rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Modal Controls</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              <div className="input-group">
                <label htmlFor="trialCount" className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Trials:
                </label>
                <input
                  id="trialCount"
                  type="number"
                  min="1"
                  max="10"
                  value={trialCount}
                  onChange={(e) => setTrialCount(parseInt(e.target.value) || 1)}
                  className="border border-gray-300 rounded-md p-2 w-full"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              <button

                onClick={() => handleOpenModal("frequency")}
              >
                Frequency
              </button>
              
              <button
               
                onClick={() => handleOpenModal("duration")}
              >
                Duration
              </button>
              
              <button
              
                onClick={() => handleOpenModal("rate")}
              >
                Rate
              </button>
              
              <button
               
                onClick={() => handleOpenModal("percentage", { trialCount })}
              >
                Percentage Correct
              </button>
              
              <button
               
                onClick={() => handleOpenModal("trials", { trialCount })}
              >
                Trials/Opportunities
              </button>
              
              <button
               
                onClick={() => handleOpenModal("task", { steps })}
              >
                Task Analysis
              </button>
              
              <button
              
                onClick={() => handleOpenModal("latency", { trialCount: 4 })}
              >
                Latency
              </button>
            </div>
          </div>

          {/* Saved Data Display */}
          {Object.keys(savedData).length > 0 && (
            <div className="saved-data mt-6 bg-white p-6 rounded-lg shadow">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Saved Data</h2>
              
              {Object.entries(savedData).map(([modalType, data]) => (
                <div key={modalType} className="mb-6 p-4 border rounded-lg">
                  <h3 className="text-lg font-semibold mb-3 capitalize">{modalType.replace(/([A-Z])/g, ' $1')}</h3>
                  
                  {modalType === "frequency" && (
                    <div className="space-y-2">
                      <p><strong>Occurrences:</strong> {data.numberOfOccurrence}</p>
                      <p><strong>Notes:</strong> {data.notes || "No notes"}</p>
                    </div>
                  )}
                  
                  {modalType === "duration" && (
                    <div className="space-y-2">
                      <p><strong>Duration:</strong> {formatTime(data.duration)}</p>
                      <p><strong>Notes:</strong> {data.notes || "No notes"}</p>
                    </div>
                  )}
                  
                  {modalType === "rate" && (
                    <div className="space-y-2">
                      <p><strong>Occurrences:</strong> {data.numberOfOccurrence}</p>
                      <p><strong>Duration:</strong> {formatTime(data.duration)}</p>
                      <p><strong>Rate:</strong> {data.duration > 0 ? (data.numberOfOccurrence / data.duration * 60).toFixed(2) + " per minute" : "N/A"}</p>
                      <p><strong>Notes:</strong> {data.notes || "No notes"}</p>
                    </div>
                  )}
                  
                  {modalType === "percentage" && (
                    <div className="space-y-2">
                      <p><strong>Percentage Correct:</strong> {data.percentageCorrect}%</p>
                      <p><strong>Notes:</strong> {data.notes || "No notes"}</p>
                      {data.trials && (
                        <div className="mt-3">
                          <h4 className="font-semibold mb-2">Trials:</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {data.trials.map((trial, index) => (
                              <div key={index} className="border p-2 rounded">
                                <p><strong>Trial {index + 1}:</strong> {trial.performance} | {trial.promptLevel}</p>
                                {trial.notes && <p className="text-sm">Note: {trial.notes}</p>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {modalType === "trials" && (
                    <div className="space-y-2">
                      <p><strong>Notes:</strong> {data.notes || "No notes"}</p>
                      {data.trials && (
                        <div className="mt-3">
                          <h4 className="font-semibold mb-2">Trials:</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {data.trials.map((trial, index) => (
                              <div key={index} className="border p-2 rounded">
                                <p><strong>Trial {index + 1}:</strong> {trial.performance} | {trial.promptLevel}</p>
                                {trial.notes && <p className="text-sm">Note: {trial.notes}</p>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {modalType === "task" && (
                    <div className="space-y-2">
                      <p><strong>Notes:</strong> {data.notes || "No notes"}</p>
                      {data.steps && (
                        <div className="mt-3">
                          <h4 className="font-semibold mb-2">Steps:</h4>
                          <div className="space-y-2">
                            {data.steps.map((step, index) => (
                              <div key={index} className="border p-2 rounded">
                                <p><strong>{step.description}:</strong> {step.performance} | {step.promptLevel}</p>
                                {step.notes && <p className="text-sm">Note: {step.notes}</p>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {modalType === "latency" && (
                    <div className="space-y-2">
                      <p><strong>Notes:</strong> {data.notes || "No notes"}</p>
                      {data.trials && (
                        <div className="mt-3">
                          <h4 className="font-semibold mb-2">Trials:</h4>
                          <div className="space-y-2">
                            {data.trials.map((trial, index) => (
                              <div key={index} className="border p-2 rounded">
                                <p><strong>Trial {trial.trial}:</strong></p>
                                <p>Stimulus: {trial.stimulusPresented.hours}h:{trial.stimulusPresented.minutes}m:{trial.stimulusPresented.seconds}s</p>
                                <p>Behavior Start: {trial.behaviourStart || "Not recorded"}</p>
                                <p>Latency: {trial.latency !== null ? `${trial.latency >= 0 ? "+" : ""}${trial.latency}s` : "N/A"}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </main>

        {/* Modal Components */}
        <FrequencyModal
          isOpen={activeModal === "frequency"}
          onClose={handleCloseModal}
          onSave={handleSaveData}
          submitting={false}
        />
        
        <DurationModal
          isOpen={activeModal === "duration"}
          onClose={handleCloseModal}
          onSave={handleSaveData}
          submitting={false}
        />
        
        <RateModal
          isOpen={activeModal === "rate"}
          onClose={handleCloseModal}
          onSave={handleSaveData}
          submitting={false}
        />
        
        <PercentageCorrect
          isOpen={activeModal === "percentage"}
          onClose={handleCloseModal}
          trialCount={modalData.trialCount || 3}
          onSave={handleSaveData}
          submitting={false}
        />
        
        <TrialsOpportunities
          isOpen={activeModal === "trials"}
          onClose={handleCloseModal}
          trialCount={modalData.trialCount || 3}
          onSave={handleSaveData}
          submitting={false}
        />
        
        <TaskAnalysisModal
          isOpen={activeModal === "task"}
          onClose={handleCloseModal}
          steps={modalData.steps || steps}
          onSave={handleSaveData}
          submitting={false}
        />
        
        <LatencyModal
          isOpen={activeModal === "latency"}
          onClose={handleCloseModal}
          trialCount={modalData.trialCount || 4}
          onSave={handleSaveData}
          submitting={false}
        />
      </div>
    </DashboardLayout>
  );
};

export default DataDummy;