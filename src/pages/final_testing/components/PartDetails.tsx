  import React from "react";
  import { Part } from "../types";

  interface PartDetailsProps {
    part: Part;
    index: number;
  }

  const PartDetails: React.FC<PartDetailsProps> = ({ part, index }) => {
    return (
      <div className="mb-4 border border-gray-200 rounded-lg p-4">
        <h2 className="text-lg font-semibold text-gray-700 mb-3 border-b pb-2">
          Part Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-600 mb-1">Part Number</p>
            <p className="font-semibold text-gray-800">{part.partNumber}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Ticket Code</p>
            <p className="font-semibold text-gray-800">{part.ticketCode}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Test Condition</p>
            <p className="font-semibold text-gray-800">{part.testCondition}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Project</p>
            <p className="font-semibold text-gray-800">
              {part.stage1Record?.project}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600 mb-1">Build</p>
            <p className="font-semibold text-gray-800">
              {part.stage1Record?.build}
            </p>
          </div>
        </div>
      </div>
    );
  };

  export default PartDetails;
