import React from 'react';
import { X } from 'lucide-react';
import { formatNumber } from '../../../../utils/formatters';
import { RejectedItemReport } from '../types';

interface HistoryModalProps {
  report: RejectedItemReport;
  onClose: () => void;
}

const HistoryModal: React.FC<HistoryModalProps> = ({ report, onClose }) => {
  const netRejected = report.netRejected !== undefined 
    ? report.netRejected 
    : (report.quantity - (report.sentToVendor || 0) - (report.receivedBack || 0) - (report.scrapped || 0));

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4"
      style={{ 
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Transaction History</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm">
            <p><span className="font-medium">Report:</span> {report.reportNumber}</p>
            <p><span className="font-medium">Item:</span> {report.itemName}</p>
            <p><span className="font-medium">Rejected Qty:</span> {formatNumber(report.quantity)}</p>
          </div>
          <div className="space-y-2">
            <div className="p-3 border border-gray-200 rounded-lg">
              <p className="text-sm"><span className="font-medium">Sent to Vendor:</span> {formatNumber(report.sentToVendor || 0)}</p>
            </div>
            <div className="p-3 border border-gray-200 rounded-lg">
              <p className="text-sm"><span className="font-medium">Received Back:</span> {formatNumber(report.receivedBack || 0)}</p>
            </div>
            <div className="p-3 border border-gray-200 rounded-lg">
              <p className="text-sm"><span className="font-medium">Scrapped:</span> {formatNumber(report.scrapped || 0)}</p>
            </div>
            <div className="p-3 border border-gray-200 rounded-lg">
              <p className="text-sm"><span className="font-medium">Net Rejected:</span> {formatNumber(netRejected)}</p>
            </div>
          </div>
          <div className="flex justify-end mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HistoryModal;

