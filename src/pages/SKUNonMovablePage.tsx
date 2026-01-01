import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, AlertTriangle, Trash2, RotateCcw, PackageX, Settings } from 'lucide-react';
import { skuService } from '../services/skuService';
import { formatCurrency, formatDate, formatNumber } from '../utils/formatters';
import { PlanningThresholds, getDefaultPlanningThresholds } from '../utils/skuClassification';

interface NonMovableSKU {
  skuId: string;
  itemName: string;
  category: string;
  currentStock: number;
  lastMovementDate: string;
  aging: number;
  unitPrice: number;
  inventoryValue: number;
}

const SKUNonMovablePage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [skus, setSkus] = useState<NonMovableSKU[]>([]);
  const [totalDeadStockValue, setTotalDeadStockValue] = useState(0);
  const [planningThresholds, setPlanningThresholds] = useState<PlanningThresholds>(getDefaultPlanningThresholds());

  // Load planning thresholds from settings
  useEffect(() => {
    const loadThresholds = () => {
      const savedSettings = localStorage.getItem('appSettings');
      if (savedSettings) {
        try {
          const settings = JSON.parse(savedSettings);
          if (settings.planningThresholds) {
            setPlanningThresholds(settings.planningThresholds);
          }
        } catch (error) {
          console.error('Error loading planning thresholds:', error);
        }
      }
    };
    loadThresholds();
    
    // Listen for storage changes (when settings are updated)
    const handleStorageChange = () => {
      loadThresholds();
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    loadData();
  }, [planningThresholds]);

  useEffect(() => {
    const total = skus.reduce((sum, sku) => sum + sku.inventoryValue, 0);
    setTotalDeadStockValue(total);
  }, [skus]);

  const loadData = async () => {
    try {
      setLoading(true);
      // Use planning thresholds from settings
      // Backend should use canonical classification rules with these thresholds
      const response = await skuService.getNonMovable({ 
        period: planningThresholds.non_moving_days,
        minQty: planningThresholds.non_moving_min_qty
      });
      setSkus(response.data || []);
    } catch (error) {
      console.error('Error loading non-movable SKUs:', error);
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
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Non-Movable SKUs</h1>
          </div>
          <p className="text-lg text-slate-500 font-medium">
            SKUs classified as non-moving (dead stock) based on configured planning thresholds.
          </p>
        </div>
      </div>

      {/* Current Thresholds Display */}
      <div className="bg-red-50 border border-red-200 rounded-[2.5rem] p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-red-900 mb-2 flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Current Classification Thresholds
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-red-700 font-medium">Days Threshold:</span>
                <span className="ml-2 text-red-900 font-bold">{planningThresholds.non_moving_days} days</span>
              </div>
              <div>
                <span className="text-red-700 font-medium">Quantity Threshold:</span>
                <span className="ml-2 text-red-900 font-bold">≥ {planningThresholds.non_moving_min_qty} units</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Summary */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1"></div>
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
              <Download className="w-5 h-5" />
              Export
            </button>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg px-6 py-3">
            <div className="text-sm text-red-600 font-medium">Total Dead Stock Value</div>
            <div className="text-2xl font-bold text-red-700">{formatCurrency(totalDeadStockValue)}</div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
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
                  Current Stock (Dead Stock)
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Last Movement Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Aging (Days)
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Unit Price
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  Inventory Value
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
                    No non-movable SKUs found
                  </td>
                </tr>
              ) : (
                skus.map((sku) => (
                  <tr key={sku.skuId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{sku.skuId}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{sku.itemName}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{sku.category}</td>
                    <td className="px-4 py-3 text-sm text-red-600 font-semibold">
                      {formatNumber(sku.currentStock)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{formatDate(sku.lastMovementDate)}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">
                      <span className="flex items-center gap-1">
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                        {sku.aging} days
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{formatCurrency(sku.unitPrice)}</td>
                    <td className="px-4 py-3 text-sm text-red-700 font-semibold">
                      {formatCurrency(sku.inventoryValue)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          className="px-3 py-1 text-xs bg-red-100 text-red-800 rounded hover:bg-red-200 flex items-center gap-1"
                          title="Liquidate"
                        >
                          <PackageX className="w-4 h-4" />
                          Liquidate
                        </button>
                        <button
                          className="px-3 py-1 text-xs bg-gray-100 text-gray-800 rounded hover:bg-gray-200 flex items-center gap-1"
                          title="Write-off"
                        >
                          <Trash2 className="w-4 h-4" />
                          Write-off
                        </button>
                        <button
                          className="px-3 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200 flex items-center gap-1"
                          title="Return to Vendor"
                        >
                          <RotateCcw className="w-4 h-4" />
                          Return
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

export default SKUNonMovablePage;

