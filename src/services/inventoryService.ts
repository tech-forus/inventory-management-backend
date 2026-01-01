import api from '../utils/api';
import { cachedGet, invalidateCachePrefix } from '../utils/cachedApi';
import { emitInventoryUpdated } from '../utils/inventoryEvents';

export const inventoryService = {
  getAll: async (params?: {
    search?: string;
    productCategory?: string;
    itemCategory?: string;
    subCategory?: string;
    brand?: string;
    stockStatus?: string;
    dateFrom?: string;
    dateTo?: string;
  }) => {
    return await cachedGet('/inventory', { params }, { ttlMs: 60 * 1000 });
  },
  getIncoming: async (params?: {
    dateFrom?: string;
    dateTo?: string;
    vendor?: string;
    status?: string;
  }) => {
    return await cachedGet('/inventory/incoming', { params }, { ttlMs: 60 * 1000 });
  },
  getIncomingById: async (id: number) => {
    return await cachedGet(`/inventory/incoming/${id}`, undefined, { ttlMs: 5 * 60 * 1000 });
  },
  getIncomingHistory: async (params?: {
    dateFrom?: string;
    dateTo?: string;
    vendor?: string;
    sku?: string;
  }) => {
    return await cachedGet('/inventory/incoming/history', { params }, { ttlMs: 60 * 1000 });
  },
  addIncoming: async (data: any) => {
    const response = await api.post('/inventory/incoming', data);
    invalidateCachePrefix('GET:/inventory');
    invalidateCachePrefix('GET:/skus');
    invalidateCachePrefix('sku:');
    emitInventoryUpdated();
    return response.data;
  },
  getOutgoingHistory: async (params?: {
    dateFrom?: string;
    dateTo?: string;
    destination?: string;
    sku?: string;
    status?: string;
    id?: number;
  }) => {
    return await cachedGet('/inventory/outgoing/history', { params }, { ttlMs: 60 * 1000 });
  },
  getOutgoing: async (params?: {
    dateFrom?: string;
    dateTo?: string;
    destination?: string;
    status?: string;
  }) => {
    return await cachedGet('/inventory/outgoing', { params }, { ttlMs: 60 * 1000 });
  },
  getOutgoingById: async (id: number) => {
    return await cachedGet(`/inventory/outgoing/${id}`, undefined, { ttlMs: 5 * 60 * 1000 });
  },
  getOutgoingItems: async (id: number) => {
    return await cachedGet(`/inventory/outgoing/${id}`, undefined, { ttlMs: 5 * 60 * 1000 });
  },
  addOutgoing: async (data: any) => {
    const response = await api.post('/inventory/outgoing', data);
    invalidateCachePrefix('GET:/inventory');
    invalidateCachePrefix('GET:/skus');
    invalidateCachePrefix('sku:');
    emitInventoryUpdated();
    return response.data;
  },
  getIncomingItems: async (id: number) => {
    return await cachedGet(`/inventory/incoming/${id}/items`, undefined, { ttlMs: 5 * 60 * 1000 });
  },
  moveReceivedToRejected: async (id: number, itemId: number, quantity?: number, inspectionDate?: string, reason?: string) => {
    const response = await api.post(`/inventory/incoming/${id}/move-received-to-rejected`, { itemId, quantity, inspectionDate, reason });
    
    // Check for warnings (report creation failures)
    if (response.data?.warning) {
      console.warn('[inventoryService] Warning from backend:', response.data.warning);
    }
    
    // Invalidate all related caches - do this BEFORE emitting event
    invalidateCachePrefix('GET:/inventory');
    invalidateCachePrefix('GET:/skus');
    invalidateCachePrefix('GET:/inventory/rejected-item-reports');
    invalidateCachePrefix('sku:');
    
    // Add a small delay to ensure backend transaction is committed
    // This prevents race condition where page queries before report is visible
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Emit event to notify all pages AFTER cache invalidation and delay
    emitInventoryUpdated();
    return response.data;
  },
  moveShortToRejected: async (id: number, itemId: number, quantity?: number) => {
    const response = await api.post(`/inventory/incoming/${id}/move-to-rejected`, { itemId, quantity });
    invalidateCachePrefix('GET:/inventory');
    invalidateCachePrefix('GET:/skus');
    invalidateCachePrefix('GET:/inventory/rejected-item-reports');
    invalidateCachePrefix('sku:');
    emitInventoryUpdated();
    return response.data;
  },
  updateShortItem: async (id: number, data: { itemId: number; received?: number; short?: number; challanNumber?: string; challanDate?: string }) => {
    const response = await api.put(`/inventory/incoming/${id}/update-short-item`, data);
    invalidateCachePrefix('GET:/inventory');
    invalidateCachePrefix('GET:/skus');
    invalidateCachePrefix('GET:/inventory/short-item-reports');
    invalidateCachePrefix('sku:');
    emitInventoryUpdated();
    return response.data;
  },
  updateRejectedShort: async (id: number, data: { itemId: number; rejected?: number; short?: number; invoiceNumber?: string; invoiceDate?: string }) => {
    // Use the new endpoint that supports both rejected and short
    const updateData: any = {
      itemId: data.itemId,
    };
    
    if (data.rejected !== undefined) {
      updateData.rejected = data.rejected;
    }
    
    if (data.short !== undefined) {
      updateData.short = data.short;
    }
    
    const response = await api.put(`/inventory/incoming/${id}/update-item-rejected-short`, updateData);
    invalidateCachePrefix('GET:/inventory');
    invalidateCachePrefix('GET:/skus');
    invalidateCachePrefix('GET:/inventory/rejected-item-reports');
    invalidateCachePrefix('GET:/inventory/short-item-reports');
    invalidateCachePrefix('sku:');
    emitInventoryUpdated();
    return response.data;
  },
  updateRecordLevelRejectedShort: async (id: number, data: { rejected?: number; short?: number }) => {
    const response = await api.put(`/inventory/incoming/${id}/update-record-level`, data);
    invalidateCachePrefix('GET:/inventory');
    return response.data;
  },
  getRejectedItems: async (params?: {
    dateFrom?: string;
    dateTo?: string;
    vendor?: string;
    brand?: string;
    sku?: string;
    limit?: number;
    offset?: number;
  }) => {
    return await cachedGet('/inventory/incoming/rejected-items', { params }, { ttlMs: 60 * 1000 });
  },
  getPriceHistory: async (skuId: string) => {
    return await cachedGet('/inventory/incoming/price-history', { params: { skuId } }, { ttlMs: 10 * 60 * 1000 });
  },
  hasPriceHistory: async (skuId: string) => {
    return await cachedGet('/inventory/incoming/has-price-history', { params: { skuId } }, { ttlMs: 10 * 60 * 1000 });
  },
  getRejectedItemReports: async (params?: {
    dateFrom?: string;
    dateTo?: string;
    search?: string;
    limit?: number;
    offset?: number;
    _t?: number; // timestamp for cache busting
  }) => {
    // Remove _t from params before sending to API (it's only for cache busting)
    const { _t, ...apiParams } = params || {};
    return await cachedGet('/inventory/rejected-item-reports', { params: apiParams }, { ttlMs: 60 * 1000 });
  },
  getRejectedItemReportById: async (id: number) => {
    return await cachedGet(`/inventory/rejected-item-reports/${id}`, undefined, { ttlMs: 5 * 60 * 1000 });
  },
  createRejectedItemReport: async (data: {
    incomingInventoryId: number;
    incomingInventoryItemId: number;
    skuId: number;
    itemName: string;
    quantity: number;
    inspectionDate?: string;
  }) => {
    const response = await api.post('/inventory/rejected-item-reports', data);
    invalidateCachePrefix('GET:/inventory/rejected-item-reports');
    return response.data;
  },
  updateRejectedItemReport: async (id: number, data: {
    sentToVendor?: number;
    receivedBack?: number;
    scrapped?: number;
    netRejected?: number;
    status?: string;
    inspectionDate?: string;
  }) => {
    const response = await api.put(`/inventory/rejected-item-reports/${id}`, data);
    invalidateCachePrefix('GET:/inventory/rejected-item-reports');
    return response.data;
  },
  deleteRejectedItemReport: async (id: number) => {
    const response = await api.delete(`/inventory/rejected-item-reports/${id}`);
    invalidateCachePrefix('GET:/inventory/rejected-item-reports');
    return response.data;
  },
  getShortItemReports: async (params?: {
    dateFrom?: string;
    dateTo?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }) => {
    return await cachedGet('/inventory/short-item-reports', { params }, { ttlMs: 60 * 1000 });
  },
};

