export interface InventoryItem {
  id: number;
  skuId: string;
  productCategory: string;
  itemCategory: string;
  subCategory?: string;
  itemName: string;
  itemDetails?: string;
  vendorItemCode?: string;
  ratingSize?: string;
  model?: string;
  series?: string;
  hsnSacCode?: string;
  brand: string;
  vendor: string;
  unit: string;
  currentStock: number;
  minStock: number;
  minStockLevel?: number;
  lastMovementDate?: string;
  lastUpdated: string;
  // Optional specs
  material?: string;
  insulation?: string;
  inputSupply?: string;
  color?: string;
  cri?: string;
  cct?: string;
  beamAngle?: string;
  ledType?: string;
  shape?: string;
  weight?: number;
  length?: number;
  width?: number;
  height?: number;
}

export interface IncomingInventoryRecord {
  rejected: number;
  id: number;
  invoiceDate: string;
  invoiceNumber: string;
  vendorName: string;
  brandName: string;
  receivingDate: string;
  receivedByName?: string;
  status: string;
  totalValue: number;
  totalQuantity: number;
  received: number;
  short: number;
  createdAt: string;
}

export interface IncomingInventoryItem {
  itemId?: number;
  item_id?: number;
  id?: number;
  skuId?: number;
  sku_id?: number;
  skuCode?: string;
  sku_code?: string;
  itemName?: string;
  item_name?: string;
  received?: number;
  short?: number;
  rejected?: number;
  totalQuantity?: number;
  total_quantity?: number;
  challanNumber?: string;
  challan_number?: string;
  challanDate?: string;
  challan_date?: string;
  unitPrice?: number;
  unit_price?: number;
  totalValue?: number;
  total_value?: number;
}

export interface OutgoingInventoryRecord {
  id: number;
  documentType: string;
  documentSubType?: string;
  vendorSubType?: string;
  deliveryChallanSubType?: string;
  invoiceChallanDate: string;
  invoiceChallanNumber?: string;
  docketNumber?: string;
  transportorName?: string;
  destinationType: string;
  destinationId?: number;
  destinationName?: string;
  dispatchedBy?: number;
  dispatchedByName?: string;
  remarks?: string;
  status: string;
  totalValue: number;
  totalQuantity: number;
  createdAt: string;
}

export interface OutgoingInventoryItem {
  id?: number;
  skuId?: number;
  sku_id?: number;
  skuCode?: string;
  sku_code?: string;
  itemName?: string;
  item_name?: string;
  outgoingQuantity?: number;
  outgoing_quantity?: number;
  rejectedQuantity?: number;
  rejected_quantity?: number;
  unitPrice?: number;
  unit_price?: number;
  totalValue?: number;
  total_value?: number;
}

