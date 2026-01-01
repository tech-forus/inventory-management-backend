import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Download, RefreshCw, AlertCircle, FileText } from 'lucide-react';
import { inventoryService } from '../services/inventoryService';
import { libraryService } from '../services/libraryService';
import { skuService } from '../services/skuService';
import { onInventoryUpdated } from '../utils/inventoryEvents';
import { RejectedItemReport, ActionFormData } from '../components/inventory/rejectedItemReports/types';
import { ShortItemReport, ShortItemActionFormData } from '../components/inventory/shortItemReports/types';
import RejectedItemReportTable from '../components/inventory/rejectedItemReports/RejectedItemReportTable';
import ShortItemReportTable from '../components/inventory/shortItemReports/ShortItemReportTable';
import SendToVendorModal from '../components/inventory/rejectedItemReports/modals/SendToVendorModal';
import ReceiveFromVendorModal from '../components/inventory/rejectedItemReports/modals/ReceiveFromVendorModal';
import ScrapModal from '../components/inventory/rejectedItemReports/modals/ScrapModal';
import HistoryModal from '../components/inventory/rejectedItemReports/modals/HistoryModal';
import ReceiveBackModal from '../components/inventory/shortItemReports/modals/ReceiveBackModal';

const RejectedItemReportPage: React.FC = () => {
  // Toggle between Rejected Items and Short Shipments
  const [activeTab, setActiveTab] = useState<'rejected' | 'short'>('rejected');
  
  const [loading, setLoading] = useState(false);
  const [rejectedItemReports, setRejectedItemReports] = useState<RejectedItemReport[]>([]);
  const [filteredReports, setFilteredReports] = useState<RejectedItemReport[]>([]);
  
  // Short items state
  const [shortItemReports, setShortItemReports] = useState<ShortItemReport[]>([]);
  const [filteredShortReports, setFilteredShortReports] = useState<ShortItemReport[]>([]);
  const [shortLoading, setShortLoading] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Actions dropdown
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);
  const dropdownRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});
  
  // Short items dropdown
  const [openShortDropdownId, setOpenShortDropdownId] = useState<number | null>(null);
  const shortDropdownRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

  // Action modals
  const [sendToVendorModal, setSendToVendorModal] = useState<RejectedItemReport | null>(null);
  const [receiveFromVendorModal, setReceiveFromVendorModal] = useState<RejectedItemReport | null>(null);
  const [scrapModal, setScrapModal] = useState<RejectedItemReport | null>(null);
  const [historyModal, setHistoryModal] = useState<RejectedItemReport | null>(null);
  
  // Short item modals
  const [receiveBackModal, setReceiveBackModal] = useState<ShortItemReport | null>(null);
  
  // Form states for actions
  const [actionFormData, setActionFormData] = useState<ActionFormData>({
    quantity: 0,
    remarks: '',
    vendorId: '',
    brandId: '',
    date: new Date().toISOString().split('T')[0],
    docketTracking: '',
    transporter: '',
    reason: '',
    condition: 'replaced',
    invoiceChallan: '',
    addToStock: true,
    scrapReason: 'beyond-repair',
    scrapReasonOther: '',
    approvedBy: '',
    unitPrice: undefined,
    shortItem: undefined,
  });
  const [processing, setProcessing] = useState(false);
  
  // Short item form data
  const [shortItemFormData, setShortItemFormData] = useState<ShortItemActionFormData>({
    quantity: 0,
    remarks: '',
    vendorId: '',
    brandId: '',
    date: new Date().toISOString().split('T')[0],
    docketTracking: '',
    transporter: '',
    reason: '',
    condition: 'replaced',
    invoiceChallan: '',
    addToStock: true,
    receivedBy: '',
  });

  // Vendors, Brands, and Teams
  const [vendors, setVendors] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);

  const loadVendorsAndBrands = async () => {
    try {
      const [vendorsRes, brandsRes, teamsRes] = await Promise.all([
        libraryService.getYourVendors(),
        libraryService.getYourBrands(),
        libraryService.getTeams(),
      ]);
      setVendors(vendorsRes.data || []);
      setBrands(brandsRes.data || []);
      setTeams(teamsRes.data || []);
    } catch (error) {
      console.error('Error loading vendors, brands, and teams:', error);
    }
  };

  const loadRejectedItemReports = useCallback(async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      if (search) params.search = search;

      console.log('[RejectedItemReportPage] Loading rejected item reports with params:', params);
      // Don't use timestamp for cache busting - rely on cache invalidation instead
      // This ensures we get fresh data when cache is invalidated, but use cache when not
      const response = await inventoryService.getRejectedItemReports(params);
      if (response.success) {
        const reports = response.data || [];
        console.log('[RejectedItemReportPage] Loaded rejected item reports:', reports.length);
        setRejectedItemReports(reports);
      } else {
        console.warn('[RejectedItemReportPage] Response not successful:', response);
      }
    } catch (error) {
      console.error('Error loading rejected item reports:', error);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, search]);

  const loadShortItemReports = useCallback(async () => {
    try {
      setShortLoading(true);
      const params: any = {};
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      if (search) params.search = search;

      console.log('[RejectedItemReportPage] Loading short item reports with params:', params);
      // Don't use timestamp for cache busting - rely on cache invalidation instead
      const response = await inventoryService.getShortItemReports(params);
      if (response.success) {
        const reports = response.data || [];
        console.log('[RejectedItemReportPage] Loaded short item reports:', reports.length);
        setShortItemReports(reports);
      } else {
        console.warn('[RejectedItemReportPage] Response not successful:', response);
      }
    } catch (error) {
      console.error('Error loading short item reports:', error);
    } finally {
      setShortLoading(false);
    }
  }, [dateFrom, dateTo, search]);

  // Load data
  useEffect(() => {
    loadRejectedItemReports();
    loadShortItemReports();
    loadVendorsAndBrands();
  }, [loadRejectedItemReports, loadShortItemReports]);

  // Listen for inventory updates
  // Use refs to always call the latest functions without recreating the listener
  const loadRejectedRef = useRef(loadRejectedItemReports);
  const loadShortRef = useRef(loadShortItemReports);
  
  // Update refs when functions change
  useEffect(() => {
    loadRejectedRef.current = loadRejectedItemReports;
    loadShortRef.current = loadShortItemReports;
  }, [loadRejectedItemReports, loadShortItemReports]);
  
  // Set up event listener once, using refs to call latest functions
  useEffect(() => {
    const cleanup = onInventoryUpdated(() => {
      console.log('[RejectedItemReportPage] Inventory updated event received, refreshing reports...');
      // Add small delay to ensure backend transaction is committed
      setTimeout(() => {
        loadRejectedRef.current();
        loadShortRef.current();
      }, 150);
    });
    return cleanup;
  }, []); // Empty dependency array - listener is set up once

  // Apply filters
  useEffect(() => {
    applyFilters();
    applyShortFilters();
  }, [rejectedItemReports, shortItemReports, search, dateFrom, dateTo]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openDropdownId !== null) {
        const dropdown = dropdownRefs.current[openDropdownId];
        if (dropdown && !dropdown.contains(event.target as Node)) {
          setOpenDropdownId(null);
        }
      }
      if (openShortDropdownId !== null) {
        const dropdown = shortDropdownRefs.current[openShortDropdownId];
        if (dropdown && !dropdown.contains(event.target as Node)) {
          setOpenShortDropdownId(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openDropdownId, openShortDropdownId]);

  const applyFilters = () => {
    let filtered = [...rejectedItemReports];

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (report) =>
          report.reportNumber?.toLowerCase().includes(searchLower) ||
          report.skuCode?.toLowerCase().includes(searchLower) ||
          report.itemName?.toLowerCase().includes(searchLower) ||
          report.originalInvoiceNumber?.toLowerCase().includes(searchLower)
      );
    }

    setFilteredReports(filtered);
  };

  const applyShortFilters = () => {
    let filtered = [...shortItemReports];

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(
        (report) =>
          report.invoiceNumber?.toLowerCase().includes(searchLower) ||
          report.skuCode?.toLowerCase().includes(searchLower) ||
          report.itemName?.toLowerCase().includes(searchLower)
      );
    }

    setFilteredShortReports(filtered);
  };

  const handleExport = () => {
    // TODO: Implement CSV/Excel export
    console.log('Export functionality to be implemented');
  };


  const toggleShortDropdown = (reportId: number) => {
    setOpenShortDropdownId(openShortDropdownId === reportId ? null : reportId);
  };

  const getDefaultShortItemFormData = (): ShortItemActionFormData => ({
    quantity: 0,
    remarks: '',
    vendorId: '',
    brandId: '',
    date: new Date().toISOString().split('T')[0],
    docketTracking: '',
    transporter: '',
    reason: '',
    condition: 'replaced',
    invoiceChallan: '',
    addToStock: true,
    receivedBy: '',
  });

  const resetShortItemFormData = () => {
    setShortItemFormData(getDefaultShortItemFormData());
  };

  const handleShortReceiveBack = (report: ShortItemReport) => {
    setOpenShortDropdownId(null);
    const availableQty = report.shortQuantity - (report.receivedBack || 0);
    setShortItemFormData({
      ...getDefaultShortItemFormData(),
      quantity: Math.max(0, availableQty),
      vendorId: report.vendorId || '',
      brandId: report.brandId || '',
    });
    setReceiveBackModal(report);
  };

  const handleShortReceiveBackSubmit = async () => {
    if (!receiveBackModal) return;
    
    // Validation
    if (!shortItemFormData.vendorId) {
      alert('Please select a vendor');
      return;
    }
    if (!shortItemFormData.brandId) {
      alert('Please select a brand');
      return;
    }
    if (!shortItemFormData.date) {
      alert('Please select a date');
      return;
    }
    if (!shortItemFormData.invoiceChallan) {
      alert('Please enter invoice number');
      return;
    }
    if (!shortItemFormData.receivedBy) {
      alert('Please select received by');
      return;
    }
    if (shortItemFormData.quantity <= 0) {
      alert('Quantity must be greater than 0');
      return;
    }
    const availableQty = receiveBackModal.shortQuantity - (receiveBackModal.receivedBack || 0);
    if (shortItemFormData.quantity > availableQty) {
      alert('Quantity exceeds available short quantity');
      return;
    }

    try {
      setProcessing(true);
      
      // Get unit price (default to 0.01 if not available)
      let unitPrice = 0.01;
      try {
        const skuResponse = await skuService.getById(receiveBackModal.skuId);
        if (skuResponse?.success && skuResponse.data?.unitPrice) {
          unitPrice = skuResponse.data.unitPrice > 0 ? skuResponse.data.unitPrice : 0.01;
        }
      } catch (skuError) {
        console.warn('Could not fetch SKU unit price, using 0.01:', skuError);
      }
      
      // Create incoming inventory record
      // This will show in IncomingRecordItems.tsx and add to stock
      const incomingData = {
        invoiceDate: shortItemFormData.date,
        invoiceNumber: shortItemFormData.invoiceChallan,
        receivingDate: shortItemFormData.date,
        vendorId: parseInt(shortItemFormData.vendorId),
        brandId: parseInt(shortItemFormData.brandId),
        receivedBy: parseInt(shortItemFormData.receivedBy),
        documentType: 'bill',
        status: 'completed', // Set to completed so stock is updated
        remarks: shortItemFormData.remarks || `Short items received back. Original invoice: ${receiveBackModal.invoiceNumber}`,
        items: [
          {
            skuId: receiveBackModal.skuId,
            received: shortItemFormData.quantity, // This will add to stock
            short: 0,
            totalQuantity: shortItemFormData.quantity,
            unitPrice: unitPrice,
            totalValue: shortItemFormData.quantity * unitPrice,
          }
        ]
      };
      
      // Create incoming inventory record
      await inventoryService.addIncoming(incomingData);
      
      // Update the original incoming inventory item to reduce short quantity
      // This will automatically update the short item report table
      // Short item reports are derived from incoming_inventory_items where short > 0
      // When we reduce the short quantity, the report will automatically reflect the change
      const newShortQuantity = receiveBackModal.shortQuantity - shortItemFormData.quantity;
      await inventoryService.updateShortItem(
        receiveBackModal.incomingInventoryId,
        {
          itemId: receiveBackModal.incomingInventoryItemId,
          short: Math.max(0, newShortQuantity), // Ensure it doesn't go negative
        }
      );
      
      await loadShortItemReports();
      setReceiveBackModal(null);
      resetShortItemFormData();
      alert(`Short items received back successfully and added to stock`);
    } catch (error: any) {
      console.error('Error receiving back short items:', error);
      alert(error.response?.data?.error || error.response?.data?.message || 'Failed to receive back short items');
    } finally {
      setProcessing(false);
    }
  };

  const handleShortViewHistory = (report: ShortItemReport) => {
    setOpenShortDropdownId(null);
    // TODO: Implement history view for short items
    console.log('View history for short item:', report);
    alert('History view functionality to be implemented');
  };


  const toggleDropdown = (reportId: number) => {
    setOpenDropdownId(openDropdownId === reportId ? null : reportId);
  };

  const getDefaultFormData = (): ActionFormData => ({
    quantity: 0,
    remarks: '',
    vendorId: '',
    brandId: '',
    date: new Date().toISOString().split('T')[0],
    docketTracking: '',
    transporter: '',
    reason: '',
    condition: 'replaced',
    invoiceChallan: '',
    addToStock: true, // Always true - mandatory to add to stock
    scrapReason: 'beyond-repair',
    scrapReasonOther: '',
    approvedBy: '',
    unitPrice: undefined,
    shortItem: undefined,
  });

  const resetFormData = () => {
    setActionFormData(getDefaultFormData());
  };

  const handleSendToVendor = async (report: RejectedItemReport) => {
    setOpenDropdownId(null);
    const availableQty = report.quantity - (report.sentToVendor || 0) - (report.receivedBack || 0) - (report.scrapped || 0);
    
    // Try to fetch SKU unit price as default
    let defaultUnitPrice: number | undefined = undefined;
    try {
      const skuResponse = await skuService.getById(report.skuId);
      if (skuResponse?.success && skuResponse.data?.unitPrice) {
        defaultUnitPrice = skuResponse.data.unitPrice;
      }
    } catch (error) {
      console.warn('Could not fetch SKU unit price for default:', error);
    }
    
    setActionFormData({
      ...getDefaultFormData(),
      quantity: Math.max(0, availableQty),
      vendorId: report.vendorId || '',
      brandId: report.brandId || '',
      unitPrice: defaultUnitPrice,
    });
    setSendToVendorModal(report);
  };

  const handleReceiveFromVendor = (report: RejectedItemReport) => {
    setOpenDropdownId(null);
    const availableQty = report.sentToVendor || 0;
    setActionFormData({
      ...getDefaultFormData(),
      quantity: Math.max(0, availableQty),
      vendorId: report.vendorId || '',
      brandId: report.brandId || '',
      addToStock: true, // Always true - mandatory
    });
    setReceiveFromVendorModal(report);
  };

  const handleScrap = (report: RejectedItemReport) => {
    setOpenDropdownId(null);
    const availableQty = report.quantity - (report.sentToVendor || 0) - (report.receivedBack || 0) - (report.scrapped || 0);
    setActionFormData({
      ...getDefaultFormData(),
      quantity: Math.max(0, availableQty),
    });
    setScrapModal(report);
  };

  const handleViewHistory = (report: RejectedItemReport) => {
    setOpenDropdownId(null);
    setHistoryModal(report);
  };

  const handleFormChange = (data: Partial<ActionFormData>) => {
    setActionFormData(prev => ({ ...prev, ...data }));
  };

  const handleSendToVendorSubmit = async () => {
    if (!sendToVendorModal) return;
    
    // Validation
    if (!actionFormData.vendorId) {
      alert('Please select a vendor');
      return;
    }
    if (!actionFormData.brandId) {
      alert('Please select a brand');
      return;
    }
    if (!actionFormData.reason) {
      alert('Please enter a reason');
      return;
    }
    if (!actionFormData.date) {
      alert('Please select a date');
      return;
    }
    if (actionFormData.quantity <= 0) {
      alert('Quantity must be greater than 0');
      return;
    }
    if (actionFormData.quantity > (sendToVendorModal.quantity - (sendToVendorModal.sentToVendor || 0) - (sendToVendorModal.receivedBack || 0) - (sendToVendorModal.scrapped || 0))) {
      alert('Quantity exceeds available rejected quantity');
      return;
    }
    if (actionFormData.unitPrice === undefined || actionFormData.unitPrice === null || actionFormData.unitPrice < 0) {
      alert('Please enter a valid unit price (must be 0 or greater)');
      return;
    }

    try {
      setProcessing(true);
      
      // Generate report number - use existing report number from rejected item report
      const reportNumber = sendToVendorModal.reportNumber || `REJ-${sendToVendorModal.originalInvoiceNumber}-${Date.now()}`;
      
      // Use unit price from form
      // Backend validation requires unitPrice > 0 (because !unitPrice fails for 0)
      // So if user enters 0, we use 0.01 as minimum
      const unitPrice = actionFormData.unitPrice > 0 ? actionFormData.unitPrice : 0.01;
      
      // Create outgoing inventory record
      const outgoingData = {
        documentType: 'delivery_challan',
        documentSubType: 'replacement',
        deliveryChallanSubType: 'to_vendor',
        invoiceChallanDate: actionFormData.date,
        invoiceChallanNumber: reportNumber, // Use report number as invoice/challan number
        docketNumber: actionFormData.docketTracking || '',
        transportorName: actionFormData.transporter || '',
        destinationType: 'vendor',
        destinationId: parseInt(actionFormData.vendorId),
        remarks: actionFormData.remarks || `Rejected items sent to vendor. Reason: ${actionFormData.reason}`,
        status: 'completed',
        items: [
          {
            skuId: sendToVendorModal.skuId,
            outgoingQuantity: actionFormData.quantity,
            unitPrice: unitPrice,
            totalValue: unitPrice * actionFormData.quantity,
          }
        ]
      };
      
      // Create outgoing inventory record
      await inventoryService.addOutgoing(outgoingData);
      
      // Update rejected item report
      const newSentToVendor = (sendToVendorModal.sentToVendor || 0) + actionFormData.quantity;
      const newNetRejected = Math.max(0, sendToVendorModal.quantity - newSentToVendor - (sendToVendorModal.receivedBack || 0) - (sendToVendorModal.scrapped || 0));
      
      await inventoryService.updateRejectedItemReport(sendToVendorModal.id, {
        sentToVendor: newSentToVendor,
        netRejected: newNetRejected,
      });

      await loadRejectedItemReports();
      setSendToVendorModal(null);
      resetFormData();
      alert(`Items sent to vendor successfully. Report Number: ${reportNumber}`);
    } catch (error: any) {
      console.error('Error sending to vendor:', error);
      alert(error.response?.data?.error || error.response?.data?.message || 'Failed to send items to vendor');
    } finally {
      setProcessing(false);
    }
  };

  const handleReceiveFromVendorSubmit = async () => {
    if (!receiveFromVendorModal) return;
    
    // Validation
    if (!actionFormData.vendorId) {
      alert('Please select a vendor');
      return;
    }
    if (!actionFormData.brandId) {
      alert('Please select a brand');
      return;
    }
    if (!actionFormData.date) {
      alert('Please select a date');
      return;
    }
    if (actionFormData.quantity <= 0) {
      alert('Quantity must be greater than 0');
      return;
    }
    if (actionFormData.quantity > (receiveFromVendorModal.sentToVendor || 0)) {
      alert('Quantity exceeds sent to vendor quantity');
      return;
    }
    if (actionFormData.shortItem !== undefined && actionFormData.shortItem > actionFormData.quantity) {
      alert('Short item quantity cannot exceed receive quantity');
      return;
    }

    try {
      setProcessing(true);
      const newReceivedBack = (receiveFromVendorModal.receivedBack || 0) + actionFormData.quantity;
      const newSentToVendor = Math.max(0, (receiveFromVendorModal.sentToVendor || 0) - actionFormData.quantity);
      const newNetRejected = Math.max(0, receiveFromVendorModal.quantity - newSentToVendor - newReceivedBack - (receiveFromVendorModal.scrapped || 0));
      
      await inventoryService.updateRejectedItemReport(receiveFromVendorModal.id, {
        sentToVendor: newSentToVendor,
        receivedBack: newReceivedBack,
        netRejected: newNetRejected,
      });

      // Always create incoming inventory record and add to stock (mandatory)
      // This will show in IncomingRecordItems.tsx and update available stock
      const shortQty = actionFormData.shortItem || 0;
      const receivedQty = actionFormData.quantity - shortQty; // Full quantity minus any short items
      const totalQty = actionFormData.quantity;
      
      // Generate invoice number from report number
      const invoiceNumber = actionFormData.invoiceChallan || `RECV-${receiveFromVendorModal.reportNumber}-${Date.now()}`;
      
      // Get unit price (default to 0.01 if not available)
      let unitPrice = 0.01;
      try {
        const skuResponse = await skuService.getById(receiveFromVendorModal.skuId);
        if (skuResponse?.success && skuResponse.data?.unitPrice) {
          unitPrice = skuResponse.data.unitPrice > 0 ? skuResponse.data.unitPrice : 0.01;
        }
      } catch (skuError) {
        console.warn('Could not fetch SKU unit price, using 0.01:', skuError);
      }
      
      const incomingData = {
        invoiceDate: actionFormData.date,
        invoiceNumber: invoiceNumber,
        receivingDate: actionFormData.date,
        vendorId: parseInt(actionFormData.vendorId),
        brandId: parseInt(actionFormData.brandId),
        documentType: 'bill',
        status: 'completed', // Always completed to update stock
        remarks: actionFormData.remarks || `Items received from vendor. Condition: ${actionFormData.condition}. ${receiveFromVendorModal.reportNumber ? `Report: ${receiveFromVendorModal.reportNumber}` : ''}`,
        items: [
          {
            skuId: receiveFromVendorModal.skuId,
            received: receivedQty, // Always add received quantity to stock
            short: shortQty, // Any short items recorded separately
            totalQuantity: totalQty,
            unitPrice: unitPrice,
            totalValue: totalQty * unitPrice,
          }
        ]
      };
      
      await inventoryService.addIncoming(incomingData);

      await loadRejectedItemReports();
      await loadShortItemReports(); // Refresh short item reports if short was added
      setReceiveFromVendorModal(null);
      resetFormData();
      
      const messages = ['added to available stock'];
      if (shortQty > 0) {
        messages.push('short item recorded');
      }
      
      alert(`Items received from vendor successfully and ${messages.join(', ')}`);
    } catch (error: any) {
      console.error('Error receiving from vendor:', error);
      alert(error.response?.data?.error || error.response?.data?.message || 'Failed to receive items from vendor');
    } finally {
      setProcessing(false);
    }
  };

  const handleScrapSubmit = async () => {
    if (!scrapModal) return;
    
    // Validation
    if (!actionFormData.date) {
      alert('Please select a date');
      return;
    }
    if (actionFormData.quantity <= 0) {
      alert('Quantity must be greater than 0');
      return;
    }
    if (actionFormData.quantity > (scrapModal.quantity - (scrapModal.sentToVendor || 0) - (scrapModal.receivedBack || 0) - (scrapModal.scrapped || 0))) {
      alert('Quantity exceeds available rejected quantity');
      return;
    }
    if (actionFormData.scrapReason === 'other' && !actionFormData.scrapReasonOther.trim()) {
      alert('Please specify the reason for scrapping');
      return;
    }
    if (!actionFormData.approvedBy) {
      alert('Please select who approved this scrap action');
      return;
    }

    try {
      setProcessing(true);
      const newScrapped = (scrapModal.scrapped || 0) + actionFormData.quantity;
      const newNetRejected = Math.max(0, scrapModal.quantity - (scrapModal.sentToVendor || 0) - (scrapModal.receivedBack || 0) - newScrapped);
      
      await inventoryService.updateRejectedItemReport(scrapModal.id, {
        scrapped: newScrapped,
        netRejected: newNetRejected,
      });

      await loadRejectedItemReports();
      setScrapModal(null);
      resetFormData();
      alert('Items marked as scrapped successfully');
    } catch (error: any) {
      console.error('Error scrapping items:', error);
      alert(error.response?.data?.error || 'Failed to scrap items');
    } finally {
      setProcessing(false);
    }
  };

  const getRejectedItemsCount = () => rejectedItemReports.length;
  const getShortItemsCount = () => shortItemReports.length;

  return (
    <div className="p-6 space-y-[30px] w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-[18px]">
        <div className="space-y-[6px]">
          <h1 className="text-[27px] font-black text-slate-900 tracking-tight">Rejected & Short Items</h1>
          <p className="text-[13.5px] text-slate-500 font-medium">Manage rejected items and short shipments tracking.</p>
        </div>
      </div>

      {/* Toggle Buttons with Action Buttons */}
      <div className="bg-white rounded-[1.875rem] border border-slate-100 shadow-sm p-[6px] flex items-center justify-between gap-[6px]">
        <div className="flex gap-[6px]">
          <button
            onClick={() => setActiveTab('rejected')}
            className={`flex items-center gap-[9px] px-[18px] py-[9px] rounded-xl transition-all ${
              activeTab === 'rejected'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
              <AlertCircle className={`w-[15px] h-[15px] ${
              activeTab === 'rejected' ? 'text-white' : 'text-slate-400'
              }`} />
            <span className={`font-black text-[9.75px] uppercase tracking-wider ${
              activeTab === 'rejected' ? 'text-white' : 'text-slate-600'
            }`}>
              Rejected Items
            </span>
            <span className={`px-[6px] py-[3px] rounded-full text-[10.5px] font-medium ${
              activeTab === 'rejected'
                ? 'bg-orange-100 text-orange-600'
                : 'bg-gray-200 text-gray-600'
            }`}>
              {getRejectedItemsCount()}
            </span>
          </button>
          
          <button
            onClick={() => setActiveTab('short')}
            className={`flex items-center gap-[9px] px-[18px] py-[12px] rounded-lg border-2 transition-all ${
              activeTab === 'short'
                ? 'bg-white border-orange-500 shadow-md'
                : 'bg-gray-100 border-gray-300 hover:bg-gray-200'
            }`}
          >
            <div className={`p-[6px] rounded-full ${
              activeTab === 'short' ? 'bg-orange-100' : 'bg-gray-200'
            }`}>
              <FileText className={`w-[15px] h-[15px] ${
                activeTab === 'short' ? 'text-orange-600' : 'text-gray-600'
              }`} />
            </div>
            <span className={`font-medium text-[10.5px] ${
              activeTab === 'short' ? 'text-orange-600' : 'text-gray-600'
            }`}>
              Short Shipments
            </span>
            <span className={`px-[6px] py-[3px] rounded-full text-[10.5px] font-medium ${
              activeTab === 'short'
                ? 'bg-orange-100 text-orange-600'
                : 'bg-gray-200 text-gray-600'
            }`}>
              {getShortItemsCount()}
            </span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-[9px]">
          <button
            onClick={() => {
              if (activeTab === 'rejected') {
                loadRejectedItemReports();
              } else {
                loadShortItemReports();
              }
            }}
            disabled={activeTab === 'rejected' ? loading : shortLoading}
            className="px-3 py-[6px] rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 text-[10.5px]"
          >
            <RefreshCw className={`w-3 h-3 inline mr-[6px] ${(activeTab === 'rejected' ? loading : shortLoading) ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={handleExport}
            className="px-3 py-[6px] rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors text-[10.5px]"
          >
            <Download className="w-3 h-3 inline mr-[6px]" />
            Export
          </button>
        </div>
      </div>

      {/* Tables */}
      {activeTab === 'rejected' ? (
        <RejectedItemReportTable
          reports={filteredReports}
          loading={loading}
          openDropdownId={openDropdownId}
          dropdownRefs={dropdownRefs}
          onToggleDropdown={toggleDropdown}
          onSendToVendor={handleSendToVendor}
          onReceiveFromVendor={handleReceiveFromVendor}
          onScrap={handleScrap}
          onViewHistory={handleViewHistory}
        />
      ) : (
        <ShortItemReportTable
          reports={filteredShortReports}
          loading={shortLoading}
          openDropdownId={openShortDropdownId}
          dropdownRefs={shortDropdownRefs}
          onToggleDropdown={toggleShortDropdown}
          onReceiveBack={handleShortReceiveBack}
          onViewHistory={handleShortViewHistory}
        />
      )}

      {/* Modals */}
      {sendToVendorModal && (
        <SendToVendorModal
          report={sendToVendorModal}
          formData={actionFormData}
          vendors={vendors}
          brands={brands}
          processing={processing}
          onClose={() => {
            setSendToVendorModal(null);
            resetFormData();
          }}
          onFormChange={handleFormChange}
          onSubmit={handleSendToVendorSubmit}
        />
      )}

      {receiveFromVendorModal && (
        <ReceiveFromVendorModal
          report={receiveFromVendorModal}
          formData={actionFormData}
          vendors={vendors}
          brands={brands}
          processing={processing}
          onClose={() => {
            setReceiveFromVendorModal(null);
            resetFormData();
          }}
          onFormChange={handleFormChange}
          onSubmit={handleReceiveFromVendorSubmit}
        />
      )}

      {scrapModal && (
        <ScrapModal
          report={scrapModal}
          formData={actionFormData}
          teams={teams}
          processing={processing}
          onClose={() => {
            setScrapModal(null);
            resetFormData();
          }}
          onFormChange={handleFormChange}
          onSubmit={handleScrapSubmit}
        />
      )}

      {historyModal && (
        <HistoryModal
          report={historyModal}
          onClose={() => setHistoryModal(null)}
        />
      )}

      {receiveBackModal && (
        <ReceiveBackModal
          report={receiveBackModal}
          formData={shortItemFormData}
          vendors={vendors}
          brands={brands}
          teams={teams}
          processing={processing}
          onClose={() => {
            setReceiveBackModal(null);
            resetShortItemFormData();
          }}
          onFormChange={(data) => setShortItemFormData(prev => ({ ...prev, ...data }))}
          onSubmit={handleShortReceiveBackSubmit}
        />
      )}
    </div>
  );
};

export default RejectedItemReportPage;
