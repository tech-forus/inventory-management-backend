import React, { useState, useEffect } from 'react';
import { useSidebar } from '../contexts/SidebarContext';
import { skuService } from '../services/skuService';
import { inventoryService } from '../services/inventoryService';
import { formatNumber } from '../utils/formatters';
import DashboardHeader from '../components/dashboard/DashboardHeader';
import DashboardView from '../components/dashboard/DashboardView';
import { Metric, MovementData, CategoryData, TopProduct } from '../constants/dashboard';
import { Package, Clock, AlertTriangle, AlertCircle } from 'lucide-react';

const Dashboard: React.FC = () => {
  const { isOpen, toggleSidebar } = useSidebar();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [movementData, setMovementData] = useState<MovementData[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load all data in parallel
      // Calculate date range for last 7 days
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Normalize to start of day
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(today.getDate() - 7);
      const dateFrom = sevenDaysAgo.toISOString().split('T')[0];
      const dateTo = today.toISOString().split('T')[0];

      const [skuResponse, slowMovingRes, nonMovableRes, mostSellingRes, incomingRes, outgoingRes] = await Promise.all([
        skuService.getAll({ limit: 10000 }).catch(() => ({ data: [] })),
        skuService.getSlowMoving({ period: 90 }).catch(() => ({ data: [] })),
        skuService.getNonMovable({ period: 180 }).catch(() => ({ data: [] })),
        skuService.getMostSelling({ period: 30, sortBy: 'units' }).catch(() => ({ data: [] })),
        inventoryService.getIncomingHistory({ dateFrom, dateTo }).catch(() => ({ data: [] })),
        inventoryService.getOutgoingHistory({ dateFrom, dateTo }).catch(() => ({ data: [] })),
      ]);

      const skus = skuResponse.data || [];
      const slowMoving = slowMovingRes.data || [];
      const nonMovable = nonMovableRes.data || [];
      const mostSelling = mostSellingRes.data || [];
      const incoming = Array.isArray(incomingRes.data) ? incomingRes.data : [];
      const outgoing = Array.isArray(outgoingRes.data) ? outgoingRes.data : [];

      // Calculate metrics
      const totalSKUs = skus.length;

      const lowStockItems = skus.filter((sku: any) => {
        const currentStock = sku.currentStock || 0;
        const minStock = sku.minStockLevel || sku.minStock || sku.min_stock || 0;
        return currentStock > 0 && currentStock <= minStock;
      }).length;

      const outOfStockItems = skus.filter((sku: any) => {
        return (sku.currentStock || 0) === 0;
      }).length;

      // Set metrics
      setMetrics([
        {
          label: 'TOTAL SKUS',
          value: formatNumber(totalSKUs),
          icon: Package,
          iconColor: 'text-blue-600',
          bgColor: 'bg-blue-50',
        },
        {
          label: 'SLOW MOVING SKUS',
          value: formatNumber(slowMoving.length),
          icon: Clock,
          iconColor: 'text-amber-600',
          bgColor: 'bg-amber-50',
        },
        {
          label: 'NON-MOVABLE SKUS',
          value: formatNumber(nonMovable.length),
          icon: AlertTriangle,
          iconColor: 'text-rose-600',
          bgColor: 'bg-rose-50',
        },
        {
          label: 'LOW STOCK ALERTS',
          value: formatNumber(lowStockItems),
          icon: AlertCircle,
          iconColor: 'text-red-600',
          bgColor: 'bg-red-50',
        },
      ]);

      // Calculate movement data for last 7 days
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const movement: MovementData[] = [];

      // Loop through last 7 days (6 days ago to today)
      // Reuse 'today' variable declared above
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        date.setHours(0, 0, 0, 0); // Normalize to start of day
        
        const dayName = days[date.getDay()];
        const dateStr = date.toISOString().split('T')[0];

        // Calculate incoming amounts (EXPENSES/PURCHASES) for this day - GST excluded
        // Incoming = money spent on purchases
        // History endpoint returns records grouped by invoice with receivingDate
        const incomingForDay = incoming.filter((record: any) => {
          // History endpoint uses receivingDate (from model line 247)
          const recordDate = record.receivingDate || record.receiving_date || record.invoiceDate || record.invoice_date || record.createdAt;
          if (!recordDate) return false;
          try {
            const recordDateObj = new Date(recordDate);
            recordDateObj.setHours(0, 0, 0, 0);
            const recordDateStr = recordDateObj.toISOString().split('T')[0];
            return recordDateStr === dateStr;
          } catch {
            return false;
          }
        });
        
        // Sum up expenses (purchases) - history endpoint has totalValueExclGst aggregated
        const incomingAmount = incomingForDay.reduce((sum: number, record: any) => {
          // History endpoint aggregates totalValueExclGst from items (model line 254)
          const value = parseFloat(record.totalValueExclGst || record.total_value_excl_gst || 0);
          // Validate: filter out invalid values (negative, NaN, or extremely large)
          if (isNaN(value) || value < 0 || value > 100000000) return sum;
          return sum + value;
        }, 0);

        // Calculate outgoing amounts (REVENUE/SALES) for this day - GST excluded
        // Outgoing = money received from sales
        // History endpoint returns item-level data with date field
        const outgoingForDay = outgoing.filter((record: any) => {
          // History endpoint uses 'date' field (transformOutgoingHistoryItem line 66-67)
          const recordDate = record.date || record.invoiceChallanDate || record.invoice_challan_date || record.createdAt;
          if (!recordDate) return false;
          try {
            const recordDateObj = new Date(recordDate);
            recordDateObj.setHours(0, 0, 0, 0);
            const recordDateStr = recordDateObj.toISOString().split('T')[0];
            return recordDateStr === dateStr;
          } catch {
            return false;
          }
        });
        
        // Sum up revenue (sales) - history endpoint has totalValueExclGst per item
        const outgoingAmount = outgoingForDay.reduce((sum: number, record: any) => {
          // History endpoint has totalValueExclGst per item (transformOutgoingHistoryItem line 77)
          const value = parseFloat(record.totalValueExclGst || record.total_value_excl_gst || 0);
          // Validate: filter out invalid values (negative, NaN, or extremely large)
          if (isNaN(value) || value < 0 || value > 100000000) return sum;
          return sum + value;
        }, 0);

        movement.push({
          day: `${dayName}\n${date.getDate()}`, // Day name with date below
          date: date.getDate(), // Day of month (1-31) for reference
          fullDate: dateStr, // Full date string for reference
          incomingAmount: Math.round(incomingAmount * 100) / 100, // Round to 2 decimals
          outgoingAmount: Math.round(outgoingAmount * 100) / 100, // Round to 2 decimals
        });
      }

      setMovementData(movement);

      // Calculate category distribution (count SKUs per category, not stock units)
      const categoryMap: Record<string, number> = {};
      skus.forEach((sku: any) => {
        const category = sku.productCategory || 'Uncategorized';
        categoryMap[category] = (categoryMap[category] || 0) + 1; // Count SKUs, not sum stock
      });

      const categories: CategoryData[] = Object.entries(categoryMap)
        .map(([name, value]) => ({ name, value: value as number }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 4);

      setCategoryData(categories);

      // Process top products
      const topProductsData: TopProduct[] = (mostSelling.slice(0, 5) || []).map((item: any, index: number) => {
        const stock = item.currentStock || 0;
        const minStock = item.minStockLevel || item.minStock || 0;

        let status: 'In Stock' | 'Low Stock' | 'Out of Stock' = 'In Stock';
        if (stock === 0) status = 'Out of Stock';
        else if (minStock > 0 && stock <= minStock) status = 'Low Stock';

        return {
          id: item.skuId || item.id || String(index),
          name: item.itemName || item.name || 'Unknown Item',
          category: (item.productCategory || item.category || 'UNCATEGORIZED').toUpperCase(),
          sold: item.unitsSold || 0,
          stock: stock,
          status: status,
        };
      });

      setTopProducts(topProductsData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <DashboardHeader
        onMenuClick={toggleSidebar}
        isSidebarOpen={isOpen}
        activeTabLabel="Dashboard"
      />
      <DashboardView
        metrics={metrics}
        movementData={movementData}
        categoryData={categoryData}
        topProducts={topProducts}
        loading={loading}
      />
    </>
  );
};

export default Dashboard;
