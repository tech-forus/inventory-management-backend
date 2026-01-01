import { RejectedItemReport } from './types';

export type ReportStatus = 
  | 'Pending' 
  | 'In Progress' 
  | 'Sent to Vendor' 
  | 'Partially Returned' 
  | 'Completed' 
  | 'Received'
  | 'Scrapped';

export interface StatusInfo {
  status: ReportStatus;
  color: string;
  description: string;
}

/**
 * Calculate the status of a rejected item report based on its quantities
 */
export const calculateStatus = (report: RejectedItemReport): StatusInfo => {
  const quantity = report.quantity || 0;
  const sentToVendor = report.sentToVendor || 0;
  const receivedBack = report.receivedBack || 0;
  const scrapped = report.scrapped || 0;
  const totalProcessed = sentToVendor + receivedBack + scrapped;

  // Edge case: No quantity
  if (quantity === 0) {
    return {
      status: 'Pending',
      color: 'bg-yellow-100 text-yellow-800',
      description: 'No action taken yet on rejected items',
    };
  }

  // All scrapped (and nothing sent or received)
  if (scrapped === quantity && sentToVendor === 0 && receivedBack === 0) {
    return {
      status: 'Scrapped',
      color: 'bg-gray-100 text-gray-800',
      description: 'All rejected items have been scrapped/written off',
    };
  }

  // All sent to vendor (and nothing received back or scrapped)
  if (sentToVendor === quantity && receivedBack === 0 && scrapped === 0) {
    return {
      status: 'Sent to Vendor',
      color: 'bg-purple-100 text-purple-800',
      description: 'All rejected items have been sent back to vendor, awaiting return',
    };
  }

  // All items received back - all rejected items have been received back
  // This is the highest priority check: if all items are received back, status is "Received"
  if (receivedBack === quantity && scrapped === 0) {
    return {
      status: 'Received',
      color: 'bg-green-100 text-green-800',
      description: 'All rejected items received back and added to stock',
    };
  }

  // All sent items received back (completed) - all sent items have been received
  // This means: we sent items to vendor, and we received all of them back
  if (sentToVendor > 0 && receivedBack === sentToVendor && scrapped === 0) {
    return {
      status: 'Completed',
      color: 'bg-green-100 text-green-800',
      description: 'All sent items received back and added to stock',
    };
  }

  // Partially returned (some but not all sent items received)
  if (sentToVendor > 0 && receivedBack > 0 && receivedBack < sentToVendor) {
    return {
      status: 'Partially Returned',
      color: 'bg-orange-100 text-orange-800',
      description: 'Some (but not all) sent items have been received back from vendor',
    };
  }

  // In Progress (partial actions taken - some sent OR some scrapped, but not all)
  if (totalProcessed > 0 && totalProcessed < quantity) {
    return {
      status: 'In Progress',
      color: 'bg-blue-100 text-blue-800',
      description: 'Some items sent to vendor OR some scrapped, but not all',
    };
  }

  // Default: Pending (no actions taken)
  return {
    status: 'Pending',
    color: 'bg-yellow-100 text-yellow-800',
    description: 'No action taken yet on rejected items',
  };
};

/**
 * Get status color class for a given status string
 */
export const getStatusColor = (status: string): string => {
  const statusLower = status?.toLowerCase() || '';
  
  switch (statusLower) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'in progress':
      return 'bg-blue-100 text-blue-800';
    case 'sent to vendor':
      return 'bg-purple-100 text-purple-800';
    case 'partially returned':
      return 'bg-orange-100 text-orange-800';
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'received':
      return 'bg-green-100 text-green-800';
    case 'scrapped':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

