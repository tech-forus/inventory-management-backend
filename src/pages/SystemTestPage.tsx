import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, AlertCircle, RefreshCw, Database, Calculator, FileText } from 'lucide-react';
import { inventoryService } from '../services/inventoryService';
import { skuService } from '../services/skuService';
import api from '../utils/api';

interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'warning' | 'pending';
  message: string;
  data?: any;
  duration?: number;
}

const SystemTestPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [selectedTest, setSelectedTest] = useState<string | null>(null);

  const runTest = async (testName: string, testFn: () => Promise<TestResult>) => {
    const startTime = Date.now();
    try {
      const result = await testFn();
      const duration = Date.now() - startTime;
      return { ...result, duration };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      return {
        name: testName,
        status: 'fail' as const,
        message: error.message || 'Test failed',
        duration,
      };
    }
  };

  const testAPIHealth = async (): Promise<TestResult> => {
    try {
      const response = await api.get('/health');
      if (response.data && response.status === 200) {
        return {
          name: 'API Health Check',
          status: 'pass',
          message: 'API is responding',
          data: response.data,
        };
      }
      return {
        name: 'API Health Check',
        status: 'fail',
        message: 'API returned unexpected response',
      };
    } catch (error: any) {
      return {
        name: 'API Health Check',
        status: 'fail',
        message: error.message || 'API is not responding',
      };
    }
  };

  const testIncomingHistory = async (): Promise<TestResult> => {
    try {
      const today = new Date();
      const threeMonthsAgo = new Date(today);
      threeMonthsAgo.setMonth(today.getMonth() - 3);
      
      const dateFrom = threeMonthsAgo.toISOString().split('T')[0];
      const dateTo = today.toISOString().split('T')[0];

      const response = await inventoryService.getIncomingHistory({ dateFrom, dateTo });
      const data = response.data || [];
      
      // Check for GST fields
      const hasGSTFields = data.length > 0 && (
        data[0].totalValueExclGst !== undefined ||
        data[0].total_value_excl_gst !== undefined ||
        data[0].gstAmount !== undefined ||
        data[0].gst_amount !== undefined
      );

      const missingGST = data.filter((record: any) => 
        !record.totalValueExclGst && !record.total_value_excl_gst
      ).length;

      return {
        name: 'Incoming History API',
        status: hasGSTFields && missingGST === 0 ? 'pass' : missingGST > 0 ? 'warning' : 'fail',
        message: `Found ${data.length} records. ${missingGST > 0 ? `${missingGST} records missing GST fields` : 'GST fields present'}`,
        data: {
          totalRecords: data.length,
          hasGSTFields,
          missingGSTCount: missingGST,
          sampleRecord: data[0] || null,
        },
      };
    } catch (error: any) {
      return {
        name: 'Incoming History API',
        status: 'fail',
        message: error.message || 'Failed to fetch incoming history',
      };
    }
  };

  const testOutgoingHistory = async (): Promise<TestResult> => {
    try {
      const today = new Date();
      const threeMonthsAgo = new Date(today);
      threeMonthsAgo.setMonth(today.getMonth() - 3);
      
      const dateFrom = threeMonthsAgo.toISOString().split('T')[0];
      const dateTo = today.toISOString().split('T')[0];

      const response = await inventoryService.getOutgoingHistory({ dateFrom, dateTo });
      const data = response.data || [];
      
      // Check for date field
      const hasDateField = data.length > 0 && (
        data[0].date !== undefined ||
        data[0].invoiceChallanDate !== undefined ||
        data[0].invoice_challan_date !== undefined
      );

      // Check for GST fields
      const hasGSTFields = data.length > 0 && (
        data[0].totalValueExclGst !== undefined ||
        data[0].total_value_excl_gst !== undefined ||
        data[0].gstAmount !== undefined ||
        data[0].gst_amount !== undefined
      );

      const missingDate = data.filter((record: any) => 
        !record.date && !record.invoiceChallanDate && !record.invoice_challan_date
      ).length;

      const missingGST = data.filter((record: any) => 
        !record.totalValueExclGst && !record.total_value_excl_gst
      ).length;

      const zeroSales = data.filter((record: any) => {
        const exclGST = record.totalValueExclGst || record.total_value_excl_gst || 0;
        return exclGST === 0;
      }).length;

      return {
        name: 'Outgoing History API (Sales)',
        status: hasDateField && hasGSTFields && missingDate === 0 && missingGST === 0 ? 'pass' : 'warning',
        message: `Found ${data.length} records. Date field: ${hasDateField ? '✓' : '✗'}, GST fields: ${hasGSTFields ? '✓' : '✗'}. ${zeroSales} records with zero sales.`,
        data: {
          totalRecords: data.length,
          hasDateField,
          hasGSTFields,
          missingDateCount: missingDate,
          missingGSTCount: missingGST,
          zeroSalesCount: zeroSales,
          sampleRecord: data[0] || null,
        },
      };
    } catch (error: any) {
      return {
        name: 'Outgoing History API (Sales)',
        status: 'fail',
        message: error.message || 'Failed to fetch outgoing history',
      };
    }
  };

  const testFinanceCalculations = async (): Promise<TestResult> => {
    try {
      const today = new Date();
      const threeMonthsAgo = new Date(today);
      threeMonthsAgo.setMonth(today.getMonth() - 3);
      
      const dateFrom = threeMonthsAgo.toISOString().split('T')[0];
      const dateTo = today.toISOString().split('T')[0];

      const [incomingResponse, outgoingResponse] = await Promise.all([
        inventoryService.getIncomingHistory({ dateFrom, dateTo }),
        inventoryService.getOutgoingHistory({ dateFrom, dateTo }),
      ]);

      const incomingData = incomingResponse.data || [];
      const outgoingData = outgoingResponse.data || [];

      // Calculate totals
      let totalRevenueExclGST = 0;
      let totalExpensesExclGST = 0;
      let totalOutputGST = 0;
      let totalInputGST = 0;

      outgoingData.forEach((record: any) => {
        const exclGST = parseFloat(record.totalValueExclGst || record.total_value_excl_gst || 0);
        const gst = parseFloat(record.gstAmount || record.gst_amount || 0);
        totalRevenueExclGST += exclGST;
        totalOutputGST += gst;
      });

      incomingData.forEach((record: any) => {
        const exclGST = parseFloat(record.totalValueExclGst || record.total_value_excl_gst || 0);
        const gst = parseFloat(record.gstAmount || record.gst_amount || 0);
        totalExpensesExclGST += exclGST;
        totalInputGST += gst;
      });

      const grossProfit = totalRevenueExclGST - totalExpensesExclGST;
      const netGST = totalOutputGST - totalInputGST;

      const issues: string[] = [];
      if (totalRevenueExclGST === 0 && outgoingData.length > 0) {
        issues.push('Sales revenue is zero but records exist');
      }
      if (totalOutputGST < 0) {
        issues.push('Output GST is negative (data issue)');
      }
      if (totalInputGST < 0) {
        issues.push('Input GST is negative (data issue)');
      }

      return {
        name: 'Finance Calculations',
        status: issues.length === 0 ? 'pass' : 'warning',
        message: issues.length > 0 ? issues.join(', ') : 'Calculations are correct',
        data: {
          totalRevenueExclGST,
          totalExpensesExclGST,
          totalGrossProfit: grossProfit,
          totalOutputGST,
          totalInputGST,
          netGST,
          incomingRecords: incomingData.length,
          outgoingRecords: outgoingData.length,
        },
      };
    } catch (error: any) {
      return {
        name: 'Finance Calculations',
        status: 'fail',
        message: error.message || 'Failed to calculate finance data',
      };
    }
  };

  const testDataIntegrity = async (): Promise<TestResult> => {
    try {
      const today = new Date();
      const threeMonthsAgo = new Date(today);
      threeMonthsAgo.setMonth(today.getMonth() - 3);
      
      const dateFrom = threeMonthsAgo.toISOString().split('T')[0];
      const dateTo = today.toISOString().split('T')[0];

      const [incomingResponse, outgoingResponse] = await Promise.all([
        inventoryService.getIncomingHistory({ dateFrom, dateTo }),
        inventoryService.getOutgoingHistory({ dateFrom, dateTo }),
      ]);

      const incomingData = incomingResponse.data || [];
      const outgoingData = outgoingResponse.data || [];

      const issues: string[] = [];
      const warnings: string[] = [];

      // Check for negative GST amounts
      const negativeOutputGST = outgoingData.filter((record: any) => {
        const gst = parseFloat(record.gstAmount || record.gst_amount || 0);
        return gst < 0;
      }).length;

      const negativeInputGST = incomingData.filter((record: any) => {
        const gst = parseFloat(record.gstAmount || record.gst_amount || 0);
        return gst < 0;
      }).length;

      if (negativeOutputGST > 0) {
        issues.push(`${negativeOutputGST} outgoing records have negative GST`);
      }
      if (negativeInputGST > 0) {
        issues.push(`${negativeInputGST} incoming records have negative GST`);
      }

      // Check for missing dates
      const missingOutgoingDates = outgoingData.filter((record: any) => 
        !record.date && !record.invoiceChallanDate && !record.invoice_challan_date
      ).length;

      const missingIncomingDates = incomingData.filter((record: any) => 
        !record.receivingDate && !record.receiving_date && !record.invoiceDate && !record.invoice_date
      ).length;

      if (missingOutgoingDates > 0) {
        warnings.push(`${missingOutgoingDates} outgoing records missing dates`);
      }
      if (missingIncomingDates > 0) {
        warnings.push(`${missingIncomingDates} incoming records missing dates`);
      }

      return {
        name: 'Data Integrity Check',
        status: issues.length === 0 ? (warnings.length > 0 ? 'warning' : 'pass') : 'fail',
        message: issues.length > 0 
          ? issues.join(', ') 
          : warnings.length > 0 
            ? warnings.join(', ') 
            : 'Data integrity is good',
        data: {
          negativeOutputGST,
          negativeInputGST,
          missingOutgoingDates,
          missingIncomingDates,
          totalIncomingRecords: incomingData.length,
          totalOutgoingRecords: outgoingData.length,
        },
      };
    } catch (error: any) {
      return {
        name: 'Data Integrity Check',
        status: 'fail',
        message: error.message || 'Failed to check data integrity',
      };
    }
  };

  const testDateFieldMapping = async (): Promise<TestResult> => {
    try {
      const response = await inventoryService.getOutgoingHistory({});
      const data = response.data || [];
      
      if (data.length === 0) {
        return {
          name: 'Date Field Mapping',
          status: 'warning',
          message: 'No outgoing records to test',
        };
      }

      const sample = data[0];
      const hasDate = !!sample.date;
      const hasInvoiceChallanDate = !!sample.invoiceChallanDate;
      const hasInvoiceChallanDateSnake = !!sample.invoice_challan_date;

      const fieldMapping = {
        date: hasDate,
        invoiceChallanDate: hasInvoiceChallanDate,
        invoice_challan_date: hasInvoiceChallanDateSnake,
      };

      return {
        name: 'Date Field Mapping',
        status: hasDate ? 'pass' : 'warning',
        message: hasDate 
          ? 'Date field is correctly mapped' 
          : 'Date field may be missing - check field mapping',
        data: {
          fieldMapping,
          sampleRecord: sample,
        },
      };
    } catch (error: any) {
      return {
        name: 'Date Field Mapping',
        status: 'fail',
        message: error.message || 'Failed to check date field mapping',
      };
    }
  };

  const testSKUAPI = async (): Promise<TestResult> => {
    try {
      const response = await skuService.getAll({ limit: 10 });
      const data = response.data || [];
      
      const hasRequiredFields = data.length === 0 || (
        data[0].skuId !== undefined || data[0].sku_id !== undefined ||
        data[0].itemName !== undefined || data[0].item_name !== undefined
      );

      const missingStock = data.filter((sku: any) => 
        sku.currentStock === undefined && sku.current_stock === undefined
      ).length;

      return {
        name: 'SKU API',
        status: hasRequiredFields && missingStock === 0 ? 'pass' : missingStock > 0 ? 'warning' : 'fail',
        message: `Found ${data.length} SKUs. ${missingStock > 0 ? `${missingStock} missing stock data` : 'All fields present'}`,
        data: {
          totalSKUs: data.length,
          hasRequiredFields,
          missingStockCount: missingStock,
          sampleSKU: data[0] || null,
        },
      };
    } catch (error: any) {
      return {
        name: 'SKU API',
        status: 'fail',
        message: error.message || 'Failed to fetch SKUs',
      };
    }
  };

  const testAuthentication = async (): Promise<TestResult> => {
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) {
        return {
          name: 'Authentication',
          status: 'warning',
          message: 'No authentication token found',
          data: { hasToken: false },
        };
      }

      // Try to access a protected endpoint
      const response = await api.get('/skus', { params: { limit: 1 } });
      
      return {
        name: 'Authentication',
        status: response.status === 200 ? 'pass' : 'fail',
        message: response.status === 200 ? 'Authentication is working' : 'Authentication failed',
        data: {
          hasToken: true,
          status: response.status,
        },
      };
    } catch (error: any) {
      const status = (error as any).response?.status;
      if (status === 401) {
        return {
          name: 'Authentication',
          status: 'fail',
          message: 'Authentication token is invalid or expired',
        };
      }
      return {
        name: 'Authentication',
        status: 'warning',
        message: error.message || 'Could not verify authentication',
      };
    }
  };

  const testAPIResponseTime = async (): Promise<TestResult> => {
    try {
      const endpoints = [
        { name: 'Health', url: '/health' },
        { name: 'SKUs', url: '/skus?limit=1' },
        { name: 'Incoming History', url: '/inventory/incoming/history?limit=1' },
        { name: 'Outgoing History', url: '/inventory/outgoing/history?limit=1' },
      ];

      const results: any[] = [];
      for (const endpoint of endpoints) {
        const startTime = Date.now();
        try {
          await api.get(endpoint.url);
          const duration = Date.now() - startTime;
          results.push({ name: endpoint.name, duration, status: 'success' });
        } catch (error: any) {
          const duration = Date.now() - startTime;
          results.push({ name: endpoint.name, duration, status: 'error', error: error.message });
        }
      }

      const avgResponseTime = results.reduce((sum, r) => sum + r.duration, 0) / results.length;
      const slowEndpoints = results.filter(r => r.duration > 2000);
      const failedEndpoints = results.filter(r => r.status === 'error');

      return {
        name: 'API Response Time',
        status: failedEndpoints.length > 0 ? 'fail' : slowEndpoints.length > 0 ? 'warning' : 'pass',
        message: failedEndpoints.length > 0
          ? `${failedEndpoints.length} endpoints failed`
          : slowEndpoints.length > 0
            ? `Average: ${Math.round(avgResponseTime)}ms. ${slowEndpoints.length} slow endpoints (>2s)`
            : `Average response time: ${Math.round(avgResponseTime)}ms (all good)`,
        data: {
          results,
          averageResponseTime: Math.round(avgResponseTime),
          slowEndpoints: slowEndpoints.length,
          failedEndpoints: failedEndpoints.length,
        },
      };
    } catch (error: any) {
      return {
        name: 'API Response Time',
        status: 'fail',
        message: error.message || 'Failed to test response times',
      };
    }
  };

  const testDashboardData = async (): Promise<TestResult> => {
    try {
      const [skuResponse, incomingResponse, outgoingResponse] = await Promise.all([
        skuService.getAll({ limit: 100 }).catch(() => ({ data: [] })),
        inventoryService.getIncoming().catch(() => ({ data: [] })),
        inventoryService.getOutgoing().catch(() => ({ data: [] })),
      ]);

      const skus = skuResponse.data || [];
      const incoming = incomingResponse.data || [];
      const outgoing = outgoingResponse.data || [];

      const issues: string[] = [];
      if (skus.length === 0) {
        issues.push('No SKUs found');
      }
      if (incoming.length === 0 && outgoing.length === 0) {
        issues.push('No inventory data found');
      }

      const lowStockSKUs = skus.filter((sku: any) => {
        const stock = sku.currentStock || sku.current_stock || 0;
        const minStock = sku.minStockLevel || sku.min_stock || 0;
        return stock > 0 && stock <= minStock;
      }).length;

      return {
        name: 'Dashboard Data',
        status: issues.length === 0 ? 'pass' : 'warning',
        message: issues.length > 0
          ? issues.join(', ')
          : `Dashboard data available: ${skus.length} SKUs, ${incoming.length} incoming, ${outgoing.length} outgoing. ${lowStockSKUs} low stock items.`,
        data: {
          totalSKUs: skus.length,
          totalIncoming: incoming.length,
          totalOutgoing: outgoing.length,
          lowStockCount: lowStockSKUs,
        },
      };
    } catch (error: any) {
      return {
        name: 'Dashboard Data',
        status: 'fail',
        message: error.message || 'Failed to fetch dashboard data',
      };
    }
  };

  const testGSTCalculation = async (): Promise<TestResult> => {
    try {
      const today = new Date();
      const oneMonthAgo = new Date(today);
      oneMonthAgo.setMonth(today.getMonth() - 1);
      
      const dateFrom = oneMonthAgo.toISOString().split('T')[0];
      const dateTo = today.toISOString().split('T')[0];

      const [incomingResponse, outgoingResponse] = await Promise.all([
        inventoryService.getIncomingHistory({ dateFrom, dateTo }),
        inventoryService.getOutgoingHistory({ dateFrom, dateTo }),
      ]);

      const incomingData = incomingResponse.data || [];
      const outgoingData = outgoingResponse.data || [];

      const issues: string[] = [];
      let incorrectCalculations = 0;

      // Check GST calculations for outgoing (sales)
      outgoingData.forEach((record: any) => {
        const exclGST = parseFloat(record.totalValueExclGst || record.total_value_excl_gst || 0);
        const gstAmount = parseFloat(record.gstAmount || record.gst_amount || 0);
        const gstPercentage = parseFloat(record.gstPercentage || record.gst_percentage || 0);
        const inclGST = parseFloat(record.totalValueInclGst || record.total_value_incl_gst || 0);

        if (exclGST > 0 && gstPercentage > 0) {
          const expectedGST = exclGST * (gstPercentage / 100);
          const expectedInclGST = exclGST + expectedGST;
          
          // Allow 0.01 difference for rounding
          if (Math.abs(gstAmount - expectedGST) > 0.01) {
            incorrectCalculations++;
          }
          if (Math.abs(inclGST - expectedInclGST) > 0.01 && inclGST > 0) {
            incorrectCalculations++;
          }
        }
      });

      if (incorrectCalculations > 0) {
        issues.push(`${incorrectCalculations} records have incorrect GST calculations`);
      }

      return {
        name: 'GST Calculation Validation',
        status: issues.length === 0 ? 'pass' : 'warning',
        message: issues.length > 0
          ? issues.join(', ')
          : `GST calculations are correct for ${outgoingData.length} sales records`,
        data: {
          totalOutgoingRecords: outgoingData.length,
          totalIncomingRecords: incomingData.length,
          incorrectCalculations,
        },
      };
    } catch (error: any) {
      return {
        name: 'GST Calculation Validation',
        status: 'fail',
        message: error.message || 'Failed to validate GST calculations',
      };
    }
  };

  const testDateRangeValidation = async (): Promise<TestResult> => {
    try {
      const today = new Date();
      const futureDate = new Date(today);
      futureDate.setDate(today.getDate() + 30);
      
      const dateFrom = today.toISOString().split('T')[0];
      const dateTo = futureDate.toISOString().split('T')[0];

      // Test with future date range
      const response = await inventoryService.getIncomingHistory({ dateFrom, dateTo });
      const data = response.data || [];

      // Check if dates are in the future
      const futureRecords = data.filter((record: any) => {
        const recordDate = record.receivingDate || record.receiving_date;
        if (!recordDate) return false;
        const date = new Date(recordDate);
        return date > today;
      }).length;

      return {
        name: 'Date Range Validation',
        status: futureRecords === 0 ? 'pass' : 'warning',
        message: futureRecords > 0
          ? `Found ${futureRecords} records with future dates (data issue)`
          : 'Date ranges are valid',
        data: {
          totalRecords: data.length,
          futureRecords,
        },
      };
    } catch (error: any) {
      return {
        name: 'Date Range Validation',
        status: 'fail',
        message: error.message || 'Failed to validate date ranges',
      };
    }
  };

  const runAllTests = async () => {
    setLoading(true);
    setTestResults([]);

    const tests = [
      { name: 'API Health', fn: testAPIHealth },
      { name: 'Authentication', fn: testAuthentication },
      { name: 'SKU API', fn: testSKUAPI },
      { name: 'Incoming History', fn: testIncomingHistory },
      { name: 'Outgoing History', fn: testOutgoingHistory },
      { name: 'Finance Calculations', fn: testFinanceCalculations },
      { name: 'Data Integrity', fn: testDataIntegrity },
      { name: 'Date Field Mapping', fn: testDateFieldMapping },
      { name: 'API Response Time', fn: testAPIResponseTime },
      { name: 'Dashboard Data', fn: testDashboardData },
      { name: 'GST Calculation Validation', fn: testGSTCalculation },
      { name: 'Date Range Validation', fn: testDateRangeValidation },
    ];

    const results: TestResult[] = [];
    for (const test of tests) {
      const result = await runTest(test.name, test.fn);
      results.push(result);
      setTestResults([...results]);
    }

    setLoading(false);
  };

  const runSingleTest = async (testName: string) => {
    setLoading(true);
    const testMap: { [key: string]: () => Promise<TestResult> } = {
      'API Health': testAPIHealth,
      'Authentication': testAuthentication,
      'SKU API': testSKUAPI,
      'Incoming History': testIncomingHistory,
      'Outgoing History': testOutgoingHistory,
      'Finance Calculations': testFinanceCalculations,
      'Data Integrity': testDataIntegrity,
      'Date Field Mapping': testDateFieldMapping,
      'API Response Time': testAPIResponseTime,
      'Dashboard Data': testDashboardData,
      'GST Calculation Validation': testGSTCalculation,
      'Date Range Validation': testDateRangeValidation,
    };

    if (testMap[testName]) {
      const result = await runTest(testName, testMap[testName]);
      setTestResults([result]);
    }
    setLoading(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'fail':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      default:
        return <RefreshCw className="w-5 h-5 text-gray-400 animate-spin" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass':
        return 'bg-green-50 border-green-200';
      case 'fail':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="p-8 space-y-6 w-full bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/app/dashboard')}
            className="text-slate-600 hover:text-indigo-600 transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-[28.8px] font-bold leading-[1.2] tracking-tight text-slate-900">System Test & Diagnostics</h1>
            <p className="text-[14px] font-normal leading-[1.5] text-slate-500 mt-1">
              Test system components, API endpoints, and data integrity
            </p>
          </div>
        </div>
        <button
          onClick={runAllTests}
          disabled={loading}
          className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          Run All Tests
        </button>
      </div>

      {/* Quick Test Buttons */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Tests</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {[
            { name: 'API Health', icon: Database },
            { name: 'Authentication', icon: Database },
            { name: 'SKU API', icon: Database },
            { name: 'Incoming History', icon: FileText },
            { name: 'Outgoing History', icon: FileText },
            { name: 'Finance Calculations', icon: Calculator },
            { name: 'Data Integrity', icon: Database },
            { name: 'Date Field Mapping', icon: FileText },
            { name: 'API Response Time', icon: Database },
            { name: 'Dashboard Data', icon: Database },
            { name: 'GST Calculation Validation', icon: Calculator },
            { name: 'Date Range Validation', icon: FileText },
          ].map((test) => (
            <button
              key={test.name}
              onClick={() => runSingleTest(test.name)}
              disabled={loading}
              className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 flex flex-col items-center gap-2"
            >
              <test.icon className="w-6 h-6 text-indigo-600" />
              <span className="text-xs font-medium text-gray-700 text-center">{test.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Test Results */}
      {testResults.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-gray-900">Test Results</h2>
          {testResults.map((result, index) => (
            <div
              key={index}
              className={`bg-white rounded-xl shadow-sm p-6 border-2 ${getStatusColor(result.status)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  {getStatusIcon(result.status)}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-gray-900">{result.name}</h3>
                      {result.duration && (
                        <span className="text-xs text-gray-500">({result.duration}ms)</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 mb-3">{result.message}</p>
                    {result.data && (
                      <div className="mt-4">
                        <button
                          onClick={() => setSelectedTest(selectedTest === result.name ? null : result.name)}
                          className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                        >
                          {selectedTest === result.name ? 'Hide' : 'Show'} Details
                        </button>
                        {selectedTest === result.name && (
                          <pre className="mt-3 p-4 bg-gray-50 rounded-lg text-xs overflow-auto max-h-96 border border-gray-200">
                            {JSON.stringify(result.data, null, 2)}
                          </pre>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  result.status === 'pass' ? 'bg-green-100 text-green-700' :
                  result.status === 'fail' ? 'bg-red-100 text-red-700' :
                  result.status === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {result.status.toUpperCase()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary */}
      {testResults.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Test Summary</h2>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900">{testResults.length}</div>
              <div className="text-sm text-gray-500">Total Tests</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {testResults.filter(r => r.status === 'pass').length}
              </div>
              <div className="text-sm text-gray-500">Passed</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-yellow-600">
                {testResults.filter(r => r.status === 'warning').length}
              </div>
              <div className="text-sm text-gray-500">Warnings</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600">
                {testResults.filter(r => r.status === 'fail').length}
              </div>
              <div className="text-sm text-gray-500">Failed</div>
            </div>
          </div>
        </div>
      )}

      {loading && testResults.length === 0 && (
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <RefreshCw className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Running tests...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemTestPage;

