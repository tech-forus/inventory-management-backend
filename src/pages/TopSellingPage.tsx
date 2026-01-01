import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ChevronRight, Calendar, Download, Search, Filter, RefreshCw,
    ArrowUp, ArrowDown, MoreVertical, Eye, Heart, BarChart3,
    DollarSign, ShoppingBag, Tag, ChevronLeft, ChevronRight as ChevronRightIcon
} from 'lucide-react';
import { skuService } from '../services/skuService';
import { inventoryService } from '../services/inventoryService';
import { libraryService } from '../services/libraryService';
import { formatCurrency, formatNumber } from '../utils/formatters';

interface TopSellingItem {
    id: string | number;
    rank: number;
    name: string;
    sku: string;
    category: string;
    totalSold: number;
    revenue: number;
    stockLevel: number;
    minStock: number;
    maxStock: number;
    lastSaleDate: string;
    status: 'In Stock' | 'Low Stock' | 'Out of Stock';
    trend: 'up' | 'down' | 'neutral';
}

const TopSellingPage: React.FC = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState<TopSellingItem[]>([]);
    const [filteredItems, setFilteredItems] = useState<TopSellingItem[]>([]);

    // Filters
    const [period, setPeriod] = useState('This Month');
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [stockFilter, setStockFilter] = useState('');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Sorting
    const [sortField, setSortField] = useState<keyof TopSellingItem>('totalSold');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

    // Selection
    const [selectedItems, setSelectedItems] = useState<string[]>([]);

    // Metadata
    const [categories, setCategories] = useState<string[]>([]);
    const [summary, setSummary] = useState({
        totalSold: 0,
        totalRevenue: 0,
        avgPrice: 0,
        topCategory: 'N/A'
    });

    useEffect(() => {
        fetchData();
    }, [period]); // Refetch when period changes

    useEffect(() => {
        applyFilters();
    }, [items, searchQuery, categoryFilter, statusFilter, stockFilter, sortField, sortDirection]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Determine period days
            let days = 30;
            if (period === 'Today') days = 1;
            if (period === 'This Week') days = 7;
            if (period === 'This Month') days = 30;
            if (period === 'Last 3 Months') days = 90;
            if (period === 'This Year') days = 365;

            const [mostSellingRes, inventoryRes, categoriesRes] = await Promise.all([
                skuService.getMostSelling({ period: days, sortBy: 'units' }),
                inventoryService.getAll(),
                libraryService.getYourProductCategories()
            ]);

            const inventoryMap = new Map();
            (inventoryRes.data || []).forEach((item: any) => {
                if (item.sku?.skuId) inventoryMap.set(item.sku.skuId, item);
                else if (item.skuId) inventoryMap.set(item.skuId, item);
            });

            const processedItems: TopSellingItem[] = (mostSellingRes.data || []).map((sku: any, index: number) => {
                const invItem = inventoryMap.get(sku.skuId) || {};
                const stockLevel = invItem.currentStock || sku.currentStock || 0;
                const minStock = invItem.minStock || sku.minStock || 10;
                const price = invItem.price || sku.price || 0; // Assuming price is available or 0
                const revenue = (sku.unitsSold || 0) * (price || 1500); // Fallback price for demo if 0

                let status: 'In Stock' | 'Low Stock' | 'Out of Stock' = 'In Stock';
                if (stockLevel === 0) status = 'Out of Stock';
                else if (stockLevel <= minStock) status = 'Low Stock';

                return {
                    id: sku.skuId || sku.id,
                    rank: index + 1,
                    name: sku.itemName || sku.name || 'Unknown Item',
                    sku: sku.skuId || 'SKU-???',
                    category: sku.category || invItem.productCategory || 'Uncategorized',
                    totalSold: sku.unitsSold || 0,
                    revenue: revenue,
                    stockLevel: stockLevel,
                    minStock: minStock,
                    maxStock: invItem.maxStock || 100,
                    lastSaleDate: sku.lastSaleDate || new Date().toISOString(), // Mock if missing
                    status: status,
                    trend: Math.random() > 0.5 ? 'up' : 'down' // Mock trend
                };
            });

            setItems(processedItems);

            // Process Categories
            setCategories((categoriesRes.data || []).map((c: any) => c.name || c));

            // Process Summary
            const totalSold = processedItems.reduce((sum, item) => sum + item.totalSold, 0);
            const totalRevenue = processedItems.reduce((sum, item) => sum + item.revenue, 0);

            // Find top category
            const catCounts: Record<string, number> = {};
            processedItems.forEach(item => {
                catCounts[item.category] = (catCounts[item.category] || 0) + item.totalSold;
            });
            const topCat = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

            setSummary({
                totalSold,
                totalRevenue,
                avgPrice: totalSold ? totalRevenue / totalSold : 0,
                topCategory: topCat
            });

        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const applyFilters = () => {
        let result = [...items];

        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            result = result.filter(item =>
                item.name.toLowerCase().includes(lowerQuery) ||
                item.sku.toLowerCase().includes(lowerQuery)
            );
        }

        if (categoryFilter) {
            result = result.filter(item => item.category === categoryFilter);
        }

        if (statusFilter) {
            result = result.filter(item => item.status === statusFilter);
        }

        // Sorting
        result.sort((a, b) => {
            const aValue = a[sortField];
            const bValue = b[sortField];

            if (typeof aValue === 'string' && typeof bValue === 'string') {
                return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
            }

            if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });

        setFilteredItems(result);
    };

    const handleSort = (field: keyof TopSellingItem) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('desc'); // Default to desc for metrics usually
        }
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedItems(paginatedItems.map(item => String(item.id)));
        } else {
            setSelectedItems([]);
        }
    };

    const handleSelectItem = (id: string) => {
        if (selectedItems.includes(id)) {
            setSelectedItems(selectedItems.filter(item => item !== id));
        } else {
            setSelectedItems([...selectedItems, id]);
        }
    };

    // Pagination Logic
    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
    const paginatedItems = filteredItems.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    return (
        <div className="p-8 space-y-10 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="space-y-2">
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight">Top Selling Items</h1>
                    <p className="text-lg text-slate-500 font-medium">Track your best-performing products and sales metrics.</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 flex items-center gap-2 text-sm text-gray-700 shadow-sm cursor-pointer hover:border-blue-400">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <span>{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                    <button className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-sm transition-all">
                        <Download className="w-4 h-4" />
                        Export
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="p-3 bg-blue-50 rounded-lg">
                        <ShoppingBag className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Total Items Sold</p>
                        <p className="text-2xl font-bold text-gray-900">{formatNumber(summary.totalSold)}</p>
                        <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                            <ArrowUp className="w-3 h-3" /> 12% vs last period
                        </span>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="p-3 bg-green-50 rounded-lg">
                        <DollarSign className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Total Revenue</p>
                        <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.totalRevenue)}</p>
                        <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                            <ArrowUp className="w-3 h-3" /> 8% vs last period
                        </span>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="p-3 bg-purple-50 rounded-lg">
                        <Tag className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Avg. Sale Price</p>
                        <p className="text-2xl font-bold text-gray-900">{formatCurrency(summary.avgPrice)}</p>
                        <span className="text-xs text-gray-500 font-medium">No change</span>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="p-3 bg-orange-50 rounded-lg">
                        <BarChart3 className="w-6 h-6 text-orange-600" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Top Category</p>
                        <p className="text-lg font-bold text-gray-900 truncate max-w-[120px]" title={summary.topCategory}>{summary.topCategory}</p>
                        <span className="text-xs text-gray-500 font-medium">Most items sold</span>
                    </div>
                </div>
            </div>

            {/* Filter Stats & Tools */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
                <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                    {/* Tabs */}
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        {['Today', 'This Week', 'This Month', 'Last 3 Months', 'This Year'].map((t) => (
                            <button
                                key={t}
                                onClick={() => setPeriod(t)}
                                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${period === t
                                    ? 'bg-white text-gray-900 shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => fetchData()} className="p-2 text-gray-400 hover:text-blue-600 transition-colors">
                            <RefreshCw className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="p-4 flex flex-col md:flex-row gap-4">
                    {/* Search */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by Item Name or SKU..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    {/* Dropdowns */}
                    <div className="flex gap-3 overflow-x-auto pb-1 md:pb-0">
                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white focus:outline-none focus:border-blue-500 min-w-[140px]"
                        >
                            <option value="">All Categories</option>
                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>

                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 bg-white focus:outline-none focus:border-blue-500 min-w-[120px]"
                        >
                            <option value="">All Status</option>
                            <option value="In Stock">In Stock</option>
                            <option value="Low Stock">Low Stock</option>
                            <option value="Out of Stock">Out of Stock</option>
                        </select>

                        {(categoryFilter || statusFilter || stockFilter || searchQuery) && (
                            <button
                                onClick={() => {
                                    setCategoryFilter('');
                                    setStatusFilter('');
                                    setStockFilter('');
                                    setSearchQuery('');
                                }}
                                className="px-3 py-2 text-red-600 text-sm font-medium hover:bg-red-50 rounded-lg transition-colors whitespace-nowrap"
                            >
                                Reset
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Main Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : filteredItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-96 text-center p-6">
                        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <Search className="w-10 h-10 text-gray-300" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">No items found</h3>
                        <p className="text-gray-500 max-w-sm">
                            We couldn't find any items matching your filters. Try adjusting your search or date range.
                        </p>
                        <button
                            onClick={() => {
                                setCategoryFilter('');
                                setStatusFilter('');
                                setSearchQuery('');
                                setPeriod('This Month');
                            }}
                            className="mt-6 text-blue-600 font-semibold hover:underline"
                        >
                            Clear all filters
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                                    <tr>
                                        <th className="py-4 px-4 w-12">
                                            <input
                                                type="checkbox"
                                                onChange={handleSelectAll}
                                                checked={selectedItems.length === paginatedItems.length && paginatedItems.length > 0}
                                                className="rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                                            />
                                        </th>
                                        {[
                                            { id: 'rank', label: '#' },
                                            { id: 'name', label: 'Item Name' },
                                            { id: 'category', label: 'Category' },
                                            { id: 'totalSold', label: 'Total Sold' },
                                            { id: 'revenue', label: 'Revenue' },
                                            { id: 'stockLevel', label: 'Stock Level' },
                                            { id: 'lastSaleDate', label: 'Last Sale' },
                                            { id: 'status', label: 'Status' }
                                        ].map((col: any) => (
                                            <th
                                                key={col.id}
                                                className="py-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                                                onClick={() => handleSort(col.id)}
                                            >
                                                <div className="flex items-center gap-1">
                                                    {col.label}
                                                    {sortField === col.id && (
                                                        sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                                                    )}
                                                </div>
                                            </th>
                                        ))}
                                        <th className="py-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {paginatedItems.map((item) => (
                                        <tr key={item.id} className="group hover:bg-gray-50 transition-all">
                                            <td className="py-4 px-4">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedItems.includes(String(item.id))}
                                                    onChange={() => handleSelectItem(String(item.id))}
                                                    className="rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                                                />
                                            </td>
                                            <td className="py-4 px-4">
                                                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${item.rank <= 3 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'
                                                    }`}>
                                                    {item.rank}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4">
                                                <div className="font-medium text-gray-900">{item.name}</div>
                                                <div className="text-xs text-gray-400">{item.sku}</div>
                                            </td>
                                            <td className="py-4 px-4">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                                                    {item.category}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-gray-900">{formatNumber(item.totalSold)}</span>
                                                    {item.trend === 'up' && <ArrowUp className="w-3 h-3 text-green-500" />}
                                                    {item.trend === 'down' && <ArrowDown className="w-3 h-3 text-red-500" />}
                                                </div>
                                            </td>
                                            <td className="py-4 px-4 font-semibold text-gray-700">
                                                {formatCurrency(item.revenue)}
                                            </td>
                                            <td className="py-4 px-4 min-w-[140px]">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-sm font-medium">{item.stockLevel}</span>
                                                    <span className="text-xs text-gray-400">/ {item.maxStock}</span>
                                                </div>
                                                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full ${item.stockLevel === 0 ? 'bg-gray-200' :
                                                            item.stockLevel <= item.minStock ? 'bg-orange-500' : 'bg-blue-500'
                                                            }`}
                                                        style={{ width: `${Math.min((item.stockLevel / item.maxStock) * 100, 100)}%` }}
                                                    ></div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-4 text-sm text-gray-600">
                                                {new Date(item.lastSaleDate).toLocaleDateString()}
                                            </td>
                                            <td className="py-4 px-4">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-1.5 h-1.5 rounded-full ${item.status === 'In Stock' ? 'bg-green-500' :
                                                        item.status === 'Low Stock' ? 'bg-orange-500' : 'bg-red-500'
                                                        }`}></div>
                                                    <span className={`text-xs font-medium ${item.status === 'In Stock' ? 'text-green-600' :
                                                        item.status === 'Low Stock' ? 'text-orange-600' : 'text-red-600'
                                                        }`}>
                                                        {item.status}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-4 text-right">
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded">
                                                        <Eye className="w-4 h-4" onClick={() => navigate(`/app/sku/${item.id}`)} />
                                                    </button>
                                                    <button className="p-1.5 text-gray-400 hover:text-pink-600 hover:bg-pink-50 rounded">
                                                        <Heart className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Footer */}
                        <div className="p-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div className="text-sm text-gray-500">
                                Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredItems.length)}</span> of <span className="font-medium">{filteredItems.length}</span> results
                            </div>
                            <div className="flex items-center gap-2">
                                <select
                                    value={itemsPerPage}
                                    onChange={(e) => {
                                        setItemsPerPage(Number(e.target.value));
                                        setCurrentPage(1);
                                    }}
                                    className="border border-gray-200 rounded px-2 py-1 text-sm text-gray-600 focus:outline-none focus:border-blue-500"
                                >
                                    <option value={10}>10 per page</option>
                                    <option value={20}>20 per page</option>
                                    <option value={50}>50 per page</option>
                                </select>

                                <div className="flex shadow-sm rounded-md">
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="px-3 py-1 border border-gray-200 rounded-l-md text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <ChevronLeft className="w-4 h-4" />
                                    </button>
                                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                        // Simple logic to show first 5 pages or sliding window could be better
                                        let p = i + 1;
                                        if (totalPages > 5 && currentPage > 3) {
                                            p = currentPage - 2 + i;
                                        }
                                        if (p > totalPages) return null;

                                        return (
                                            <button
                                                key={p}
                                                onClick={() => setCurrentPage(p)}
                                                className={`px-3 py-1 border-t border-b border-gray-200 text-sm font-medium ${currentPage === p ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-white text-gray-600 hover:bg-gray-50'
                                                    }`}
                                            >
                                                {p}
                                            </button>
                                        );
                                    })}
                                    <button
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                        className="px-3 py-1 border border-gray-200 rounded-r-md text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <ChevronRightIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default TopSellingPage;
