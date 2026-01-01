import api from '../utils/api';
import { cachedGet, invalidateCachePrefix } from '../utils/cachedApi';

export const libraryService = {
  // Vendors
  getVendors: async () => {
    return await cachedGet('/library/vendors', undefined, { ttlMs: 10 * 60 * 1000 });
  },
  createVendor: async (data: any) => {
    const response = await api.post('/library/vendors', data);
    invalidateCachePrefix('GET:/library/vendors');
    return response.data;
  },
  updateVendor: async (id: number, data: any) => {
    const response = await api.put(`/library/vendors/${id}`, data);
    invalidateCachePrefix('GET:/library/vendors');
    return response.data;
  },
  deleteVendor: async (id: number) => {
    const response = await api.delete(`/library/vendors/${id}`);
    invalidateCachePrefix('GET:/library/vendors');
    return response.data;
  },
  // Brands
  getBrands: async () => {
    return await cachedGet('/library/brands', undefined, { ttlMs: 10 * 60 * 1000 });
  },
  createBrand: async (data: any) => {
    const response = await api.post('/library/brands', data);
    invalidateCachePrefix('GET:/library/brands');
    return response.data;
  },
  updateBrand: async (id: number, data: any) => {
    const response = await api.put(`/library/brands/${id}`, data);
    invalidateCachePrefix('GET:/library/brands');
    return response.data;
  },
  deleteBrand: async (id: number) => {
    const response = await api.delete(`/library/brands/${id}`);
    invalidateCachePrefix('GET:/library/brands');
    return response.data;
  },
  // Product Categories
  getProductCategories: async () => {
    return await cachedGet('/categories/product', undefined, { ttlMs: 24 * 60 * 60 * 1000 });
  },
  createProductCategory: async (data: any) => {
    const response = await api.post('/categories/product', data);
    invalidateCachePrefix('GET:/categories');
    return response.data;
  },
  updateProductCategory: async (id: number, data: any) => {
    const response = await api.put(`/categories/product/${id}`, data);
    invalidateCachePrefix('GET:/categories');
    return response.data;
  },
  deleteProductCategory: async (id: number) => {
    const response = await api.delete(`/categories/product/${id}`);
    invalidateCachePrefix('GET:/categories');
    return response.data;
  },
  // Item Categories
  getItemCategories: async (productCategoryId?: number) => {
    const params = productCategoryId ? { productCategoryId } : {};
    return await cachedGet('/categories/item', { params }, { ttlMs: 24 * 60 * 60 * 1000 });
  },
  createItemCategory: async (data: any) => {
    const response = await api.post('/categories/item', data);
    invalidateCachePrefix('GET:/categories');
    return response.data;
  },
  updateItemCategory: async (id: number, data: any) => {
    const response = await api.put(`/categories/item/${id}`, data);
    invalidateCachePrefix('GET:/categories');
    return response.data;
  },
  deleteItemCategory: async (id: number) => {
    const response = await api.delete(`/categories/item/${id}`);
    invalidateCachePrefix('GET:/categories');
    return response.data;
  },
  // Sub Categories
  getSubCategories: async (itemCategoryId?: number) => {
    const params = itemCategoryId ? { itemCategoryId } : {};
    return await cachedGet('/categories/sub', { params }, { ttlMs: 24 * 60 * 60 * 1000 });
  },
  createSubCategory: async (data: any) => {
    const response = await api.post('/categories/sub', data);
    invalidateCachePrefix('GET:/categories');
    return response.data;
  },
  updateSubCategory: async (id: number, data: any) => {
    const response = await api.put(`/categories/sub/${id}`, data);
    invalidateCachePrefix('GET:/categories');
    return response.data;
  },
  deleteSubCategory: async (id: number) => {
    const response = await api.delete(`/categories/sub/${id}`);
    invalidateCachePrefix('GET:/categories');
    return response.data;
  },
  // Excel Upload Methods
  uploadVendors: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    // Get companyId from user object
    const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user.companyId) {
        formData.append('companyId', user.companyId);
      }
    }
    const response = await api.post('/library/vendors/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  uploadBrands: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user.companyId) {
        formData.append('companyId', user.companyId);
      }
    }
    const response = await api.post('/library/brands/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    // Invalidate brand cache to ensure fresh data
    invalidateCachePrefix('GET:/yourbrands');
    invalidateCachePrefix('GET:/library/brands');
    return response.data;
  },
  uploadProductCategories: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user.companyId) {
        formData.append('companyId', user.companyId);
      }
    }
    const response = await api.post('/categories/product/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  uploadItemCategories: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user.companyId) {
        formData.append('companyId', user.companyId);
      }
    }
    const response = await api.post('/categories/item/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  uploadSubCategories: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user.companyId) {
        formData.append('companyId', user.companyId);
      }
    }
    const response = await api.post('/categories/sub/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  uploadCategories: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user.companyId) {
        formData.append('companyId', user.companyId);
      }
    }
    const response = await api.post('/categories/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    // Invalidate all category-related caches to ensure fresh data
    invalidateCachePrefix('GET:/yourproductcategories');
    invalidateCachePrefix('GET:/youritemcategories');
    invalidateCachePrefix('GET:/yoursubcategories');
    invalidateCachePrefix('GET:/categories');
    return response.data;
  },
  // New "your" prefixed routes
  getYourVendors: async () => {
    return await cachedGet('/yourvendors', undefined, { ttlMs: 10 * 60 * 1000 });
  },
  createYourVendor: async (data: any) => {
    const response = await api.post('/yourvendors', data);
    invalidateCachePrefix('GET:/yourvendors');
    return response.data;
  },
  updateYourVendor: async (id: number, data: any) => {
    const response = await api.put(`/yourvendors/${id}`, data);
    invalidateCachePrefix('GET:/yourvendors');
    return response.data;
  },
  getYourBrands: async () => {
    return await cachedGet('/yourbrands', undefined, { ttlMs: 10 * 60 * 1000 });
  },
  createYourBrand: async (data: any) => {
    const response = await api.post('/yourbrands', data);
    invalidateCachePrefix('GET:/yourbrands');
    return response.data;
  },
  updateYourBrand: async (id: number, data: any) => {
    const response = await api.put(`/yourbrands/${id}`, data);
    invalidateCachePrefix('GET:/yourbrands');
    return response.data;
  },
  getYourProductCategories: async () => {
    return await cachedGet('/yourproductcategories', undefined, { ttlMs: 24 * 60 * 60 * 1000 });
  },
  createYourProductCategory: async (data: any) => {
    const response = await api.post('/yourproductcategories', data);
    invalidateCachePrefix('GET:/yourproductcategories');
    return response.data;
  },
  getYourItemCategories: async (productCategoryId?: number) => {
    const params = productCategoryId ? { productCategoryId } : {};
    return await cachedGet('/youritemcategories', { params }, { ttlMs: 24 * 60 * 60 * 1000 });
  },
  createYourItemCategory: async (data: any) => {
    const response = await api.post('/youritemcategories', data);
    invalidateCachePrefix('GET:/youritemcategories');
    return response.data;
  },
  getYourSubCategories: async (itemCategoryId?: number) => {
    const params = itemCategoryId ? { itemCategoryId } : {};
    return await cachedGet('/yoursubcategories', { params }, { ttlMs: 24 * 60 * 60 * 1000 });
  },
  createYourSubCategory: async (data: any) => {
    const response = await api.post('/yoursubcategories', data);
    invalidateCachePrefix('GET:/yoursubcategories');
    return response.data;
  },
  updateYourProductCategory: async (id: number, data: any) => {
    const response = await api.put(`/yourproductcategories/${id}`, data);
    invalidateCachePrefix('GET:/yourproductcategories');
    return response.data;
  },
  updateYourItemCategory: async (id: number, data: any) => {
    const response = await api.put(`/youritemcategories/${id}`, data);
    invalidateCachePrefix('GET:/youritemcategories');
    return response.data;
  },
  updateYourSubCategory: async (id: number, data: any) => {
    const response = await api.put(`/yoursubcategories/${id}`, data);
    invalidateCachePrefix('GET:/yoursubcategories');
    return response.data;
  },
  deleteYourVendor: async (id: number) => {
    const response = await api.delete(`/yourvendors/${id}`);
    invalidateCachePrefix('GET:/yourvendors');
    return response.data;
  },
  deleteYourBrand: async (id: number) => {
    const response = await api.delete(`/yourbrands/${id}`);
    invalidateCachePrefix('GET:/yourbrands');
    return response.data;
  },
  deleteYourProductCategory: async (id: number) => {
    const response = await api.delete(`/yourproductcategories/${id}`);
    invalidateCachePrefix('GET:/yourproductcategories');
    return response.data;
  },
  deleteYourItemCategory: async (id: number) => {
    const response = await api.delete(`/youritemcategories/${id}`);
    invalidateCachePrefix('GET:/youritemcategories');
    return response.data;
  },
  deleteYourSubCategory: async (id: number) => {
    const response = await api.delete(`/yoursubcategories/${id}`);
    invalidateCachePrefix('GET:/yoursubcategories');
    return response.data;
  },
  // Teams
  getTeams: async () => {
    return await cachedGet('/library/teams', undefined, { ttlMs: 10 * 60 * 1000 });
  },
  createTeam: async (data: any) => {
    const response = await api.post('/library/teams', data);
    invalidateCachePrefix('GET:/library/teams');
    return response.data;
  },
  updateTeam: async (id: number, data: any) => {
    const response = await api.put(`/library/teams/${id}`, data);
    invalidateCachePrefix('GET:/library/teams');
    return response.data;
  },
  deleteTeam: async (id: number) => {
    const response = await api.delete(`/library/teams/${id}`);
    invalidateCachePrefix('GET:/library/teams');
    return response.data;
  },
  // Customers
  getCustomers: async () => {
    return await cachedGet('/library/customers', undefined, { ttlMs: 10 * 60 * 1000 });
  },
  createCustomer: async (data: any) => {
    const response = await api.post('/library/customers', data);
    invalidateCachePrefix('GET:/library/customers');
    return response.data;
  },
  updateCustomer: async (id: number, data: any) => {
    const response = await api.put(`/library/customers/${id}`, data);
    invalidateCachePrefix('GET:/library/customers');
    return response.data;
  },
  deleteCustomer: async (id: number) => {
    const response = await api.delete(`/library/customers/${id}`);
    invalidateCachePrefix('GET:/library/customers');
    return response.data;
  },
  uploadCustomers: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user.companyId) {
        formData.append('companyId', user.companyId);
      }
    }
    const response = await api.post('/library/customers/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  // Teams
  uploadTeams: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user.companyId) {
        formData.append('companyId', user.companyId);
      }
    }
    const response = await api.post('/library/teams/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  // Transportors
  getTransportors: async () => {
    return await cachedGet('/library/transportors', undefined, { ttlMs: 10 * 60 * 1000 });
  },
  createTransportor: async (data: any) => {
    const response = await api.post('/library/transportors', data);
    invalidateCachePrefix('GET:/library/transportors');
    return response.data;
  },
  updateTransportor: async (id: number, data: any) => {
    const response = await api.put(`/library/transportors/${id}`, data);
    invalidateCachePrefix('GET:/library/transportors');
    return response.data;
  },
  deleteTransportor: async (id: number) => {
    const response = await api.delete(`/library/transportors/${id}`);
    invalidateCachePrefix('GET:/library/transportors');
    return response.data;
  },
  uploadTransportors: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user.companyId) {
        formData.append('companyId', user.companyId);
      }
    }
    const response = await api.post('/library/transportors/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    invalidateCachePrefix('GET:/library/transportors');
    return response.data;
  },
};

