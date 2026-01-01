import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, X, Upload, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { libraryService } from '../../services/libraryService';
import { validateRequired } from '../../utils/validators';
import { formatDate } from '../../utils/formatters';

interface ProductCategory {
  id: number;
  name: string;
  description?: string;
  createdAt?: string;
}

interface ItemCategory {
  id: number;
  name: string;
  productCategoryId: number;
  productCategoryName?: string;
  description?: string;
  createdAt?: string;
}

interface SubCategory {
  id: number;
  name: string;
  itemCategoryId: number;
  itemCategoryName?: string;
  description?: string;
  createdAt?: string;
}

type UnifiedCategoryRow = {
  id: string;
  type: 'product' | 'item' | 'sub';
  productCategory: string;
  itemCategory: string;
  subCategory: string;
  createdAt: string;
  productCategoryId?: number;
  itemCategoryId?: number;
  subCategoryId?: number;
};

interface CategoryMasterTabProps {
  productCategories: ProductCategory[];
  itemCategories: ItemCategory[];
  subCategories: SubCategory[];
  loading: boolean;
  onRefresh: () => void;
}

const CategoryMasterTab: React.FC<CategoryMasterTabProps> = ({
  productCategories,
  itemCategories,
  subCategories,
  loading,
  onRefresh,
}) => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [unifiedRows, setUnifiedRows] = useState<UnifiedCategoryRow[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editingRow, setEditingRow] = useState<UnifiedCategoryRow | null>(null);
  const [formType, setFormType] = useState<'product' | 'item' | 'sub'>('product');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isMultipleMode, setIsMultipleMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Upload preview states
  const [showUploadPreview, setShowUploadPreview] = useState(false);
  const [uploadPreviewData, setUploadPreviewData] = useState<{
    rows: Array<{ productCategory: string; itemCategory: string; subCategory: string }>;
    file: File | null;
  } | null>(null);
  const [uploading, setUploading] = useState(false);

  // Form states
  const [productForm, setProductForm] = useState({ name: '' });
  const [itemForm, setItemForm] = useState({ name: '', productCategoryId: 0 });
  const [subForm, setSubForm] = useState({ name: '', itemCategoryId: 0 });
  const [availableProductCategories, setAvailableProductCategories] = useState<ProductCategory[]>([]);
  const [availableItemCategories, setAvailableItemCategories] = useState<ItemCategory[]>([]);

  // Multiple form states
  const [multipleItemCategories, setMultipleItemCategories] = useState<Array<{ name: string }>>([{ name: '' }]);
  const [multipleSubCategories, setMultipleSubCategories] = useState<Array<{ name: string }>>([{ name: '' }]);

  // Build unified rows from all category types
  useEffect(() => {
    const rows: UnifiedCategoryRow[] = [];

    // Add Product Categories
    productCategories.forEach((pc) => {
      rows.push({
        id: `product-${pc.id}`,
        type: 'product',
        productCategory: pc.name,
        itemCategory: '-',
        subCategory: '-',
        createdAt: pc.createdAt || '',
        productCategoryId: pc.id,
      });
    });

    // Add Item Categories
    itemCategories.forEach((ic) => {
      const productCat = productCategories.find((pc) => pc.id === ic.productCategoryId);
      rows.push({
        id: `item-${ic.id}`,
        type: 'item',
        productCategory: productCat?.name || '-',
        itemCategory: ic.name,
        subCategory: '-',
        createdAt: ic.createdAt || '',
        productCategoryId: ic.productCategoryId,
        itemCategoryId: ic.id,
      });
    });

    // Add Sub Categories
    subCategories.forEach((sc) => {
      const itemCat = itemCategories.find((ic) => ic.id === sc.itemCategoryId);
      const productCat = productCategories.find((pc) => pc.id === itemCat?.productCategoryId);
      rows.push({
        id: `sub-${sc.id}`,
        type: 'sub',
        productCategory: productCat?.name || '-',
        itemCategory: itemCat?.name || '-',
        subCategory: sc.name,
        createdAt: sc.createdAt || '',
        productCategoryId: productCat?.id,
        itemCategoryId: sc.itemCategoryId,
        subCategoryId: sc.id,
      });
    });

    // Sort by created date (newest first)
    rows.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA;
    });

    setUnifiedRows(rows);
  }, [productCategories, itemCategories, subCategories]);

  // Load product categories for dropdowns
  useEffect(() => {
    if (showDialog) {
      libraryService.getYourProductCategories().then((res) => {
        setAvailableProductCategories(res.data || []);
      });
      if (formType === 'sub' || formType === 'item') {
        libraryService.getYourItemCategories().then((res) => {
          setAvailableItemCategories(res.data || []);
        });
      }
    }
  }, [showDialog, formType]);

  const filteredRows = unifiedRows.filter((row) => {
    const searchLower = search.toLowerCase();
    const hasAllThree =
      !!row.productCategory && row.productCategory !== '-' &&
      !!row.itemCategory && row.itemCategory !== '-' &&
      !!row.subCategory && row.subCategory !== '-';

    if (!hasAllThree) return false;

    return (
      row.productCategory.toLowerCase().includes(searchLower) ||
      row.itemCategory.toLowerCase().includes(searchLower) ||
      row.subCategory.toLowerCase().includes(searchLower)
    );
  });

  const handleOpenDialog = (type: 'product' | 'item' | 'sub', row?: UnifiedCategoryRow) => {
    setFormType(type);
    setIsMultipleMode(false);
    setErrors({});

    if (row) {
      setEditingRow(row);
      if (type === 'product') {
        const pc = productCategories.find((c) => c.id === row.productCategoryId);
        setProductForm({ name: pc?.name || '' });
      } else if (type === 'item') {
        const ic = itemCategories.find((c) => c.id === row.itemCategoryId);
        setItemForm({ name: ic?.name || '', productCategoryId: ic?.productCategoryId || 0 });
      } else if (type === 'sub') {
        const sc = subCategories.find((c) => c.id === row.subCategoryId);
        setSubForm({ name: sc?.name || '', itemCategoryId: sc?.itemCategoryId || 0 });
      }
    } else {
      setEditingRow(null);
      if (type === 'product') {
        setProductForm({ name: '' });
      } else if (type === 'item') {
        setItemForm({ name: '', productCategoryId: 0 });
        setMultipleItemCategories([{ name: '' }]);
      } else if (type === 'sub') {
        setSubForm({ name: '', itemCategoryId: 0 });
        setMultipleSubCategories([{ name: '' }]);
      }
    }
    setShowDialog(true);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingRow(null);
    setErrors({});
    setIsMultipleMode(false);
  };

  const addMultipleItemRow = () => {
    setMultipleItemCategories([...multipleItemCategories, { name: '' }]);
  };

  const updateMultipleItemField = (index: number, value: string) => {
    const updated = [...multipleItemCategories];
    updated[index] = { name: value };
    setMultipleItemCategories(updated);
  };

  const removeMultipleItemRow = (index: number) => {
    if (multipleItemCategories.length > 1) {
      setMultipleItemCategories(multipleItemCategories.filter((_, i) => i !== index));
    }
  };

  const addMultipleSubRow = () => {
    setMultipleSubCategories([...multipleSubCategories, { name: '' }]);
  };

  const updateMultipleSubField = (index: number, value: string) => {
    const updated = [...multipleSubCategories];
    updated[index] = { name: value };
    setMultipleSubCategories(updated);
  };

  const removeMultipleSubRow = (index: number) => {
    if (multipleSubCategories.length > 1) {
      setMultipleSubCategories(multipleSubCategories.filter((_, i) => i !== index));
    }
  };

  const handleSaveMultipleItems = async () => {
    const validItems = multipleItemCategories.filter(item => item.name.trim() !== '');
    if (validItems.length === 0) {
      setErrors({ name: 'Please add at least one item category' });
      return;
    }
    if (!itemForm.productCategoryId || itemForm.productCategoryId === 0) {
      setErrors({ productCategoryId: 'Product Category is required' });
      return;
    }

    try {
      setSaving(true);
      const promises = validItems.map(item =>
        libraryService.createYourItemCategory({
          name: item.name.trim(),
          productCategoryId: itemForm.productCategoryId,
        })
      );
      await Promise.all(promises);
      handleCloseDialog();
      onRefresh();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to save item categories');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveMultipleSubs = async () => {
    const validItems = multipleSubCategories.filter(item => item.name.trim() !== '');
    if (validItems.length === 0) {
      setErrors({ name: 'Please add at least one sub category' });
      return;
    }
    if (!subForm.itemCategoryId || subForm.itemCategoryId === 0) {
      setErrors({ itemCategoryId: 'Item Category is required' });
      return;
    }

    try {
      setSaving(true);
      const promises = validItems.map(item =>
        libraryService.createYourSubCategory({
          name: item.name.trim(),
          itemCategoryId: subForm.itemCategoryId,
        })
      );
      await Promise.all(promises);
      handleCloseDialog();
      onRefresh();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to save sub categories');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (isMultipleMode && formType === 'item') {
      await handleSaveMultipleItems();
      return;
    }
    if (isMultipleMode && formType === 'sub') {
      await handleSaveMultipleSubs();
      return;
    }

    const newErrors: Record<string, string> = {};

    if (formType === 'product') {
      if (!validateRequired(productForm.name)) {
        newErrors.name = 'Category Name is required';
      }
    } else if (formType === 'item') {
      if (!validateRequired(itemForm.name)) {
        newErrors.name = 'Category Name is required';
      }
      if (!itemForm.productCategoryId || itemForm.productCategoryId === 0) {
        newErrors.productCategoryId = 'Product Category is required';
      }
    } else if (formType === 'sub') {
      if (!validateRequired(subForm.name)) {
        newErrors.name = 'Category Name is required';
      }
      if (!subForm.itemCategoryId || subForm.itemCategoryId === 0) {
        newErrors.itemCategoryId = 'Item Category is required';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setSaving(true);
      if (editingRow) {
        if (formType === 'product' && editingRow.productCategoryId) {
          await libraryService.updateYourProductCategory(editingRow.productCategoryId, productForm);
        } else if (formType === 'item' && editingRow.itemCategoryId) {
          await libraryService.updateYourItemCategory(editingRow.itemCategoryId, itemForm);
        } else if (formType === 'sub' && editingRow.subCategoryId) {
          await libraryService.updateYourSubCategory(editingRow.subCategoryId, subForm);
        }
      } else {
        if (formType === 'product') {
          await libraryService.createYourProductCategory(productForm);
        } else if (formType === 'item') {
          await libraryService.createYourItemCategory(itemForm);
        } else if (formType === 'sub') {
          await libraryService.createYourSubCategory(subForm);
        }
      }
      handleCloseDialog();
      onRefresh();
    } catch (error: any) {
      alert(error.response?.data?.error || `Failed to save ${formType} category`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: UnifiedCategoryRow) => {
    const typeName = row.type === 'product' ? 'product category' : row.type === 'item' ? 'item category' : 'sub category';
    if (!window.confirm(`Are you sure you want to delete this ${typeName}?`)) return;

    try {
      setSaving(true);
      if (row.type === 'product' && row.productCategoryId) {
        await libraryService.deleteYourProductCategory(row.productCategoryId);
      } else if (row.type === 'item' && row.itemCategoryId) {
        await libraryService.deleteYourItemCategory(row.itemCategoryId);
      } else if (row.type === 'sub' && row.subCategoryId) {
        await libraryService.deleteYourSubCategory(row.subCategoryId);
      }
      onRefresh();
    } catch (error: any) {
      alert(error.response?.data?.error || `Failed to delete ${typeName}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadTemplate = () => {
    // Create unified template with a single sheet (user-friendly)
    const wb = XLSX.utils.book_new();
    
    // Title + headers + example row (exact headers requested)
    const aoa = [
      ['Category Master Template', '', ''],
      ['Product Category', 'Item Category', 'Sub Category'],
      ['', '', ''],
    ];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = [{ wch: 25 }, { wch: 25 }, { wch: 25 }];
    // Merge title across 3 columns
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }];
    XLSX.utils.book_append_sheet(wb, ws, 'Category Master');
    
    XLSX.writeFile(wb, 'Category_Master_Upload_Template.xlsx');
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const parseExcelFile = (file: File): Promise<{
    rows: Array<{ productCategory: string; itemCategory: string; subCategory: string }>;
  }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          
          // Find Category Master sheet
          const categoryMasterSheetName = workbook.SheetNames.find(name => {
            const lowerName = name.toLowerCase().trim();
            return (lowerName.includes('category') && lowerName.includes('master')) ||
                   lowerName === 'category master' ||
                   lowerName === 'categorymaster';
          });
          
          if (!categoryMasterSheetName) {
            reject(new Error('Category Master sheet not found in the file'));
            return;
          }
          
          const worksheet = workbook.Sheets[categoryMasterSheetName];
          
          // Find header row
          let dataStartRow = 2; // Default: start from row 3 (0-based index 2)
          const maxSearchRows = 5;
          for (let i = 0; i < maxSearchRows; i++) {
            const cellA = worksheet[XLSX.utils.encode_cell({ r: i, c: 0 })];
            if (cellA && cellA.v && cellA.v.toString().toLowerCase().includes('product category')) {
              dataStartRow = i + 1;
              break;
            }
          }
          
          // Parse data
          const unifiedData = XLSX.utils.sheet_to_json(worksheet, {
            header: ['Product Category', 'Item Category', 'Sub Category'],
            range: dataStartRow,
            defval: null,
            blankrows: false,
          });
          
          // Filter empty rows
          const dataRows = unifiedData.filter((row: any) =>
            (row['Product Category'] && row['Product Category'].toString().trim()) ||
            (row['Item Category'] && row['Item Category'].toString().trim()) ||
            (row['Sub Category'] && row['Sub Category'].toString().trim())
          );
          
          // Extract unique categories
          const productCategoryMap = new Map<string, string>(); // lowercase -> original
          const itemCategoryMap = new Map<string, Map<string, string>>(); // productKey -> Map(itemKey -> original)
          const subCategoryMap = new Map<string, Map<string, string>>(); // itemKey -> Map(subKey -> original)
          
          for (const row of dataRows) {
            const productCat = ((row as any)['Product Category'] || '').toString().trim();
            const itemCat = ((row as any)['Item Category'] || '').toString().trim();
            const subCat = ((row as any)['Sub Category'] || '').toString().trim();
            
            if (productCat) {
              const key = productCat.toLowerCase().trim();
              if (!productCategoryMap.has(key)) {
                productCategoryMap.set(key, productCat.trim());
              }
            }
            
            if (productCat && itemCat) {
              const productKey = productCat.toLowerCase().trim();
              if (!itemCategoryMap.has(productKey)) {
                itemCategoryMap.set(productKey, new Map());
              }
              const itemKey = itemCat.toLowerCase().trim();
              if (!itemCategoryMap.get(productKey)!.has(itemKey)) {
                itemCategoryMap.get(productKey)!.set(itemKey, itemCat.trim());
              }
            }
            
            if (productCat && itemCat && subCat) {
              const key = `${productCat.toLowerCase().trim()}|${itemCat.toLowerCase().trim()}`;
              if (!subCategoryMap.has(key)) {
                subCategoryMap.set(key, new Map());
              }
              const subKey = subCat.toLowerCase().trim();
              if (!subCategoryMap.get(key)!.has(subKey)) {
                subCategoryMap.get(key)!.set(subKey, subCat.trim());
              }
            }
          }
          
          // Convert to unified rows array (same format as Excel)
          const rows: Array<{ productCategory: string; itemCategory: string; subCategory: string }> = [];
          
          for (const row of dataRows) {
            const productCat = ((row as any)['Product Category'] || '').toString().trim();
            const itemCat = ((row as any)['Item Category'] || '').toString().trim();
            const subCat = ((row as any)['Sub Category'] || '').toString().trim();
            
            rows.push({
              productCategory: productCat || '',
              itemCategory: itemCat || '',
              subCategory: subCat || ''
            });
          }
          
          resolve({ rows });
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  };

  const handleFileUpload = async (file: File | null) => {
    if (!file) return;

    // Check both MIME type and file extension for better compatibility
    const validMimeTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/octet-stream',
      'application/x-zip-compressed',
      'text/csv',
    ];
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    const isValidMimeType = validMimeTypes.includes(file.type);
    const isValidExtension = validExtensions.includes(fileExtension);
    
    if (!isValidMimeType && !isValidExtension) {
      alert('Please upload a valid Excel file (.xlsx, .xls) or CSV file');
      return;
    }

    try {
      setSaving(true);
      const previewData = await parseExcelFile(file);
      setUploadPreviewData({ ...previewData, file });
      setShowUploadPreview(true);
    } catch (error: any) {
      alert(error.message || 'Failed to parse Excel file');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmUpload = async () => {
    if (!uploadPreviewData?.file) return;

    try {
      setUploading(true);
      const result = await libraryService.uploadCategories(uploadPreviewData.file);
      
      if (result.success) {
        let summary = `Upload Summary:\n\n` +
          `Product Categories: ${result.productCategories?.inserted || 0} inserted, ${result.productCategories?.updated || 0} already existed, ${result.productCategories?.errors || 0} errors\n` +
          `Item Categories: ${result.itemCategories?.inserted || 0} inserted, ${result.itemCategories?.updated || 0} already existed, ${result.itemCategories?.errors || 0} errors\n` +
          `Sub Categories: ${result.subCategories?.inserted || 0} inserted, ${result.subCategories?.updated || 0} already existed, ${result.subCategories?.errors || 0} errors`;
        
        // Add error details if any
        const allErrors: string[] = [];
        
        if (result.productCategories?.errorDetails && result.productCategories.errorDetails.length > 0) {
          allErrors.push('\nProduct Category Errors:');
          result.productCategories.errorDetails.forEach((err: any) => {
            allErrors.push(`  - ${err.error}`);
          });
        }
        
        if (result.itemCategories?.errorDetails && result.itemCategories.errorDetails.length > 0) {
          allErrors.push('\nItem Category Errors:');
          result.itemCategories.errorDetails.forEach((err: any) => {
            allErrors.push(`  - ${err.error}`);
          });
        }
        
        if (result.subCategories?.errorDetails && result.subCategories.errorDetails.length > 0) {
          allErrors.push('\nSub Category Errors:');
          result.subCategories.errorDetails.forEach((err: any) => {
            allErrors.push(`  - ${err.error}`);
          });
        }
        
        if (allErrors.length > 0) {
          summary += '\n\n' + allErrors.join('\n');
        }
        
        // Close preview modal first
        setShowUploadPreview(false);
        setUploadPreviewData(null);
        
        // Show success message and refresh immediately
        alert(summary);
        
        // Refresh the list to show uploaded items immediately
        onRefresh();
      } else {
        alert(result.message || 'Failed to upload file');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Failed to upload file';
      const errorDetails = error.response?.data?.errorDetails;
      
      let fullError = errorMessage;
      if (errorDetails && Array.isArray(errorDetails) && errorDetails.length > 0) {
        fullError += '\n\nError Details:\n' + errorDetails.map((err: any) => `  - ${err.error || err}`).join('\n');
      }
      
      alert(fullError);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleCancelUpload = () => {
    setShowUploadPreview(false);
    setUploadPreviewData(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search categories..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => navigate('/app/library/categories/manage')}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </button>
          <button
            onClick={handleDownloadTemplate}
            className="px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 flex items-center gap-2 text-sm"
            title="Download unified Excel template with all category types"
          >
            <Download className="w-4 h-4" />
            Download Template
          </button>
          <button
            onClick={handleFileSelect}
            className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 text-sm"
          >
            <Upload className="w-4 h-4" />
            Upload Excel
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => handleFileUpload(e.target.files?.[0] || null)}
            accept=".xlsx,.xls,.csv"
            className="hidden"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="p-12 text-center">
          <p className="text-gray-600 text-sm">No categories found</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 uppercase">Product Category</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 uppercase">Item Category</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 uppercase">Sub Category</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 uppercase">Created Date</th>
                  <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredRows.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-xs text-gray-900 text-center">
                      {row.productCategory}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-900 text-center">
                      {row.itemCategory}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-900 text-center">
                      {row.subCategory}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500 text-center">
                      {row.createdAt ? formatDate(row.createdAt) : '-'}
                    </td>
                    <td className="px-3 py-2 text-xs text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() =>
                            navigate('/app/library/categories/manage', {
                              state: {
                                fromCategoryMaster: true,
                                type: row.type,
                                productCategoryId: row.productCategoryId,
                                itemCategoryId: row.itemCategoryId,
                                subCategoryId: row.subCategoryId,
                              },
                            })
                          }
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(row)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Dialog */}
      {showDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`bg-white rounded-lg shadow-xl w-full mx-4 max-h-[90vh] overflow-y-auto ${isMultipleMode && (formType === 'item' || formType === 'sub') ? 'max-w-3xl' : 'max-w-2xl'}`}>
            <div className="p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  {editingRow ? `Edit ${formType === 'product' ? 'Product' : formType === 'item' ? 'Item' : 'Sub'} Category` : `Add ${formType === 'product' ? 'Product' : formType === 'item' ? 'Item' : 'Sub'} Category`}
                </h2>
                <button
                  onClick={handleCloseDialog}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Multiple Mode Toggle for Item and Sub Categories */}
              {(formType === 'item' || formType === 'sub') && !editingRow && (
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200 mb-4">
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-gray-900">
                      Entry Mode
                    </span>
                    <span className="text-[10px] text-gray-500 mt-0.5">
                      {isMultipleMode ? 'Add multiple categories at once' : 'Add one category at a time'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className={`text-xs font-medium transition-colors ${!isMultipleMode ? 'text-gray-900' : 'text-gray-500'}`}>
                      Single
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsMultipleMode(!isMultipleMode);
                        setErrors({});
                      }}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
                        isMultipleMode ? 'bg-blue-600' : 'bg-gray-300'
                      }`}
                      role="switch"
                      aria-checked={isMultipleMode}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                          isMultipleMode ? 'translate-x-5' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                    <span className={`text-xs font-medium transition-colors ${isMultipleMode ? 'text-gray-900' : 'text-gray-500'}`}>
                      Multiple
                    </span>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {formType === 'product' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Product Category Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={productForm.name}
                      onChange={(e) => setProductForm({ name: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm ${
                        errors.name ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                  </div>
                )}

                {formType === 'item' && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Product Category <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={itemForm.productCategoryId}
                        onChange={(e) => setItemForm({ ...itemForm, productCategoryId: parseInt(e.target.value) })}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${
                          errors.productCategoryId ? 'border-red-500' : 'border-gray-300'
                        }`}
                      >
                        <option value="0">Select Product Category</option>
                        {availableProductCategories.map((pc) => (
                          <option key={pc.id} value={pc.id}>
                            {pc.name}
                          </option>
                        ))}
                      </select>
                      {errors.productCategoryId && <p className="text-red-500 text-xs mt-1">{errors.productCategoryId}</p>}
                    </div>

                    {isMultipleMode && !editingRow ? (
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Item Category Names <span className="text-red-500">*</span>
                        </label>
                        <div className="space-y-2">
                          {multipleItemCategories.map((item, index) => (
                            <div key={index} className="flex gap-2">
                              <input
                                type="text"
                                value={item.name}
                                onChange={(e) => updateMultipleItemField(index, e.target.value)}
                                placeholder={`Item Category ${index + 1}`}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                              />
                              {multipleItemCategories.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeMultipleItemRow(index)}
                                  className="px-2 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={addMultipleItemRow}
                            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Add Another
                          </button>
                        </div>
                        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                      </div>
                    ) : (
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Item Category Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={itemForm.name}
                          onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm ${
                            errors.name ? 'border-red-500' : 'border-gray-300'
                          }`}
                        />
                        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                      </div>
                    )}
                  </>
                )}

                {formType === 'sub' && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Item Category <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={subForm.itemCategoryId}
                        onChange={(e) => setSubForm({ ...subForm, itemCategoryId: parseInt(e.target.value) })}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm ${
                          errors.itemCategoryId ? 'border-red-500' : 'border-gray-300'
                        }`}
                      >
                        <option value="0">Select Item Category</option>
                        {availableItemCategories.map((ic) => (
                          <option key={ic.id} value={ic.id}>
                            {ic.name}
                          </option>
                        ))}
                      </select>
                      {errors.itemCategoryId && <p className="text-red-500 text-xs mt-1">{errors.itemCategoryId}</p>}
                    </div>

                    {isMultipleMode && !editingRow ? (
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Sub Category Names <span className="text-red-500">*</span>
                        </label>
                        <div className="space-y-2">
                          {multipleSubCategories.map((item, index) => (
                            <div key={index} className="flex gap-2">
                              <input
                                type="text"
                                value={item.name}
                                onChange={(e) => updateMultipleSubField(index, e.target.value)}
                                placeholder={`Sub Category ${index + 1}`}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                              />
                              {multipleSubCategories.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeMultipleSubRow(index)}
                                  className="px-2 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={addMultipleSubRow}
                            className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Add Another
                          </button>
                        </div>
                        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                      </div>
                    ) : (
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Sub Category Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={subForm.name}
                          onChange={(e) => setSubForm({ ...subForm, name: e.target.value })}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm ${
                            errors.name ? 'border-red-500' : 'border-gray-300'
                          }`}
                        />
                        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="flex justify-end gap-2.5 mt-4">
                <button
                  onClick={handleCloseDialog}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
                >
                  {saving ? 'Saving...' : editingRow ? 'Update' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Preview Modal */}
      {showUploadPreview && uploadPreviewData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full mx-4 max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Upload Preview</h2>
                <button
                  onClick={handleCancelUpload}
                  className="text-gray-400 hover:text-gray-600"
                  disabled={uploading}
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>File:</strong> {uploadPreviewData.file?.name}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Review the categories below. Click "Save and Done" to upload them to the system.
                </p>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                {uploadPreviewData.rows.length > 0 ? (
                  <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">#</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Product Category</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Item Category</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Sub Category</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {uploadPreviewData.rows.map((row, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-sm text-gray-600">{index + 1}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{row.productCategory || '-'}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{row.itemCategory || '-'}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{row.subCategory || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-4 text-center text-sm text-gray-500">No categories found</div>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
                <button
                  onClick={handleCancelUpload}
                  disabled={uploading}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmUpload}
                  disabled={uploading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium flex items-center gap-2"
                >
                  {uploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Uploading...
                    </>
                  ) : (
                    <>
                      <span>Save and Done</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryMasterTab;

