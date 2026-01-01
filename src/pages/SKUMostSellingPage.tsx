import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Eye, TrendingUp } from 'lucide-react';
import { skuService } from '../services/skuService';
import { formatCurrency, formatDate, formatNumber } from '../utils/formatters';

interface MostSellingSKU {
  rank: number;
  skuId: string;
  itemName: string;
  category: string;
  unitsSold: number;
  revenue: number;
  lastSaleDate: string;
}

const SKUMostSellingPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [skus, setSkus] = useState<MostSellingSKU[]>([]);
  const [period, setPeriod] = useState(30);
  const [sortBy, setSortBy] = useState('units');

  useEffect(() => {
    loadData();
  }, [period, sortBy]);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await skuService.getMostSelling({ period, sortBy });
      setSkus(response.data || []);
    } catch (error) {
      console.error('Error loading most selling SKUs:', error);
      setSkus([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-10 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-2">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/app/sku')}
              className="text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Most Selling SKUs</h1>
          </div>
          <p className="text-lg text-slate-500 font-medium">Track your top-performing products by sales volume and revenue.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-6">
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Period</label>
            <select
              value={period}
              onChange={(e) => setPeriod(parseInt(e.target.value))}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value={30}>Last 30 Days</option>
              <option value={60}>Last 60 Days</option>
              <option value={90}>Last 90 Days</option>
              <option value={0}>Custom Range</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="units">Units Sold</option>
              <option value="revenue">Revenue</option>
              <option value="frequency">Frequency</option>
            </select>
          </div>
          <div className="flex-1"></div>
          <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
            <Download className="w-5 h-5" />
            Export
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  SKU ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Item Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Units Sold
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Revenue (₹)
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Last Sale Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Chart
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                    <div className="flex justify-center">
                      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  </td>
                </tr>
              ) : skus.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                    No data available
                  </td>
                </tr>
              ) : (
                skus.map((sku) => (
                  <tr key={sku.skuId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                      #{sku.rank}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{sku.skuId}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{sku.itemName}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{sku.category}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 font-semibold">
                      {formatNumber(sku.unitsSold)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 font-semibold">
                      {formatCurrency(sku.revenue)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{formatDate(sku.lastSaleDate)}</td>
                    <td className="px-4 py-3 text-sm">
                      <TrendingUp className="w-5 h-5 text-green-600" />
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <button
                        onClick={() => navigate(`/app/sku/${sku.skuId}`)}
                        className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                      >
                        <Eye className="w-4 h-4" />
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SKUMostSellingPage;

