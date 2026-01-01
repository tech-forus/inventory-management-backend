import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp, TrendingDown, Info, AlertCircle } from 'lucide-react';
import { inventoryService } from '../services/inventoryService';
import { formatCurrency, formatDate } from '../utils/formatters';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
  ReferenceLine
} from 'recharts';

// Normalize date to YYYY-MM-DD format
const normalizeDate = (date: string | Date): string => {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
};

// Calculate days difference
const daysDifference = (date1: string, date2: string): number => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
};

// Get previous period dates (equal length)
const getPreviousPeriod = (dateFrom: string, dateTo: string): { prevDateFrom: string; prevDateTo: string } => {
  const periodDays = daysDifference(dateFrom, dateTo) + 1;
  const prevDateTo = new Date(dateFrom);
  prevDateTo.setDate(prevDateTo.getDate() - 1);
  const prevDateFrom = new Date(prevDateTo);
  prevDateFrom.setDate(prevDateFrom.getDate() - periodDays + 1);
  
  return {
    prevDateFrom: normalizeDate(prevDateFrom),
    prevDateTo: normalizeDate(prevDateTo),
  };
};

interface FinancialData {
  date: string;
  revenueExclGST: number;
  revenueInclGST: number;
  expensesExclGST: number;
  expensesInclGST: number;
  grossProfit: number;
  outputGST: number;
  inputGST: number;
  provisionalNetGST: number;
}

interface SummaryStats {
  totalRevenueExclGST: number;
  totalRevenueInclGST: number;
  totalExpensesExclGST: number;
  totalExpensesInclGST: number;
  totalGrossProfit: number;
  totalOutputGST: number;
  totalInputGST: number;
  provisionalNetGSTLiability: number;
  revenueChange: number;
  expensesChange: number;
  profitChange: number;
  gstChange: number;
}

const FinancePage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [financialData, setFinancialData] = useState<FinancialData[]>([]);
  const [summaryStats, setSummaryStats] = useState<SummaryStats | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [fiscalPeriod, setFiscalPeriod] = useState('LAST_3_MONTHS');

  useEffect(() => {
    // Initialize with today's date
    const today = new Date();
    setDateTo(normalizeDate(today));
  }, []);

  useEffect(() => {
    if (fiscalPeriod !== 'CUSTOM') {
      // Calculate date range based on fiscal period
      const today = new Date();
      const dateToValue = normalizeDate(today);
      const dateFromCalc = new Date(today);
      
      if (fiscalPeriod === 'LAST_3_MONTHS') {
        dateFromCalc.setMonth(today.getMonth() - 3);
      } else if (fiscalPeriod === 'LAST_6_MONTHS') {
        dateFromCalc.setMonth(today.getMonth() - 6);
      } else if (fiscalPeriod === 'LAST_12_MONTHS') {
        dateFromCalc.setMonth(today.getMonth() - 12);
      }
      const dateFromValue = normalizeDate(dateFromCalc);
      
      setDateFrom(dateFromValue);
      setDateTo(dateToValue);
    }
  }, [fiscalPeriod]);

  const processInventoryData = useCallback((incomingHistory: any[], outgoingHistory: any[]) => {
    const dateMap = new Map<string, {
      revenueExclGST: number;
      revenueInclGST: number;
      expensesExclGST: number;
      expensesInclGST: number;
      outputGST: number;
      inputGST: number;
    }>();

    // Process outgoing history (Sales/Revenue)
    // For sales: Revenue is total price EXCLUDING GST
    outgoingHistory.forEach((record: any) => {
      const date = record.invoiceChallanDate || record.invoice_challan_date;
      if (date) {
        const dateKey = normalizeDate(date);
        
        // Use totalValueExclGst directly from record (sales price excluding GST)
        const totalValueExclGST = parseFloat(record.totalValueExclGst || record.total_value_excl_gst || 0);
        const gstAmount = parseFloat(record.gstAmount || record.gst_amount || 0);
        const totalValueInclGST = totalValueExclGST + gstAmount; // Calculate incl GST for cash flow
        
        const current = dateMap.get(dateKey) || {
          revenueExclGST: 0,
          revenueInclGST: 0,
          expensesExclGST: 0,
          expensesInclGST: 0,
          outputGST: 0,
          inputGST: 0,
        };
        
        dateMap.set(dateKey, {
          ...current,
          revenueExclGST: current.revenueExclGST + totalValueExclGST, // Sales price excluding GST
          revenueInclGST: current.revenueInclGST + totalValueInclGST, // For cash flow tracking
          outputGST: current.outputGST + gstAmount,
        });
      }
    });

    // Process incoming history (Purchases/Cost of Goods)
    incomingHistory.forEach((record: any) => {
      const date = record.receivingDate || record.receiving_date || record.invoiceDate || record.invoice_date;
      if (date) {
        const dateKey = normalizeDate(date);
        
        // Use GST fields directly from record (aggregated from items)
        const totalValueExclGST = parseFloat(record.totalValueExclGst || record.total_value_excl_gst || 0);
        const gstAmount = parseFloat(record.gstAmount || record.gst_amount || 0);
        const totalValueInclGST = parseFloat(record.totalValueInclGst || record.total_value_incl_gst || record.totalValue || record.total_value || 0);
        
        const current = dateMap.get(dateKey) || {
          revenueExclGST: 0,
          revenueInclGST: 0,
          expensesExclGST: 0,
          expensesInclGST: 0,
          outputGST: 0,
          inputGST: 0,
        };
        
        dateMap.set(dateKey, {
          ...current,
          expensesExclGST: current.expensesExclGST + totalValueExclGST,
          expensesInclGST: current.expensesInclGST + totalValueInclGST,
          inputGST: current.inputGST + gstAmount,
        });
      }
    });

    // Convert to array and calculate gross profit and provisional net GST
    const data: FinancialData[] = Array.from(dateMap.entries())
      .map(([date, totals]) => ({
        date,
        revenueExclGST: totals.revenueExclGST,
        revenueInclGST: totals.revenueInclGST,
        expensesExclGST: totals.expensesExclGST,
        expensesInclGST: totals.expensesInclGST,
        grossProfit: totals.revenueExclGST - totals.expensesExclGST, // P&L: Excl GST
        outputGST: totals.outputGST,
        inputGST: totals.inputGST,
        provisionalNetGST: totals.outputGST - totals.inputGST, // Provisional (before ITC restrictions)
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return data;
  }, []);

  const loadFinancialData = useCallback(async () => {
    if (!dateFrom || !dateTo) return;

    try {
      setLoading(true);
      
      // Get previous period for comparison
      const { prevDateFrom, prevDateTo } = getPreviousPeriod(dateFrom, dateTo);
      
      // Fetch current and previous period data
      const [currentIncoming, currentOutgoing, prevIncoming, prevOutgoing] = await Promise.all([
        inventoryService.getIncomingHistory({ dateFrom, dateTo }),
        inventoryService.getOutgoingHistory({ dateFrom, dateTo }),
        inventoryService.getIncomingHistory({ dateFrom: prevDateFrom, dateTo: prevDateTo }),
        inventoryService.getOutgoingHistory({ dateFrom: prevDateFrom, dateTo: prevDateTo }),
      ]);

      const currentData = processInventoryData(
        currentIncoming.data || [],
        currentOutgoing.data || []
      );
      
      const previousData = processInventoryData(
        prevIncoming.data || [],
        prevOutgoing.data || []
      );

      setFinancialData(currentData);

      // Calculate summary statistics
      const totalRevenueExclGST = currentData.reduce((sum, d) => sum + d.revenueExclGST, 0);
      const totalRevenueInclGST = currentData.reduce((sum, d) => sum + d.revenueInclGST, 0);
      const totalExpensesExclGST = currentData.reduce((sum, d) => sum + d.expensesExclGST, 0);
      const totalExpensesInclGST = currentData.reduce((sum, d) => sum + d.expensesInclGST, 0);
      const totalGrossProfit = currentData.reduce((sum, d) => sum + d.grossProfit, 0);
      const totalOutputGST = currentData.reduce((sum, d) => sum + d.outputGST, 0);
      const totalInputGST = currentData.reduce((sum, d) => sum + d.inputGST, 0);
      const provisionalNetGSTLiability = totalOutputGST - totalInputGST;

      // Calculate period-over-period changes (current vs previous equal-length period)
      const prevRevenueExclGST = previousData.reduce((sum, d) => sum + d.revenueExclGST, 0);
      const prevExpensesExclGST = previousData.reduce((sum, d) => sum + d.expensesExclGST, 0);
      const prevGrossProfit = previousData.reduce((sum, d) => sum + d.grossProfit, 0);
      const prevNetGST = previousData.reduce((sum, d) => sum + d.provisionalNetGST, 0);

      const revenueChange = prevRevenueExclGST !== 0 
        ? ((totalRevenueExclGST - prevRevenueExclGST) / Math.abs(prevRevenueExclGST)) * 100 
        : 0;
      const expensesChange = prevExpensesExclGST !== 0 
        ? ((totalExpensesExclGST - prevExpensesExclGST) / Math.abs(prevExpensesExclGST)) * 100 
        : 0;
      const profitChange = prevGrossProfit !== 0 
        ? ((totalGrossProfit - prevGrossProfit) / Math.abs(prevGrossProfit)) * 100 
        : 0;
      const gstChange = prevNetGST !== 0 
        ? ((provisionalNetGSTLiability - prevNetGST) / Math.abs(prevNetGST)) * 100 
        : 0;

      setSummaryStats({
        totalRevenueExclGST,
        totalRevenueInclGST,
        totalExpensesExclGST,
        totalExpensesInclGST,
        totalGrossProfit,
        totalOutputGST,
        totalInputGST,
        provisionalNetGSTLiability,
        revenueChange,
        expensesChange,
        profitChange,
        gstChange,
      });
    } catch (error) {
      console.error('Error loading financial data:', error);
      setFinancialData([]);
      setSummaryStats(null);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, processInventoryData]);

  useEffect(() => {
    loadFinancialData();
  }, [loadFinancialData]);

  const formatCompactCurrency = useCallback((value: number) => {
    if (!value && value !== 0) return '₹0';
    const absValue = Math.abs(value);
    const sign = value < 0 ? '-' : '';
    
    if (absValue >= 1000000) {
      return `${sign}₹${(absValue / 1000000).toFixed(1)}M`;
    } else if (absValue >= 1000) {
      return `${sign}₹${Math.round(absValue / 1000)}k`;
    }
    return `${sign}₹${Math.round(absValue)}`;
  }, []);

  const formatPercentage = useCallback((value: number) => {
    if (!value && value !== 0) return '0%';
    const sign = value >= 0 ? '+' : '';
    return `${sign}${Math.round(value)}%`;
  }, []);

  const getFiscalYear = useCallback(() => {
    if (!dateFrom) return '';
    const year = new Date(dateFrom).getFullYear();
    return `FY${year.toString().slice(-2)}`;
  }, [dateFrom]);

  // Memoize chart data to prevent unnecessary re-renders
  const chartData = useMemo(() => financialData, [financialData]);

  return (
    <div className="p-8 space-y-8 w-full bg-gray-50 min-h-screen">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/app/dashboard')}
              className="text-slate-600 hover:text-indigo-600 transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-[28.8px] font-bold leading-[1.2] tracking-tight text-slate-900">Financial Intelligence</h1>
          </div>
          <p className="text-[14px] font-normal leading-[1.5] text-slate-500">
            Profitability analysis and tax liability tracking.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <select
            value={fiscalPeriod}
            onChange={(e) => setFiscalPeriod(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm font-medium text-gray-700 focus:ring-2 focus:ring-indigo-500"
          >
            <option value="LAST_3_MONTHS">Last 3 Months</option>
            <option value="LAST_6_MONTHS">Last 6 Months</option>
            <option value="LAST_12_MONTHS">Last 12 Months</option>
            <option value="CUSTOM">Custom Range</option>
          </select>
          <div className="flex gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-96">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : financialData.length === 0 ? (
        <div className="flex justify-center items-center h-96 text-gray-500">
          <p>No data available for the selected date range</p>
        </div>
      ) : (
        <>
          {/* Key Metric Cards */}
          {summaryStats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Total Sales (Revenue) */}
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Total Sales</h3>
                  <TrendingUp className="w-4 h-4 text-green-500" />
                </div>
                <p className="text-3xl font-bold text-gray-900 mb-2">
                  {formatCompactCurrency(summaryStats.totalRevenueExclGST)}
                </p>
                <div className="flex items-center gap-1">
                  <span className={`text-xs font-semibold ${
                    summaryStats.revenueChange >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatPercentage(summaryStats.revenueChange)} VS PREV. PERIOD
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1">Excl. GST</p>
              </div>

              {/* Cost of Goods / Purchases */}
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Cost of Goods</h3>
                  <TrendingUp className="w-4 h-4 text-green-500" />
                </div>
                <p className="text-3xl font-bold text-gray-900 mb-2">
                  {formatCompactCurrency(summaryStats.totalExpensesExclGST)}
                </p>
                <div className="flex items-center gap-1">
                  <span className={`text-xs font-semibold ${
                    summaryStats.expensesChange >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatPercentage(summaryStats.expensesChange)} VS PREV. PERIOD
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1">Excl. GST</p>
              </div>

              {/* Gross Margin */}
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Gross Margin</h3>
                  <TrendingUp className="w-4 h-4 text-green-500" />
                </div>
                <p className="text-3xl font-bold text-gray-900 mb-2">
                  {formatCompactCurrency(summaryStats.totalGrossProfit)}
                </p>
                <div className="flex items-center gap-1">
                  <span className={`text-xs font-semibold ${
                    summaryStats.profitChange >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatPercentage(summaryStats.profitChange)} VS PREV. PERIOD
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1">Before Tax</p>
              </div>

              {/* Provisional GST Liability */}
              <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide">GST Liability</h3>
                  <TrendingDown className="w-4 h-4 text-red-500" />
                </div>
                <p className="text-3xl font-bold text-gray-900 mb-2">
                  {formatCompactCurrency(summaryStats.provisionalNetGSTLiability)}
                </p>
                <div className="flex items-center gap-1">
                  <span className={`text-xs font-semibold ${
                    summaryStats.gstChange <= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatPercentage(summaryStats.gstChange)} VS PREV. PERIOD
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1">Provisional</p>
              </div>
            </div>
          )}

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sales vs Purchases Chart (Stacked Area) */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="mb-4">
                <h3 className="text-lg font-bold text-gray-900 mb-1">Sales vs Purchases</h3>
                <p className="text-xs text-gray-500">Cash flow trajectory (Incl. GST)</p>
              </div>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                      </linearGradient>
                      <linearGradient id="colorPurchases" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                      }}
                      stroke="#6b7280"
                      style={{ fontSize: '11px' }}
                    />
                    <YAxis
                      tickFormatter={(value) => formatCompactCurrency(value)}
                      stroke="#6b7280"
                      style={{ fontSize: '11px' }}
                    />
                    <Tooltip
                      formatter={(value: number | undefined) => formatCurrency(value || 0)}
                      labelFormatter={(label) => formatDate(label)}
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="revenueInclGST"
                      name="Sales"
                      stackId="1"
                      stroke="#3b82f6"
                      fill="url(#colorSales)"
                    />
                    <Area
                      type="monotone"
                      dataKey="expensesInclGST"
                      name="Purchases"
                      stackId="2"
                      stroke="#ef4444"
                      fill="url(#colorPurchases)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* GST Analytics Card */}
            <div className="bg-indigo-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold">GST Analytics</h3>
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                  <span className="text-lg font-bold">₹</span>
                </div>
              </div>

              <div className="space-y-6">
                {/* Output GST (Sales) */}
                <div className="bg-white/10 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-indigo-100 uppercase tracking-wide">
                      Output GST (Sales)
                    </span>
                    <TrendingUp className="w-4 h-4 text-white" />
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {summaryStats ? formatCompactCurrency(summaryStats.totalOutputGST) : formatCompactCurrency(0)}
                  </p>
                  <p className="text-xs text-indigo-100 mt-1">{getFiscalYear()}</p>
                </div>

                {/* Input Tax Credit */}
                <div className="bg-white/10 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-indigo-100 uppercase tracking-wide">
                      Input Tax Credit
                    </span>
                    <TrendingDown className="w-4 h-4 text-white" />
                  </div>
                  <p className="text-2xl font-bold text-white">
                    {summaryStats ? formatCompactCurrency(summaryStats.totalInputGST) : formatCompactCurrency(0)}
                  </p>
                  <p className="text-xs text-indigo-100 mt-1">{getFiscalYear()}</p>
                </div>

                {/* Provisional Net GST Liability */}
                <div className="bg-white/20 rounded-lg p-4 border-2 border-white/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-white uppercase tracking-wide">
                      Provisional Net GST
                    </span>
                    <Info className="w-4 h-4 text-white" />
                  </div>
                  <p className="text-3xl font-bold text-white">
                    {summaryStats ? formatCompactCurrency(summaryStats.provisionalNetGSTLiability) : formatCompactCurrency(0)}
                  </p>
                  <div className="flex items-start gap-2 mt-2">
                    <AlertCircle className="w-3 h-3 text-yellow-300 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-indigo-100">
                      Indicative liability before ITC restrictions and adjustments.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Gross Margin Chart (Before Taxation) */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-gray-900 mb-1">Gross Margin (Before Taxation)</h3>
              <p className="text-xs text-gray-500">Monthly gross margin excluding GST</p>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    }}
                    stroke="#6b7280"
                    style={{ fontSize: '11px' }}
                  />
                  <YAxis
                    tickFormatter={(value) => formatCompactCurrency(value)}
                    stroke="#6b7280"
                    style={{ fontSize: '11px' }}
                  />
                  <ReferenceLine y={0} stroke="#1f2937" strokeWidth={2} />
                  <Tooltip
                    formatter={(value: number | undefined) => formatCurrency(value || 0)}
                    labelFormatter={(label) => formatDate(label)}
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="grossProfit" name="Gross Margin (Before Tax)">
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.grossProfit >= 0 ? '#10b981' : '#ef4444'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* GST Amount Chart (Stacked) */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-gray-900 mb-1">GST Amount (After Taxation)</h3>
              <p className="text-xs text-gray-500">Output GST, Input Tax Credit, and Provisional Net GST Liability</p>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    }}
                    stroke="#6b7280"
                    style={{ fontSize: '11px' }}
                  />
                  <YAxis
                    tickFormatter={(value) => formatCompactCurrency(value)}
                    stroke="#6b7280"
                    style={{ fontSize: '11px' }}
                  />
                  <Tooltip
                    formatter={(value: number | undefined) => formatCurrency(value || 0)}
                    labelFormatter={(label) => formatDate(label)}
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Bar dataKey="outputGST" name="Output GST (Sales)" fill="#3b82f6" />
                  <Bar dataKey="inputGST" name="Input Tax Credit" fill="#10b981" />
                  <Bar dataKey="provisionalNetGST" name="Provisional Net GST">
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.provisionalNetGST >= 0 ? '#f59e0b' : '#10b981'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default FinancePage;
