import { cachedGet } from '../utils/cachedApi';

export const dashboardService = {
  getStats: async () => {
    return await cachedGet('/dashboard/stats', undefined, {
      ttlMs: 60 * 1000,
      key: 'dashboard:stats',
    });
  },
  getRecentActivity: async (limit: number = 10) => {
    return await cachedGet(`/dashboard/recent-activity?limit=${limit}`, undefined, {
      ttlMs: 30 * 1000,
      key: `dashboard:recent-activity:${limit}`,
    });
  },
};

