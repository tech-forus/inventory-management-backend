import React, { useState, useRef } from 'react';
import { Plus, Search, Edit, Trash2, X, Upload, Download } from 'lucide-react';
import { libraryService } from '../../services/libraryService';
import { validateRequired, validateEmail, validatePhone, validateGST } from '../../utils/validators';
import * as XLSX from 'xlsx';

interface Customer {
  id: number;
  name: string;
  contactPerson?: string;
  phone?: string;
  whatsappNumber?: string;
  email?: string;
  gstNumber?: string;
  address?: string;
  city?: string;
  state?: string;
  pin?: string;
  isActive: boolean;
}

interface CustomersTabProps {
  customers: Customer[];
  loading: boolean;
  onRefresh: () => void;
}

const CustomersTab: React.FC<CustomersTabProps> = ({ customers, loading, onRefresh }) => {
  const [search, setSearch] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sameAsPhone, setSameAsPhone] = useState(false);

  const [customerForm, setCustomerForm] = useState<Partial<Customer>>({
    name: '',
    contactPerson: '',
    phone: '',
    whatsappNumber: '',
    email: '',
    gstNumber: '',
    address: '',
    city: '',
    state: '',
    pin: '',
    isActive: true,
  });

  const filteredCustomers = customers.filter((customer) => {
    const searchLower = search.toLowerCase();
    return (
      customer.name?.toLowerCase().includes(searchLower) ||
      customer.contactPerson?.toLowerCase().includes(searchLower) ||
      customer.phone?.toLowerCase().includes(searchLower) ||
      customer.email?.toLowerCase().includes(searchLower) ||
      customer.gstNumber?.toLowerCase().includes(searchLower) ||
      customer.city?.toLowerCase().includes(searchLower) ||
      customer.state?.toLowerCase().includes(searchLower)
    );
  });

  const handleOpenDialog = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      const isSameAsPhone = customer.whatsappNumber === customer.phone;
      setSameAsPhone(isSameAsPhone);
      setCustomerForm({
        name: customer.name || '',
        contactPerson: customer.contactPerson || '',
        phone: customer.phone || '',
        whatsappNumber: customer.whatsappNumber || '',
        email: customer.email || '',
        gstNumber: customer.gstNumber || '',
        address: customer.address || '',
        city: customer.city || '',
        state: customer.state || '',
        pin: customer.pin || '',
        isActive: customer.isActive !== false,
      });
    } else {
      setEditingCustomer(null);
      setSameAsPhone(false);
      setCustomerForm({
        name: '',
        contactPerson: '',
        phone: '',
        whatsappNumber: '',
        email: '',
        gstNumber: '',
        address: '',
        city: '',
        state: '',
        pin: '',
        isActive: true,
      });
    }
    setErrors({});
    setShowDialog(true);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingCustomer(null);
    setErrors({});
  };

  const handleSave = async () => {
    const newErrors: Record<string, string> = {};
    if (!validateRequired(customerForm.name || '')) {
      newErrors.name = 'Company Name is required';
    }
    if (!validateRequired(customerForm.contactPerson || '')) {
      newErrors.contactPerson = 'Contact Person is required';
    }
    if (!validateRequired(customerForm.phone || '')) {
      newErrors.phone = 'Phone Number is required';
    } else if (!validatePhone(customerForm.phone || '')) {
      newErrors.phone = 'Invalid phone number (10 digits)';
    }
    if (!validateRequired(customerForm.whatsappNumber || '')) {
      newErrors.whatsappNumber = 'WhatsApp Number is required';
    } else if (!validatePhone(customerForm.whatsappNumber || '')) {
      newErrors.whatsappNumber = 'Invalid WhatsApp number (10 digits)';
    }
    if (!validateRequired(customerForm.email || '')) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(customerForm.email || '')) {
      newErrors.email = 'Invalid email format';
    }
    if (!validateRequired(customerForm.gstNumber || '')) {
      newErrors.gstNumber = 'GST Number is required';
    } else if (!validateGST(customerForm.gstNumber || '')) {
      newErrors.gstNumber = 'Invalid GST number format';
    }
    if (!validateRequired(customerForm.pin || '')) {
      newErrors.pin = 'PIN is required';
    }
    if (!validateRequired(customerForm.city || '')) {
      newErrors.city = 'City is required';
    }
    if (!validateRequired(customerForm.state || '')) {
      newErrors.state = 'State is required';
    }
    if (!validateRequired(customerForm.address || '')) {
      newErrors.address = 'Address is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setSaving(true);
      if (editingCustomer) {
        await libraryService.updateCustomer(editingCustomer.id, customerForm);
      } else {
        await libraryService.createCustomer(customerForm);
      }
      handleCloseDialog();
      onRefresh();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to save customer');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this customer?')) return;

    try {
      setSaving(true);
      await libraryService.deleteCustomer(id);
      onRefresh();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to delete customer');
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'Name': '',
        'Contact Person': '',
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
      { wch: 15 }, // Phone
      { wch: 25 }, // Email
      { wch: 18 }, // GST Number
      { wch: 30 }, // Address
      { wch: 15 }, // City
      { wch: 15 }, // State
      { wch: 10 }, // PIN
      { wch: 12 }, // Is Active
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Customers Template');
    XLSX.writeFile(wb, 'Customer_Upload_Template.xlsx');
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
      const result = await libraryService.uploadCustomers(file);
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search customers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="flex items-center gap-2">
        <button
          onClick={() => handleOpenDialog()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Customer
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
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Company Name</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Contact Person</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Phone</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Email</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase">GST Number</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase">City</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase">State</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-6 text-center text-gray-500 text-xs">No customers found</td>
                  </tr>
                ) : (
                  filteredCustomers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-xs font-medium text-gray-900">{customer.name}</td>
                      <td className="px-3 py-2 text-xs text-gray-700">{customer.contactPerson || '-'}</td>
                      <td className="px-3 py-2 text-xs text-gray-700">{customer.phone || '-'}</td>
                      <td className="px-3 py-2 text-xs text-gray-700">{customer.email || '-'}</td>
                      <td className="px-3 py-2 text-xs text-gray-700">{customer.gstNumber || '-'}</td>
                      <td className="px-3 py-2 text-xs text-gray-700">{customer.city || '-'}</td>
                      <td className="px-3 py-2 text-xs text-gray-700">{customer.state || '-'}</td>
                      <td className="px-3 py-2 text-xs">
                        <span className={`px-2 py-1 text-xs font-semibold rounded ${
                          customer.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {customer.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenDialog(customer)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(customer.id)}
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

      {/* Dialog */}
      {showDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingCustomer ? 'Edit Customer' : 'Add Customer'}
                </h2>
                <button
                  onClick={handleCloseDialog}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={customerForm.name}
                    onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      errors.name ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Person <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={customerForm.contactPerson}
                    onChange={(e) => setCustomerForm({ ...customerForm, contactPerson: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      errors.contactPerson ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.contactPerson && <p className="text-red-500 text-xs mt-1">{errors.contactPerson}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={customerForm.phone}
                      onChange={(e) => {
                        const newPhone = e.target.value;
                        setCustomerForm({ 
                          ...customerForm, 
                          phone: newPhone,
                          whatsappNumber: sameAsPhone ? newPhone : customerForm.whatsappNumber
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
                      WhatsApp Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={customerForm.whatsappNumber || ''}
                      onChange={(e) => {
                        if (!sameAsPhone) {
                          setCustomerForm({ ...customerForm, whatsappNumber: e.target.value });
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
                          setCustomerForm({ 
                            ...customerForm, 
                            whatsappNumber: checked ? customerForm.phone : ''
                          });
                        }}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">Same as Phone Number</span>
                    </label>
                    {errors.whatsappNumber && <p className="text-red-500 text-xs mt-1">{errors.whatsappNumber}</p>}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={customerForm.email}
                    onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
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
                    value={customerForm.gstNumber}
                    onChange={(e) => setCustomerForm({ ...customerForm, gstNumber: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      errors.gstNumber ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.gstNumber && <p className="text-red-500 text-xs mt-1">{errors.gstNumber}</p>}
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      PIN <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={customerForm.pin}
                      onChange={(e) => setCustomerForm({ ...customerForm, pin: e.target.value })}
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
                      value={customerForm.city}
                      onChange={(e) => setCustomerForm({ ...customerForm, city: e.target.value })}
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
                      value={customerForm.state}
                      onChange={(e) => setCustomerForm({ ...customerForm, state: e.target.value })}
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
                    value={customerForm.address}
                    onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
                    rows={3}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      errors.address ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address}</p>}
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={customerForm.isActive !== false}
                    onChange={(e) => setCustomerForm({ ...customerForm, isActive: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
                    Active
                  </label>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={handleCloseDialog}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Saving...' : editingCustomer ? 'Update' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomersTab;

