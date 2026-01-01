import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, AlertCircle, Tag, ChevronDown } from 'lucide-react';
import { skuService } from '../services/skuService';
import { formatNumber, formatDate } from '../utils/formatters';

interface SlowMovingSKU {
  skuId: string;
  itemName: string;
  category: string;
  currentStock: number;
  unitsSold: number;
  lastSaleDate: string;
  daysSinceLastSale: number;
  hsnSacCode?: string;
}

const SKUSlowMovingPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [skus, setSkus] = useState<SlowMovingSKU[]>([]);
  const [period, setPeriod] = useState(3);
  const [threshold, setThreshold] = useState(5);
  const [hsnSearch, setHsnSearch] = useState('');

  useEffect(() => {
    loadData();
  }, [period, threshold]);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await skuService.getSlowMoving({ period, threshold });
      setSkus(response.data || []);
    } catch (error) {
      console.error('Error loading slow moving SKUs:', error);
      setSkus([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter SKUs based on HSN Code search
  const filteredSkus = skus.filter((sku) => {
    if (!hsnSearch.trim()) return true;
    const searchTerm = hsnSearch.trim().toLowerCase();
    return sku.hsnSacCode?.toLowerCase().includes(searchTerm) || false;
  });

  return (
    <div className="p-8 space-y-10 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-2">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/app/sku')}
              className="text-slate-600 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Slow Moving SKUs</h1>
          </div>
          <p className="text-lg text-slate-500 font-medium">Identify SKUs with low sales velocity over specified periods.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-6">
        <div className="flex flex-wrap items-end gap-4">
          <div className="relative group">
            <label className="block text-[13px] font-black text-slate-700 uppercase tracking-wider mb-2">Time Period</label>
            <select
              value={period}
              onChange={(e) => setPeriod(parseInt(e.target.value))}
              className="appearance-none bg-white border border-slate-200 text-[13px] font-bold uppercase tracking-wider text-slate-700 px-5 py-3 pr-12 rounded-[1.5rem] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer hover:bg-slate-50 w-full min-w-[200px]"
            >
              <option value={3}>Last 3 Months</option>
              <option value={6}>Last 6 Months</option>
              <option value={0}>Custom</option>
            </select>
            <ChevronDown size={18} className="absolute right-4 bottom-[14px] text-slate-400 pointer-events-none group-focus-within:text-indigo-500 transition-colors" />
          </div>
          <div>
            <label className="block text-[13px] font-black text-slate-700 uppercase tracking-wider mb-2">
              Movement Threshold (Less than X units sold)
            </label>
            <input
              type="number"
              min="1"
              value={threshold}
              onChange={(e) => setThreshold(parseInt(e.target.value) || 5)}
              className="bg-slate-50 border border-slate-200 text-[13px] font-bold uppercase tracking-wider text-slate-800 px-5 py-3 rounded-[1.5rem] focus:outline-none focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 transition-all w-32"
              placeholder="5"
            />
          </div>
          <div>
            <label className="block text-[13px] font-black text-slate-700 uppercase tracking-wider mb-2">Search by HSN Code</label>
            <input
              type="text"
              value={hsnSearch}
              onChange={(e) => setHsnSearch(e.target.value)}
              placeholder="Enter HSN/SAC Code"
              className="bg-slate-50 border border-slate-200 text-[13px] font-bold uppercase tracking-wider text-slate-800 px-5 py-3 rounded-[1.5rem] focus:outline-none focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 transition-all w-48"
            />
          </div>
          <div className="flex-1"></div>
          <button className="bg-indigo-600 hover:bg-indigo-700 text-white text-[13px] font-black uppercase tracking-wider px-6 py-3 rounded-[1.5rem] flex items-center gap-2 transition-all shadow-sm hover:shadow-md">
            <Download className="w-5 h-5" />
            Export
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100">
                <th className="px-10 py-7 text-[13px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  SKU ID
                </th>
                <th className="px-10 py-7 text-[13px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  Item Name
                </th>
                <th className="px-10 py-7 text-[13px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  Category
                </th>
                <th className="px-10 py-7 text-[13px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  HSN/SAC Code
                </th>
                <th className="px-10 py-7 text-[13px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  Current Stock
                </th>
                <th className="px-10 py-7 text-[13px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  Units Sold in Period
                </th>
                <th className="px-10 py-7 text-[13px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  Last Sale Date
                </th>
                <th className="px-10 py-7 text-[13px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  Days Since Last Sale
                </th>
                <th className="px-10 py-7 text-[13px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-10 py-12 text-center">
                    <div className="flex justify-center">
                      <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  </td>
                </tr>
              ) : filteredSkus.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-10 py-12 text-center text-slate-500 text-sm font-medium">
                    {skus.length === 0 ? 'No slow moving SKUs found' : 'No SKUs match the HSN Code search'}
                  </td>
                </tr>
              ) : (
                filteredSkus.map((sku) => (
                  <tr key={sku.skuId} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-10 py-5 text-sm font-bold text-slate-900">{sku.skuId}</td>
                    <td className="px-10 py-5 text-sm text-slate-800">{sku.itemName}</td>
                    <td className="px-10 py-5 text-sm text-slate-600">{sku.category}</td>
                    <td className="px-10 py-5 text-sm text-slate-600">{sku.hsnSacCode || '—'}</td>
                    <td className="px-10 py-5 text-sm text-slate-900 font-bold">
                      {formatNumber(sku.currentStock)}
                    </td>
                    <td className="px-10 py-5 text-sm text-amber-600 font-bold">
                      {formatNumber(sku.unitsSold)}
                    </td>
                    <td className="px-10 py-5 text-sm text-slate-600">{formatDate(sku.lastSaleDate)}</td>
                    <td className="px-10 py-5 text-sm text-slate-600">
                      <span className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-500" />
                        {sku.daysSinceLastSale} days
                      </span>
                    </td>
                    <td className="px-10 py-5 text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-amber-50 text-amber-700 rounded-xl hover:bg-amber-100 transition-all flex items-center gap-2"
                        >
                          <AlertCircle className="w-4 h-4" />
                          Mark for Review
                        </button>
                        <button
                          className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 rounded-xl hover:bg-indigo-100 transition-all flex items-center gap-2"
                        >
                          <Tag className="w-4 h-4" />
                          Apply Discount
                        </button>
                      </div>
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

export default SKUSlowMovingPage;

