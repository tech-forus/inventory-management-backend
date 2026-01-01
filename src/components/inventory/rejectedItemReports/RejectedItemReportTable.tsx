import React from 'react';
import { formatNumber, formatDate } from '../../../utils/formatters';
import { RejectedItemReport } from './types';
import RejectedItemReportActions from './RejectedItemReportActions';
import StatusBadge from './StatusBadge';

interface RejectedItemReportTableProps {
  reports: RejectedItemReport[];
  loading: boolean;
  openDropdownId: number | null;
  dropdownRefs: React.MutableRefObject<{ [key: number]: HTMLDivElement | null }>;
  onToggleDropdown: (id: number) => void;
  onSendToVendor: (report: RejectedItemReport) => void;
  onReceiveFromVendor: (report: RejectedItemReport) => void;
  onScrap: (report: RejectedItemReport) => void;
  onViewHistory: (report: RejectedItemReport) => void;
}

const RejectedItemReportTable: React.FC<RejectedItemReportTableProps> = ({
  reports,
  loading,
  openDropdownId,
  dropdownRefs,
  onToggleDropdown,
  onSendToVendor,
  onReceiveFromVendor,
  onScrap,
  onViewHistory,
}) => {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-12 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading rejected item reports...</p>
        </div>
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-12 text-center">
          <p className="text-gray-600">No rejected item reports found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Report No.
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Inspection Date
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                SKU
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Item
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Reason
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rejected Qty
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Sent to Vendor
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Received Back
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Scrapped
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Net Rejected
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {reports.map((report) => {
              const sentToVendor = report.sentToVendor || 0;
              const receivedBack = report.receivedBack || 0;
              const scrapped = report.scrapped || 0;
              const netRejected = report.netRejected !== undefined 
                ? report.netRejected 
                : (report.quantity - sentToVendor - receivedBack - scrapped);
              
              return (
                <tr key={report.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-center">
                    {report.reportNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                    {formatDate(report.inspectionDate)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-center">
                    {report.skuCode || `SKU-${report.skuId}`}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate text-center">
                    {report.itemName}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700 text-center max-w-xs truncate">
                    {report.reason || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 text-center font-bold">
                    {formatNumber(report.quantity)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                    {formatNumber(sentToVendor)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                    {formatNumber(receivedBack)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                    {formatNumber(scrapped)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 text-center font-bold">
                    {formatNumber(netRejected)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <StatusBadge report={report} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <RejectedItemReportActions
                      report={report}
                      isOpen={openDropdownId === report.id}
                      onToggle={() => onToggleDropdown(report.id)}
                      onSendToVendor={onSendToVendor}
                      onReceiveFromVendor={onReceiveFromVendor}
                      onScrap={onScrap}
                      onViewHistory={onViewHistory}
                      dropdownRef={(el) => { dropdownRefs.current[report.id] = el; }}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RejectedItemReportTable;

