import React from 'react';
import { formatNumber, formatDate } from '../../../utils/formatters';
import { ShortItemReport } from './types';
import ShortItemReportActions from './ShortItemReportActions';

interface ShortItemReportTableProps {
  reports: ShortItemReport[];
  loading: boolean;
  openDropdownId: number | null;
  dropdownRefs: React.MutableRefObject<{ [key: number]: HTMLDivElement | null }>;
  onToggleDropdown: (id: number) => void;
  onReceiveBack: (report: ShortItemReport) => void;
  onViewHistory: (report: ShortItemReport) => void;
}

const ShortItemReportTable: React.FC<ShortItemReportTableProps> = ({
  reports,
  loading,
  openDropdownId,
  dropdownRefs,
  onToggleDropdown,
  onReceiveBack,
  onViewHistory,
}) => {
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-12 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading short item reports...</p>
        </div>
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-12 text-center">
          <p className="text-gray-600">No short item reports found</p>
        </div>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const statusLower = status?.toLowerCase() || 'pending';
    const statusConfig: { [key: string]: { bg: string; text: string } } = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800' },
      'received-back': { bg: 'bg-green-100', text: 'text-green-800' },
      'partially-received': { bg: 'bg-blue-100', text: 'text-blue-800' },
      closed: { bg: 'bg-gray-100', text: 'text-gray-800' },
    };

    const config = statusConfig[statusLower] || statusConfig.pending;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {status.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Invoice Number
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Invoice Received Date
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                SKU Number
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Item Name
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Short Quantity
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Received Back
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
              const receivedBack = report.receivedBack || 0;
              const netRejected = report.netRejected !== undefined 
                ? report.netRejected 
                : (report.shortQuantity - receivedBack);
              
              return (
                <tr key={report.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-center">
                    {report.invoiceNumber}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                    {formatDate(report.invoiceReceivedDate)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-center">
                    {report.skuCode || `SKU-${report.skuId}`}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 max-w-xs truncate text-center">
                    {report.itemName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-orange-600 text-center font-bold">
                    {formatNumber(report.shortQuantity)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-center">
                    {formatNumber(receivedBack)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-orange-600 text-center font-bold">
                    {formatNumber(netRejected)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    {getStatusBadge(report.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center">
                    <ShortItemReportActions
                      report={report}
                      isOpen={openDropdownId === report.id}
                      onToggle={() => onToggleDropdown(report.id)}
                      onReceiveBack={onReceiveBack}
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

export default ShortItemReportTable;




