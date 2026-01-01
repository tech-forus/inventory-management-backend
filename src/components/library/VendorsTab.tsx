import React, { useState, useRef, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, X, Upload, Download } from 'lucide-react';
import { libraryService } from '../../services/libraryService';
import { validateRequired, validateEmail, validatePhone, validateGST } from '../../utils/validators';
import * as XLSX from 'xlsx';

interface Vendor {
  id: number;
  name: string;
  contactPerson?: string;
  designation?: string;
  phone?: string;
  whatsappNumber?: string;
  email?: string;
  gstNumber?: string;
  address?: string;
  city?: string;
  state?: string;
  pin?: string;
  isActive: boolean;
  productCategoryIds?: number[];
  itemCategoryIds?: number[];
  subCategoryIds?: number[];
  brandIds?: number[];
}

interface ProductCategory {
  id: number;
  name: string;
}

interface ItemCategory {
  id: number;
  name: string;
  productCategoryId: number;
}

interface SubCategory {
  id: number;
  name: string;
  itemCategoryId: number;
}

interface Brand {
  id: number;
  name: string;
}

interface VendorsTabProps {
  vendors: Vendor[];
  loading: boolean;
  onRefresh: () => void;
}

const VendorsTab: React.FC<VendorsTabProps> = ({ vendors, loading, onRefresh }) => {
  const [search, setSearch] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Category and brand data
  const [productCategories, setProductCategories] = useState<ProductCategory[]>([]);
  const [itemCategories, setItemCategories] = useState<ItemCategory[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedProductCategory, setSelectedProductCategory] = useState<number>(0);

  // Multiple brand form
  const [multipleBrands, setMultipleBrands] = useState<Array<{ name: string }>>([
    { name: '' }
  ]);
  const [showBrandDialog, setShowBrandDialog] = useState(false);
  const [sameAsPhone, setSameAsPhone] = useState(false);

  const [vendorForm, setVendorForm] = useState<Partial<Vendor>>({
    name: '',
    contactPerson: '',
    designation: '',
    phone: '',
    whatsappNumber: '',
    email: '',
    gstNumber: '',
    address: '',
    city: '',
    state: '',
    pin: '',
    isActive: true,
    productCategoryIds: [],
    itemCategoryIds: [],
    subCategoryIds: [],
    brandIds: [],
  });

  // Load categories and brands when dialog opens
  useEffect(() => {
    if (showDialog) {
      libraryService.getYourProductCategories().then((res) => {
        setProductCategories(res.data || []);
      });
      libraryService.getYourBrands().then((res) => {
        setBrands(res.data || []);
      });
    }
  }, [showDialog]);

  // Load item categories when product category is selected
  useEffect(() => {
    if (showDialog && selectedProductCategory > 0) {
      libraryService.getYourItemCategories(selectedProductCategory).then((res) => {
        setItemCategories(res.data || []);
      });
    } else {
      setItemCategories([]);
      setSubCategories([]);
      setVendorForm({
        ...vendorForm,
        itemCategoryIds: [],
        subCategoryIds: [],
      });
    }
  }, [selectedProductCategory, showDialog]);

  // Load sub categories when item categories are selected
  useEffect(() => {
    if (showDialog && vendorForm.itemCategoryIds && vendorForm.itemCategoryIds.length > 0) {
      // Load sub categories for all selected item categories
      const promises = vendorForm.itemCategoryIds.map(itemCatId =>
        libraryService.getYourSubCategories(itemCatId)
      );
      Promise.all(promises).then((results) => {
        const allSubCats = results.flatMap(res => res.data || []);
        // Remove duplicates
        const uniqueSubCats = allSubCats.filter((cat, index, self) =>
          index === self.findIndex(c => c.id === cat.id)
        );
        setSubCategories(uniqueSubCats);
      });
    } else {
      setSubCategories([]);
      setVendorForm({
        ...vendorForm,
        subCategoryIds: [],
      });
    }
  }, [vendorForm.itemCategoryIds, showDialog]);

  const handleOpenDialog = (vendor?: Vendor) => {
    if (vendor) {
      setEditingVendor(vendor);
      const productCatId = vendor.productCategoryIds && vendor.productCategoryIds.length > 0 
        ? vendor.productCategoryIds[0] 
        : 0;
      setSelectedProductCategory(productCatId);
      const isSameAsPhone = vendor.whatsappNumber === vendor.phone;
      setSameAsPhone(isSameAsPhone);
      setVendorForm({
        ...vendor,
        productCategoryIds: vendor.productCategoryIds || [],
        itemCategoryIds: vendor.itemCategoryIds || [],
        subCategoryIds: vendor.subCategoryIds || [],
        brandIds: vendor.brandIds || [],
      });
    } else {
      setEditingVendor(null);
      setSelectedProductCategory(0);
      setSameAsPhone(false);
      setVendorForm({
        name: '',
        contactPerson: '',
        designation: '',
        phone: '',
        whatsappNumber: '',
        email: '',
        gstNumber: '',
        address: '',
        city: '',
        state: '',
        pin: '',
        isActive: true,
        productCategoryIds: [],
        itemCategoryIds: [],
        subCategoryIds: [],
        brandIds: [],
      });
    }
    setItemCategories([]);
    setSubCategories([]);
    setMultipleBrands([{ name: '' }]);
    setShowDialog(true);
    setErrors({});
  };

  const handleItemCategoryToggle = (categoryId: number) => {
    const currentIds = vendorForm.itemCategoryIds || [];
    if (currentIds.includes(categoryId)) {
      setVendorForm({
        ...vendorForm,
        itemCategoryIds: currentIds.filter(id => id !== categoryId),
      });
    } else {
      setVendorForm({
        ...vendorForm,
        itemCategoryIds: [...currentIds, categoryId],
      });
    }
  };

  const handleSubCategoryToggle = (categoryId: number) => {
    const currentIds = vendorForm.subCategoryIds || [];
    if (currentIds.includes(categoryId)) {
      setVendorForm({
        ...vendorForm,
        subCategoryIds: currentIds.filter(id => id !== categoryId),
      });
    } else {
      setVendorForm({
        ...vendorForm,
        subCategoryIds: [...currentIds, categoryId],
      });
    }
  };

  const handleBrandToggle = (brandId: number) => {
    const currentIds = vendorForm.brandIds || [];
    if (currentIds.includes(brandId)) {
      setVendorForm({
        ...vendorForm,
        brandIds: currentIds.filter(id => id !== brandId),
      });
    } else {
      setVendorForm({
        ...vendorForm,
        brandIds: [...currentIds, brandId],
      });
    }
  };

  const addBrandField = () => {
    setMultipleBrands([...multipleBrands, { name: '' }]);
  };

  const removeBrandField = (index: number) => {
    if (multipleBrands.length > 1) {
      setMultipleBrands(multipleBrands.filter((_, i) => i !== index));
    }
  };

  const updateBrandField = (index: number, value: string) => {
    const updated = [...multipleBrands];
    updated[index] = { name: value };
    setMultipleBrands(updated);
  };

  const handleSaveMultipleBrands = async () => {
    const validItems = multipleBrands.filter(item => item.name.trim() !== '');
    if (validItems.length === 0) {
      alert('Please add at least one brand');
      return;
    }

    try {
      setSaving(true);
      const promises = validItems.map(item =>
        libraryService.createYourBrand({
          name: item.name.trim(),
          description: '',
          isActive: true,
        })
      );
      const results = await Promise.all(promises);
      const newBrandIds = results.map(r => r.data.id);
      
      // Add new brands to selected brands
      setVendorForm({
        ...vendorForm,
        brandIds: [...(vendorForm.brandIds || []), ...newBrandIds],
      });
      
      // Refresh brands list
      const brandsRes = await libraryService.getYourBrands();
      setBrands(brandsRes.data || []);
      
      setMultipleBrands([{ name: '' }]);
      setShowBrandDialog(false);
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to save brands');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    const newErrors: Record<string, string> = {};
    if (!validateRequired(vendorForm.name || '')) {
      newErrors.name = 'Vendor Name is required';
    }
    if (!validateRequired(vendorForm.contactPerson || '')) {
      newErrors.contactPerson = 'Contact Person is required';
    }
    if (!validateRequired(vendorForm.designation || '')) {
      newErrors.designation = 'Designation is required';
    }
    if (!validateRequired(vendorForm.phone || '')) {
      newErrors.phone = 'Phone Number is required';
    } else if (!validatePhone(vendorForm.phone || '')) {
      newErrors.phone = 'Invalid phone number (10 digits)';
    }
    if (!validateRequired(vendorForm.email || '')) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(vendorForm.email || '')) {
      newErrors.email = 'Invalid email format';
    }
    if (!validateRequired(vendorForm.gstNumber || '')) {
      newErrors.gstNumber = 'GST Number is required';
    } else if (!validateGST(vendorForm.gstNumber || '')) {
      newErrors.gstNumber = 'Invalid GST number format';
    }
    if (!validateRequired(vendorForm.pin || '')) {
      newErrors.pin = 'Pincode is required';
    }
    if (!validateRequired(vendorForm.city || '')) {
      newErrors.city = 'City is required';
    }
    if (!validateRequired(vendorForm.state || '')) {
      newErrors.state = 'State is required';
    }
    if (!validateRequired(vendorForm.address || '')) {
      newErrors.address = 'Address is required';
    }
    if (!selectedProductCategory || selectedProductCategory === 0) {
      newErrors.productCategory = 'Product Category is required';
    }
    if (!vendorForm.brandIds || vendorForm.brandIds.length === 0) {
      newErrors.brands = 'At least one Brand is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setSaving(true);
      if (editingVendor) {
        await libraryService.updateYourVendor(editingVendor.id, vendorForm);
      } else {
        await libraryService.createYourVendor(vendorForm);
      }
      setShowDialog(false);
      onRefresh();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to save vendor');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this vendor?')) return;

    try {
      setSaving(true);
      await libraryService.deleteYourVendor(id);
      onRefresh();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to delete vendor');
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'Name': '',
        'Contact Person': '',
        'Designation': '',
        'Phone': '',
        'Email': '',
        'GST Number': '',
        'Address': '',
        'City': '',
        'State': '',
        'PIN': '',
        'Is Active': 'true'
      }
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(templateData);
    
    // Set column widths
    ws['!cols'] = [
      { wch: 25 }, // Name
      { wch: 20 }, // Contact Person
      { wch: 18 }, // Designation
      { wch: 15 }, // Phone
      { wch: 25 }, // Email
      { wch: 18 }, // GST Number
      { wch: 30 }, // Address
      { wch: 15 }, // City
      { wch: 15 }, // State
      { wch: 10 }, // PIN
      { wch: 12 }, // Is Active
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Vendors Template');
    XLSX.writeFile(wb, 'Vendor_Upload_Template.xlsx');
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = async (file: File | null) => {
    if (!file) return;

    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ];
    if (!validTypes.includes(file.type)) {
      alert('Please upload a valid Excel file (.xlsx, .xls) or CSV file');
      return;
    }

    try {
      setSaving(true);
      const result = await libraryService.uploadVendors(file);
      if (result.success) {
        alert(`${result.message}\nInserted: ${result.inserted}\nErrors: ${result.errors}`);
        onRefresh();
      }
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to upload file');
    } finally {
      setSaving(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const filteredVendors = vendors.filter((v) =>
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    v.contactPerson?.toLowerCase().includes(search.toLowerCase()) ||
    v.designation?.toLowerCase().includes(search.toLowerCase()) ||
    v.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex-1 w-full sm:w-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleOpenDialog()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add Vendor
            </button>
            <button
              onClick={handleDownloadTemplate}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 flex items-center gap-2"
              title="Download Excel template with required columns"
            >
              <Download className="w-5 h-5" />
              Download Template
            </button>
            <button
              onClick={handleFileSelect}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <Upload className="w-5 h-5" />
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
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Vendor Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Contact Person</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Designation</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Phone</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">GST Number</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Address</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredVendors.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-gray-500">No vendors found</td>
                    </tr>
                  ) : (
                    filteredVendors.map((vendor) => (
                      <tr key={vendor.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{vendor.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{vendor.contactPerson || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{vendor.designation || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{vendor.phone || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{vendor.email || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{vendor.gstNumber || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{vendor.address || '-'}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 text-xs font-semibold rounded ${
                            vendor.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {vendor.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleOpenDialog(vendor)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(vendor.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Dialog */}
      {showDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingVendor ? 'Edit Vendor' : 'Add Vendor'}
                </h2>
                <button
                  onClick={() => setShowDialog(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vendor Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={vendorForm.name}
                    onChange={(e) => setVendorForm({ ...vendorForm, name: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      errors.name ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contact Person <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={vendorForm.contactPerson}
                      onChange={(e) => setVendorForm({ ...vendorForm, contactPerson: e.target.value })}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        errors.contactPerson ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.contactPerson && <p className="text-red-500 text-xs mt-1">{errors.contactPerson}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Designation <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={vendorForm.designation}
                      onChange={(e) => setVendorForm({ ...vendorForm, designation: e.target.value })}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        errors.designation ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.designation && <p className="text-red-500 text-xs mt-1">{errors.designation}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={vendorForm.phone}
                      onChange={(e) => {
                        const newPhone = e.target.value;
                        setVendorForm({ 
                          ...vendorForm, 
                          phone: newPhone,
                          whatsappNumber: sameAsPhone ? newPhone : vendorForm.whatsappNumber
                        });
                      }}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        errors.phone ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      WhatsApp Number
                    </label>
                    <input
                      type="text"
                      value={vendorForm.whatsappNumber || ''}
                      onChange={(e) => {
                        if (!sameAsPhone) {
                          setVendorForm({ ...vendorForm, whatsappNumber: e.target.value });
                        }
                      }}
                      disabled={sameAsPhone}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        sameAsPhone ? 'bg-gray-100 cursor-not-allowed' : ''
                      } ${
                        errors.whatsappNumber ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    <label className="flex items-center gap-2 mt-2">
                      <input
                        type="checkbox"
                        checked={sameAsPhone}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setSameAsPhone(checked);
                          setVendorForm({ 
                            ...vendorForm, 
                            whatsappNumber: checked ? vendorForm.phone : ''
                          });
                        }}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Same as Phone Number</span>
                    </label>
                    {errors.whatsappNumber && <p className="text-red-500 text-xs mt-1">{errors.whatsappNumber}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={vendorForm.email}
                      onChange={(e) => setVendorForm({ ...vendorForm, email: e.target.value })}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        errors.email ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      GST Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={vendorForm.gstNumber}
                      onChange={(e) => setVendorForm({ ...vendorForm, gstNumber: e.target.value })}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        errors.gstNumber ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.gstNumber && <p className="text-red-500 text-xs mt-1">{errors.gstNumber}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Pincode <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={vendorForm.pin}
                      onChange={(e) => setVendorForm({ ...vendorForm, pin: e.target.value })}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        errors.pin ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.pin && <p className="text-red-500 text-xs mt-1">{errors.pin}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={vendorForm.city}
                      onChange={(e) => setVendorForm({ ...vendorForm, city: e.target.value })}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        errors.city ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      State <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={vendorForm.state}
                      onChange={(e) => setVendorForm({ ...vendorForm, state: e.target.value })}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        errors.state ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.state && <p className="text-red-500 text-xs mt-1">{errors.state}</p>}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={vendorForm.address}
                    onChange={(e) => setVendorForm({ ...vendorForm, address: e.target.value })}
                    rows={3}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      errors.address ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
                </div>

                {/* Select Product Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Select Product Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedProductCategory}
                    onChange={(e) => {
                      const productCatId = parseInt(e.target.value);
                      setSelectedProductCategory(productCatId);
                      setVendorForm({ 
                        ...vendorForm, 
                        productCategoryIds: productCatId > 0 ? [productCatId] : [],
                        itemCategoryIds: [],
                        subCategoryIds: []
                      });
                    }}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      errors.productCategory ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="0">Select Product Category</option>
                    {productCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  {errors.productCategory && <p className="text-red-500 text-xs mt-1">{errors.productCategory}</p>}
                </div>

                {/* Item Categories - Show when product category is selected */}
                {selectedProductCategory > 0 && itemCategories.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Item Categories (Select Multiple)</label>
                    <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-2 space-y-2">
                      {itemCategories.map((cat) => (
                        <label key={cat.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                          <input
                            type="checkbox"
                            checked={(vendorForm.itemCategoryIds || []).includes(cat.id)}
                            onChange={() => handleItemCategoryToggle(cat.id)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">{cat.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sub Categories - Show when item categories are selected */}
                {vendorForm.itemCategoryIds && vendorForm.itemCategoryIds.length > 0 && subCategories.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Sub Categories (Select Multiple)</label>
                    <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-2 space-y-2">
                      {subCategories.map((cat) => (
                        <label key={cat.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                          <input
                            type="checkbox"
                            checked={(vendorForm.subCategoryIds || []).includes(cat.id)}
                            onChange={() => handleSubCategoryToggle(cat.id)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">{cat.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Selected Items List */}
                {(vendorForm.productCategoryIds && vendorForm.productCategoryIds.length > 0) ||
                 (vendorForm.itemCategoryIds && vendorForm.itemCategoryIds.length > 0) ||
                 (vendorForm.subCategoryIds && vendorForm.subCategoryIds.length > 0) ? (
                  <div className="border-t border-gray-200 pt-4 mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Selected Items</label>
                    <div className="bg-gray-50 rounded-lg p-4 space-y-2 max-h-48 overflow-y-auto">
                      {/* Selected Product Categories */}
                      {vendorForm.productCategoryIds && vendorForm.productCategoryIds.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-600 mb-1">Product Categories:</p>
                          <div className="flex flex-wrap gap-2">
                            {vendorForm.productCategoryIds.map((id) => {
                              const cat = productCategories.find(c => c.id === id);
                              return cat ? (
                                <span key={id} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                                  {cat.name}
                                </span>
                              ) : null;
                            })}
                          </div>
                        </div>
                      )}
                      
                      {/* Selected Item Categories */}
                      {vendorForm.itemCategoryIds && vendorForm.itemCategoryIds.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-600 mb-1">Item Categories:</p>
                          <div className="flex flex-wrap gap-2">
                            {vendorForm.itemCategoryIds.map((id) => {
                              const cat = itemCategories.find(c => c.id === id);
                              return cat ? (
                                <span key={id} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                                  {cat.name}
                                </span>
                              ) : null;
                            })}
                          </div>
                        </div>
                      )}
                      
                      {/* Selected Sub Categories */}
                      {vendorForm.subCategoryIds && vendorForm.subCategoryIds.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-600 mb-1">Sub Categories:</p>
                          <div className="flex flex-wrap gap-2">
                            {vendorForm.subCategoryIds.map((id) => {
                              const cat = subCategories.find(c => c.id === id);
                              return cat ? (
                                <span key={id} className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
                                  {cat.name}
                                </span>
                              ) : null;
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}

                {/* Brands */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Brands <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowBrandDialog(true)}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" />
                      Add Multiple Brands
                    </button>
                  </div>
                  <div className={`max-h-40 overflow-y-auto border rounded-lg p-2 space-y-2 ${
                    errors.brands ? 'border-red-500' : 'border-gray-300'
                  }`}>
                    {brands.length === 0 ? (
                      <p className="text-sm text-gray-500">No brands available</p>
                    ) : (
                      brands.map((brand) => (
                        <label key={brand.id} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded">
                          <input
                            type="checkbox"
                            checked={(vendorForm.brandIds || []).includes(brand.id)}
                            onChange={() => handleBrandToggle(brand.id)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">{brand.name}</span>
                        </label>
                      ))
                    )}
                  </div>
                  {errors.brands && <p className="text-red-500 text-xs mt-1">{errors.brands}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={vendorForm.isActive === true}
                        onChange={() => setVendorForm({ ...vendorForm, isActive: true })}
                        className="text-blue-600"
                      />
                      <span>Active</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        checked={vendorForm.isActive === false}
                        onChange={() => setVendorForm({ ...vendorForm, isActive: false })}
                        className="text-blue-600"
                      />
                      <span>Inactive</span>
                    </label>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-4 mt-6">
                <button
                  onClick={() => setShowDialog(false)}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Multiple Brands Dialog */}
      {showBrandDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-900">Add Multiple Brands</h2>
                <button
                  onClick={() => {
                    setShowBrandDialog(false);
                    setMultipleBrands([{ name: '' }]);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Brand Name <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={addBrandField}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" />
                      Add Another
                    </button>
                  </div>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                    {multipleBrands.map((item, index) => (
                      <div key={index} className="flex gap-2 items-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex-1">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => updateBrandField(index, e.target.value)}
                            placeholder={`Brand Name ${index + 1}`}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                          />
                        </div>
                        {multipleBrands.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeBrandField(index)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Remove"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-4 mt-6">
                <button
                  onClick={() => {
                    setShowBrandDialog(false);
                    setMultipleBrands([{ name: '' }]);
                  }}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveMultipleBrands}
                  disabled={saving || multipleBrands.filter(i => i.name.trim()).length === 0}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : `Save ${multipleBrands.filter(i => i.name.trim()).length} Brand(s)`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default VendorsTab;

