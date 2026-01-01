import React, { useState, useRef } from 'react';
import { Plus, Search, Edit, Trash2, X, Upload, Download } from 'lucide-react';
import { libraryService } from '../../services/libraryService';
import { validateRequired, validateEmail, validatePhone, validateGST } from '../../utils/validators';
import * as XLSX from 'xlsx';

interface Transportor {
  id: number;
  name: string;
  contactPerson?: string;
  contactNumber?: string;
  email?: string;
  gstNumber?: string;
  vehicleType?: string;
  capacity?: string;
  pricingType?: string;
  rate?: number;
  isActive: boolean;
  remarks?: string;
}

interface TransportorTabProps {
  transportors: Transportor[];
  loading: boolean;
  onRefresh: () => void;
}

const TransportorTab: React.FC<TransportorTabProps> = ({ transportors, loading, onRefresh }) => {
  const [search, setSearch] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editingTransportor, setEditingTransportor] = useState<Transportor | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [transportorForm, setTransportorForm] = useState<Partial<Transportor>>({
    name: '',
    contactPerson: '',
    contactNumber: '',
    email: '',
    gstNumber: '',
    isActive: true,
    remarks: '',
  });

  const filteredTransportors = transportors.filter((transportor) => {
    const searchLower = search.toLowerCase();
    return (
      transportor.name?.toLowerCase().includes(searchLower) ||
      transportor.contactPerson?.toLowerCase().includes(searchLower) ||
      transportor.contactNumber?.toLowerCase().includes(searchLower) ||
      transportor.email?.toLowerCase().includes(searchLower) ||
      transportor.gstNumber?.toLowerCase().includes(searchLower)
    );
  });

  const handleOpenDialog = (transportor?: Transportor) => {
    if (transportor) {
      setEditingTransportor(transportor);
      setTransportorForm({
        name: transportor.name || '',
        contactPerson: transportor.contactPerson || '',
        contactNumber: transportor.contactNumber || '',
        email: transportor.email || '',
        gstNumber: transportor.gstNumber || '',
        isActive: transportor.isActive !== false,
        remarks: transportor.remarks || '',
      });
    } else {
      setEditingTransportor(null);
      setTransportorForm({
        name: '',
        contactPerson: '',
        contactNumber: '',
        email: '',
        gstNumber: '',
        isActive: true,
        remarks: '',
      });
    }
    setErrors({});
    setShowDialog(true);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingTransportor(null);
    setErrors({});
  };

  const handleSave = async () => {
    const newErrors: Record<string, string> = {};
    
    if (!validateRequired(transportorForm.name || '')) {
      newErrors.name = 'Transporter Name is required';
    }
    if (!validateRequired(transportorForm.contactPerson || '')) {
      newErrors.contactPerson = 'Contact Person Name is required';
    }
    if (!validateRequired(transportorForm.contactNumber || '')) {
      newErrors.contactNumber = 'Contact Number is required';
    }
    if (!validateRequired(transportorForm.email || '')) {
      newErrors.email = 'Email ID is required';
    } else if (!validateEmail(transportorForm.email || '')) {
      newErrors.email = 'Invalid email format';
    }
    // GST Number is optional, but if provided, validate format
    if (transportorForm.gstNumber && transportorForm.gstNumber.trim() && !validateGST(transportorForm.gstNumber)) {
      newErrors.gstNumber = 'Invalid GST number format';
    }
    
    if (transportorForm.contactNumber && !validatePhone(transportorForm.contactNumber)) {
      newErrors.contactNumber = 'Invalid phone number (10 digits)';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setSaving(true);
      if (editingTransportor) {
        await libraryService.updateTransportor(editingTransportor.id, transportorForm);
      } else {
        await libraryService.createTransportor(transportorForm);
      }
      handleCloseDialog();
      onRefresh();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to save transporter');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this transporter?')) return;

    try {
      setSaving(true);
      await libraryService.deleteTransportor(id);
      onRefresh();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to delete transporter');
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'Transporter Name': '',
        'Contact Person Name': '',
        'Contact Number': '',
        'Email ID': '',
        'GST Number': '',
        'Status': 'Active',
        'Remarks': ''
      }
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(templateData);
    
    // Set column widths
    ws['!cols'] = [
      { wch: 25 }, // Transporter Name
      { wch: 20 }, // Contact Person Name
      { wch: 15 }, // Contact Number
      { wch: 25 }, // Email ID
      { wch: 18 }, // GST Number
      { wch: 12 }, // Status
      { wch: 30 }, // Remarks
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Transporters Template');
    XLSX.writeFile(wb, 'Transporter_Upload_Template.xlsx');
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
      const result = await libraryService.uploadTransportors(file);
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
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search transporters..."
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
            Add Transporter
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
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Transporter Name</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Contact Person</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Contact Number</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Email</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase">GST Number</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredTransportors.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-6 text-center text-gray-500 text-xs">No transporters found</td>
                  </tr>
                ) : (
                  filteredTransportors.map((transportor) => (
                    <tr key={transportor.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-xs font-medium text-gray-900">{transportor.name}</td>
                      <td className="px-3 py-2 text-xs text-gray-700">{transportor.contactPerson || '-'}</td>
                      <td className="px-3 py-2 text-xs text-gray-700">{transportor.contactNumber || '-'}</td>
                      <td className="px-3 py-2 text-xs text-gray-700">{transportor.email || '-'}</td>
                      <td className="px-3 py-2 text-xs text-gray-700">{transportor.gstNumber || '-'}</td>
                      <td className="px-3 py-2 text-xs">
                        <span className={`px-2 py-1 text-xs font-semibold rounded ${
                          transportor.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {transportor.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenDialog(transportor)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(transportor.id)}
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
                  {editingTransportor ? 'Edit Transporter' : 'Add Transporter'}
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
                    Transporter Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={transportorForm.name}
                    onChange={(e) => setTransportorForm({ ...transportorForm, name: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      errors.name ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Person Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={transportorForm.contactPerson}
                    onChange={(e) => setTransportorForm({ ...transportorForm, contactPerson: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      errors.contactPerson ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.contactPerson && <p className="text-red-500 text-xs mt-1">{errors.contactPerson}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contact Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={transportorForm.contactNumber}
                      onChange={(e) => setTransportorForm({ ...transportorForm, contactNumber: e.target.value })}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        errors.contactNumber ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.contactNumber && <p className="text-red-500 text-xs mt-1">{errors.contactNumber}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={transportorForm.email}
                      onChange={(e) => setTransportorForm({ ...transportorForm, email: e.target.value })}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        errors.email ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    GST Number
                  </label>
                  <input
                    type="text"
                    value={transportorForm.gstNumber}
                    onChange={(e) => setTransportorForm({ ...transportorForm, gstNumber: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      errors.gstNumber ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.gstNumber && <p className="text-red-500 text-xs mt-1">{errors.gstNumber}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                  <textarea
                    value={transportorForm.remarks}
                    onChange={(e) => setTransportorForm({ ...transportorForm, remarks: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={transportorForm.isActive !== false}
                    onChange={(e) => setTransportorForm({ ...transportorForm, isActive: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">
                    Status: Active
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
                  {saving ? 'Saving...' : editingTransportor ? 'Update' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransportorTab;

