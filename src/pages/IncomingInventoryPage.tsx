import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { inventoryService } from '../services/inventoryService';
import { libraryService } from '../services/libraryService';
import { skuService } from '../services/skuService';
import { InvoiceItem, IncomingInventoryFormData } from '../components/inventory/incomingInventory/types';
import DocumentDetailsSection from '../components/inventory/incomingInventory/DocumentDetailsSection';
import InvoiceDetailsSection from '../components/inventory/incomingInventory/InvoiceDetailsSection';
import ReceivingDetailsSection from '../components/inventory/incomingInventory/ReceivingDetailsSection';
import ItemDetailsSection from '../components/inventory/incomingInventory/ItemDetailsSection';
import AdditionalDetailsSection from '../components/inventory/incomingInventory/AdditionalDetailsSection';
import ActionButtons from '../components/inventory/incomingInventory/ActionButtons';
import HistoryFilters from '../components/inventory/incomingInventory/HistoryFilters';
import HistoryTable from '../components/inventory/incomingInventory/HistoryTable';
import PriceHistoryModal from '../components/inventory/incomingInventory/PriceHistoryModal';

const IncomingInventoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'add' | 'history'>('add');
  const [loading, setLoading] = useState(false);
  
  // Initialize with one empty item
  const createEmptyItem = (): InvoiceItem => ({
    id: Date.now().toString(),
    skuId: '',
    itemName: '',
    orderedQuantity: 0,
    received: 0,
    short: 0,
    total: 0,
    totalQuantity: 0,
    unitPrice: 0,
    totalExclGst: 0,
    gstRate: 0,
    gstAmount: 0,
    totalInclGst: 0,
    totalValue: 0,
    numberOfBoxes: 0,
    receivedBoxes: 0,
  });

  const [formData, setFormData] = useState<IncomingInventoryFormData>({
    documentType: 'bill',
    documentSubType: '',
    vendorSubType: '',
    deliveryChallanSubType: '',
    destinationType: 'vendor',
    destinationId: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    invoiceNumber: '',
    docketNumber: '',
    transportorName: '',
    vendorId: '',
    brandId: '',
    warranty: 0,
    warrantyUnit: 'months',
    receivingDate: new Date().toISOString().split('T')[0],
    useCurrentDate: true,
    receivedBy: '',
    remarks: '',
    items: [createEmptyItem()],
  });

  const [vendors, setVendors] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [skus, setSkus] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [expandedRows, setExpandedRows] = useState<{ [key: number]: boolean }>({});
  const [rowItems, setRowItems] = useState<{ [key: number]: any[] }>({});
  const [editingItem, setEditingItem] = useState<{ inventoryId: number; itemId: number } | null>(null);
  const [editFormData, setEditFormData] = useState<{ received: number; short: number; challanNumber: string; challanDate: string }>({
    received: 0,
    short: 0,
    challanNumber: '',
    challanDate: ''
  });
  
  // User and price history state
  const [user, setUser] = useState<any>(null);
  const [priceHistoryMap, setPriceHistoryMap] = useState<{ [key: string]: boolean }>({});
  const [priceHistoryModal, setPriceHistoryModal] = useState<{
    isOpen: boolean;
    skuId: string;
    loading: boolean;
    data: any;
  }>({
    isOpen: false,
    skuId: '',
    loading: false,
    data: null,
  });

  // History filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filterVendor, setFilterVendor] = useState('');
  const [filterSKU, setFilterSKU] = useState('');

  useEffect(() => {
    loadInitialData();
    loadUser();
  }, []);

  const loadUser = () => {
    const userData = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (userData) {
      try {
        const userObj = JSON.parse(userData);
        setUser(userObj);
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
  };

  const isAdmin = () => {
    return user?.role === 'admin' || user?.role === 'super_admin';
  };

  // Check price history for items when SKU is selected
  useEffect(() => {
    const checkPriceHistory = async () => {
      if (!isAdmin()) return;
      
      const checks = formData.items
        .filter(item => item.skuId)
        .map(async (item) => {
          try {
            const response = await inventoryService.hasPriceHistory(item.skuId);
            if (response.success) {
              setPriceHistoryMap(prev => ({
                ...prev,
                [item.skuId]: response.data.hasHistory
              }));
            }
          } catch (error) {
            console.error(`Error checking price history for SKU ${item.skuId}:`, error);
          }
        });
      
      await Promise.all(checks);
    };

    checkPriceHistory();
  }, [formData.items, user]);

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab, dateFrom, dateTo, filterVendor, filterSKU]);

  // Reset form when document type changes
  useEffect(() => {
    if (formData.documentType === 'transfer_note') {
      setFormData(prev => ({
        ...prev,
        documentSubType: '',
        vendorSubType: '',
        deliveryChallanSubType: '',
        destinationType: 'vendor',
        destinationId: '',
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        documentSubType: '',
        vendorSubType: '',
        deliveryChallanSubType: '',
        destinationType: prev.documentType === 'bill' ? 'vendor' : 'customer',
        destinationId: '',
      }));
    }
  }, [formData.documentType]);

  // Handle document subtype changes
  useEffect(() => {
    if (formData.documentType === 'bill') {
      if (formData.documentSubType === 'from_vendor') {
        setFormData(prev => ({ ...prev, destinationType: 'vendor', destinationId: '', vendorSubType: 'purchase_receipt' }));
      } else if (formData.documentSubType === 'from_customer') {
        setFormData(prev => ({ ...prev, destinationType: 'customer', destinationId: '', vendorSubType: '' }));
      }
    } else if (formData.documentType === 'delivery_challan') {
      if (formData.documentSubType === 'sample') {
        setFormData(prev => ({ ...prev, deliveryChallanSubType: '', destinationId: '' }));
      } else if (formData.documentSubType === 'replace') {
        setFormData(prev => ({ ...prev, destinationType: 'customer', deliveryChallanSubType: '', destinationId: '' }));
      }
    }
  }, [formData.documentSubType]);

  // Handle delivery challan sample subtype
  useEffect(() => {
    if (formData.documentType === 'delivery_challan' && formData.documentSubType === 'sample') {
      if (formData.deliveryChallanSubType === 'vendor') {
        setFormData(prev => ({ ...prev, destinationType: 'vendor', destinationId: '' }));
      } else if (formData.deliveryChallanSubType === 'customer') {
        setFormData(prev => ({ ...prev, destinationType: 'customer', destinationId: '' }));
      }
    }
  }, [formData.deliveryChallanSubType]);

  const loadInitialData = async () => {
    try {
      const [vendorsData, customersData, brandsData, teamsData, skusData] = await Promise.all([
        libraryService.getYourVendors(),
        libraryService.getCustomers(),
        libraryService.getYourBrands(),
        libraryService.getTeams(),
        skuService.getAll({ limit: 1000 }),
      ]);
      // Handle both response structures: direct array or { data: [...] }
      setVendors(Array.isArray(vendorsData) ? vendorsData : (vendorsData?.data || []));
      setCustomers(Array.isArray(customersData) ? customersData : (customersData?.data || []));
      setBrands(Array.isArray(brandsData) ? brandsData : (brandsData?.data || []));
      setTeams(Array.isArray(teamsData) ? teamsData : (teamsData?.data || []));
      setSkus(Array.isArray(skusData) ? skusData : (skusData?.data || []));
    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  };

  const loadHistory = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      if (filterVendor) params.vendor = filterVendor;
      if (filterSKU) params.sku = filterSKU;

      const response = await inventoryService.getIncomingHistory(params);
      setHistory(response.data || []);
      setExpandedRows({});
      setRowItems({});
    } catch (error) {
      console.error('Error loading history:', error);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const loadRowItems = async (inventoryId: number) => {
    try {
      const response = await inventoryService.getIncomingItems(inventoryId);
      setRowItems((prev) => ({ ...prev, [inventoryId]: response.data || [] }));
    } catch (error) {
      console.error('Error loading items:', error);
      setRowItems((prev) => ({ ...prev, [inventoryId]: [] }));
    }
  };

  const handleToggleRow = async (inventoryId: number) => {
    const isExpanded = expandedRows[inventoryId];
    setExpandedRows((prev) => ({ ...prev, [inventoryId]: !isExpanded }));
    
    if (!isExpanded && !rowItems[inventoryId]) {
      await loadRowItems(inventoryId);
    }
  };

  const handleMoveToRejected = async (inventoryId: number, itemId: number) => {
    if (!confirm('Are you sure you want to move this short quantity to rejected? This will update the stock.')) {
      return;
    }

    try {
      setLoading(true);
      await inventoryService.moveShortToRejected(inventoryId, itemId);
      await loadRowItems(inventoryId);
      await loadHistory();
      alert('Short quantity moved to rejected successfully. Stock has been updated.');
    } catch (error: any) {
      console.error('Error moving to rejected:', error);
      alert(error.response?.data?.error || 'Failed to move short to rejected');
    } finally {
      setLoading(false);
    }
  };

  const handleEditShort = (inventoryId: number, item: any) => {
    setEditingItem({ inventoryId, itemId: item.itemId || item.item_id });
    setEditFormData({
      received: item.received || 0,
      short: item.short || 0,
      challanNumber: item.challanNumber || item.challan_number || '',
      challanDate: item.challanDate || item.challan_date || ''
    });
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;

    try {
      setLoading(true);
      await inventoryService.updateShortItem(editingItem.inventoryId, {
        itemId: editingItem.itemId,
        received: editFormData.received,
        short: editFormData.short,
        challanNumber: editFormData.challanNumber,
        challanDate: editFormData.challanDate
      });
      
      await loadRowItems(editingItem.inventoryId);
      await loadHistory();
      setEditingItem(null);
      alert('Short item updated successfully. Stock has been updated.');
    } catch (error: any) {
      console.error('Error updating short item:', error);
      alert(error.response?.data?.error || 'Failed to update short item');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
    setEditFormData({
      received: 0,
      short: 0,
      challanNumber: '',
      challanDate: ''
    });
  };

  const getChallanCount = (items: any[]): number => {
    if (!items) return 0;
    const uniqueChallans = new Set(
      items
        .filter(item => item.challanNumber || item.challan_number)
        .map(item => item.challanNumber || item.challan_number)
    );
    return uniqueChallans.size;
  };

  const handleAddItem = () => {
    const newItem: InvoiceItem = createEmptyItem();
    setFormData((prev) => ({ ...prev, items: [...prev.items, newItem] }));
  };

  const handleRemoveItem = (id: string) => {
    setFormData((prev) => {
      const newItems = prev.items.filter((item) => item.id !== id);
      if (newItems.length === 0) {
        return { ...prev, items: [createEmptyItem()] };
      }
      return { ...prev, items: newItems };
    });
  };

  const handleItemChange = (id: string, field: keyof InvoiceItem, value: any) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          if (field === 'skuId') {
            const sku = skus.find((s) => s.id.toString() === value);
            updated.itemName = sku?.itemName || '';
            // Set GST rate from SKU if available (check multiple field name variations)
            const gstRate = sku?.gstRate ?? sku?.gst_rate ?? sku?.gstRatePercentage ?? sku?.gst_rate_percentage;
            if (gstRate !== undefined && gstRate !== null) {
              const parsedGstRate = parseFloat(gstRate);
              if (!isNaN(parsedGstRate)) {
                updated.gstRate = parsedGstRate;
              }
            }
          }
          
          // Calculate short quantity
          if (field === 'received' || field === 'orderedQuantity') {
            updated.short = Math.max(0, (updated.orderedQuantity || 0) - (updated.received || 0));
            updated.total = updated.orderedQuantity || 0;
            updated.totalQuantity = updated.orderedQuantity || 0;
          }
          
          // Calculate GST and totals
          const orderedQty = updated.orderedQuantity || 0;
          const unitPrice = updated.unitPrice || 0;
          const gstRate = updated.gstRate || 0;
          
          // Recalculate whenever orderedQuantity, unitPrice, or gstRate changes
          if (field === 'orderedQuantity' || field === 'unitPrice' || field === 'gstRate' || field === 'skuId') {
            // Total (Excl GST) = Ordered Qty * Unit Price
            updated.totalExclGst = orderedQty * unitPrice;
            
            // GST Amount = Total (Excl GST) * (GST Rate / 100)
            updated.gstAmount = updated.totalExclGst * (gstRate / 100);
            
            // Total (Incl GST) = Total (Excl GST) + GST Amount
            updated.totalInclGst = updated.totalExclGst + updated.gstAmount;
            
            // Keep totalValue for backward compatibility (using totalInclGst)
            updated.totalValue = updated.totalInclGst;
          }
          
          return updated;
        }
        return item;
      }),
    }));
  };

  // Validation function to check if Ordered Quantity matches received + short
  const validateTotalQuantity = (item: InvoiceItem): boolean => {
    const calculatedTotal = (item.received || 0) + (item.short || 0);
    return item.orderedQuantity === calculatedTotal;
  };

  // Check if all items have valid total quantity
  const isFormValid = (): boolean => {
    // Document Details validation
    if (!formData.documentType) return false;
    if (formData.documentType === 'bill' && !formData.documentSubType) return false;
    if (formData.documentType === 'delivery_challan' && !formData.documentSubType) return false;
    
    // Invoice/Challan Details validation
    if (!formData.invoiceDate) return false;
    if (!formData.invoiceNumber.trim()) return false;
    if (!formData.docketNumber.trim()) return false;
    if (!formData.transportorName.trim()) return false;
    
    // Receiving Details validation
    if (!formData.receivingDate) return false;
    
    // Vendor/Brand validation (only for from_vendor)
    if (formData.documentType === 'bill' && formData.documentSubType === 'from_vendor') {
      if (!formData.vendorId) return false;
      if (!formData.brandId) return false;
    }
    
    // Customer validation (only for from_customer)
    if (formData.documentType === 'bill' && formData.documentSubType === 'from_customer') {
      if (!formData.destinationId) return false;
    }
    
    // Additional Details validation
    if (!formData.receivedBy) return false;
    
    // Item Details validation
    if (formData.items.length === 0) return false;
    
    // Validate each item
    const itemsValid = formData.items.every((item) => {
      if (!item.skuId) return false;
      if (item.orderedQuantity === undefined || item.orderedQuantity === null || item.orderedQuantity === 0) return false;
      if (item.received === undefined || item.received === null) return false;
      if (item.short === undefined || item.short === null) return false;
      if (item.unitPrice === undefined || item.unitPrice === null || item.unitPrice === 0) return false;
      if (item.totalInclGst === undefined || item.totalInclGst === null || item.totalInclGst === 0) return false;
      return validateTotalQuantity(item);
    });
    
    return itemsValid;
  };

  const handleSubmit = async (saveAsDraft: boolean = false) => {
    if (!saveAsDraft) {
      // Document Details validation
      if (!formData.documentType) {
        alert('Please select Document Type.');
        return;
      }
      if (formData.documentType === 'bill' && !formData.documentSubType) {
        alert('Please select Type (From Vendor or From Customer).');
        return;
      }
      
      // Invoice/Challan Details validation
      if (!formData.invoiceDate) {
        alert('Please enter Invoice/Challan Date.');
        return;
      }
      if (!formData.invoiceNumber.trim()) {
        alert('Please enter Invoice/Challan Number.');
        return;
      }
      if (!formData.docketNumber.trim()) {
        alert('Please enter Docket Number.');
        return;
      }
      if (!formData.transportorName.trim()) {
        alert('Please enter Transportor Name.');
        return;
      }
      
      // Receiving Details validation
      if (!formData.receivingDate) {
        alert('Please select Receiving Date.');
        return;
      }
      
      // Vendor/Brand validation (only for from_vendor)
      if (formData.documentType === 'bill' && formData.documentSubType === 'from_vendor') {
        if (!formData.vendorId) {
          alert('Please select a Vendor.');
          return;
        }
        if (!formData.brandId) {
          alert('Please select a Brand.');
          return;
        }
      }
      
      // Customer validation (only for from_customer)
      if (formData.documentType === 'bill' && formData.documentSubType === 'from_customer') {
        if (!formData.destinationId) {
          alert('Please select a Customer.');
          return;
        }
      }
      
      // Additional Details validation
      if (!formData.receivedBy) {
        alert('Please select Received By.');
        return;
      }
      
      // Item Details validation
      if (formData.items.length === 0) {
        alert('Please add at least one item.');
        return;
      }
      
      // Validate each item
      for (const item of formData.items) {
        if (!item.skuId) {
          alert('Please select SKU for all items.');
          return;
        }
        if (item.orderedQuantity === undefined || item.orderedQuantity === null || item.orderedQuantity === 0) {
          alert('Please enter Ordered Quantity for all items.');
          return;
        }
        if (item.received === undefined || item.received === null) {
          alert('Please enter Received quantity for all items.');
          return;
        }
        if (item.short === undefined || item.short === null) {
          alert('Please ensure Short quantity is calculated for all items.');
          return;
        }
        if (item.unitPrice === undefined || item.unitPrice === null || item.unitPrice === 0) {
          alert('Please enter Unit Price (Excl GST) for all items.');
          return;
        }
        if (item.totalInclGst === undefined || item.totalInclGst === null || item.totalInclGst === 0) {
          alert('Please ensure Total (Incl GST) is calculated for all items.');
          return;
        }
        if (!validateTotalQuantity(item)) {
          alert('Please ensure all Ordered Quantity fields match their calculated sums (Received + Short).');
          return;
        }
      }
    }

    try {
      setLoading(true);
      const toNullIfEmpty = (value: any): any => {
        if (value === null || value === undefined) return null;
        if (typeof value === 'string' && value.trim() === '') return null;
        return value;
      };

      const payload = {
        invoiceDate: formData.invoiceDate,
        invoiceNumber: formData.invoiceNumber,
        docketNumber: toNullIfEmpty(formData.docketNumber),
        transportorName: toNullIfEmpty(formData.transportorName),
        vendorId: formData.vendorId ? (typeof formData.vendorId === 'string' ? parseInt(formData.vendorId, 10) : formData.vendorId) : null,
        brandId: formData.brandId ? (typeof formData.brandId === 'string' ? parseInt(formData.brandId, 10) : formData.brandId) : null,
        warranty: formData.warranty ? (typeof formData.warranty === 'string' ? parseInt(formData.warranty, 10) : formData.warranty) : 0,
        warrantyUnit: formData.warrantyUnit || 'months',
        receivingDate: formData.receivingDate,
        receivedBy: formData.receivedBy ? (typeof formData.receivedBy === 'string' ? parseInt(formData.receivedBy, 10) : formData.receivedBy) : null,
        remarks: toNullIfEmpty(formData.remarks),
        documentType: formData.documentType || 'bill',
        documentSubType: toNullIfEmpty(formData.documentSubType),
        vendorSubType: toNullIfEmpty(formData.vendorSubType),
        deliveryChallanSubType: toNullIfEmpty(formData.deliveryChallanSubType),
        destinationType: toNullIfEmpty(formData.destinationType),
        destinationId: formData.destinationId ? (typeof formData.destinationId === 'string' ? parseInt(formData.destinationId, 10) : formData.destinationId) : null,
        items: formData.items.map((item) => ({
          skuId: item.skuId ? (typeof item.skuId === 'string' ? parseInt(item.skuId, 10) : item.skuId) : null,
          orderedQuantity: item.orderedQuantity ? (typeof item.orderedQuantity === 'string' ? parseInt(item.orderedQuantity, 10) : item.orderedQuantity) : 0,
          received: item.received ? (typeof item.received === 'string' ? parseInt(item.received, 10) : item.received) : 0,
          short: item.short ? (typeof item.short === 'string' ? parseInt(item.short, 10) : item.short) : 0,
          totalQuantity: item.orderedQuantity ? (typeof item.orderedQuantity === 'string' ? parseInt(item.orderedQuantity, 10) : item.orderedQuantity) : 0,
          unitPrice: item.unitPrice ? (typeof item.unitPrice === 'string' ? parseFloat(item.unitPrice) : item.unitPrice) : 0,
          totalExclGst: item.totalExclGst ? (typeof item.totalExclGst === 'string' ? parseFloat(item.totalExclGst) : item.totalExclGst) : 0,
          gstRate: item.gstRate ? (typeof item.gstRate === 'string' ? parseFloat(item.gstRate) : item.gstRate) : 0,
          gstAmount: item.gstAmount ? (typeof item.gstAmount === 'string' ? parseFloat(item.gstAmount) : item.gstAmount) : 0,
          totalInclGst: item.totalInclGst ? (typeof item.totalInclGst === 'string' ? parseFloat(item.totalInclGst) : item.totalInclGst) : 0,
          numberOfBoxes: item.numberOfBoxes ? (typeof item.numberOfBoxes === 'string' ? parseInt(item.numberOfBoxes, 10) : item.numberOfBoxes) : 0,
          receivedBoxes: item.receivedBoxes ? (typeof item.receivedBoxes === 'string' ? parseInt(item.receivedBoxes, 10) : item.receivedBoxes) : 0,
        })),
        status: saveAsDraft ? 'draft' : 'completed',
      };

      const result = await inventoryService.addIncoming(payload);
      
      if (result.success && isAdmin()) {
        const checks = formData.items
          .filter(item => item.skuId)
          .map(async (item) => {
            try {
              const response = await inventoryService.hasPriceHistory(item.skuId);
              if (response.success) {
                setPriceHistoryMap(prev => ({
                  ...prev,
                  [item.skuId]: response.data.hasHistory
                }));
              }
            } catch (error) {
              console.error(`Error checking price history for SKU ${item.skuId}:`, error);
            }
          });
        
        await Promise.all(checks);
      }
      
      navigate('/app/inventory');
    } catch (error: any) {
      console.error('Error submitting incoming inventory:', error);
      console.error('Full error response:', error.response?.data);
      
      let errorMessage = 'Failed to submit incoming inventory';
      let errorDetails = '';
      
      if (error.response?.data) {
        const errorData = error.response.data;
        errorMessage = errorData.message || errorData.error || errorMessage;
        
        if (errorData.details) {
          if (typeof errorData.details === 'string') {
            errorDetails = errorData.details;
          } else if (typeof errorData.details === 'object') {
            const detailParts: string[] = [];
            if (errorData.details.originalError) {
              detailParts.push(`Error: ${errorData.details.originalError}`);
            }
            if (errorData.details.hint) {
              detailParts.push(`Hint: ${errorData.details.hint}`);
            }
            if (errorData.details.detail) {
              detailParts.push(`Detail: ${errorData.details.detail}`);
            }
            if (errorData.details.code) {
              detailParts.push(`Code: ${errorData.details.code}`);
            }
            errorDetails = detailParts.join('\n');
          }
        }
        
        if (errorData.error === 'DATABASE_SCHEMA_ERROR' || errorData.error === 'DATABASE_ERROR') {
          errorMessage = errorData.message || 'Database configuration error';
          if (errorData.details?.hint) {
            errorDetails = errorData.details.hint;
          }
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      const fullError = errorDetails ? `${errorMessage}\n\n${errorDetails}` : errorMessage;
      alert(fullError);
    } finally {
      setLoading(false);
    }
  };

  const handlePriceHistoryClick = async (item: InvoiceItem) => {
    setPriceHistoryModal({
      isOpen: true,
      skuId: item.skuId,
      loading: true,
      data: null,
    });
    try {
      const response = await inventoryService.getPriceHistory(item.skuId);
      setPriceHistoryModal(prev => ({
        ...prev,
        loading: false,
        data: response.data,
      }));
    } catch (error) {
      console.error('Error loading price history:', error);
      setPriceHistoryModal(prev => ({
        ...prev,
        loading: false,
        data: null,
      }));
    }
  };

  return (
    <div className="p-8 space-y-10 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <style>{`
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type="number"] {
          -moz-appearance: textfield;
        }
      `}</style>
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-2">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/app/inventory')}
              className="text-slate-600 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
            <h1 className="text-[28.8px] font-semibold leading-[1.2] tracking-[-0.01em] text-slate-900">Incoming Inventory</h1>
          </div>
          <p className="text-[16.8px] font-normal leading-[1.5] text-slate-500">Record and manage incoming stock from vendors and suppliers.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-2">
        <nav className="flex space-x-2">
          <button
            onClick={() => setActiveTab('add')}
            className={`px-6 py-3 rounded-2xl font-black text-[15.6px] uppercase tracking-wider transition-all ${
              activeTab === 'add'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            Add New
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-6 py-3 rounded-2xl font-black text-[15.6px] uppercase tracking-wider transition-all ${
              activeTab === 'history'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            History
          </button>
        </nav>
      </div>

      {activeTab === 'add' && (
        <form className="space-y-6">
          <DocumentDetailsSection
            formData={formData}
            vendors={vendors}
            customers={customers}
            brands={brands}
            onFormDataChange={(updates) => setFormData(prev => ({ ...prev, ...updates }))}
          />

          <InvoiceDetailsSection
            formData={formData}
            onFormDataChange={(updates) => setFormData(prev => ({ ...prev, ...updates }))}
          />

          <ReceivingDetailsSection
            formData={formData}
            onFormDataChange={(updates) => setFormData(prev => ({ ...prev, ...updates }))}
          />

          <ItemDetailsSection
            items={formData.items}
            skus={skus}
            isAdmin={isAdmin()}
            priceHistoryMap={priceHistoryMap}
            onAddItem={handleAddItem}
            onRemoveItem={handleRemoveItem}
            onItemChange={handleItemChange}
            onPriceHistoryClick={handlePriceHistoryClick}
            validateTotalQuantity={validateTotalQuantity}
          />

          <AdditionalDetailsSection
            formData={formData}
            teams={teams}
            onFormDataChange={(updates) => setFormData(prev => ({ ...prev, ...updates }))}
          />

          <ActionButtons
            loading={loading}
            isValid={isFormValid()}
            hasItems={formData.items.length > 0}
            onSaveDraft={() => handleSubmit(true)}
            onSubmit={() => handleSubmit(false)}
          />
        </form>
      )}

      {activeTab === 'history' && (
        <div className="space-y-6">
          <HistoryFilters
            dateFrom={dateFrom}
            dateTo={dateTo}
            filterVendor={filterVendor}
            filterSKU={filterSKU}
            vendors={vendors}
            onDateFromChange={setDateFrom}
            onDateToChange={setDateTo}
            onFilterVendorChange={setFilterVendor}
            onFilterSKUChange={setFilterSKU}
          />

          <HistoryTable
            loading={loading}
            history={history}
            expandedRows={expandedRows}
            rowItems={rowItems}
            editingItem={editingItem}
            editFormData={editFormData}
            onToggleRow={handleToggleRow}
            onEditShort={handleEditShort}
            onSaveEdit={handleSaveEdit}
            onCancelEdit={handleCancelEdit}
            onMoveToRejected={handleMoveToRejected}
            onEditFormDataChange={(updates) => setEditFormData(prev => ({ ...prev, ...updates }))}
            getChallanCount={getChallanCount}
          />
        </div>
      )}

      <PriceHistoryModal
        isOpen={priceHistoryModal.isOpen}
        loading={priceHistoryModal.loading}
        data={priceHistoryModal.data}
        onClose={() => setPriceHistoryModal({ isOpen: false, skuId: '', loading: false, data: null })}
      />
    </div>
  );
};

export default IncomingInventoryPage;
