// Programs Tab Component

import { useMemo, useRef, useState } from "react";
import Button from "../../../../../Components/Button/Button";
import { FaChevronDown } from "react-icons/fa";
import CustomTable from "../../../../../Components/Table/CustomTable";
import { useNavigate, useParams } from "react-router-dom";

const ProgramsTab = () => {
  const navigate = useNavigate();
  const { clientId } = useParams();
  const [isProgramOpen, setIsProgramOpen] = useState(false);
  const menuRef = useRef(null);
  const triggerRef = useRef(null);


  const Columns = [
    { header: "Program", key: "program", type: "text" },
    { header: "Type", key: "type", type: "text" },
  ];

  const tableData = useMemo(
    () => [
      {
        id: "1",
        program: "Program Name 1",
        type: "Skill Acquisition",
        hasActions: true,
      },
      {
        id: "2",
        program: "Program Name 2",
        type: "Skill Acquisition",
        hasActions: true,
      },
      {
        id: "3",
        program: "Program Name 3",
        type: "Skill Acquisition",
        hasActions: true,
      },
      {
        id: "4",
        program: "Program Name 4",
        type: "Skill Acquisition",
        hasActions: true,
      },
      {
        id: "5",
        program: "Program Name 5",
        type: "Skill Acquisition",
        hasActions: true,
      },
      {
        id: "6",
        program: "Program Name 6",
        type: "Skill Acquisition",
        hasActions: true,
      },
    ],
    []
  );

  const actions = [
    {
      type: "dropdown",
      label: "More",
      items: [
        {
          label: "Edit Program",
          onClick: (row) => navigate(`/client/view-program/${clientId}/target/${row.id}`),
        },

        { label: "Remove Program", onClick: () => {}, className: "remove" },
      ],
      className: "more-dropdown",
    },
  ];
  return (
    <div>
      <div className="client-dropdown-wrapper justify-end flex mt-6">
        <div
          ref={triggerRef}
          onClick={() => setIsProgramOpen((prev) => !prev)}
          style={{ cursor: "pointer" }}
        >
          <Button
            label="New"
            variant="primary"
            icon={<FaChevronDown />}
            iconPosition="right"
          />
        </div>

        {/* Dropdown Menu */}
        {isProgramOpen && (
          <div ref={menuRef} className="client-dropdown-menu w-200">
            <button
              className="client-dropdown-item"
              //   onClick={() => handleItemClick("Add to Onboarding Pipeline")}
            >
              <span>Program from Library</span>
            </button>

            <button
              className="client-dropdown-item"
              //   onClick={() =>
              //     handleItemClick("Import from Onboarding Pipeline")
              //   }
            >
              <span>Custom Program</span>
            </button>
          </div>
        )}
      </div>
      <div>
        <CustomTable
          data={tableData}
          columns={Columns}
          actions={actions}
          filters={[]}
          itemsPerPage={10}
          tableName="Programs"
          showActions={true}
          showCheckbox={false}
        />
      </div>
    </div>
  );
};

export default ProgramsTab;
