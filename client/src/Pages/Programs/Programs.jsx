import usePageTitle from "../../hooks/usePageTitle";
import { useState, useEffect } from "react";
import ReusableTable from "../../Components/Table/ReuseableTable";
import { FiEye } from "react-icons/fi";
import Chart from "react-apexcharts";
import "./Programs.css";
import DashboardLayout from "../../layouts/ClientLayout";
import useAuth from "../../hooks/useAuth";
import api from "../../api/programsApis";
import Button from "../../Components/Button/Button";
import ErrorFallback from "../../Components/ErrorFallback";
import usePersistedTab from "../../hooks/usePersistedTab";

const Programs = () => {
  const { clientId, accessToken, refreshToken } = useAuth();

  usePageTitle("Programs");
  const [activeTab, setActiveTab] = usePersistedTab("client:programs", "all");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Main data
  const [programs, setPrograms] = useState([]);
  const [loadingPrograms, setLoadingPrograms] = useState(true);
  const [programsError, setProgramsError] = useState(null);

  // Modal state
  const [performanceModal, setPerformanceModal] = useState({
    isOpen: false,
    targetId: null,
    targetName: "",
    programName: "",
    dataCollectionType: "",
    performanceData: null,
    loading: false,
    error: null,
  });

  // Fetch all programs + targets on mount
  useEffect(() => {
    const fetchProgramsAndTargets = async () => {
      if (!clientId || !accessToken) return;

      setLoadingPrograms(true);
      setProgramsError(null);

      try {
        const response = await api.GetClientProgramsAndTargets({
          clientId,
          accessToken,
          refreshToken,
        });


        // Transform the nested data structure
        const rawData = response.data?.data || [];
        const transformedPrograms = rawData.map((item) => ({
          id: item.program?.id || "",
          programName: item.program?.name || "Unnamed Program",
          description: item.program?.description || "",
          domainId: item.program?.domainId || "",
          isDeleted: item.program?.isDeleted || false,
          createdAt: item.program?.createdAt || "",
          updatedAt: item.program?.updatedAt || "",
          targets: (item.program?.target || []).map((target) => ({
            id: target.id || "",
            name: target.name || "Unnamed Target",
            description: target.description || "",
            sd: target.sd || "",
            expectedResponse: target.expectedResponse || "",
            teachingProcedure: target.teachingProcedure || "",
            promptingStrategy: target.promptingStrategy || [],
            dataCollectionType: target.dataCollectionType || "",
            baselineDataRequired: target.baselineDataRequired || false,
            masteryMetric: target.masteryMetric || "",
            masteryCriteria: target.masteryCriteria || {},
            initialStatus: target.initialStatus || "",
            attachment: target.attachment || null,
            notes: target.notes || "",
          })),
        }));

        setPrograms(transformedPrograms);
      } catch (err) {
        console.error("Error fetching programs:", err);
        setProgramsError(err.message || "Failed to load programs");
      } finally {
        setLoadingPrograms(false);
      }
    };

    fetchProgramsAndTargets();
  }, [clientId]); // eslint-disable-line react-hooks/exhaustive-deps

  const columns = [
    {
      key: "programName",
      title: "Program",
      render: (value) => (
        <div className="program-name-cell">
          <div className="program-name">{value || "Unnamed Program"}</div>
        </div>
      ),
    },
    {
      key: "description",
      title: "Description",
      render: (value) => (
        <div className="program-description-cell">
          <div className="program-description">{value || "No description"}</div>
        </div>
      ),
    },
  ];

  const actions = [
    {
      label: "View Performance",
      icon: <FiEye size={16} />,
      onClick: (row) => handleViewPerformance(row),
      // Show action for all programs that have at least one target
      show: (row) => row.targets?.length > 0,
    },
  ];

  const renderExpandedRow = (row) => (
    <div className="targets-expanded-content">
      <div className="targets-list">
        {row.targets?.length > 0 ? (
          row.targets.map((target) => {
            return (
              <div key={target.id} className="target-item-row">
                <div className="target-info-row">
                  {/* Target Name Section */}
                  <div className="target-name-section">
                    <h5 className="target-name-row" title={target.name}>
                      {target.name || "Unnamed Target"}
                    </h5>
                  </div>

                  {/* Description Section */}
                  <div className="target-description-section">
                    <p
                      className="target-description-row"
                      title={target.description}
                    >
                      {target.description || "No description"}
                    </p>
                  </div>

                  {/* Data Collection Type Badge Section */}
                  <div className="target-badge-section">
                    <span className="target-badge-row">
                      {target.dataCollectionType || "Not specified"}
                    </span>
                  </div>

                  {/* Action Button Section */}
                  <div className="target-action-section">
                    <button
                      className="target-action-btn-row"
                      onClick={() => handleTargetPerformance(target, row)}
                      title={`View performance for ${target.name}`}
                    >
                      <FiEye size={14} />
                      <span>View Performance</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="no-targets-message">
            No targets available for this program
          </div>
        )}
      </div>
    </div>
  );

  const handleViewPerformance = (program) => {
    // Take the first target if available
    const firstTarget = program.targets?.[0];

    if (firstTarget) {
      handleTargetPerformance(firstTarget, program);
    }
  };

  const handleTargetPerformance = (target, program) => {
    setPerformanceModal({
      isOpen: true,
      targetId: target.id,
      targetName: target.name || "Target",
      programName: program.programName || "Program",
      dataCollectionType: target.dataCollectionType,
      performanceData: null,
      loading: true,
      error: null,
    });
  };

  // Fetch performance data when modal opens
  useEffect(() => {
    if (!performanceModal.isOpen || !performanceModal.targetId || !clientId)
      return;

    const fetchTargetPerformance = async () => {
      try {
        const response = await api.GetClientTargetPerformance({
          clientId,
          targetId: performanceModal.targetId,
          accessToken,
          refreshToken,
        });


        const monthlyData = response.data?.data || [];
        
        // Extract values and handle nulls
        const values = monthlyData.map(item => 
          item.average !== null ? Number(item.average) : 0
        );
        
        const labels = monthlyData.map(item => item.monthName);
        
        // Check if we have any non-zero data
        const hasData = monthlyData.some(item => item.average !== null && item.average > 0);

        if (!hasData) {
          // Show message for no data
          setPerformanceModal((prev) => ({
            ...prev,
            performanceData: null,
            loading: false,
            error: "No session data available for this target"
          }));
          return;
        }

        // Get the data type from the first month with data
        const firstDataMonth = monthlyData.find(item => item.rawData?.length > 0);
        const dataType = firstDataMonth?.dataType || 'percentage';
        
        const chartData = createChartData(values, labels, monthlyData, dataType);
        setPerformanceModal((prev) => ({
          ...prev,
          performanceData: chartData,
          loading: false,
          error: null,
        }));
      } catch (err) {
        console.error("Performance fetch failed:", err);
        setPerformanceModal((prev) => ({
          ...prev,
          error: err.message || "Failed to load performance data",
          loading: false,
        }));
      }
    };

    fetchTargetPerformance();
  }, [
    performanceModal.isOpen,
    performanceModal.targetId,
    clientId,
    accessToken,
    refreshToken,
  ]);

  const createChartData = (values, labels, monthlyData, dataType) => {
    // Configure y-axis based on data type
    const getYAxisConfig = () => {
      switch(dataType) {
        case 'percentage':
          return {
            min: 0,
            max: 100,
            tickAmount: 5,
            title: { text: "Percentage (%)", style: { fontSize: '13px', color: '#64748b' } }
          };
        case 'task_analysis':
          return {
            min: 0,
            max: 100,
            tickAmount: 5,
            title: { text: "Completion Rate (%)", style: { fontSize: '13px', color: '#64748b' } }
          };
        case 'trials_opportunities':
          return {
            min: 0,
            max: Math.max(...values) + 2,
            tickAmount: 6,
            title: { text: "Correct Trials", style: { fontSize: '13px', color: '#64748b' } }
          };
        default:
          return {
            min: 0,
            max: Math.max(...values.filter(v => v > 0), 100) + 10,
            tickAmount: 6,
            title: { text: "Performance Score", style: { fontSize: '13px', color: '#64748b' } }
          };
      }
    };

    // Format tooltip values based on data type
    const formatTooltipValue = (val, monthData) => {
      if (monthData.sessionCount === 0) return "No data";
      
      switch(monthData.dataType) {
        case 'percentage':
          return `${val.toFixed(1)}% (${monthData.sessionCount} session${monthData.sessionCount !== 1 ? 's' : ''})`;
        case 'task_analysis':
          return `${val.toFixed(1)}% completion (${monthData.sessionCount} session${monthData.sessionCount !== 1 ? 's' : ''})`;
        case 'trials_opportunities':
          return `${val.toFixed(1)} correct (${monthData.sessionCount} session${monthData.sessionCount !== 1 ? 's' : ''})`;
        default:
          return `${val.toFixed(1)} (${monthData.sessionCount} session${monthData.sessionCount !== 1 ? 's' : ''})`;
      }
    };

    // Create custom tooltip content
    const getCustomTooltip = (monthData) => {
      if (monthData.sessionCount === 0) {
        return '<div class="custom-tooltip">No sessions this month</div>';
      }

      const rawData = monthData.rawData?.[0] || {};
      
      let details = '';
      switch(monthData.dataType) {
        case 'percentage':
          details = `
            <div>Average: ${monthData.average?.toFixed(1)}%</div>
            <div>Min: ${monthData.min}%</div>
            <div>Max: ${monthData.max}%</div>
            ${rawData.trials ? `<div>Trials: ${rawData.trials}</div>` : ''}
          `;
          break;
        case 'task_analysis':
          details = `
            <div>Completion: ${monthData.average?.toFixed(1)}%</div>
            <div>Steps: ${rawData.steps || 'N/A'}</div>
            <div>Completed: ${rawData.completed || 'N/A'}</div>
          `;
          break;
        case 'trials_opportunities':
          details = `
            <div>Correct: ${monthData.average?.toFixed(1)}</div>
            <div>Min: ${monthData.min}</div>
            <div>Max: ${monthData.max}</div>
            ${rawData.trials ? `<div>Total Trials: ${rawData.trials}</div>` : ''}
            ${rawData.correct ? `<div>Correct: ${rawData.correct}</div>` : ''}
            ${rawData.incorrect ? `<div>Incorrect: ${rawData.incorrect}</div>` : ''}
          `;
          break;
        default:
          details = `
            <div>Average: ${monthData.average?.toFixed(1)}</div>
            <div>Min: ${monthData.min}</div>
            <div>Max: ${monthData.max}</div>
          `;
      }

      return `<div class="custom-tooltip">
        <div><strong>${monthData.monthName}</strong></div>
        ${details}
        <div>Sessions: ${monthData.sessionCount}</div>
      </div>`;
    };

    const yAxisConfig = getYAxisConfig();

    return {
      series: [
        {
          name: dataType === 'percentage' ? 'Percentage' : 
                dataType === 'task_analysis' ? 'Completion Rate' :
                dataType === 'trials_opportunities' ? 'Correct Trials' : 'Average Performance',
          data: values,
        },
      ],
      options: {
        chart: {
          id: `target-performance-chart`,
          type: "area",
          height: 380,
          toolbar: { show: false },
          zoom: { enabled: false },
          animations: { enabled: true, speed: 800 },
        },
        dataLabels: { 
          enabled: false,
        },
        stroke: { curve: "smooth", width: 2.5, colors: ["#3b82f6"] },
        fill: {
          type: "gradient",
          gradient: {
            shadeIntensity: 0.9,
            opacityFrom: 0.5,
            opacityTo: 0.1,
            stops: [0, 90, 100],
          },
        },
        markers: {
          size: 4,
          colors: ["#3b82f6"],
          strokeColors: "#fff",
          strokeWidth: 2,
          hover: { size: 6 }
        },
        xaxis: {
          categories: labels,
          labels: { 
            style: { colors: "#64748b", fontSize: "13px" },
            rotate: 0,
          },
          axisBorder: { show: false },
          axisTicks: { show: false },
          title: { text: "Month", style: { fontSize: '13px', color: '#64748b' } }
        },
        yaxis: {
          ...yAxisConfig,
          labels: { 
            style: { colors: "#64748b", fontSize: "13px" },
            formatter: (val) => {
              if (dataType === 'percentage' || dataType === 'task_analysis') {
                return Math.round(val) + '%';
              }
              return Math.round(val);
            }
          },
        },
        grid: {
          borderColor: "#e2e8f0",
          strokeDashArray: 4,
          yaxis: { lines: { show: true } },
          xaxis: { lines: { show: false } },
        },
        tooltip: { 
          y: { 
            formatter: (val, { dataPointIndex }) => {
              const monthData = monthlyData[dataPointIndex];
              return formatTooltipValue(val, monthData);
            }
          },
          custom: ({ series, seriesIndex, dataPointIndex, w }) => {
            const monthData = monthlyData[dataPointIndex];
            return getCustomTooltip(monthData);
          }
        },
        colors: ["#3b82f6"],
        noData: {
          text: "No data available",
          align: 'center',
          verticalAlign: 'middle',
          style: { color: "#64748b", fontSize: '14px' }
        }
      },
    };
  };

  const closeModal = () => {
    setPerformanceModal({
      isOpen: false,
      targetId: null,
      targetName: "",
      programName: "",
      dataCollectionType: "",
      performanceData: null,
      loading: false,
      error: null,
    });
  };

  const handleSearch = (term) => setSearchTerm(term);

  // Filter programs based on search term
  const filteredPrograms = programs.filter((program) => {
    if (!searchTerm) return true;

    const searchTermLower = searchTerm.toLowerCase();
    const programName = program.programName || "";
    const description = program.description || "";

    return (
      programName.toLowerCase().includes(searchTermLower) ||
      description.toLowerCase().includes(searchTermLower)
    );
  });

  return (
    <DashboardLayout>
      <div className="programs-container">
        <div className="programs-header">
          <div className="programs-subtitle">
            <h1 className="programs-title">Programs</h1>
          </div>
          <div>
            <p>See your program and treatment information here</p>
          </div>
        </div>

        {loadingPrograms ? (
          <div className="loading-state">Loading programs...</div>
        ) : programsError ? (
          <div className="error-state">{programsError}</div>
        ) : (
          <ReusableTable
            title=""
            subtitle=""
            tabs={[]}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            columns={columns}
            data={filteredPrograms}
            searchPlaceholder="Search programs..."
            onSearch={handleSearch}
            showFilters={false}
            showViewToggle={false}
            emptyState={{
              icon: null,
              title: searchTerm
                ? "No matching programs found"
                : "No programs found",
              subtitle: searchTerm
                ? "Try a different search term"
                : "Get started by creating your first program",
            }}
            actions={actions}
            renderExpandedRow={renderExpandedRow}
            pagination={{
              currentPage,
              totalPages: Math.ceil(filteredPrograms.length / 10) || 1,
            }}
            onPageChange={setCurrentPage}
          />
        )}

        {/* Performance Modal */}
        <TargetPerformanceModal
          modalState={performanceModal}
          onClose={closeModal}
        />
      </div>
    </DashboardLayout>
  );
};

const TargetPerformanceModal = ({ modalState, onClose }) => {
  const { isOpen, targetName, programName, dataCollectionType, performanceData, loading, error } =
    modalState;

  if (!isOpen) return null;

  return (
    <div className="target-performance-modal-overlay-unique">
      <div className="target-performance-modal-unique">
        <div className="modal-header-unique">
          <div>
            <h2 className="modal-title-unique">{targetName || "Target"}</h2>
            <p className="modal-subtitle-unique">
              Program: {programName || "Program"} • {dataCollectionType || "Data Collection"}
            </p>
          </div>
          <div className="modal-period-selector-unique">
            <select defaultValue="all">
              <option value="all">All time</option>
              <option value="ytd">Year to date</option>
              <option value="30d">Last 30 days</option>
              <option value="custom">Custom</option>
            </select>
          </div>
        </div>

        <div className="modal-chart-container-unique">
          {loading ? (
            <div className="chart-loading">Loading performance data...</div>
          ) : error ? (
            <ErrorFallback message="Something went wrong loading performance data. Please try again." />
          ) : performanceData ? (
            <div className="chart-wrapper">
              <Chart
                options={performanceData.options}
                series={performanceData.series}
                type="area"
                height={380}
                width="100%"
              />
            </div>
          ) : (
            <div className="chart-empty">
              No performance data available for this target
            </div>
          )}
        </div>

        <div className="modal-footer-unique">
          <Button label="Cancel" variant="secondary" onClick={onClose} />
          <Button label="Close" variant="primary" onClick={onClose} />
        </div>
      </div>
    </div>
  );
};

export default Programs;