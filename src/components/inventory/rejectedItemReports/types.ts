export interface RejectedItemReport {
  id: number;
  reportNumber: string;
  originalInvoiceNumber: string;
  inspectionDate: string;
  skuId: number;
  skuCode: string;
  itemName: string;
  reason?: string | null;
  quantity: number;
  sentToVendor?: number;
  receivedBack?: number;
  scrapped?: number;
  netRejected?: number;
  status: string;
  createdAt: string;
  vendorId?: string | null;
  brandId?: string | null;
}

export interface ActionFormData {
  quantity: number;
  remarks: string;
  vendorId: string;
  brandId: string;
  date: string;
  docketTracking: string;
  transporter: string;
  reason: string;
  condition: 'replaced' | 'repaired' | 'as-is';
  invoiceChallan: string;
  addToStock: boolean;
  scrapReason: 'beyond-repair' | 'not-worth-return' | 'expired-obsolete' | 'other';
  scrapReasonOther: string;
  approvedBy: string;
  unitPrice?: number;
  shortItem?: number;
}

