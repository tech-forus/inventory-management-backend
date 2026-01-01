import api from '../utils/api';
import { cachedGet, invalidateCachePrefix } from '../utils/cachedApi';

export const skuService = {
  getAll: async (params?: {
    search?: string;
    productCategory?: string;
    itemCategory?: string;
    subCategory?: string;
    brand?: string;
    stockStatus?: string;
    page?: number;
    limit?: number;
    dateFrom?: string;
    dateTo?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) => {
    return await cachedGet('/skus', { params }, { ttlMs: 60 * 1000 });
  },
  getById: async (id: string | number) => {
    return await cachedGet(`/skus/${id}`, undefined, { ttlMs: 5 * 60 * 1000, key: `sku:detail:${id}` });
  },
  create: async (data: any) => {
    const response = await api.post('/skus', data);
    invalidateCachePrefix('GET:/skus');
    invalidateCachePrefix('sku:');
    return response.data;
  },
  update: async (id: string | number, data: any) => {
    const response = await api.put(`/skus/${id}`, data);
    invalidateCachePrefix('GET:/skus');
    invalidateCachePrefix('sku:');
    return response.data;
  },
  delete: async (id: string | number) => {
    const response = await api.delete(`/skus/${id}`);
    invalidateCachePrefix('GET:/skus');
    invalidateCachePrefix('sku:');
    return response.data;
  },
  getMostSelling: async (params?: { period?: number; sortBy?: string }) => {
    return await cachedGet('/skus/analytics/top-selling', { params }, { ttlMs: 60 * 1000 });
  },
  getSlowMoving: async (params?: { period?: number; threshold?: number }) => {
    return await cachedGet('/skus/analytics/slow-moving', { params }, { ttlMs: 60 * 1000 });
  },
  getNonMovable: async (params?: { period?: number }) => {
    return await cachedGet('/skus/analytics/non-movable', { params }, { ttlMs: 60 * 1000 });
  },
  upload: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/skus/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    invalidateCachePrefix('GET:/skus');
    invalidateCachePrefix('sku:');
    return response.data;
  },
};

