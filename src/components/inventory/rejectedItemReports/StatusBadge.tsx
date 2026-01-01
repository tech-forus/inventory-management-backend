import React from 'react';
import { calculateStatus } from './statusUtils';
import { RejectedItemReport } from './types';

interface StatusBadgeProps {
  report: RejectedItemReport;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ report }) => {
  const statusInfo = calculateStatus(report);

  return (
    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusInfo.color}`}>
      {statusInfo.status}
    </span>
  );
};

export default StatusBadge;

