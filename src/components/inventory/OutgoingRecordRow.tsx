import React from 'react';
import { ChevronDown, ChevronUp, Eye, Download } from 'lucide-react';
import { formatNumber, formatDate, formatCurrency } from '../../utils/formatters';
import { OutgoingInventoryRecord, OutgoingInventoryItem } from './types';

interface OutgoingRecordRowProps {
  record: OutgoingInventoryRecord;
  item: OutgoingInventoryItem;
  itemKey: string;
  isExpanded: boolean;
  onToggle: () => void;
  onViewDetails?: () => void;
  onDownloadInvoice?: () => void;
  downloading?: boolean;
}

const OutgoingRecordRow: React.FC<OutgoingRecordRowProps> = ({
  record,
  item,
  itemKey,
  isExpanded,
  onToggle,
  onViewDetails,
  onDownloadInvoice,
  downloading = false,
}) => {
  const itemName = item.itemName || item.item_name || 'N/A';
  const skuCode = item.skuCode || item.sku_code || String(item.skuId || item.sku_id || '-');
  const outgoingQty = item.outgoingQuantity || item.outgoing_quantity || 0;
  const rejectedQty = item.rejectedQuantity || item.rejected_quantity || 0;
  const unitPrice = item.unitPrice || item.unit_price || 0;
  const totalValue = item.totalValue || item.total_value || 0;

  const getDocumentTypeLabel = () => {
    let label = '';
    if (record.documentType === 'sales_invoice') {
      label = 'Sales Invoice';
      if (record.documentSubType === 'to_customer') label += ' - To Customer';
      if (record.documentSubType === 'to_vendor') {
        label += ' - To Vendor';
        if (record.vendorSubType === 'replacement') label += ' (Replacement)';
        if (record.vendorSubType === 'rejected') label += ' (Rejected)';
      }
    } else if (record.documentType === 'delivery_challan') {
      label = 'Delivery Challan';
      if (record.documentSubType === 'sample') label += ' - Sample';
      if (record.documentSubType === 'replacement') {
        label += ' - Replacement';
        if (record.deliveryChallanSubType === 'to_customer') label += ' (To Customer)';
        if (record.deliveryChallanSubType === 'to_vendor') label += ' (To Vendor)';
      }
    } else if (record.documentType === 'transfer_note') {
      label = 'Transfer Note';
    } else {
      label = record.documentType?.replace(/_/g, ' ') || '-';
    }
    return label;
  };

  return (
    <>
      <tr className="group hover:bg-slate-50/40 transition-all min-h-[56px]">
        <td className="px-[30px] py-6 text-center">
          <button
            onClick={onToggle}
            className="text-slate-400 hover:text-indigo-600 transition-colors"
          >
            {isExpanded ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </button>
        </td>
        <td className="px-[30px] py-6 text-center">
          <span className="text-[11.7px] font-medium leading-[1.4] text-slate-900">{record.invoiceChallanNumber || record.docketNumber || '-'}</span>
        </td>
        <td className="px-[30px] py-6 text-center">
          <span className="text-[11.7px] font-normal leading-[1.4] text-slate-500">
            {record.invoiceChallanDate ? formatDate(record.invoiceChallanDate) : '-'}
          </span>
        </td>
        <td className="px-[30px] py-6 text-center">
          <span className="text-[11.7px] font-normal leading-[1.4] text-slate-500 capitalize">
            {getDocumentTypeLabel()}
          </span>
        </td>
        <td className="px-[30px] py-6 text-center">
          <span className="text-[12.6px] font-semibold leading-[1.4] text-slate-900 block group-hover:text-indigo-600 transition-colors">
            {itemName}
          </span>
        </td>
        <td className="px-[30px] py-6 text-center">
          <span className="inline-block text-[11.7px] font-normal leading-[1.4] text-indigo-600 bg-indigo-50/50 px-3 py-[6px] rounded-xl border border-indigo-100/50">
            {skuCode}
          </span>
        </td>
        <td className="px-[30px] py-6 text-center">
          <span className="text-[11.7px] font-normal leading-[1.4] text-slate-500">{record.destinationName || '-'}</span>
        </td>
        <td className="px-[30px] py-6 text-center">
          <span className="text-[13.5px] font-semibold leading-[1.3] text-slate-900">
            {formatNumber(outgoingQty)}
          </span>
        </td>
        <td className="px-[30px] py-6 text-center">
          <span className="text-[13.5px] font-semibold leading-[1.3] text-slate-900">
            {formatCurrency(totalValue)}
          </span>
        </td>
        <td className="px-[30px] py-6 text-center">
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={onViewDetails}
              className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-50"
              title="View Details"
              disabled={!onViewDetails}
            >
              <Eye className="w-4 h-4" />
            </button>
            <button
              onClick={onDownloadInvoice}
              className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Download Invoice"
              disabled={!onDownloadInvoice || downloading}
            >
              <Download className={`w-4 h-4 ${downloading ? 'animate-pulse' : ''}`} />
            </button>
          </div>
        </td>
      </tr>
      {isExpanded && (
        <tr className="bg-slate-50/30">
          <td colSpan={10} className="px-[30px] py-[18px]">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Docket Number:</span>
                <p className="text-[10.5px] text-slate-900 mt-1 font-medium">{record.docketNumber || '-'}</p>
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Transportor:</span>
                <p className="text-[10.5px] text-slate-900 mt-1 font-medium">{record.transportorName || '-'}</p>
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Dispatched By:</span>
                <p className="text-[10.5px] text-slate-900 mt-1 font-medium">{record.dispatchedByName || '-'}</p>
              </div>
              <div>
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Unit Price:</span>
                <p className="text-[10.5px] text-slate-900 mt-1 font-medium">{formatCurrency(unitPrice)}</p>
              </div>
              {rejectedQty > 0 && (
                <div>
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Rejected Quantity:</span>
                  <p className="text-[10.5px] text-rose-600 mt-1 font-semibold">{formatNumber(rejectedQty)}</p>
                </div>
              )}
              {record.remarks && (
                <div className="md:col-span-2">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wide">Remarks:</span>
                  <p className="text-[10.5px] text-slate-900 mt-1 font-medium">{record.remarks}</p>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

export default OutgoingRecordRow;

