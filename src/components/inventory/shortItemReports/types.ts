export interface ShortItemReport {
  id: number;
  incomingInventoryId: number;
  incomingInventoryItemId: number;
  invoiceNumber: string;
  invoiceReceivedDate: string;
  skuId: number;
  skuCode: string;
  itemName: string;
  shortQuantity: number;
  receivedBack?: number;
  netRejected?: number;
  status: string;
  createdAt: string;
  vendorId?: string | null;
  brandId?: string | null;
}

export interface ShortItemActionFormData {
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
  receivedBy?: string;
}




