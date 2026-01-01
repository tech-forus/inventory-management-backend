import React, { useState } from 'react';
import { Info } from 'lucide-react';

const StatusHeader: React.FC = () => {
  const [showTooltip, setShowTooltip] = useState(false);

  const statusDefinitions = [
    { status: 'Pending', color: 'Yellow', when: 'Initial state', description: 'No action taken yet on rejected items' },
    { status: 'In Progress', color: 'Blue', when: 'Partial actions', description: 'Some items sent to vendor OR some scrapped, but not all' },
    { status: 'Sent to Vendor', color: 'Purple', when: 'All sent', description: 'All rejected items have been sent back to vendor, awaiting return' },
    { status: 'Partially Returned', color: 'Orange', when: 'Partial receive', description: 'Some (but not all) sent items have been received back from vendor' },
    { status: 'Received', color: 'Green', when: 'All received', description: 'All rejected items received back and added to stock' },
    { status: 'Completed', color: 'Green', when: 'Full cycle done', description: 'All sent items received back and added to stock' },
    { status: 'Scrapped', color: 'Gray', when: 'All destroyed', description: 'All rejected items have been scrapped/written off' },
  ];

  return (
    <div className="flex items-center justify-center gap-1.5">
      <span className="uppercase">Status</span>
      <div 
        className="relative"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <Info className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help transition-colors" />
        {showTooltip && (
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-[420px] p-4 bg-gray-900 text-white text-xs rounded-lg shadow-xl z-50 pointer-events-none">
            <div className="font-semibold mb-3 text-sm text-white border-b border-gray-700 pb-2">Status Definitions</div>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {statusDefinitions.map((def, index) => (
                <div key={index} className="border-b border-gray-700 last:border-0 pb-3 last:pb-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded ${
                      def.color === 'Yellow' ? 'bg-yellow-100 text-yellow-800' :
                      def.color === 'Blue' ? 'bg-blue-100 text-blue-800' :
                      def.color === 'Purple' ? 'bg-purple-100 text-purple-800' :
                      def.color === 'Orange' ? 'bg-orange-100 text-orange-800' :
                      def.color === 'Green' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {def.status}
                    </span>
                    <span className="text-gray-400 text-xs">({def.color})</span>
                  </div>
                  <div className="text-gray-300 text-xs mb-1">
                    <span className="font-medium text-gray-200">When Applied:</span> {def.when}
                  </div>
                  <div className="text-gray-300 text-xs leading-relaxed">
                    {def.description}
                  </div>
                </div>
              ))}
            </div>
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full">
              <div className="border-4 border-transparent border-t-gray-900"></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatusHeader;

