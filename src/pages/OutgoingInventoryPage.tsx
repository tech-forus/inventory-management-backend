import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, X, Save, ChevronDown, Trash2 } from 'lucide-react';
import { inventoryService } from '../services/inventoryService';
import { skuService } from '../services/skuService';
import { libraryService } from '../services/libraryService';
import { formatCurrency, formatDate, formatNumber } from '../utils/formatters';

interface OutgoingItem {
  id: string;
  skuId: string;
  itemName: string;
  currentStock: number;
  originalStock: number; // Store original stock when SKU is selected
  outgoingQuantity: number;
  unitPrice: number;
  gstPercentage: number;
  totalValue: number;
}

interface FormData {
  documentType: 'sales_invoice' | 'delivery_challan' | 'transfer_note';
  documentSubType: string; // For Sales Invoice: 'to_customer' | 'to_vendor', For Delivery Challan: 'sample' | 'replacement'
  vendorSubType: string; // For Sales Invoice > To Vendor: 'replacement' | 'rejected'
  deliveryChallanSubType: string; // For Delivery Challan > Replacement: 'to_customer' | 'to_vendor'
  invoiceChallanDate: string;
  invoiceChallanNumber: string;
  docketNumber: string;
  transportorName: string;
  destinationType: 'customer' | 'vendor' | 'store_to_factory';
  destinationId: string;
  dispatchedBy: string;
  remarks: string;
  items: OutgoingItem[];
}

const OutgoingInventoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'add' | 'history'>('add');
  const [loading, setLoading] = useState(false);
  
  // Initialize with one empty item
  const createEmptyItem = (): OutgoingItem => ({
    id: Date.now().toString(),
    skuId: '',
    itemName: '',
    currentStock: 0,
    originalStock: 0,
    outgoingQuantity: 0,
    unitPrice: 0,
    gstPercentage: 0,
    totalValue: 0,
  });

  const [formData, setFormData] = useState<FormData>({
    documentType: 'sales_invoice',
    documentSubType: '',
    vendorSubType: '',
    deliveryChallanSubType: '',
    invoiceChallanDate: new Date().toISOString().split('T')[0],
    invoiceChallanNumber: '',
    docketNumber: '',
    transportorName: '',
    destinationType: 'customer',
    destinationId: '',
    dispatchedBy: '',
    remarks: '',
    items: [createEmptyItem()], // Always start with one item
  });

  const [skus, setSkus] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [skuSearchTerm, setSkuSearchTerm] = useState<{ [key: string]: string }>({});
  const [showSkuDropdown, setShowSkuDropdown] = useState<{ [key: string]: boolean }>({});
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});

  // History filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filterDestination, setFilterDestination] = useState('');
  const [filterSKU, setFilterSKU] = useState('');

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab, dateFrom, dateTo, filterDestination, filterSKU]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      // Close all dropdowns if clicking outside
      if (!target.closest('.sku-dropdown-container')) {
        setShowSkuDropdown({});
        // Clear search terms to close search dropdowns
        setSkuSearchTerm((prev) => {
          const newState: { [key: string]: string } = {};
          // Only keep search terms that match the selected SKU's code (to preserve input display)
          Object.keys(prev).forEach((itemId) => {
            const item = formData.items.find((i) => i.id === itemId);
            if (item?.skuId) {
              const selectedSku = skus.find((s) => s.id.toString() === item.skuId);
              if (selectedSku?.skuId === prev[itemId]) {
                newState[itemId] = prev[itemId];
              }
            }
          });
          return newState;
        });
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [formData.items, skus]);

  // Reset form when document type changes
  useEffect(() => {
    if (formData.documentType === 'transfer_note') {
      setFormData(prev => ({
        ...prev,
        documentSubType: '',
        vendorSubType: '',
        deliveryChallanSubType: '',
        destinationType: 'store_to_factory',
        destinationId: '',
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        documentSubType: '',
        vendorSubType: '',
        deliveryChallanSubType: '',
        destinationType: prev.documentType === 'sales_invoice' ? 'customer' : 'customer',
        destinationId: '',
      }));
    }
    // Clear validation errors when document type changes (might affect rejected case status)
    setValidationErrors({});
  }, [formData.documentType]);

  // Handle document subtype changes
  useEffect(() => {
    if (formData.documentType === 'sales_invoice') {
      if (formData.documentSubType === 'to_customer') {
        setFormData(prev => ({ ...prev, destinationType: 'customer', vendorSubType: '', destinationId: '' }));
      } else if (formData.documentSubType === 'to_vendor') {
        setFormData(prev => ({ ...prev, destinationType: 'vendor', destinationId: '' }));
      }
    } else if (formData.documentType === 'delivery_challan') {
      if (formData.documentSubType === 'sample') {
        setFormData(prev => ({ ...prev, destinationType: 'customer', deliveryChallanSubType: '', destinationId: '' }));
      } else if (formData.documentSubType === 'replacement') {
        setFormData(prev => ({ ...prev, destinationId: '' }));
      }
    }
    // Clear validation errors when document subtype changes (might affect rejected case status)
    setValidationErrors({});
  }, [formData.documentSubType]);

  // Handle delivery challan replacement subtype
  useEffect(() => {
    if (formData.documentType === 'delivery_challan' && formData.documentSubType === 'replacement') {
      if (formData.deliveryChallanSubType === 'to_customer') {
        setFormData(prev => ({ ...prev, destinationType: 'customer', destinationId: '' }));
      } else if (formData.deliveryChallanSubType === 'to_vendor') {
        setFormData(prev => ({ ...prev, destinationType: 'vendor', destinationId: '' }));
      }
    }
    // Clear validation errors when delivery challan subtype changes (affects rejected case status)
    setValidationErrors({});
  }, [formData.deliveryChallanSubType]);

  const loadInitialData = async () => {
    try {
      const [skusData, customersData, vendorsData, teamsData] = await Promise.all([
        skuService.getAll({ limit: 1000 }),
        libraryService.getCustomers(),
        libraryService.getYourVendors(),
        libraryService.getTeams(),
      ]);
      setSkus(skusData.data || []);
      setCustomers(customersData.data || []);
      setVendors(vendorsData.data || []);
      setTeams(teamsData.data || []);
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
      if (filterDestination) params.destination = filterDestination;
      if (filterSKU) params.sku = filterSKU;

      const response = await inventoryService.getOutgoingHistory(params);
      setHistory(response.data || []);
    } catch (error) {
      console.error('Error loading history:', error);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    const newItem: OutgoingItem = createEmptyItem();
    setFormData((prev) => ({ ...prev, items: [...prev.items, newItem] }));
  };

  const handleRemoveItem = (id: string) => {
    setFormData((prev) => {
      const newItems = prev.items.filter((item) => item.id !== id);
      // Always keep at least one item
      if (newItems.length === 0) {
        return { ...prev, items: [createEmptyItem()] };
      }
      return { ...prev, items: newItems };
    });
  };

  // Check if this is the special case: Delivery Challan > Replacement > To Vendor
  const isRejectedQuantityCase = () => {
    return (
      formData.documentType === 'delivery_challan' &&
      formData.documentSubType === 'replacement' &&
      formData.deliveryChallanSubType === 'to_vendor'
    );
  };

  const handleItemChange = (id: string, field: keyof OutgoingItem, value: any) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          
          if (field === 'skuId') {
            const sku = skus.find((s) => s.id.toString() === value);
            updated.itemName = sku?.itemName || '';
            updated.originalStock = sku?.currentStock || 0;
            updated.currentStock = sku?.currentStock || 0;
            // Set GST percentage from SKU if available (check multiple field name variations)
            const gstRate = sku?.gstRate ?? sku?.gst_rate ?? sku?.gstRatePercentage ?? sku?.gst_rate_percentage;
            if (gstRate !== undefined && gstRate !== null) {
              const parsedGstRate = parseFloat(gstRate);
              if (!isNaN(parsedGstRate)) {
                updated.gstPercentage = parsedGstRate;
              }
            }
            // Reset outgoing quantity when SKU changes
            updated.outgoingQuantity = 0;
            // Recalculate total value with GST after setting GST percentage from SKU
            const baseAmount = updated.outgoingQuantity * updated.unitPrice;
            updated.totalValue = baseAmount + (baseAmount * (updated.gstPercentage / 100));
            // Clear validation error when SKU changes
            setValidationErrors((prev) => {
              const newErrors = { ...prev };
              delete newErrors[item.id];
              return newErrors;
            });
          }
          
          if (field === 'outgoingQuantity') {
            const qty = parseInt(value) || 0;
            const isRejectedCase = isRejectedQuantityCase();
            
            if (isRejectedCase) {
              // For rejected quantity case, don't reduce stock, just set the quantity
              updated.outgoingQuantity = qty;
              // Clear validation error for rejected case
              setValidationErrors((prev) => {
                const newErrors = { ...prev };
                delete newErrors[item.id];
                return newErrors;
              });
            } else {
              // For all other cases, validate against available stock
              const maxAllowed = updated.originalStock;
              
              if (qty > maxAllowed) {
                // Set validation error
                setValidationErrors((prev) => ({
                  ...prev,
                  [item.id]: `Outgoing quantity cannot exceed available stock (${maxAllowed})`,
                }));
                // Don't update the quantity if it exceeds available stock
                return item;
              } else {
                // Clear validation error
                setValidationErrors((prev) => {
                  const newErrors = { ...prev };
                  delete newErrors[item.id];
                  return newErrors;
                });
                updated.outgoingQuantity = qty;
                // Reduce current stock by the outgoing quantity
                updated.currentStock = updated.originalStock - qty;
              }
            }
            // Calculate total value with GST: (Outgoing Qty * Unit Price) + (Outgoing Qty * Unit Price) * GST%
            const baseAmount = updated.outgoingQuantity * updated.unitPrice;
            updated.totalValue = baseAmount + (baseAmount * (updated.gstPercentage / 100));
          }
          
          if (field === 'unitPrice') {
            // Calculate total value with GST: (Outgoing Qty * Unit Price) + (Outgoing Qty * Unit Price) * GST%
            const baseAmount = updated.outgoingQuantity * updated.unitPrice;
            updated.totalValue = baseAmount + (baseAmount * (updated.gstPercentage / 100));
          }
          
          if (field === 'gstPercentage') {
            // Calculate total value with GST: (Outgoing Qty * Unit Price) + (Outgoing Qty * Unit Price) * GST%
            const baseAmount = updated.outgoingQuantity * updated.unitPrice;
            updated.totalValue = baseAmount + (baseAmount * (updated.gstPercentage / 100));
          }
          
          return updated;
        }
        return item;
      }),
    }));
  };

  const validateForm = (): boolean => {
    const errors: { [key: string]: string } = {};
    const isRejectedCase = isRejectedQuantityCase();
    
    formData.items.forEach((item) => {
      if (!item.skuId) {
        return; // Skip validation if SKU is not selected
      }
      
      if (!isRejectedCase && item.outgoingQuantity > item.originalStock) {
        errors[item.id] = `Outgoing quantity cannot exceed available stock (${item.originalStock})`;
      }
    });
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (saveAsDraft: boolean = false) => {
    // Validate form before submission
    if (!saveAsDraft && !validateForm()) {
      alert('Please fix validation errors before submitting.');
      return;
    }
    
    try {
      setLoading(true);
      const payload = {
        ...formData,
        items: formData.items.map((item) => ({
          skuId: item.skuId,
          outgoingQuantity: item.outgoingQuantity,
          unitPrice: item.unitPrice,
          gstPercentage: item.gstPercentage,
        })),
        status: saveAsDraft ? 'draft' : 'completed',
      };

      await inventoryService.addOutgoing(payload);
      navigate('/app/inventory');
    } catch (error: any) {
      console.error('Error submitting outgoing inventory:', error);
      alert(error.response?.data?.error || 'Failed to submit outgoing inventory');
    } finally {
      setLoading(false);
    }
  };

  const getStockColor = (current: number): string => {
    if (current > 10) return 'text-green-600';
    if (current > 0) return 'text-yellow-600';
    return 'text-red-600';
  };

  const renderDocumentSubTypeDropdown = () => {
    if (formData.documentType === 'sales_invoice') {
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Type</label>
          <select
            value={formData.documentSubType}
            onChange={(e) => setFormData(prev => ({ ...prev, documentSubType: e.target.value, vendorSubType: '' }))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select...</option>
            <option value="to_customer">To Customer</option>
            <option value="to_vendor">To Vendor</option>
          </select>
        </div>
      );
    } else if (formData.documentType === 'delivery_challan') {
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Type</label>
          <select
            value={formData.documentSubType}
            onChange={(e) => setFormData(prev => ({ ...prev, documentSubType: e.target.value, deliveryChallanSubType: '' }))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select...</option>
            <option value="sample">Sample</option>
            <option value="replacement">Replacement</option>
          </select>
        </div>
      );
    } else if (formData.documentType === 'transfer_note') {
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Transfer Type</label>
          <input
            type="text"
            value="Store to Factory"
            readOnly
            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
          />
        </div>
      );
    }
    return null;
  };

  const renderVendorSubTypeDropdown = () => {
    if (formData.documentType === 'sales_invoice' && formData.documentSubType === 'to_vendor') {
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Vendor Type</label>
          <select
            value={formData.vendorSubType}
            onChange={(e) => setFormData(prev => ({ ...prev, vendorSubType: e.target.value }))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select...</option>
            <option value="replacement">Replacement</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      );
    }
    return null;
  };

  const renderDeliveryChallanReplacementDropdown = () => {
    if (formData.documentType === 'delivery_challan' && formData.documentSubType === 'replacement') {
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Replacement Type</label>
          <select
            value={formData.deliveryChallanSubType}
            onChange={(e) => setFormData(prev => ({ ...prev, deliveryChallanSubType: e.target.value }))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select...</option>
            <option value="to_customer">To Customer</option>
            <option value="to_vendor">To Vendor (Return to Vendor)</option>
          </select>
        </div>
      );
    }
    return null;
  };

  const renderDestinationDropdown = () => {
    // For Transfer Note, skip destination dropdown
    if (formData.documentType === 'transfer_note') {
      return null;
    }

    // For Delivery Challan > Sample, auto-select customer
    if (formData.documentType === 'delivery_challan' && formData.documentSubType === 'sample') {
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Customer</label>
          <select
            value={formData.destinationId}
            onChange={(e) => setFormData(prev => ({ ...prev, destinationId: e.target.value }))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select Customer</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.customerName || customer.name}
              </option>
            ))}
          </select>
        </div>
      );
    }

    // For other cases, show appropriate dropdown
    if (formData.destinationType === 'customer') {
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Customer</label>
          <select
            value={formData.destinationId}
            onChange={(e) => setFormData(prev => ({ ...prev, destinationId: e.target.value }))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select Customer</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.customerName || customer.name}
              </option>
            ))}
          </select>
        </div>
      );
    } else if (formData.destinationType === 'vendor') {
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Vendor</label>
          <select
            value={formData.destinationId}
            onChange={(e) => setFormData(prev => ({ ...prev, destinationId: e.target.value }))}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select Vendor</option>
            {vendors.map((vendor) => (
              <option key={vendor.id} value={vendor.id}>
                {vendor.name || vendor.vendorName}
              </option>
            ))}
          </select>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="p-8 space-y-10 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
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
            <h1 className="text-[28.8px] font-semibold leading-[1.2] tracking-[-0.01em] text-slate-900">Outgoing Inventory</h1>
          </div>
          <p className="text-[16.8px] font-normal leading-[1.5] text-slate-500">Record and manage outgoing stock shipments and transfers.</p>
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
        <form className="space-y-4">
          {/* Document Details */}
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Document Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Document Type</label>
                <div className="space-y-2">
                  <label 
                    className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-gray-50 transition-colors"
                    onClick={() => setFormData(prev => ({ ...prev, documentType: 'sales_invoice' as any }))}
                  >
                    <input
                      type="radio"
                      name="documentType"
                      value="sales_invoice"
                      checked={formData.documentType === 'sales_invoice'}
                      onChange={(e) => setFormData(prev => ({ ...prev, documentType: e.target.value as any }))}
                      className="text-blue-600 cursor-pointer"
                    />
                    <span className="cursor-pointer">Sales Invoice</span>
                  </label>
                  <label 
                    className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-gray-50 transition-colors"
                    onClick={() => setFormData(prev => ({ ...prev, documentType: 'delivery_challan' as any }))}
                  >
                    <input
                      type="radio"
                      name="documentType"
                      value="delivery_challan"
                      checked={formData.documentType === 'delivery_challan'}
                      onChange={(e) => setFormData(prev => ({ ...prev, documentType: e.target.value as any }))}
                      className="text-blue-600 cursor-pointer"
                    />
                    <span className="cursor-pointer">Delivery Challan</span>
                  </label>
                  <label 
                    className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-gray-50 transition-colors"
                    onClick={() => setFormData(prev => ({ ...prev, documentType: 'transfer_note' as any }))}
                  >
                    <input
                      type="radio"
                      name="documentType"
                      value="transfer_note"
                      checked={formData.documentType === 'transfer_note'}
                      onChange={(e) => setFormData(prev => ({ ...prev, documentType: e.target.value as any }))}
                      className="text-blue-600 cursor-pointer"
                    />
                    <span className="cursor-pointer">Transfer Note</span>
                  </label>
                </div>
              </div>
              <div>
                {renderDocumentSubTypeDropdown()}
                {renderVendorSubTypeDropdown()}
                {renderDeliveryChallanReplacementDropdown()}
              </div>
            </div>
          </div>

          {/* Common Fields */}
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Document Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Invoice/Challan Date</label>
                <input
                  type="date"
                  value={formData.invoiceChallanDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, invoiceChallanDate: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Invoice/Challan Number</label>
                <input
                  type="text"
                  value={formData.invoiceChallanNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, invoiceChallanNumber: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter invoice/challan number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Docket Number</label>
                <input
                  type="text"
                  value={formData.docketNumber}
                  onChange={(e) => setFormData(prev => ({ ...prev, docketNumber: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter docket number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Transportor Name</label>
                <input
                  type="text"
                  value={formData.transportorName}
                  onChange={(e) => setFormData(prev => ({ ...prev, transportorName: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter transportor name"
                />
              </div>
            </div>
          </div>

          {/* Destination */}
          {renderDestinationDropdown() && (
            <div className="bg-white rounded-lg shadow p-4">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Destination</h2>
              {renderDestinationDropdown()}
            </div>
          )}

          {/* Item Details */}
          <div className="bg-white rounded-lg shadow p-5">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Item Details</h2>
              <button
                type="button"
                onClick={handleAddItem}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Item
              </button>
            </div>

            <div className="space-y-3">
                {formData.items.map((item) => (
                  <div key={item.id} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                    {/* Single Row Layout - CSS Grid for equal distribution */}
                    <div className="grid grid-cols-[auto_1fr_1fr_1fr_1fr_1fr_1fr_1fr_auto] gap-3 items-end min-w-0">
                      {/* Item Number */}
                      <div className="flex items-center pb-1">
                        <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">#{formData.items.indexOf(item) + 1}</span>
                      </div>
                      
                      {/* SKU Field */}
                      <div className="relative sku-dropdown-container min-w-0" style={{ zIndex: 1 }}>
                        <label className="block text-xs font-medium text-gray-700 mb-1">SKU</label>
                        <div className="flex gap-1.5 items-start">
                          <div className="flex-1 relative min-w-0" style={{ zIndex: 10 }}>
                            <div className="flex gap-0.5">
                              <div className="flex-1 relative min-w-0">
                                <input
                                  type="text"
                                  value={skuSearchTerm[item.id] || (item.skuId ? skus.find((s) => s.id.toString() === item.skuId)?.skuId || '' : '')}
                                  onChange={(e) => {
                                    setSkuSearchTerm((prev) => ({ ...prev, [item.id]: e.target.value }));
                                    setShowSkuDropdown((prev) => ({ ...prev, [item.id]: false }));
                                    if (!e.target.value) {
                                      handleItemChange(item.id, 'skuId', '');
                                    }
                                  }}
                                  onFocus={() => {
                                    const selectedSku = skus.find((s) => s.id.toString() === item.skuId);
                                    setSkuSearchTerm((prev) => ({ ...prev, [item.id]: selectedSku?.skuId || '' }));
                                  }}
                                  placeholder="Search SKU..."
                                  className="w-full px-[11px] py-1.5 pr-8 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                                />
                                {(skuSearchTerm[item.id] || item.skuId) && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSkuSearchTerm((prev) => ({ ...prev, [item.id]: '' }));
                                      handleItemChange(item.id, 'skuId', '');
                                      setShowSkuDropdown((prev) => ({ ...prev, [item.id]: false }));
                                    }}
                                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowSkuDropdown((prev) => ({ ...prev, [item.id]: !prev[item.id] }));
                                  setSkuSearchTerm((prev) => ({ ...prev, [item.id]: '' }));
                                }}
                                className="px-2 py-1.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 border border-gray-300 flex-shrink-0"
                                title="Show all SKUs"
                              >
                                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showSkuDropdown[item.id] ? 'rotate-180' : ''}`} />
                              </button>
                            </div>
                            {/* Search results dropdown */}
                            {skuSearchTerm[item.id] && skuSearchTerm[item.id].length > 0 && !showSkuDropdown[item.id] && (
                              <div className="absolute z-[100] w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto" style={{ top: '100%' }}>
                                {skus
                                  .filter((sku) =>
                                    sku.skuId?.toLowerCase().includes(skuSearchTerm[item.id].toLowerCase()) ||
                                    sku.itemName?.toLowerCase().includes(skuSearchTerm[item.id].toLowerCase())
                                  )
                                  .slice(0, 10)
                                  .map((sku) => (
                                    <div
                                      key={sku.id}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleItemChange(item.id, 'skuId', sku.id.toString());
                                        setSkuSearchTerm((prev) => {
                                          const newState = { ...prev };
                                          delete newState[item.id];
                                          return newState;
                                        });
                                        setShowSkuDropdown((prev) => ({ ...prev, [item.id]: false }));
                                      }}
                                      className="px-3 py-2 text-xs hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                                    >
                                      <div className="font-medium">{sku.skuId}</div>
                                      {sku.itemName && (
                                        <div className="text-gray-500 text-xs">{sku.itemName}</div>
                                      )}
                                    </div>
                                  ))}
                                {skus.filter(
                                  (sku) =>
                                    sku.skuId?.toLowerCase().includes(skuSearchTerm[item.id].toLowerCase()) ||
                                    sku.itemName?.toLowerCase().includes(skuSearchTerm[item.id].toLowerCase())
                                ).length === 0 && (
                                  <div className="px-3 py-2 text-xs text-gray-500">No SKUs found</div>
                                )}
                              </div>
                            )}
                            {/* Full dropdown list */}
                            {showSkuDropdown[item.id] && (
                              <div className="absolute z-[100] w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto" style={{ top: '100%' }}>
                                {skus.length === 0 ? (
                                  <div className="px-3 py-2 text-xs text-gray-500">No SKUs available</div>
                                ) : (
                                  skus.map((sku) => (
                                    <div
                                      key={sku.id}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleItemChange(item.id, 'skuId', sku.id.toString());
                                        setSkuSearchTerm((prev) => {
                                          const newState = { ...prev };
                                          delete newState[item.id];
                                          return newState;
                                        });
                                        setShowSkuDropdown((prev) => ({ ...prev, [item.id]: false }));
                                      }}
                                      className={`px-3 py-2 text-xs hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 ${
                                        item.skuId === sku.id.toString() ? 'bg-blue-50' : ''
                                      }`}
                                    >
                                      <div className="font-medium">{sku.skuId}</div>
                                      {sku.itemName && (
                                        <div className="text-gray-500 text-xs">{sku.itemName}</div>
                                      )}
                                    </div>
                                  ))
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Available Stock */}
                      <div className="min-w-0">
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          {isRejectedQuantityCase() ? 'Rejected Qty' : 'Available Stock'}
                        </label>
                        <div className={`w-full px-[11px] py-1.5 text-xs border border-gray-300 rounded bg-gray-50 font-semibold ${getStockColor(item.currentStock)}`}>
                          {isRejectedQuantityCase() 
                            ? formatNumber(item.outgoingQuantity)
                            : formatNumber(item.currentStock)
                          }
                        </div>
                      </div>
                      
                      {/* Outgoing Qty */}
                      <div className="min-w-0">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Outgoing Qty</label>
                        <input
                          type="number"
                          min="0"
                          max={isRejectedQuantityCase() ? undefined : item.originalStock}
                          value={item.outgoingQuantity}
                          onChange={(e) => {
                            const inputValue = e.target.value;
                            // Allow empty input for clearing
                            if (inputValue === '') {
                              handleItemChange(item.id, 'outgoingQuantity', '0');
                              return;
                            }
                            
                            const numValue = parseInt(inputValue);
                            // Prevent invalid input (NaN, negative, or exceeding max)
                            if (isNaN(numValue) || numValue < 0) {
                              return;
                            }
                            
                            const isRejectedCase = isRejectedQuantityCase();
                            const maxAllowed = isRejectedCase ? undefined : item.originalStock;
                            
                            // For non-rejected cases, prevent typing values > max
                            if (!isRejectedCase && maxAllowed !== undefined && numValue > maxAllowed) {
                              // Don't update, show error
                              setValidationErrors((prev) => ({
                                ...prev,
                                [item.id]: `Outgoing quantity cannot exceed available stock (${maxAllowed})`,
                              }));
                              return;
                            }
                            
                            handleItemChange(item.id, 'outgoingQuantity', inputValue);
                          }}
                          onBlur={(e) => {
                            // Validate on blur and clamp to max if needed
                            const numValue = parseInt(e.target.value) || 0;
                            const isRejectedCase = isRejectedQuantityCase();
                            
                            if (!isRejectedCase && numValue > item.originalStock) {
                              // Clamp to max value
                              handleItemChange(item.id, 'outgoingQuantity', item.originalStock.toString());
                              setValidationErrors((prev) => ({
                                ...prev,
                                [item.id]: `Outgoing quantity cannot exceed available stock (${item.originalStock})`,
                              }));
                            }
                          }}
                          className={`w-full px-[11px] py-1.5 text-xs border rounded focus:ring-1 focus:ring-blue-500 ${
                            validationErrors[item.id] || (!isRejectedQuantityCase() && item.outgoingQuantity > item.originalStock)
                              ? 'border-red-500 bg-red-50'
                              : 'border-gray-300'
                          }`}
                          placeholder="0"
                        />
                        {validationErrors[item.id] && (
                          <p className="text-xs text-red-600 mt-0.5">{validationErrors[item.id]}</p>
                        )}
                      </div>
                      
                      {/* Unit Price */}
                      <div className="min-w-0">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Unit Price</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.unitPrice}
                          onChange={(e) => handleItemChange(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                          className="w-full px-[11px] py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                          placeholder="0"
                        />
                      </div>
                      
                      {/* Total (Excl GST) */}
                      <div className="min-w-0">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Total (Excl GST)</label>
                        <input
                          type="text"
                          value={((item.outgoingQuantity || 0) * (item.unitPrice || 0)).toFixed(2)}
                          readOnly
                          className="w-full px-[11px] py-1.5 text-xs border border-gray-300 rounded bg-gray-50"
                        />
                      </div>
                      
                      {/* GST% */}
                      <div className="min-w-0">
                        <label className="block text-xs font-medium text-gray-700 mb-1">GST%</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={item.gstPercentage}
                          onChange={(e) => handleItemChange(item.id, 'gstPercentage', parseFloat(e.target.value) || 0)}
                          className="w-full px-[11px] py-1.5 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                          placeholder="0"
                        />
                      </div>
                      
                      {/* Total Price (Incld GST) */}
                      <div className="min-w-0">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Total Price (Incld GST)</label>
                        <input
                          type="text"
                          value={item.totalValue.toFixed(2)}
                          readOnly
                          className="w-full px-[11px] py-1.5 text-xs border border-gray-300 rounded bg-gray-50"
                        />
                      </div>
                      
                      {/* Remove Button */}
                      <div className="flex items-end pb-1">
                        {formData.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(item.id)}
                            className="text-red-600 hover:text-red-800 flex-shrink-0 p-1"
                            title="Remove Item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Totals Row */}
                {(() => {
                  const subtotalExclGst = formData.items.reduce((sum, item) => {
                    return sum + ((item.outgoingQuantity || 0) * (item.unitPrice || 0));
                  }, 0);
                  
                  const totalGstAmount = formData.items.reduce((sum, item) => {
                    const baseAmount = (item.outgoingQuantity || 0) * (item.unitPrice || 0);
                    return sum + (baseAmount * ((item.gstPercentage || 0) / 100));
                  }, 0);
                  
                  const grandTotal = subtotalExclGst + totalGstAmount;
                  
                  return (
                    <div className="bg-white rounded-lg shadow p-4 mt-4">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700">Subtotal (Excl GST)</span>
                          <span className="text-sm font-medium text-gray-900">{formatCurrency(subtotalExclGst)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700">Total GST Amount</span>
                          <span className="text-sm font-medium text-gray-900">{formatCurrency(totalGstAmount)}</span>
                        </div>
                        <div className="border-t border-gray-300 my-2"></div>
                        <div className="flex justify-between items-center">
                          <span className="text-base font-bold text-gray-900">Grand Total (Incl GST)</span>
                          <span className="text-base font-bold text-gray-900">{formatCurrency(grandTotal)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
            </div>
          </div>

          {/* Additional Details */}
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Additional Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dispatched By</label>
                <select
                  value={formData.dispatchedBy}
                  onChange={(e) => setFormData(prev => ({ ...prev, dispatchedBy: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Team</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name || team.teamName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                <textarea
                  value={formData.remarks}
                  onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter any additional remarks"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => navigate('/app/inventory')}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleSubmit(true)}
              disabled={loading}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
            >
              Save as Draft
            </button>
            <button
              type="button"
              onClick={() => handleSubmit(false)}
              disabled={loading || formData.items.length === 0 || Object.keys(validationErrors).length > 0}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Submitting...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Submit
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {activeTab === 'history' && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-6">
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-[13px] font-black text-slate-700 uppercase tracking-wider mb-2">Date From</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-[15.6px] font-medium leading-[1.4] text-slate-800 px-5 py-3 rounded-[1.5rem] focus:outline-none focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                />
              </div>
              <div>
                <label className="block text-[13px] font-black text-slate-700 uppercase tracking-wider mb-2">Date To</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-[15.6px] font-medium leading-[1.4] text-slate-800 px-5 py-3 rounded-[1.5rem] focus:outline-none focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 transition-all"
                />
              </div>
              <div>
                <label className="block text-[13px] font-black text-slate-700 uppercase tracking-wider mb-2">Destination</label>
                <input
                  type="text"
                  value={filterDestination}
                  onChange={(e) => setFilterDestination(e.target.value)}
                  placeholder="SEARCH CUSTOMER/VENDOR"
                  className="bg-slate-50 border border-slate-200 text-[15.6px] font-medium leading-[1.4] tracking-[0.05em] placeholder:text-[15.6px] placeholder:font-normal placeholder:tracking-[0.05em] text-slate-800 px-5 py-3 rounded-[1.5rem] focus:outline-none focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 transition-all w-48"
                />
              </div>
              <div>
                <label className="block text-[13px] font-black text-slate-700 uppercase tracking-wider mb-2">SKU</label>
                <input
                  type="text"
                  value={filterSKU}
                  onChange={(e) => setFilterSKU(e.target.value)}
                  placeholder="SEARCH SKU"
                  className="bg-slate-50 border border-slate-200 text-[15.6px] font-medium leading-[1.4] tracking-[0.05em] placeholder:text-[15.6px] placeholder:font-normal placeholder:tracking-[0.05em] text-slate-800 px-5 py-3 rounded-[1.5rem] focus:outline-none focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10 transition-all w-48"
                />
              </div>
            </div>
          </div>

          {/* History Table */}
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-center mx-auto">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100">
                    <th className="px-10 py-7 text-[14.4px] font-semibold leading-[1.4] tracking-[0.1em] uppercase text-slate-400 text-center">
                      Date
                    </th>
                    <th className="px-10 py-7 text-[14.4px] font-semibold leading-[1.4] tracking-[0.1em] uppercase text-slate-400 text-center">
                      Document #
                    </th>
                    <th className="px-10 py-7 text-[14.4px] font-semibold leading-[1.4] tracking-[0.1em] uppercase text-slate-400 text-center">
                      Type
                    </th>
                    <th className="px-10 py-7 text-[14.4px] font-semibold leading-[1.4] tracking-[0.1em] uppercase text-slate-400 text-center">
                      Destination
                    </th>
                    <th className="px-10 py-7 text-[14.4px] font-semibold leading-[1.4] tracking-[0.1em] uppercase text-slate-400 text-center">
                      SKU
                    </th>
                    <th className="px-10 py-7 text-[14.4px] font-semibold leading-[1.4] tracking-[0.1em] uppercase text-slate-400 text-center">
                      Quantity
                    </th>
                    <th className="px-10 py-7 text-[14.4px] font-semibold leading-[1.4] tracking-[0.1em] uppercase text-slate-400 text-center">
                      Value
                    </th>
                    <th className="px-10 py-7 text-[14.4px] font-semibold leading-[1.4] tracking-[0.1em] uppercase text-slate-400 text-center">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="px-10 py-12 text-center">
                        <div className="flex justify-center">
                          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      </td>
                    </tr>
                  ) : history.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-10 py-12 text-center text-slate-500 font-medium">
                        No history found
                      </td>
                    </tr>
                  ) : (
                    history.map((record) => (
                      <tr key={record.id} className="group hover:bg-slate-50/40 transition-all min-h-[56px]">
                        <td className="px-10 py-8 text-center">
                          <span className="text-[15.6px] font-normal leading-[1.4] text-slate-500">{formatDate(record.date)}</span>
                        </td>
                        <td className="px-10 py-8 text-center">
                          <span className="text-[15.6px] font-medium leading-[1.4] text-slate-900">{record.documentNumber || '-'}</span>
                        </td>
                        <td className="px-10 py-8 text-center">
                          <span className="text-[15.6px] font-normal leading-[1.4] text-slate-500 capitalize">{record.documentType?.replace(/_/g, ' ') || '-'}</span>
                        </td>
                        <td className="px-10 py-8 text-center">
                          <span className="text-[15.6px] font-normal leading-[1.4] text-slate-500">{record.destination || '-'}</span>
                        </td>
                        <td className="px-10 py-8 text-center">
                          <span className="inline-block text-[15.6px] font-normal leading-[1.4] text-indigo-600 bg-indigo-50/50 px-4 py-2 rounded-xl border border-indigo-100/50">
                            {record.sku || '-'}
                          </span>
                        </td>
                        <td className="px-10 py-8 text-center">
                          <span className="text-[18px] font-semibold leading-[1.3] text-slate-900">{formatNumber(record.quantity || 0)}</span>
                        </td>
                        <td className="px-10 py-8 text-center">
                          <span className="text-[18px] font-semibold leading-[1.3] text-slate-900">
                          {formatCurrency(record.value || 0)}
                          </span>
                        </td>
                        <td className="px-10 py-8 text-center">
                          <button className="text-[15.6px] font-medium text-indigo-600 hover:text-indigo-800 transition-colors">View</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OutgoingInventoryPage;
