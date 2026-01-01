import React, { useState, useRef } from 'react';
import { Plus, Search, Edit, Trash2, X, Upload, Download } from 'lucide-react';
import { libraryService } from '../../services/libraryService';
import { validateRequired, validateEmail, validatePhone } from '../../utils/validators';
import * as XLSX from 'xlsx';

interface Team {
  id: number;
  name: string;
  contactNumber: string;
  emailId: string;
  department: string;
  designation: string;
  isActive?: boolean;
}

interface TeamsTabProps {
  teams: Team[];
  loading: boolean;
  onRefresh: () => void;
}

const TeamsTab: React.FC<TeamsTabProps> = ({ teams, loading, onRefresh }) => {
  const [search, setSearch] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [teamForm, setTeamForm] = useState<Partial<Team>>({
    name: '',
    contactNumber: '',
    emailId: '',
    department: '',
    designation: '',
    isActive: true,
  });

  const handleOpenDialog = (team?: Team) => {
    if (team) {
      setEditingTeam(team);
      setTeamForm({
        ...team,
      });
    } else {
      setEditingTeam(null);
      setTeamForm({
        name: '',
        contactNumber: '',
        emailId: '',
        department: '',
        designation: '',
        isActive: true,
      });
    }
    setShowDialog(true);
    setErrors({});
  };

  const handleSave = async () => {
    const newErrors: Record<string, string> = {};
    
    if (!validateRequired(teamForm.name || '')) {
      newErrors.name = 'Name is required';
    }
    if (!validateRequired(teamForm.contactNumber || '')) {
      newErrors.contactNumber = 'Contact Number is required';
    } else if (!validatePhone(teamForm.contactNumber || '')) {
      newErrors.contactNumber = 'Invalid phone number (10 digits)';
    }
    if (!validateRequired(teamForm.emailId || '')) {
      newErrors.emailId = 'Email ID is required';
    } else if (!validateEmail(teamForm.emailId || '')) {
      newErrors.emailId = 'Invalid email format';
    }
    if (!validateRequired(teamForm.department || '')) {
      newErrors.department = 'Department is required';
    }
    if (!validateRequired(teamForm.designation || '')) {
      newErrors.designation = 'Designation is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setSaving(true);
      if (editingTeam) {
        await libraryService.updateTeam(editingTeam.id, teamForm);
      } else {
        await libraryService.createTeam(teamForm);
      }
      setShowDialog(false);
      onRefresh();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to save team member');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this team member?')) return;

    try {
      setSaving(true);
      await libraryService.deleteTeam(id);
      onRefresh();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to delete team member');
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'Name': '',
        'Contact Number': '',
        'Email ID': '',
        'Department': '',
        'Designation': '',
        'Is Active': 'true'
      }
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(templateData);
    
    // Set column widths
    ws['!cols'] = [
      { wch: 25 }, // Name
      { wch: 18 }, // Contact Number
      { wch: 25 }, // Email ID
      { wch: 20 }, // Department
      { wch: 20 }, // Designation
      { wch: 12 }, // Is Active
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Teams Template');
    XLSX.writeFile(wb, 'Team_Upload_Template.xlsx');
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
      const result = await libraryService.uploadTeams(file);
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

  const filteredTeams = teams.filter((team) =>
    team.name.toLowerCase().includes(search.toLowerCase()) ||
    team.contactNumber?.toLowerCase().includes(search.toLowerCase()) ||
    team.emailId?.toLowerCase().includes(search.toLowerCase()) ||
    team.department?.toLowerCase().includes(search.toLowerCase()) ||
    team.designation?.toLowerCase().includes(search.toLowerCase())
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
              Add Team
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
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Contact Number</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Email ID</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Department</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Designation</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredTeams.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-500">No team members found</td>
                    </tr>
                  ) : (
                    filteredTeams.map((team) => (
                      <tr key={team.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{team.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{team.contactNumber || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{team.emailId || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{team.department || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{team.designation || '-'}</td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleOpenDialog(team)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(team.id)}
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
                  {editingTeam ? 'Edit Team Member' : 'Add Team Member'}
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
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={teamForm.name}
                    onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
                    className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                      errors.name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter name"
                  />
                  {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Contact Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={teamForm.contactNumber}
                      onChange={(e) => setTeamForm({ ...teamForm, contactNumber: e.target.value })}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        errors.contactNumber ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter contact number"
                    />
                    {errors.contactNumber && <p className="text-red-500 text-xs mt-1">{errors.contactNumber}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={teamForm.emailId}
                      onChange={(e) => setTeamForm({ ...teamForm, emailId: e.target.value })}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        errors.emailId ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter email ID"
                    />
                    {errors.emailId && <p className="text-red-500 text-xs mt-1">{errors.emailId}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Department <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={teamForm.department}
                      onChange={(e) => setTeamForm({ ...teamForm, department: e.target.value })}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        errors.department ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter department"
                    />
                    {errors.department && <p className="text-red-500 text-xs mt-1">{errors.department}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Designation <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={teamForm.designation}
                      onChange={(e) => setTeamForm({ ...teamForm, designation: e.target.value })}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        errors.designation ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter designation"
                    />
                    {errors.designation && <p className="text-red-500 text-xs mt-1">{errors.designation}</p>}
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
    </>
  );
};

export default TeamsTab;

