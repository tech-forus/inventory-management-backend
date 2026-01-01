import React, { useState, useEffect, useRef } from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { inventoryService } from '../services/inventoryService';
import { libraryService } from '../services/libraryService';
import { skuService } from '../services/skuService';
import { getDateRange, formatNumber, formatDate } from '../utils/formatters';
import { InventoryItem, IncomingInventoryRecord, OutgoingInventoryRecord } from '../components/inventory/types';
import { exportToExcel, exportToPDF } from '../utils/reportExporter';
import InventoryFilters from '../components/inventory/InventoryFilters';
import IncomingRecordsFilters from '../components/inventory/IncomingRecordsFilters';
import OutgoingRecordsFilters from '../components/inventory/OutgoingRecordsFilters';
import InventoryTable from '../components/inventory/InventoryTable';
import IncomingRecordsTable from '../components/inventory/IncomingRecordsTable';
import OutgoingRecordsTable from '../components/inventory/OutgoingRecordsTable';
import EditRejectedShortModal from '../components/inventory/EditRejectedShortModal';
import { IncomingInventoryItem, OutgoingInventoryItem } from '../components/inventory/types';
import { onCategoriesUpdated } from '../utils/categoriesEvents';
import { onInventoryUpdated } from '../utils/inventoryEvents';

const InventoryPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'all' | 'incoming' | 'outgoing'>('all');
  const [loading, setLoading] = useState(false);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [incomingRecords, setIncomingRecords] = useState<IncomingInventoryRecord[]>([]);
  const [outgoingRecords, setOutgoingRecords] = useState<OutgoingInventoryRecord[]>([]);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [expandedIncomingRows, setExpandedIncomingRows] = useState<Set<string>>(new Set());
  const [expandedOutgoingRows, setExpandedOutgoingRows] = useState<Set<string>>(new Set());
  const [incomingRecordItems, setIncomingRecordItems] = useState<Record<number, IncomingInventoryItem[]>>({});
  const [outgoingRecordItems, setOutgoingRecordItems] = useState<Record<number, OutgoingInventoryItem[]>>({});
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const exportDropdownRef = useRef<HTMLDivElement>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [productCategory, setProductCategory] = useState('');
  const [itemCategory, setItemCategory] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [brand, setBrand] = useState('');
  const [stockStatus, setStockStatus] = useState('all');
  
  // Date filters
  const [datePreset, setDatePreset] = useState<string>('');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);

  // Sorting
  const [sortBy, setSortBy] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Incoming records sorting
  const [incomingSortBy, setIncomingSortBy] = useState<string>('');
  const [incomingSortOrder, setIncomingSortOrder] = useState<'asc' | 'desc'>('asc');

  // Dropdown data
  const [productCategories, setProductCategories] = useState<any[]>([]);
  const [itemCategories, setItemCategories] = useState<any[]>([]);
  const [subCategories, setSubCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);

  // Incoming inventory filters
  const [incomingSearch, setIncomingSearch] = useState('');
  const [incomingDatePreset, setIncomingDatePreset] = useState<string>('');
  const [incomingCustomDateFrom, setIncomingCustomDateFrom] = useState('');
  const [incomingCustomDateTo, setIncomingCustomDateTo] = useState('');
  const [incomingShowCustomDatePicker, setIncomingShowCustomDatePicker] = useState(false);
  const [incomingFilterVendor, setIncomingFilterVendor] = useState('');
  const [incomingFilterStatus, setIncomingFilterStatus] = useState('');

  // Outgoing inventory filters
  const [outgoingDatePreset, setOutgoingDatePreset] = useState<string>('');
  const [outgoingCustomDateFrom, setOutgoingCustomDateFrom] = useState('');
  const [outgoingCustomDateTo, setOutgoingCustomDateTo] = useState('');
  const [outgoingShowCustomDatePicker, setOutgoingShowCustomDatePicker] = useState(false);
  const [outgoingFilterDestination, setOutgoingFilterDestination] = useState('');
  const [outgoingFilterStatus, setOutgoingFilterStatus] = useState('');

  // Edit rejected/short modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<IncomingInventoryRecord | null>(null);
  const [editingItems, setEditingItems] = useState<IncomingInventoryItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null);
  const [editFormData, setEditFormData] = useState({
    rejected: 0,
    short: 0,
    invoiceNumber: '',
    invoiceDate: '',
  });
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    return onCategoriesUpdated(() => {
      loadInitialData();
      if (productCategory) loadItemCategories(parseInt(productCategory));
      if (itemCategory) loadSubCategories(parseInt(itemCategory));
    });
  }, [productCategory, itemCategory]);

  useEffect(() => {
    return onInventoryUpdated(() => {
      if (activeTab === 'all') {
        loadInventory();
      } else if (activeTab === 'incoming') {
        loadIncomingRecords();
      } else if (activeTab === 'outgoing') {
        loadOutgoingRecords();
      }
    });
  }, [activeTab]);

  // Close export dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target as Node)) {
        setShowExportDropdown(false);
      }
    };

    if (showExportDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showExportDropdown]);

  useEffect(() => {
    if (activeTab === 'all') {
      loadInventory();
    } else if (activeTab === 'incoming') {
      loadIncomingRecords();
    } else if (activeTab === 'outgoing') {
      loadOutgoingRecords();
    }
  }, [activeTab, search, productCategory, itemCategory, subCategory, brand, stockStatus, datePreset, customDateFrom, customDateTo, sortBy, sortOrder, incomingDatePreset, incomingCustomDateFrom, incomingCustomDateTo, incomingFilterVendor, incomingFilterStatus, outgoingDatePreset, outgoingCustomDateFrom, outgoingCustomDateTo, outgoingFilterDestination, outgoingFilterStatus]);

  useEffect(() => {
    if (productCategory) {
      loadItemCategories(parseInt(productCategory));
    } else {
      setItemCategories([]);
      setItemCategory('');
      setSubCategory('');
      setSubCategories([]);
    }
  }, [productCategory]);

  useEffect(() => {
    if (itemCategory) {
      loadSubCategories(parseInt(itemCategory));
    } else {
      setSubCategories([]);
      setSubCategory('');
    }
  }, [itemCategory]);

  const loadInitialData = async () => {
    try {
      const [productCats, brandsData, vendorsData, customersData] = await Promise.all([
        libraryService.getYourProductCategories(),
        libraryService.getBrands(),
        libraryService.getYourVendors(),
        libraryService.getCustomers(),
      ]);
      setProductCategories(productCats.data || []);
      setBrands(brandsData.data || []);
      setVendors(vendorsData.data || []);
      setCustomers(customersData.data || []);
    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  };

  const loadItemCategories = async (productCategoryId: number) => {
    try {
      const response = await libraryService.getYourItemCategories(productCategoryId);
      setItemCategories(response.data || []);
    } catch (error) {
      console.error('Error loading item categories:', error);
    }
  };

  const loadSubCategories = async (itemCategoryId: number) => {
    try {
      const response = await libraryService.getYourSubCategories(itemCategoryId);
      setSubCategories(response.data || []);
    } catch (error) {
      console.error('Error loading sub categories:', error);
    }
  };

  const loadInventory = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (search) params.search = search;
      if (productCategory) params.productCategory = productCategory;
      if (itemCategory) params.itemCategory = itemCategory;
      if (subCategory) params.subCategory = subCategory;
      if (brand) params.brand = brand;
      if (stockStatus !== 'all') {
        // Map frontend values to backend expected values
        const statusMap: { [key: string]: string } = {
          'out_of_stock': 'out',
          'low_stock': 'low',
          'in_stock': 'in'
        };
        params.stockStatus = statusMap[stockStatus] || stockStatus;
      }

      // Handle date filters
      if (datePreset === 'custom') {
        if (customDateFrom) params.dateFrom = customDateFrom;
        if (customDateTo) params.dateTo = customDateTo;
      } else if (datePreset) {
        const dateRange = getDateRange(datePreset);
        if (dateRange) {
          params.dateFrom = dateRange.dateFrom;
          params.dateTo = dateRange.dateTo;
        }
      }

      const response = await skuService.getAll(params);
      let inventoryData = response.data || [];
      
      // Map backend fields to frontend interface fields for compatibility
      inventoryData = inventoryData.map((item: any) => ({
        ...item,
        lastUpdated: item.updatedAt || item.lastUpdated || item.last_updated || null,
        minStock: item.minStockLevel || item.minStock || item.min_stock || 0,
      }));
      
      // Client-side sorting
      if (sortBy && inventoryData.length > 0) {
        inventoryData = [...inventoryData].sort((a, b) => {
          let aValue: any;
          let bValue: any;
          
          switch (sortBy) {
            case 'productCategory':
              aValue = a.productCategory?.toLowerCase() || '';
              bValue = b.productCategory?.toLowerCase() || '';
              break;
            case 'itemCategory':
              aValue = a.itemCategory?.toLowerCase() || '';
              bValue = b.itemCategory?.toLowerCase() || '';
              break;
            case 'subCategory':
              aValue = a.subCategory?.toLowerCase() || '';
              bValue = b.subCategory?.toLowerCase() || '';
              break;
            case 'itemName':
              aValue = a.itemName?.toLowerCase() || '';
              bValue = b.itemName?.toLowerCase() || '';
              break;
            case 'brand':
              aValue = a.brand?.toLowerCase() || '';
              bValue = b.brand?.toLowerCase() || '';
              break;
            case 'vendor':
              aValue = a.vendor?.toLowerCase() || '';
              bValue = b.vendor?.toLowerCase() || '';
              break;
            case 'currentStock':
              aValue = a.currentStock ?? 0;
              bValue = b.currentStock ?? 0;
              break;
            default:
              return 0;
          }
          
          if (typeof aValue === 'string' && typeof bValue === 'string') {
            return sortOrder === 'asc' 
              ? aValue.localeCompare(bValue)
              : bValue.localeCompare(aValue);
          } else {
            return sortOrder === 'asc' 
              ? (aValue as number) - (bValue as number)
              : (bValue as number) - (aValue as number);
          }
        });
      }
      
      setInventory(inventoryData);
    } catch (error) {
      console.error('Error loading inventory:', error);
      setInventory([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      // Toggle sort order if same field
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new sort field with ascending order
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortBy !== field) {
      return (
        <span className="inline-flex flex-col ml-1 text-gray-400">
          <ArrowUp className="w-3 h-3 -mb-0.5" />
          <ArrowDown className="w-3 h-3" />
        </span>
      );
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="w-4 h-4 ml-1 text-blue-600" />
    ) : (
      <ArrowDown className="w-4 h-4 ml-1 text-blue-600" />
    );
  };

  const handleIncomingSort = (field: string) => {
    if (incomingSortBy === field) {
      // Toggle sort order if same field
      setIncomingSortOrder(incomingSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new sort field with ascending order
      setIncomingSortBy(field);
      setIncomingSortOrder('asc');
    }
  };

  const IncomingSortIcon = ({ field }: { field: string }) => {
    if (incomingSortBy !== field) {
      return (
        <span className="inline-flex flex-col ml-1 text-gray-400">
          <ArrowUp className="w-3 h-3 -mb-0.5" />
          <ArrowDown className="w-3 h-3" />
        </span>
      );
    }
    return incomingSortOrder === 'asc' ? (
      <ArrowUp className="w-4 h-4 ml-1 text-blue-600" />
    ) : (
      <ArrowDown className="w-4 h-4 ml-1 text-blue-600" />
    );
  };

  const handleDeleteItem = async (itemId: number) => {
    if (!window.confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      await skuService.delete(itemId);
      // Reload inventory to reflect the deletion
      await loadInventory();
      alert('Item deleted successfully');
    } catch (error: any) {
      console.error('Error deleting item:', error);
      alert(error.response?.data?.error || error.response?.data?.message || 'Failed to delete item');
    } finally {
      setLoading(false);
    }
  };

  const loadIncomingRecords = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (incomingFilterVendor) params.vendor = incomingFilterVendor;
      if (incomingFilterStatus) params.status = incomingFilterStatus;

      // Handle date filters
      if (incomingDatePreset === 'custom') {
        if (incomingCustomDateFrom) params.dateFrom = incomingCustomDateFrom;
        if (incomingCustomDateTo) params.dateTo = incomingCustomDateTo;
      } else if (incomingDatePreset) {
        const dateRange = getDateRange(incomingDatePreset);
        if (dateRange) {
          params.dateFrom = dateRange.dateFrom;
          params.dateTo = dateRange.dateTo;
        }
      }

      const response = await inventoryService.getIncoming(params);
      
      let records = [];
      if (response && response.success && Array.isArray(response.data)) {
        records = response.data;
      } else if (Array.isArray(response)) {
        records = response;
      } else if (response && Array.isArray(response.data)) {
        records = response.data;
      }
      
      setIncomingRecords(records);
      
      // Load items for all records in parallel
      const itemsMap: Record<number, IncomingInventoryItem[]> = {};
      const itemPromises = records.map(async (record: { id: number; items: IncomingInventoryItem[] }) => {
        try {
          const itemResponse = await inventoryService.getIncomingById(record.id);
          if (itemResponse.success && itemResponse.data.items) {
            itemsMap[record.id] = itemResponse.data.items;
          }
        } catch (error) {
          console.error(`Error loading items for record ${record.id}:`, error);
        }
      });
      
      await Promise.all(itemPromises);
      setIncomingRecordItems(itemsMap);
    } catch (error: any) {
      console.error('Error loading incoming records:', error);
      setIncomingRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDatePresetChange = (preset: string) => {
    setDatePreset(preset);
    if (preset === 'custom') {
      setShowCustomDatePicker(true);
    } else {
      setShowCustomDatePicker(false);
      setCustomDateFrom('');
      setCustomDateTo('');
    }
  };

  const handleIncomingDatePresetChange = (preset: string) => {
    setIncomingDatePreset(preset);
    if (preset === 'custom') {
      setIncomingShowCustomDatePicker(true);
    } else {
      setIncomingShowCustomDatePicker(false);
      setIncomingCustomDateFrom('');
      setIncomingCustomDateTo('');
    }
  };

  const handleOutgoingDatePresetChange = (preset: string) => {
    setOutgoingDatePreset(preset);
    if (preset === 'custom') {
      setOutgoingShowCustomDatePicker(true);
    } else {
      setOutgoingShowCustomDatePicker(false);
      setOutgoingCustomDateFrom('');
      setOutgoingCustomDateTo('');
    }
  };

  const loadOutgoingRecords = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (outgoingFilterDestination) params.destination = outgoingFilterDestination;
      if (outgoingFilterStatus) params.status = outgoingFilterStatus;

      // Handle date filters
      if (outgoingDatePreset === 'custom') {
        if (outgoingCustomDateFrom) params.dateFrom = outgoingCustomDateFrom;
        if (outgoingCustomDateTo) params.dateTo = outgoingCustomDateTo;
      } else if (outgoingDatePreset) {
        const dateRange = getDateRange(outgoingDatePreset);
        if (dateRange) {
          params.dateFrom = dateRange.dateFrom;
          params.dateTo = dateRange.dateTo;
        }
      }

      console.log('Loading outgoing records with params:', params);
      const response = await inventoryService.getOutgoing(params);
      console.log('Outgoing records response:', response);
      
      let records = [];
      if (response && response.success && Array.isArray(response.data)) {
        records = response.data;
      } else if (Array.isArray(response)) {
        records = response;
      } else if (response && response.data && Array.isArray(response.data)) {
        records = response.data;
      }
      
      console.log('Parsed records:', records);
      setOutgoingRecords(records);
      
      // Load items for all records in parallel
      const itemsMap: Record<number, OutgoingInventoryItem[]> = {};
      if (records.length > 0) {
        const itemPromises = records.map(async (record: { id: number; items: OutgoingInventoryItem[] }) => {
          try {
            const itemResponse = await inventoryService.getOutgoingById(record.id);
            console.log(`Items for record ${record.id}:`, itemResponse);
            if (itemResponse?.success && itemResponse.data?.items) {
              itemsMap[record.id] = itemResponse.data.items;
            } else if (itemResponse?.data?.items) {
              itemsMap[record.id] = itemResponse.data.items;
            }
          } catch (error) {
            console.error(`Error loading items for record ${record.id}:`, error);
          }
        });
        
        await Promise.all(itemPromises);
        console.log('Items map:', itemsMap);
      }
      setOutgoingRecordItems(itemsMap);
    } catch (error: any) {
      console.error('Error loading outgoing records:', error);
      setOutgoingRecords([]);
      setOutgoingRecordItems({});
    } finally {
      setLoading(false);
    }
  };

  const toggleOutgoingRow = async (itemKey: string) => {
    const newExpanded = new Set(expandedOutgoingRows);
    if (newExpanded.has(itemKey)) {
      newExpanded.delete(itemKey);
    } else {
      newExpanded.add(itemKey);
      // Parse record ID from itemKey (format: "recordId-itemId")
      const [recordIdStr] = itemKey.split('-');
      const recordId = parseInt(recordIdStr);
      
      // Fetch items if not already loaded
      if (!outgoingRecordItems[recordId]) {
        try {
          const itemResponse = await inventoryService.getOutgoingById(recordId);
          if (itemResponse?.success && itemResponse.data?.items) {
            setOutgoingRecordItems(prev => ({
              ...prev,
              [recordId]: itemResponse.data.items
            }));
          } else if (itemResponse?.data?.items) {
            setOutgoingRecordItems(prev => ({
              ...prev,
              [recordId]: itemResponse.data.items
            }));
          }
        } catch (error) {
          console.error('Error loading record items:', error);
        }
      }
    }
    setExpandedOutgoingRows(newExpanded);
  };

  const toggleRow = (id: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const toggleIncomingRow = async (itemKey: string) => {
    const newExpanded = new Set(expandedIncomingRows);
    if (newExpanded.has(itemKey)) {
      newExpanded.delete(itemKey);
    } else {
      newExpanded.add(itemKey);
      // Parse record ID from itemKey (format: "recordId-itemId")
      const [recordIdStr] = itemKey.split('-');
      const recordId = parseInt(recordIdStr);
      
      // Fetch items if not already loaded
      if (!incomingRecordItems[recordId]) {
        try {
          const response = await inventoryService.getIncomingById(recordId);
          if (response.success && response.data.items) {
            setIncomingRecordItems(prev => ({
              ...prev,
              [recordId]: response.data.items
            }));
          }
        } catch (error) {
          console.error('Error loading record items:', error);
        }
      }
    }
    setExpandedIncomingRows(newExpanded);
  };

  const handleEditRejectedShort = async (record: IncomingInventoryRecord, item: IncomingInventoryItem) => {
    try {
      setEditingRecord(record);
      
      // Fetch record details to get all items
      const response = await inventoryService.getIncomingById(record.id);
      
      if (response.success && response.data.items && response.data.items.length > 0) {
        setEditingItems(response.data.items);
        const itemId = item.itemId || item.item_id || item.id;
        setSelectedItemId(itemId || null);
        setEditFormData({
          rejected: item.rejected || 0,
          short: item.short || 0,
          invoiceNumber: record.invoiceNumber || '',
          invoiceDate: record.invoiceDate || '',
        });
      } else {
        const itemId = item.itemId || item.item_id || item.id || 0;
        setEditingItems([item]);
        setSelectedItemId(itemId);
        setEditFormData({
          rejected: item.rejected || 0,
          short: item.short || 0,
          invoiceNumber: record.invoiceNumber || '',
          invoiceDate: record.invoiceDate || '',
        });
      }

      setEditModalOpen(true);
    } catch (error) {
      console.error('Error loading record details:', error);
      const itemId = item.itemId || item.item_id || item.id || 0;
      setEditingItems([item]);
      setSelectedItemId(itemId);
      setEditFormData({
        rejected: item.rejected || 0,
        short: item.short || 0,
        invoiceNumber: record.invoiceNumber || '',
        invoiceDate: record.invoiceDate || '',
      });
      setEditModalOpen(true);
    }
  };

  const handleUpdateRejectedShort = async () => {
    if (!editingRecord || selectedItemId === null) {
      alert('Please select an item to update');
      return;
    }

    const selectedItem = editingItems.find(item => {
      const itemId = item.itemId || item.item_id || item.id;
      return itemId === selectedItemId;
    });
    
    if (!selectedItem) {
      alert('Selected item not found');
      return;
    }

    // Validate: new values cannot exceed original values
    const originalRejected = selectedItem.rejected || 0;
    const originalShort = selectedItem.short || 0;
    
    if (editFormData.rejected > originalRejected || editFormData.short > originalShort) {
      alert(`Updated rejected/short values cannot exceed the original values (Rejected: ${originalRejected}, Short: ${originalShort})`);
      return;
    }

    // Validate: at least one value should be changed
    if (editFormData.rejected === originalRejected && editFormData.short === originalShort) {
      alert('No changes detected. Please update at least one value.');
      return;
    }

    // Validate: itemId must be valid (not 0, which is a fallback)
    if (selectedItemId === 0) {
      alert('Cannot update: Item details not available. Please refresh and try again.');
      return;
    }

    try {
      setUpdating(true);
      await inventoryService.updateRejectedShort(editingRecord.id, {
        itemId: selectedItemId,
        rejected: editFormData.rejected,
        short: editFormData.short,
        invoiceNumber: editFormData.invoiceNumber || undefined,
        invoiceDate: editFormData.invoiceDate || undefined,
      });

      // Reload records
      await loadIncomingRecords();
      setEditModalOpen(false);
      setEditingRecord(null);
      setEditingItems([]);
      setSelectedItemId(null);
      alert('Rejected/Short quantities updated successfully. Stock has been adjusted.');
    } catch (error: any) {
      console.error('Error updating rejected/short:', error);
      alert(error.response?.data?.error || error.response?.data?.message || 'Failed to update rejected/short');
    } finally {
      setUpdating(false);
    }
  };

  const handleItemsUpdate = async (recordId?: number) => {
    // Refresh items for a specific record if provided
    if (recordId) {
      try {
        const response = await inventoryService.getIncomingItems(recordId);
        if (response.success && response.data) {
          setIncomingRecordItems(prev => ({
            ...prev,
            [recordId]: response.data
          }));
        }
      } catch (error) {
        console.error('Error refreshing items:', error);
      }
    }
    
    // Also refresh items for editingRecord if it exists
    if (editingRecord) {
      const response = await inventoryService.getIncomingById(editingRecord.id);
      if (response.success && response.data.items) {
        setIncomingRecordItems(prev => ({
          ...prev,
          [editingRecord.id]: response.data.items
        }));
      }
    }
    
    // Refresh the records list to get updated rejected/short values
    await loadIncomingRecords();
  };

  const handleExportPDF = async () => {
    setShowExportDropdown(false);
    try {
      const headers = ['SKU ID', 'Product Category', 'Item Category', 'Sub Category', 'Item Name', 'Brand', 'Vendor', 'Model Number', 'HSN Code', 'Current Stock'];
      const rows = inventory.map((item) => [
        item.skuId || '-',
        item.productCategory || '-',
        item.itemCategory || '-',
        item.subCategory || '-',
        item.itemName || '-',
        item.brand || '-',
        item.vendor || '-',
        item.model || '-',
        item.hsnSacCode || '-',
        formatNumber(item.currentStock || 0),
      ]);

      const dateRange = datePreset ? getDateRange(datePreset) : null;
      const dateRangeStr = dateRange 
        ? `Date Range: ${formatDate(dateRange.dateFrom)} to ${formatDate(dateRange.dateTo)}`
        : '';

      await exportToPDF({
        headers,
        rows,
        title: 'Inventory Report',
        dateRange: dateRangeStr,
      });
    } catch (error: any) {
      console.error('Error exporting PDF:', error);
      alert('Failed to export PDF');
    }
  };

  const handleExportExcel = async () => {
    setShowExportDropdown(false);
    try {
      const headers = ['SKU ID', 'Product Category', 'Item Category', 'Sub Category', 'Item Name', 'Brand', 'Vendor', 'Model Number', 'HSN Code', 'Current Stock'];
      const rows = inventory.map((item) => [
        item.skuId || '-',
        item.productCategory || '-',
        item.itemCategory || '-',
        item.subCategory || '-',
        item.itemName || '-',
        item.brand || '-',
        item.vendor || '-',
        item.model || '-',
        item.hsnSacCode || '-',
        formatNumber(item.currentStock || 0),
      ]);

      const dateRange = datePreset ? getDateRange(datePreset) : null;
      const dateRangeStr = dateRange 
        ? `Date Range: ${formatDate(dateRange.dateFrom)} to ${formatDate(dateRange.dateTo)}`
        : '';

      await exportToExcel({
        headers,
        rows,
        title: 'Inventory Report',
        dateRange: dateRangeStr,
      });
    } catch (error: any) {
      console.error('Error exporting Excel:', error);
      alert('Failed to export Excel');
    }
  };

  const handleExportCSV = async () => {
    setShowExportDropdown(false);
    try {
      const headers = ['SKU ID', 'Product Category', 'Item Category', 'Sub Category', 'Item Name', 'Brand', 'Vendor', 'Model Number', 'HSN Code', 'Current Stock'];
      const rows = inventory.map((item) => [
        item.skuId || '-',
        item.productCategory || '-',
        item.itemCategory || '-',
        item.subCategory || '-',
        item.itemName || '-',
        item.brand || '-',
        item.vendor || '-',
        item.model || '-',
        item.hsnSacCode || '-',
        formatNumber(item.currentStock || 0),
      ]);

      // Create CSV content
      const csvContent = [
        ['Inventory Report'],
        datePreset ? [getDateRange(datePreset) ? `Date Range: ${formatDate(getDateRange(datePreset)!.dateFrom)} to ${formatDate(getDateRange(datePreset)!.dateTo)}` : ''] : [],
        [],
        headers,
        ...rows
      ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `Inventory_Report_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error: any) {
      console.error('Error exporting CSV:', error);
      alert('Failed to export CSV');
    }
  };

  return (
    <div className="p-6 space-y-7 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <h1 className="text-[21.6px] font-semibold leading-[1.2] tracking-[-0.01em] text-slate-900">Inventory</h1>
          <p className="text-[12.6px] font-normal leading-[1.5] text-slate-500">Comprehensive inventory tracking and management system.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-[1.875rem] border border-slate-100 shadow-sm p-[6px]">
        <nav className="flex space-x-[6px]">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-[18px] py-[9px] rounded-xl font-black text-[11.7px] uppercase tracking-wider transition-all ${
              activeTab === 'all'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            All Inventory
          </button>
          <button
            onClick={() => setActiveTab('incoming')}
            className={`px-[18px] py-[9px] rounded-xl font-black text-[11.7px] uppercase tracking-wider transition-all ${
              activeTab === 'incoming'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            Incoming Records
          </button>
          <button
            onClick={() => setActiveTab('outgoing')}
            className={`px-[18px] py-[9px] rounded-xl font-black text-[11.7px] uppercase tracking-wider transition-all ${
              activeTab === 'outgoing'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            Outgoing Records
          </button>
        </nav>
      </div>

      {activeTab === 'all' && (
        <>
          <InventoryFilters
            search={search}
            productCategory={productCategory}
            itemCategory={itemCategory}
            subCategory={subCategory}
            brand={brand}
            stockStatus={stockStatus}
            datePreset={datePreset}
            customDateFrom={customDateFrom}
            customDateTo={customDateTo}
            showCustomDatePicker={showCustomDatePicker}
            productCategories={productCategories}
            itemCategories={itemCategories}
            subCategories={subCategories}
            brands={brands}
            onSearchChange={setSearch}
            onProductCategoryChange={setProductCategory}
            onItemCategoryChange={setItemCategory}
            onSubCategoryChange={setSubCategory}
            onBrandChange={setBrand}
            onStockStatusChange={setStockStatus}
            onDatePresetChange={handleDatePresetChange}
            onCustomDateFromChange={setCustomDateFrom}
            onCustomDateToChange={setCustomDateTo}
            onClearDateFilter={() => {
                        setDatePreset('');
                        setCustomDateFrom('');
                        setCustomDateTo('');
                        setShowCustomDatePicker(false);
                      }}
            showExportDropdown={showExportDropdown}
            onExportDropdownToggle={() => setShowExportDropdown(!showExportDropdown)}
            onExportPDF={handleExportPDF}
            onExportExcel={handleExportExcel}
            onExportCSV={handleExportCSV}
            exportDropdownRef={exportDropdownRef}
            loading={loading}
          />

          <InventoryTable
            inventory={inventory}
            loading={loading}
            expandedRows={expandedRows}
            onToggleRow={toggleRow}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSort={handleSort}
            SortIcon={SortIcon}
          />
        </>
      )}

      {activeTab === 'incoming' && (
        <>
          <IncomingRecordsFilters
            search={incomingSearch}
            vendor={incomingFilterVendor}
            status={incomingFilterStatus}
            datePreset={incomingDatePreset}
            customDateFrom={incomingCustomDateFrom}
            customDateTo={incomingCustomDateTo}
            showCustomDatePicker={incomingShowCustomDatePicker}
            vendors={vendors}
            onSearchChange={setIncomingSearch}
            onVendorChange={setIncomingFilterVendor}
            onStatusChange={setIncomingFilterStatus}
            onDatePresetChange={handleIncomingDatePresetChange}
            onCustomDateFromChange={setIncomingCustomDateFrom}
            onCustomDateToChange={setIncomingCustomDateTo}
            onClearDateFilter={() => {
                        setIncomingDatePreset('');
                        setIncomingCustomDateFrom('');
                        setIncomingCustomDateTo('');
                        setIncomingShowCustomDatePicker(false);
                      }}
          />

          <IncomingRecordsTable
            records={incomingRecords}
            loading={loading}
            expandedRows={expandedIncomingRows}
            recordItems={incomingRecordItems}
            onToggleRow={toggleIncomingRow}
            onEditRejectedShort={handleEditRejectedShort}
            onItemsUpdate={handleItemsUpdate}
            sortBy={incomingSortBy}
            sortOrder={incomingSortOrder}
            onSort={handleIncomingSort}
            SortIcon={IncomingSortIcon}
            search={incomingSearch}
          />
        </>
      )}

      {activeTab === 'outgoing' && (
        <>
          <OutgoingRecordsFilters
            destination={outgoingFilterDestination}
            status={outgoingFilterStatus}
            datePreset={outgoingDatePreset}
            customDateFrom={outgoingCustomDateFrom}
            customDateTo={outgoingCustomDateTo}
            showCustomDatePicker={outgoingShowCustomDatePicker}
            customers={customers}
            vendors={vendors}
            onDestinationChange={setOutgoingFilterDestination}
            onStatusChange={setOutgoingFilterStatus}
            onDatePresetChange={handleOutgoingDatePresetChange}
            onCustomDateFromChange={setOutgoingCustomDateFrom}
            onCustomDateToChange={setOutgoingCustomDateTo}
            onClearDateFilter={() => {
              setOutgoingDatePreset('');
              setOutgoingCustomDateFrom('');
              setOutgoingCustomDateTo('');
              setOutgoingShowCustomDatePicker(false);
            }}
          />

          <OutgoingRecordsTable
            records={outgoingRecords}
            loading={loading}
            expandedRows={expandedOutgoingRows}
            recordItems={outgoingRecordItems}
            onToggleRow={toggleOutgoingRow}
          />
        </>
      )}

      <EditRejectedShortModal
        isOpen={editModalOpen}
        record={editingRecord}
        items={editingItems}
        selectedItemId={selectedItemId}
        formData={editFormData}
        updating={updating}
        onClose={() => {
                  setEditModalOpen(false);
                  setEditingRecord(null);
                  setEditingItems([]);
                  setSelectedItemId(null);
                }}
        onItemSelect={(itemId) => {
                      setSelectedItemId(itemId);
          const item = editingItems.find(i => {
            const id = i.itemId || i.item_id || i.id;
            return id === itemId;
          });
                      if (item) {
                        setEditFormData(prev => ({
                          ...prev,
                          rejected: item.rejected || 0,
                          short: item.short || 0,
                        }));
                      }
                    }}
        onFormDataChange={(data) => {
          setEditFormData(prev => ({ ...prev, ...data }));
        }}
        onUpdate={handleUpdateRejectedShort}
      />
    </div>
  );
};

export default InventoryPage;
