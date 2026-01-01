import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, ChevronDown, ChevronUp, Save } from 'lucide-react';
import { skuService } from '../services/skuService';
import { libraryService } from '../services/libraryService';
import { validateRequired } from '../utils/validators';
import { onCategoriesUpdated } from '../utils/categoriesEvents';

interface FormData {
  skuId: string;
  autoGenerateSKU: boolean;
  productCategoryId: string;
  itemCategoryId: string;
  subCategoryId: string;
  itemName: string;
  itemDetails: string;
  vendorId: string;
  vendorItemCode: string;
  brandId: string;
  hsnSacCode: string;
  gstRate: string;
  ratingSize: string;
  model: string;
  series: string;
  unit: string;
  material: string;
  insulation: string;
  inputSupply: string;
  color: string;
  cri: string;
  cct: string;
  beamAngle: string;
  ledType: string;
  shape: string;
  weight: string;
  length: string;
  width: string;
  height: string;
  rackNumber: string;
  currentStock: string;
  minStockLevel: string;
  defaultStorageLocation: string;
}

const SKUCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [showOptionalSpecs, setShowOptionalSpecs] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    skuId: '',
    autoGenerateSKU: true,
    productCategoryId: '',
    itemCategoryId: '',
    subCategoryId: '',
    itemName: '',
    itemDetails: '',
    vendorId: '',
    vendorItemCode: '',
    brandId: '',
    hsnSacCode: '',
    gstRate: '',
    ratingSize: '',
    model: '',
    series: '',
    unit: 'Pieces',
    material: '',
    insulation: '',
    inputSupply: '',
    color: '',
    cri: '',
    cct: '',
    beamAngle: '',
    ledType: '',
    shape: '',
    weight: '',
    length: '',
    width: '',
    height: '',
    rackNumber: '',
    currentStock: '',
    minStockLevel: '',
    defaultStorageLocation: '',
  });

  const [productCategories, setProductCategories] = useState<any[]>([]);
  const [itemCategories, setItemCategories] = useState<any[]>([]);
  const [subCategories, setSubCategories] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    return onCategoriesUpdated(() => {
      loadInitialData();
      // Reload dependent dropdowns if selections already exist
      if (formData.productCategoryId) loadItemCategories(parseInt(formData.productCategoryId));
      if (formData.itemCategoryId) loadSubCategories(parseInt(formData.itemCategoryId));
    });
  }, [formData.productCategoryId, formData.itemCategoryId]);

  useEffect(() => {
    if (formData.productCategoryId) {
      loadItemCategories(parseInt(formData.productCategoryId));
    } else {
      setItemCategories([]);
      setFormData((prev) => ({ ...prev, itemCategoryId: '', subCategoryId: '' }));
    }
  }, [formData.productCategoryId]);

  useEffect(() => {
    if (formData.itemCategoryId) {
      loadSubCategories(parseInt(formData.itemCategoryId));
    } else {
      setSubCategories([]);
      setFormData((prev) => ({ ...prev, subCategoryId: '' }));
    }
  }, [formData.itemCategoryId]);

  const loadInitialData = async () => {
    try {
      const [productCats, vendorsData, brandsData] = await Promise.all([
        libraryService.getYourProductCategories(),
        libraryService.getVendors(),
        libraryService.getBrands(),
      ]);
      setProductCategories(productCats.data || []);
      setVendors(vendorsData.data || []);
      setBrands(brandsData.data || []);
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

  const handleChange = (field: keyof FormData, value: any) => {
    // Fields that need max 25 characters constraint
    const charLimitedFields: (keyof FormData)[] = [
      'itemName',
      'vendorItemCode',
      'ratingSize',
      'model',
      'series',
      'defaultStorageLocation',
      'itemDetails'
    ];

    // Enforce max 25 characters for specified fields - truncate if exceeds (prevents typing)
    if (charLimitedFields.includes(field)) {
      if (value.length > 25) {
        value = value.slice(0, 25); // Truncate to exactly 25 characters
      }
    }
    
    // Enforce HSN Code: only numeric, 4-8 characters
    if (field === 'hsnSacCode') {
      // Only allow numeric characters
      const numericValue = value.replace(/[^0-9]/g, '');
      // Limit to 8 characters max
      const limitedValue = numericValue.slice(0, 8);
      setFormData((prev) => ({ ...prev, [field]: limitedValue }));
    } else {
      setFormData((prev) => ({ ...prev, [field]: value }));
    }
    
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.autoGenerateSKU && !validateRequired(formData.skuId)) {
      newErrors.skuId = 'SKU ID is required';
    }
    if (!validateRequired(formData.productCategoryId)) {
      newErrors.productCategoryId = 'Product Category is required';
    }
    if (!validateRequired(formData.itemCategoryId)) {
      newErrors.itemCategoryId = 'Item Category is required';
    }
    if (!validateRequired(formData.subCategoryId)) {
      newErrors.subCategoryId = 'Sub Category is required';
    }
    if (!validateRequired(formData.itemName)) {
      newErrors.itemName = 'Item Name is required';
    } else if (formData.itemName.length > 25) {
      newErrors.itemName = 'Item Name must be maximum 25 characters';
    }
    if (!validateRequired(formData.vendorId)) {
      newErrors.vendorId = 'Vendor is required';
    }
    if (!validateRequired(formData.brandId)) {
      newErrors.brandId = 'Brand is required';
    }
    if (!validateRequired(formData.unit)) {
      newErrors.unit = 'Unit is required';
    }
    if (!validateRequired(formData.currentStock)) {
      newErrors.currentStock = 'Current/Opening Stocks is required';
    }
    
    // Vendor Item Code validation (required, max 25 characters)
    if (!validateRequired(formData.vendorItemCode)) {
      newErrors.vendorItemCode = 'Vendor Item Code is required';
    } else if (formData.vendorItemCode.length > 25) {
      newErrors.vendorItemCode = 'Vendor Item Code must be maximum 25 characters';
    }
    
    // Product Specifications validation
    if (!validateRequired(formData.ratingSize)) {
      newErrors.ratingSize = 'Rating/Size is required';
    } else if (formData.ratingSize.length > 25) {
      newErrors.ratingSize = 'Rating/Size must be maximum 25 characters';
    }
    
    // Model Number validation (required, max 25 characters)
    if (!validateRequired(formData.model)) {
      newErrors.model = 'Model Number is required';
    } else if (formData.model.length > 25) {
      newErrors.model = 'Model Number must be maximum 25 characters';
    }
    
    if (!validateRequired(formData.series)) {
      newErrors.series = 'Series is required';
    } else if (formData.series.length > 25) {
      newErrors.series = 'Series must be maximum 25 characters';
    }
    
    // HSN/SAC Code validation (required, 4-8 numeric characters)
    if (!validateRequired(formData.hsnSacCode)) {
      newErrors.hsnSacCode = 'HSN/SAC Code is required';
    } else if (!/^[0-9]{4,8}$/.test(formData.hsnSacCode)) {
      newErrors.hsnSacCode = 'HSN/SAC Code must be 4-8 numeric digits (0-9)';
    }
    
    // GST Rate validation (required)
    if (!validateRequired(formData.gstRate)) {
      newErrors.gstRate = 'GST Rate is required';
    }

    // Default Storage Location validation (required, max 25 characters)
    if (!validateRequired(formData.defaultStorageLocation)) {
      newErrors.defaultStorageLocation = 'Default Storage Location is required';
    } else if (formData.defaultStorageLocation.length > 25) {
      newErrors.defaultStorageLocation = 'Default Storage Location must be maximum 25 characters';
    }

    // Item Details as per Vendor validation (max 25 characters, not required)
    if (formData.itemDetails && formData.itemDetails.length > 25) {
      newErrors.itemDetails = 'Item Details must be maximum 25 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (saveAsDraft: boolean = false) => {
    if (!saveAsDraft && !validateForm()) {
      return;
    }

    try {
      setLoading(true);
      const payload = {
        ...formData,
        productCategoryId: parseInt(formData.productCategoryId),
        itemCategoryId: parseInt(formData.itemCategoryId),
        subCategoryId: formData.subCategoryId ? parseInt(formData.subCategoryId) : null,
        vendorId: parseInt(formData.vendorId),
        brandId: parseInt(formData.brandId),
        gstRate: formData.gstRate ? parseFloat(formData.gstRate) : null,
        currentStock: parseInt(formData.currentStock) || 0,
        minStockLevel: parseInt(formData.minStockLevel),
        weight: formData.weight ? parseFloat(formData.weight) : null,
        length: formData.length ? parseFloat(formData.length) : null,
        width: formData.width ? parseFloat(formData.width) : null,
        height: formData.height ? parseFloat(formData.height) : null,
        status: saveAsDraft ? 'draft' : 'active',
      };

      await skuService.create(payload);
      navigate('/app/sku');
    } catch (error: any) {
      console.error('Error creating SKU:', error);
      alert(error.response?.data?.error || 'Failed to create SKU');
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
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Create New SKU</h1>
          </div>
          <p className="text-lg text-slate-500 font-medium">Add a new SKU to your inventory system.</p>
        </div>
      </div>

      <form className="space-y-10">
        {/* Basic Information */}
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-10">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-6">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  checked={formData.autoGenerateSKU}
                  onChange={(e) => {
                    handleChange('autoGenerateSKU', e.target.checked);
                    if (e.target.checked) {
                      handleChange('skuId', '');
                    }
                  }}
                  className="rounded"
                />
                <span className="text-sm font-medium text-gray-700">Auto-generate SKU ID</span>
              </label>
            </div>
            {!formData.autoGenerateSKU && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SKU ID <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.skuId}
                  onChange={(e) => handleChange('skuId', e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    errors.skuId ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter SKU ID"
                />
                {errors.skuId && <p className="text-red-500 text-xs mt-1">{errors.skuId}</p>}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Product Category <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.productCategoryId}
                onChange={(e) => handleChange('productCategoryId', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  errors.productCategoryId ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Select Product Category</option>
                {productCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              {errors.productCategoryId && (
                <p className="text-red-500 text-xs mt-1">{errors.productCategoryId}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Item Category <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.itemCategoryId}
                onChange={(e) => handleChange('itemCategoryId', e.target.value)}
                disabled={!formData.productCategoryId}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 ${
                  errors.itemCategoryId ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Select Item Category</option>
                {itemCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              {errors.itemCategoryId && (
                <p className="text-red-500 text-xs mt-1">{errors.itemCategoryId}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sub Category <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.subCategoryId}
                onChange={(e) => handleChange('subCategoryId', e.target.value)}
                disabled={!formData.itemCategoryId}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 ${
                  errors.subCategoryId ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Select Sub Category</option>
                {subCategories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              {errors.subCategoryId && (
                <p className="text-red-500 text-xs mt-1">{errors.subCategoryId}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Item Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.itemName}
                onChange={(e) => handleChange('itemName', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  errors.itemName ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter item name"
                maxLength={25}
              />
              {errors.itemName && <p className="text-red-500 text-xs mt-1">{errors.itemName}</p>}
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Item Details as per Vendor
              </label>
              <textarea
                value={formData.itemDetails}
                onChange={(e) => handleChange('itemDetails', e.target.value)}
                rows={3}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  errors.itemDetails ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter item details"
                maxLength={25}
              />
              {errors.itemDetails && (
                <p className="text-red-500 text-xs mt-1">{errors.itemDetails}</p>
              )}
            </div>
          </div>
        </div>

        {/* Vendor & Brand Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Vendor & Brand Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vendor <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <select
                  value={formData.vendorId}
                  onChange={(e) => handleChange('vendorId', e.target.value)}
                  className={`flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    errors.vendorId ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select Vendor</option>
                  {vendors.map((vendor) => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => navigate('/app/library?tab=vendors')}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              {errors.vendorId && (
                <p className="text-red-500 text-xs mt-1">{errors.vendorId}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vendor Item Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.vendorItemCode}
                onChange={(e) => handleChange('vendorItemCode', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  errors.vendorItemCode ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter vendor item code"
                maxLength={25}
              />
              {errors.vendorItemCode && (
                <p className="text-red-500 text-xs mt-1">{errors.vendorItemCode}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Brand <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <select
                  value={formData.brandId}
                  onChange={(e) => handleChange('brandId', e.target.value)}
                  className={`flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    errors.brandId ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select Brand</option>
                  {brands.map((brand) => (
                    <option key={brand.id} value={brand.id}>
                      {brand.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => navigate('/app/library?tab=brands')}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
              {errors.brandId && <p className="text-red-500 text-xs mt-1">{errors.brandId}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                HSN/SAC Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.hsnSacCode}
                onChange={(e) => handleChange('hsnSacCode', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  errors.hsnSacCode ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter 4-8 digit HSN/SAC code"
                maxLength={8}
                pattern="[0-9]{4,8}"
              />
              {errors.hsnSacCode && (
                <p className="text-red-500 text-xs mt-1">{errors.hsnSacCode}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                GST Rate (%) <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                <select
                  value={formData.gstRate}
                  onChange={(e) => handleChange('gstRate', e.target.value)}
                  className={`flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    errors.gstRate ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select GST Rate</option>
                  <option value="0">0%</option>
                  <option value="5">5%</option>
                  <option value="18">18%</option>
                  <option value="28">28%</option>
                </select>
                <div className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg opacity-0 pointer-events-none">
                  <Plus className="w-5 h-5" />
                </div>
              </div>
              {errors.gstRate && (
                <p className="text-red-500 text-xs mt-1">{errors.gstRate}</p>
              )}
            </div>
          </div>
        </div>

        {/* Product Specifications */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Product Specifications</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rating/Size <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.ratingSize}
                onChange={(e) => handleChange('ratingSize', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  errors.ratingSize ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="e.g., 10W, 12V"
                maxLength={25}
              />
              {errors.ratingSize && (
                <p className="text-red-500 text-xs mt-1">{errors.ratingSize}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Model <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.model}
                onChange={(e) => handleChange('model', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  errors.model ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter model number"
                maxLength={25}
              />
              {errors.model && (
                <p className="text-red-500 text-xs mt-1">{errors.model}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Series <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.series}
                onChange={(e) => handleChange('series', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  errors.series ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter series"
                maxLength={25}
              />
              {errors.series && (
                <p className="text-red-500 text-xs mt-1">{errors.series}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unit <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.unit}
                onChange={(e) => handleChange('unit', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  errors.unit ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="Pieces">Pieces</option>
                <option value="Kg">Kg</option>
                <option value="Liters">Liters</option>
                <option value="Meters">Meters</option>
                <option value="Box">Box</option>
                <option value="Set">Set</option>
              </select>
              {errors.unit && <p className="text-red-500 text-xs mt-1">{errors.unit}</p>}
            </div>
          </div>
        </div>

        {/* Optional Specifications */}
        <div className="bg-white rounded-lg shadow p-6">
          <button
            type="button"
            onClick={() => setShowOptionalSpecs(!showOptionalSpecs)}
            className="flex items-center justify-between w-full text-xl font-semibold text-gray-900 mb-4"
          >
            <span>Optional Specifications</span>
            {showOptionalSpecs ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </button>
          {showOptionalSpecs && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Material</label>
                <input
                  type="text"
                  value={formData.material}
                  onChange={(e) => handleChange('material', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Insulation</label>
                <input
                  type="text"
                  value={formData.insulation}
                  onChange={(e) => handleChange('insulation', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Input Supply</label>
                <input
                  type="text"
                  value={formData.inputSupply}
                  onChange={(e) => handleChange('inputSupply', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                <input
                  type="text"
                  value={formData.color}
                  onChange={(e) => handleChange('color', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CRI</label>
                <input
                  type="text"
                  value={formData.cri}
                  onChange={(e) => handleChange('cri', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CCT</label>
                <input
                  type="text"
                  value={formData.cct}
                  onChange={(e) => handleChange('cct', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Beam Angle</label>
                <input
                  type="text"
                  value={formData.beamAngle}
                  onChange={(e) => handleChange('beamAngle', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">LED Type</label>
                <input
                  type="text"
                  value={formData.ledType}
                  onChange={(e) => handleChange('ledType', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Shape</label>
                <input
                  type="text"
                  value={formData.shape}
                  onChange={(e) => handleChange('shape', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Weight (Kg)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.weight}
                  onChange={(e) => handleChange('weight', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Length (cm)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.length}
                  onChange={(e) => handleChange('length', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Width (cm)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.width}
                  onChange={(e) => handleChange('width', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Height (cm)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.height}
                  onChange={(e) => handleChange('height', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rack Number</label>
                <input
                  type="text"
                  value={formData.rackNumber}
                  onChange={(e) => handleChange('rackNumber', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Inventory Settings */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Inventory Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current/Opening Stocks <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                value={formData.currentStock}
                onChange={(e) => handleChange('currentStock', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  errors.currentStock ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="0"
              />
              {errors.currentStock && (
                <p className="text-red-500 text-xs mt-1">{errors.currentStock}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Minimum Stock Level (MSQ)
              </label>
              <input
                type="number"
                min="0"
                value={formData.minStockLevel}
                onChange={(e) => handleChange('minStockLevel', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Default Storage Location <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.defaultStorageLocation}
                onChange={(e) => handleChange('defaultStorageLocation', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                  errors.defaultStorageLocation ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="e.g., Warehouse A, Shelf 3"
                maxLength={25}
              />
              {errors.defaultStorageLocation && (
                <p className="text-red-500 text-xs mt-1">{errors.defaultStorageLocation}</p>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate('/app/sku')}
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
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Creating...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Create SKU
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SKUCreatePage;

