import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, X, ChevronDown, ChevronUp, Mail, Clock, Download, UserPlus, Shield, FileText, Eye } from 'lucide-react';
import { formatDate, formatRelativeTime } from '../utils/formatters';
import { validateRequired, validateEmail } from '../utils/validators';
import api from '../utils/api';
import { cachedGet } from '../utils/cachedApi';

interface User {
  id: number;
  fullName: string;
  email: string;
  role: string;
  department?: string;
  status: 'active' | 'suspended';
  lastLogin?: string;
  createdAt: string;
}

interface Invitation {
  id: number;
  email: string;
  name: string;
  role: string;
  invitedBy: string;
  sentDate: string;
  expiresAt: string;
}

interface Role {
  id: number;
  name: string;
  description?: string;
  isDefault?: boolean;
  permissions?: any;
}

interface AuditLog {
  id: number;
  timestamp: string;
  user: string;
  action: string;
  module: string;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
}

const AccessControlPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'users' | 'roles' | 'audit-logs'>('users');
  const [activeSubTab, setActiveSubTab] = useState<'all' | 'pending' | 'suspended'>('all');
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // Data states
  const [users, setUsers] = useState<User[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [expandedRoles, setExpandedRoles] = useState<Set<number>>(new Set());

  // Dialog states
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);

  // Invite form
  const [inviteForm, setInviteForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    employeeId: '',
    role: '',
    department: '',
    moduleAccess: {
      dashboard: { view: true, create: false, edit: false, delete: false },
      sku: { view: true, create: true, edit: true, delete: true },
      inventory: { view: true, create: true, edit: true, delete: true },
      reports: { view: true, create: false, edit: false, delete: false },
      accessControl: { view: false, create: false, edit: false, delete: false },
      productCategory: { view: true, create: true, edit: true, delete: true },
      itemCategory: { view: true, create: true, edit: true, delete: true },
      subCategory: { view: true, create: true, edit: true, delete: true },
    },
    categoryAccess: [] as any[],
  });

  // Role form
  const [roleForm, setRoleForm] = useState({
    name: '',
    description: '',
    permissions: {} as any,
  });

  // Audit log filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [actionTypeFilter, setActionTypeFilter] = useState('all');
  const [moduleFilter, setModuleFilter] = useState('all');

  // Category data for invite form
  const [productCategories, setProductCategories] = useState<any[]>([]);
  const [itemCategories, setItemCategories] = useState<any[]>([]);
  const [subCategories, setSubCategories] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadData();
  }, [activeTab, activeSubTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      switch (activeTab) {
        case 'users':
          if (activeSubTab === 'all') {
            const usersRes = await cachedGet('/users', { params: { role: roleFilter } }, { ttlMs: 2 * 60 * 1000 });
            setUsers(usersRes.data || []);
          } else if (activeSubTab === 'pending') {
            const invRes = await cachedGet('/users/invitations', undefined, { ttlMs: 1 * 60 * 1000 });
            setInvitations(invRes.data || []);
          } else {
            const suspendedRes = await cachedGet('/users', { params: { status: 'suspended' } }, { ttlMs: 2 * 60 * 1000 });
            setUsers(suspendedRes.data || []);
          }
          break;
        case 'roles':
          const rolesRes = await cachedGet('/roles', undefined, { ttlMs: 10 * 60 * 1000 });
          setRoles(rolesRes.data || []);
          break;
        case 'audit-logs':
          const auditRes = await cachedGet('/access-control/audit-logs', {
            params: {
              dateFrom,
              dateTo,
              user: userFilter,
              actionType: actionTypeFilter !== 'all' ? actionTypeFilter : undefined,
              module: moduleFilter !== 'all' ? moduleFilter : undefined,
            },
          }, { ttlMs: 1 * 60 * 1000 });
          setAuditLogs(auditRes.data || []);
          break;
      }
    } catch (error: any) {
      console.error('Error loading data:', error);
      // Show user-friendly error message
      if (error.response?.data?.error) {
        console.error('API Error:', error.response.data.error);
      } else if (error.message) {
        console.error('Error message:', error.message);
      }
      // Reset data on error to show empty state
      if (activeTab === 'users') {
        setUsers([]);
        setInvitations([]);
      } else if (activeTab === 'roles') {
        setRoles([]);
      } else if (activeTab === 'audit-logs') {
        setAuditLogs([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Load product categories when invite dialog opens
    if (showInviteDialog) {
      cachedGet('/categories/product', undefined, { ttlMs: 24 * 60 * 60 * 1000 }).then((res) => {
        setProductCategories(res.data || []);
      });
    }
  }, [showInviteDialog]);

  const handleInviteUser = async () => {
    const newErrors: Record<string, string> = {};
    if (!validateEmail(inviteForm.email)) {
      newErrors.email = 'Valid email is required';
    }
    if (!validateRequired(inviteForm.firstName)) {
      newErrors.firstName = 'First Name is required';
    }
    if (!validateRequired(inviteForm.lastName)) {
      newErrors.lastName = 'Last Name is required';
    }
    if (!validateRequired(inviteForm.role)) {
      newErrors.role = 'Role is required';
    }

    // Validate Module Access - at least one module must have at least one permission
    const hasModuleAccess = Object.values(inviteForm.moduleAccess).some((module: any) => {
      return module.view || module.create || module.edit || module.delete;
    });
    if (!hasModuleAccess) {
      newErrors.moduleAccess = 'At least one permission must be selected in Module Access';
    }

    // Validate Category Access - each entry must have at least one permission selected
    if (inviteForm.categoryAccess.length > 0) {
      inviteForm.categoryAccess.forEach((catAccess, index) => {
        const hasPermission = catAccess.permissions?.view || 
                             catAccess.permissions?.create || 
                             catAccess.permissions?.edit || 
                             catAccess.permissions?.delete;
        if (!hasPermission) {
          newErrors[`categoryAccess_${index}`] = `Category Access ${index + 1}: At least one permission must be selected`;
        }
      });
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setLoading(true);
      await api.post('/users/invite', inviteForm);
      setShowInviteDialog(false);
      setInviteForm({
        email: '',
        firstName: '',
        lastName: '',
        employeeId: '',
        role: '',
        department: '',
        moduleAccess: {
          dashboard: { view: true, create: false, edit: false, delete: false },
          sku: { view: true, create: true, edit: true, delete: true },
          inventory: { view: true, create: true, edit: true, delete: true },
          reports: { view: true, create: false, edit: false, delete: false },
          accessControl: { view: false, create: false, edit: false, delete: false },
          productCategory: { view: true, create: true, edit: true, delete: true },
          itemCategory: { view: true, create: true, edit: true, delete: true },
          subCategory: { view: true, create: true, edit: true, delete: true },
        },
        categoryAccess: [],
      });
      loadData();
    } catch (error: any) {
      console.error('Error inviting user:', error);
      
      // Handle different error types
      if (error.response?.status === 409) {
        // Conflict - user already exists
        const errorMessage = error.response?.data?.error || error.response?.data?.message || 'User with this email already exists';
        alert(`Invitation failed: ${errorMessage}\n\nPlease use a different email address or check if this user has already been invited.`);
      } else if (error.response?.status === 400) {
        // Bad request - validation error
        const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Invalid data provided';
        alert(`Invitation failed: ${errorMessage}\n\nPlease check all required fields and try again.`);
      } else if (error.response?.status === 500) {
        // Server error
        alert('Server error: Failed to send invitation. Please try again later or contact support.');
      } else {
        // Other errors
        const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to send invitation';
        alert(`Invitation failed: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategoryAccess = () => {
    setInviteForm({
      ...inviteForm,
      categoryAccess: [
        ...inviteForm.categoryAccess,
        {
          productCategoryIds: [] as string[],
          itemCategoryIds: [] as string[],
          subCategoryIds: [] as string[],
          itemIds: [] as string[],
          permissions: { view: true, create: false, edit: false, delete: false },
        },
      ],
    });
  };

  const loadItemCategories = async (productCategoryIds: string[]) => {
    if (!productCategoryIds || productCategoryIds.length === 0) {
      setItemCategories([]);
      return;
    }
    try {
      const allItemCategories: any[] = [];
      for (const productCategoryId of productCategoryIds) {
        const response = await cachedGet('/categories/item', {
          params: { productCategoryId },
        }, { ttlMs: 24 * 60 * 60 * 1000 });
        allItemCategories.push(...(response.data || []));
      }
      const unique = allItemCategories.filter((item, index, self) =>
        index === self.findIndex((t) => t.id === item.id)
      );
      setItemCategories(unique);
    } catch (error) {
      console.error('Error loading item categories:', error);
      setItemCategories([]);
    }
  };

  const loadSubCategories = async (itemCategoryIds: string[]) => {
    if (!itemCategoryIds || itemCategoryIds.length === 0) {
      setSubCategories([]);
      return;
    }
    try {
      const allSubCategories: any[] = [];
      for (const itemCategoryId of itemCategoryIds) {
        const response = await cachedGet('/categories/sub', {
          params: { itemCategoryId },
        }, { ttlMs: 24 * 60 * 60 * 1000 });
        allSubCategories.push(...(response.data || []));
      }
      const unique = allSubCategories.filter((item, index, self) =>
        index === self.findIndex((t) => t.id === item.id)
      );
      setSubCategories(unique);
    } catch (error) {
      console.error('Error loading sub categories:', error);
      setSubCategories([]);
    }
  };

  const loadItems = async (productCategoryIds: string[], itemCategoryIds: string[], subCategoryIds: string[]) => {
    if (!productCategoryIds?.length || !itemCategoryIds?.length || !subCategoryIds?.length) {
      setItems([]);
      return;
    }
    try {
      const allItems: any[] = [];
      for (const productCategoryId of productCategoryIds) {
        for (const itemCategoryId of itemCategoryIds) {
          for (const subCategoryId of subCategoryIds) {
            const response = await cachedGet('/skus', {
              params: {
                productCategory: productCategoryId,
                itemCategory: itemCategoryId,
                subCategory: subCategoryId,
                limit: 1000,
              },
            }, { ttlMs: 60 * 1000 });
            allItems.push(...(response.data || []));
          }
        }
      }
      const unique = allItems.filter((item, index, self) =>
        index === self.findIndex((t) => t.id === item.id)
      );
      setItems(unique);
    } catch (error) {
      console.error('Error loading items:', error);
      setItems([]);
    }
  };

  const handleRemoveCategoryAccess = (index: number) => {
    setInviteForm({
      ...inviteForm,
      categoryAccess: inviteForm.categoryAccess.filter((_, i) => i !== index),
    });
  };

  const handleSaveRole = async () => {
    try {
      setLoading(true);
      if (editingRole) {
        await api.put(`/roles/${editingRole.id}`, roleForm);
      } else {
        await api.post('/roles', roleForm);
      }
      setShowRoleDialog(false);
      setEditingRole(null);
      setRoleForm({ name: '', description: '', permissions: {} });
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to save role');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (type: string, id: number, userName?: string, userEmail?: string) => {
    const confirmMessage = type === 'user' 
      ? `Are you sure you want to delete ${userName || 'this user'} (${userEmail || ''})? This action cannot be undone and will permanently remove all their data and deny access.`
      : 'Are you sure you want to delete this item?';
    
    if (!window.confirm(confirmMessage)) return;
    
    try {
      setLoading(true);
      if (type === 'user') {
        await api.delete(`/users/${id}`);
        alert('User deleted successfully. Their access has been revoked.');
      } else if (type === 'role') {
        await api.delete(`/roles/${id}`);
        alert('Role deleted successfully.');
      }
      loadData();
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Failed to delete item';
      alert(`Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSuspend = async (id: number) => {
    if (!window.confirm('Are you sure you want to suspend this user?')) return;
    try {
      setLoading(true);
      await api.put(`/users/${id}/suspend`);
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to suspend user');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(
    (user) =>
      user.fullName.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase())
  );

  const getActionBadgeColor = (action: string) => {
    switch (action.toLowerCase()) {
      case 'created':
        return 'bg-green-100 text-green-800';
      case 'updated':
        return 'bg-blue-100 text-blue-800';
      case 'deleted':
        return 'bg-red-100 text-red-800';
      case 'login':
        return 'bg-purple-100 text-purple-800';
      case 'logout':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-8 space-y-10 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Access Control</h1>
          <p className="text-lg text-slate-500 font-medium">Manage user access, roles, and permissions.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-2">
        <nav className="flex space-x-2">
          {(['users', 'roles', 'audit-logs'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 rounded-2xl font-black text-[13px] uppercase tracking-wider transition-all ${
                activeTab === tab
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              {tab.replace('-', ' ')}
            </button>
          ))}
        </nav>
      </div>

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          {/* Sub-tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8">
              {(['all', 'pending', 'suspended'] as const).map((subTab) => (
                <button
                  key={subTab}
                  onClick={() => setActiveSubTab(subTab)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm capitalize ${
                    activeSubTab === subTab
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {subTab === 'all' ? 'All Users' : subTab === 'pending' ? 'Pending Invitations' : 'Suspended Users'}
                </button>
              ))}
            </nav>
          </div>

          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex-1 w-full sm:w-auto flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {activeSubTab === 'all' && (
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Roles</option>
                  <option value="admin">Admin</option>
                  <option value="sales">User</option>
                  <option value="warehouse">Warehouse</option>
                  <option value="accountant">Accountant</option>
                </select>
              )}
            </div>
            {activeSubTab === 'all' && (
              <button
                onClick={() => navigate('/app/invite-user')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
              >
                <UserPlus className="w-5 h-5" />
                Invite User
              </button>
            )}
          </div>

          {/* All Users Table */}
          {activeSubTab === 'all' && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">User Name</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Email</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Role</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Department</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Last Login</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Created Date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {loading ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center">
                          <div className="flex justify-center">
                            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                          </div>
                        </td>
                      </tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-gray-500">No users found</td>
                      </tr>
                    ) : (
                      filteredUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{user.fullName}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{user.email}</td>
                          <td className="px-4 py-3 text-sm text-gray-700 capitalize">{user.role}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{user.department || '-'}</td>
                          <td className="px-4 py-3 text-sm">
                            <span
                              className={`px-2 py-1 text-xs font-semibold rounded ${
                                user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {user.status === 'active' ? 'Active' : 'Suspended'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {user.lastLogin ? formatRelativeTime(user.lastLogin) : 'Never'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">{formatDate(user.createdAt)}</td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex items-center gap-2">
                              <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="View">
                                <Eye className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleDelete('user', user.id, user.fullName, user.email)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" 
                                title="Delete User"
                                disabled={loading}
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

          {/* Pending Invitations Table */}
          {activeSubTab === 'pending' && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Email</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Role</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Invited By</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Sent Date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Expires In</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center">
                          <div className="flex justify-center">
                            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                          </div>
                        </td>
                      </tr>
                    ) : invitations.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-gray-500">No pending invitations</td>
                      </tr>
                    ) : (
                      invitations.map((inv) => {
                        const expiresAt = new Date(inv.expiresAt);
                        const now = new Date();
                        const diffMs = expiresAt.getTime() - now.getTime();
                        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                        return (
                          <tr key={inv.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{inv.email}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">{inv.name}</td>
                            <td className="px-4 py-3 text-sm text-gray-700 capitalize">{inv.role}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">{inv.invitedBy}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">{formatDate(inv.sentDate)}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">
                              {diffDays > 0 ? `${diffDays} days` : 'Expired'}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <div className="flex items-center gap-2">
                                <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="Resend">
                                  <Mail className="w-4 h-4" />
                                </button>
                                <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Cancel">
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Suspended Users Table - same as All Users */}
          {activeSubTab === 'suspended' && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">User Name</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Email</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Role</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Department</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Last Login</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Created Date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {loading ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center">
                          <div className="flex justify-center">
                            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                          </div>
                        </td>
                      </tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-gray-500">No suspended users found</td>
                      </tr>
                    ) : (
                      filteredUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{user.fullName}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{user.email}</td>
                          <td className="px-4 py-3 text-sm text-gray-700 capitalize">{user.role}</td>
                          <td className="px-4 py-3 text-sm text-gray-700">{user.department || '-'}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className="px-2 py-1 text-xs font-semibold rounded bg-red-100 text-red-800">
                              Suspended
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {user.lastLogin ? formatRelativeTime(user.lastLogin) : 'Never'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">{formatDate(user.createdAt)}</td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex items-center gap-2">
                              <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="View">
                                <Eye className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleDelete('user', user.id, user.fullName, user.email)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" 
                                title="Delete User"
                                disabled={loading}
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
      )}

      {/* Roles & Permissions Tab */}
      {activeTab === 'roles' && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button
              onClick={() => {
                setEditingRole(null);
                setRoleForm({ name: '', description: '', permissions: {} });
                setShowRoleDialog(true);
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Create Custom Role
            </button>
          </div>

          <div className="space-y-4">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : roles.length === 0 ? (
              <p className="text-center text-gray-500 py-12">No roles found</p>
            ) : (
              roles.map((role) => (
                <div key={role.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{role.name}</h3>
                      {role.description && <p className="text-sm text-gray-600 mt-1">{role.description}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      {!role.isDefault && (
                        <button
                          onClick={() => {
                            setEditingRole(role);
                            setRoleForm({ name: role.name, description: role.description || '', permissions: role.permissions || {} });
                            setShowRoleDialog(true);
                          }}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      )}
                      {!role.isDefault && (
                        <button
                          onClick={() => handleDelete('role', role.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          const newExpanded = new Set(expandedRoles);
                          if (newExpanded.has(role.id)) {
                            newExpanded.delete(role.id);
                          } else {
                            newExpanded.add(role.id);
                          }
                          setExpandedRoles(newExpanded);
                        }}
                        className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg"
                      >
                        {expandedRoles.has(role.id) ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  {expandedRoles.has(role.id) && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-sm text-gray-600">Module permissions and category access details would be displayed here.</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Audit Logs Tab */}
      {activeTab === 'audit-logs' && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date From</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date To</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">User</label>
                <input
                  type="text"
                  value={userFilter}
                  onChange={(e) => setUserFilter(e.target.value)}
                  placeholder="Search user"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Action Type</label>
                <select
                  value={actionTypeFilter}
                  onChange={(e) => setActionTypeFilter(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All</option>
                  <option value="created">Created</option>
                  <option value="updated">Updated</option>
                  <option value="deleted">Deleted</option>
                  <option value="login">Login</option>
                  <option value="logout">Logout</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Module</label>
                <select
                  value={moduleFilter}
                  onChange={(e) => setModuleFilter(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All</option>
                  <option value="sku">SKU</option>
                  <option value="inventory">Inventory</option>
                  <option value="users">Users</option>
                  <option value="settings">Settings</option>
                </select>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={loadData}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Apply Filters
              </button>
            </div>
          </div>

          {/* Export Button */}
          <div className="flex justify-end">
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
              <Download className="w-5 h-5" />
              Export Audit Log
            </button>
          </div>

          {/* Audit Logs Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Timestamp</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">User</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Action</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Module</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">Details</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">IP Address</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">User Agent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center">
                        <div className="flex justify-center">
                          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      </td>
                    </tr>
                  ) : auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-500">No audit logs found</td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-700">{formatDate(log.timestamp)}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{log.user}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 text-xs font-semibold rounded ${getActionBadgeColor(log.action)}`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 capitalize">{log.module}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{log.details || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{log.ipAddress || '-'}</td>
                        <td className="px-4 py-3 text-xs text-gray-700">{log.userAgent || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Invite User Dialog */}
      {showInviteDialog && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowInviteDialog(false);
            setErrors({});
          }}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Invite User</h2>
                <button
                  onClick={() => {
                    setShowInviteDialog(false);
                    setErrors({});
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Basic Information */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        value={inviteForm.email}
                        onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                          errors.email ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                      {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Role <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={inviteForm.role}
                        onChange={(e) => {
                          const selectedRole = e.target.value;
                          // Auto-set permissions based on role
                          if (selectedRole === 'admin') {
                            // Admin gets ALL permissions (View, Create, Edit, Delete) for all modules except Access Control
                            setInviteForm({
                              ...inviteForm,
                              role: selectedRole,
                              moduleAccess: {
                                dashboard: { view: true, create: true, edit: true, delete: true },
                                sku: { view: true, create: true, edit: true, delete: true },
                                inventory: { view: true, create: true, edit: true, delete: true },
                                reports: { view: true, create: true, edit: true, delete: true },
                                accessControl: { view: false, create: false, edit: false, delete: false }, // Hidden from UI
                                productCategory: { view: true, create: true, edit: true, delete: true },
                                itemCategory: { view: true, create: true, edit: true, delete: true },
                                subCategory: { view: true, create: true, edit: true, delete: true },
                              },
                              // Admin can have category access with full permissions
                              categoryAccess: inviteForm.categoryAccess.length > 0 ? inviteForm.categoryAccess : [],
                            });
                          } else if (selectedRole === 'sales') {
                            // User (sales) gets only SKU Management with View only - limited permissions
                            setInviteForm({
                              ...inviteForm,
                              role: selectedRole,
                              moduleAccess: {
                                dashboard: { view: false, create: false, edit: false, delete: false },
                                sku: { view: true, create: false, edit: false, delete: false },
                                inventory: { view: false, create: false, edit: false, delete: false },
                                reports: { view: false, create: false, edit: false, delete: false },
                                accessControl: { view: false, create: false, edit: false, delete: false },
                                productCategory: { view: false, create: false, edit: false, delete: false },
                                itemCategory: { view: false, create: false, edit: false, delete: false },
                                subCategory: { view: false, create: false, edit: false, delete: false },
                              },
                              categoryAccess: [], // Reset category access for User role - Users don't get category access
                            });
                          } else if (selectedRole && selectedRole !== '') {
                            // Other roles - show confirmation
                            const confirmed = window.confirm(
                              `Are you sure you want to give access to ${selectedRole} role? You can configure specific permissions manually.`
                            );
                            if (confirmed) {
                              setInviteForm({ ...inviteForm, role: selectedRole });
                            } else {
                              // Reset to previous role or empty
                              e.target.value = inviteForm.role;
                              return;
                            }
                          } else {
                            setInviteForm({ ...inviteForm, role: selectedRole });
                          }
                        }}
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                          errors.role ? 'border-red-500' : 'border-gray-300'
                        }`}
                      >
                        <option value="">Select Role</option>
                        <option value="admin">Admin</option>
                        <option value="sales">User</option>
                        <option value="warehouse" disabled className="opacity-50">Warehouse</option>
                        <option value="accountant" disabled className="opacity-50">Accountant</option>
                      </select>
                      {errors.role && <p className="text-red-500 text-xs mt-1">{errors.role}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        First Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={inviteForm.firstName}
                        onChange={(e) => setInviteForm({ ...inviteForm, firstName: e.target.value })}
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                          errors.firstName ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                      {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Last Name <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        value={inviteForm.lastName}
                        onChange={(e) => setInviteForm({ ...inviteForm, lastName: e.target.value })}
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                          errors.lastName ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                      {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID</label>
                      <input
                        type="text"
                        value={inviteForm.employeeId}
                        onChange={(e) => setInviteForm({ ...inviteForm, employeeId: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="EMP001"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                      <input
                        type="text"
                        value={inviteForm.department}
                        onChange={(e) => setInviteForm({ ...inviteForm, department: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Module Access */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Module Access</h3>
                    <span className="text-sm text-red-500">* At least one permission required</span>
                  </div>
                  {errors.moduleAccess && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-sm text-red-600">{errors.moduleAccess}</p>
                    </div>
                  )}
                  <div className="space-y-3">
                    {Object.entries(inviteForm.moduleAccess)
                      .filter(([module]) => module !== 'accessControl') // Remove Access Control from display
                      .map(([module, perms]: [string, any]) => {
                      const moduleLabels: Record<string, string> = {
                        sku: 'SKU Management',
                        accessControl: 'Access Control',
                        productCategory: 'Product Category Access',
                        itemCategory: 'Item Category Access',
                        subCategory: 'Sub Category Access',
                      };
                      const moduleLabel = moduleLabels[module] || module.charAt(0).toUpperCase() + module.slice(1);
                      
                      // For User role, only show SKU Management
                      const isUserRole = inviteForm.role === 'sales';
                      const shouldShowModule = !isUserRole || module === 'sku';
                      
                      if (!shouldShowModule) return null;
                      
                      // For User role, only show View option
                      const showOnlyView = isUserRole && module === 'sku';
                      
                      return (
                        <div key={module} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <span className="font-medium w-48">{moduleLabel}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            <label className="flex items-center gap-1 text-sm">
                              <input
                                type="checkbox"
                                checked={perms.view}
                                onChange={(e) => {
                                  setInviteForm({
                                    ...inviteForm,
                                    moduleAccess: {
                                      ...inviteForm.moduleAccess,
                                      [module]: { 
                                        ...perms, 
                                        view: e.target.checked,
                                        create: e.target.checked && !showOnlyView ? perms.create : false,
                                        edit: e.target.checked && !showOnlyView ? perms.edit : false,
                                        delete: e.target.checked && !showOnlyView ? perms.delete : false,
                                      },
                                    },
                                  });
                                  // Clear module access error when any permission is selected
                                  if (e.target.checked && errors.moduleAccess) {
                                    const newErrors = { ...errors };
                                    delete newErrors.moduleAccess;
                                    setErrors(newErrors);
                                  }
                                }}
                                className="rounded"
                              />
                              <span>View</span>
                            </label>
                            {!showOnlyView && (
                              <>
                                <label className="flex items-center gap-1 text-sm">
                                  <input
                                    type="checkbox"
                                    checked={perms.create}
                                    disabled={!perms.view}
                                    onChange={(e) => {
                                      setInviteForm({
                                        ...inviteForm,
                                        moduleAccess: {
                                          ...inviteForm.moduleAccess,
                                          [module]: { ...perms, create: e.target.checked },
                                        },
                                      });
                                      // Clear module access error when any permission is selected
                                      if (e.target.checked && errors.moduleAccess) {
                                        const newErrors = { ...errors };
                                        delete newErrors.moduleAccess;
                                        setErrors(newErrors);
                                      }
                                    }}
                                    className="rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                  />
                                  <span className={!perms.view ? 'text-gray-400' : ''}>Create</span>
                                </label>
                                <label className="flex items-center gap-1 text-sm">
                                  <input
                                    type="checkbox"
                                    checked={perms.edit}
                                    disabled={!perms.view}
                                    onChange={(e) => {
                                      setInviteForm({
                                        ...inviteForm,
                                        moduleAccess: {
                                          ...inviteForm.moduleAccess,
                                          [module]: { ...perms, edit: e.target.checked },
                                        },
                                      });
                                      // Clear module access error when any permission is selected
                                      if (e.target.checked && errors.moduleAccess) {
                                        const newErrors = { ...errors };
                                        delete newErrors.moduleAccess;
                                        setErrors(newErrors);
                                      }
                                    }}
                                    className="rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                  />
                                  <span className={!perms.view ? 'text-gray-400' : ''}>Edit</span>
                                </label>
                                <label className="flex items-center gap-1 text-sm">
                                  <input
                                    type="checkbox"
                                    checked={perms.delete}
                                    disabled={!perms.view}
                                    onChange={(e) => {
                                      setInviteForm({
                                        ...inviteForm,
                                        moduleAccess: {
                                          ...inviteForm.moduleAccess,
                                          [module]: { ...perms, delete: e.target.checked },
                                        },
                                      });
                                      // Clear module access error when any permission is selected
                                      if (e.target.checked && errors.moduleAccess) {
                                        const newErrors = { ...errors };
                                        delete newErrors.moduleAccess;
                                        setErrors(newErrors);
                                      }
                                    }}
                                    className="rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                  />
                                  <span className={!perms.view ? 'text-gray-400' : ''}>Delete</span>
                                </label>
                              </>
                            )}
                            {module === 'accessControl' && (
                              <span className="text-xs text-gray-500 ml-2">(Super Admin Only)</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Category Access - Only for Admin role */}
                {inviteForm.role === 'admin' && (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Category Access</h3>
                    <button
                      onClick={handleAddCategoryAccess}
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" />
                      Add Category Access
                    </button>
                  </div>
                  <div className="space-y-4">
                    {inviteForm.categoryAccess.map((catAccess, index) => (
                      <div key={index} className="p-4 border border-gray-200 rounded-lg">
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-sm font-medium text-gray-700">Category Access {index + 1}</span>
                          <button
                            onClick={() => handleRemoveCategoryAccess(index)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Product Category</label>
                            <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto bg-white">
                              {productCategories.length === 0 ? (
                                <p className="text-sm text-gray-500">No product categories available</p>
                              ) : (
                                productCategories.map((cat) => (
                                  <label key={cat.id} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-gray-50 rounded px-2">
                                    <input
                                      type="checkbox"
                                      checked={catAccess.productCategoryIds?.includes(String(cat.id)) || false}
                                      onChange={(e) => {
                                        const updated = [...inviteForm.categoryAccess];
                                        const currentIds = updated[index].productCategoryIds || [];
                                        if (e.target.checked) {
                                          updated[index].productCategoryIds = [...currentIds, String(cat.id)];
                                        } else {
                                          updated[index].productCategoryIds = currentIds.filter(id => id !== String(cat.id));
                                          updated[index].itemCategoryIds = [];
                                          updated[index].subCategoryIds = [];
                                          updated[index].itemIds = [];
                                        }
                                        setInviteForm({ ...inviteForm, categoryAccess: updated });
                                        loadItemCategories(updated[index].productCategoryIds);
                                      }}
                                      className="rounded"
                                    />
                                    <span className="text-sm text-gray-700">{cat.name}</span>
                                  </label>
                                ))
                              )}
                            </div>
                            {catAccess.productCategoryIds?.length > 0 && (
                              <p className="text-xs text-gray-500 mt-1">{catAccess.productCategoryIds.length} selected</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Item Category</label>
                            <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto bg-white">
                              {itemCategories.length === 0 ? (
                                <p className="text-sm text-gray-500">
                                  {catAccess.productCategoryIds?.length > 0 ? 'No item categories available' : 'Select Product Category first'}
                                </p>
                              ) : (
                                itemCategories.map((cat) => (
                                  <label key={cat.id} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-gray-50 rounded px-2">
                                    <input
                                      type="checkbox"
                                      checked={catAccess.itemCategoryIds?.includes(String(cat.id)) || false}
                                      onChange={(e) => {
                                        const updated = [...inviteForm.categoryAccess];
                                        const currentIds = updated[index].itemCategoryIds || [];
                                        if (e.target.checked) {
                                          updated[index].itemCategoryIds = [...currentIds, String(cat.id)];
                                        } else {
                                          updated[index].itemCategoryIds = currentIds.filter(id => id !== String(cat.id));
                                          updated[index].subCategoryIds = [];
                                          updated[index].itemIds = [];
                                        }
                                        setInviteForm({ ...inviteForm, categoryAccess: updated });
                                        loadSubCategories(updated[index].itemCategoryIds);
                                      }}
                                      disabled={!catAccess.productCategoryIds?.length}
                                      className="rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                    />
                                    <span className={`text-sm ${!catAccess.productCategoryIds?.length ? 'text-gray-400' : 'text-gray-700'}`}>{cat.name}</span>
                                  </label>
                                ))
                              )}
                            </div>
                            {catAccess.itemCategoryIds?.length > 0 && (
                              <p className="text-xs text-gray-500 mt-1">{catAccess.itemCategoryIds.length} selected</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Sub Category</label>
                            <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto bg-white">
                              {subCategories.length === 0 ? (
                                <p className="text-sm text-gray-500">
                                  {catAccess.itemCategoryIds?.length > 0 ? 'No sub categories available' : 'Select Item Category first'}
                                </p>
                              ) : (
                                subCategories.map((cat) => (
                                  <label key={cat.id} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-gray-50 rounded px-2">
                                    <input
                                      type="checkbox"
                                      checked={catAccess.subCategoryIds?.includes(String(cat.id)) || false}
                                      onChange={(e) => {
                                        const updated = [...inviteForm.categoryAccess];
                                        const currentIds = updated[index].subCategoryIds || [];
                                        if (e.target.checked) {
                                          updated[index].subCategoryIds = [...currentIds, String(cat.id)];
                                        } else {
                                          updated[index].subCategoryIds = currentIds.filter(id => id !== String(cat.id));
                                          updated[index].itemIds = [];
                                        }
                                        setInviteForm({ ...inviteForm, categoryAccess: updated });
                                        if (updated[index].productCategoryIds?.length && updated[index].itemCategoryIds?.length && updated[index].subCategoryIds?.length) {
                                          loadItems(updated[index].productCategoryIds, updated[index].itemCategoryIds, updated[index].subCategoryIds);
                                        }
                                      }}
                                      disabled={!catAccess.itemCategoryIds?.length}
                                      className="rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                    />
                                    <span className={`text-sm ${!catAccess.itemCategoryIds?.length ? 'text-gray-400' : 'text-gray-700'}`}>{cat.name}</span>
                                  </label>
                                ))
                              )}
                            </div>
                            {catAccess.subCategoryIds?.length > 0 && (
                              <p className="text-xs text-gray-500 mt-1">{catAccess.subCategoryIds.length} selected</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
                            <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto bg-white">
                              {items.length === 0 ? (
                                <p className="text-sm text-gray-500">
                                  {catAccess.subCategoryIds?.length > 0 ? 'No items available' : 'Select Sub Category first'}
                                </p>
                              ) : (
                                items.map((item) => (
                                  <label key={item.id} className="flex items-center gap-2 py-1 cursor-pointer hover:bg-gray-50 rounded px-2">
                                    <input
                                      type="checkbox"
                                      checked={catAccess.itemIds?.includes(String(item.id)) || false}
                                      onChange={(e) => {
                                        const updated = [...inviteForm.categoryAccess];
                                        const currentIds = updated[index].itemIds || [];
                                        if (e.target.checked) {
                                          updated[index].itemIds = [...currentIds, String(item.id)];
                                        } else {
                                          updated[index].itemIds = currentIds.filter(id => id !== String(item.id));
                                        }
                                        setInviteForm({ ...inviteForm, categoryAccess: updated });
                                      }}
                                      disabled={!catAccess.subCategoryIds?.length}
                                      className="rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                    />
                                    <span className={`text-sm ${!catAccess.subCategoryIds?.length ? 'text-gray-400' : 'text-gray-700'}`}>
                                      {item.itemName || item.skuId}
                                    </span>
                                  </label>
                                ))
                              )}
                            </div>
                            {catAccess.itemIds?.length > 0 && (
                              <p className="text-xs text-gray-500 mt-1">{catAccess.itemIds.length} selected</p>
                            )}
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-gray-700">Permissions</label>
                            <span className="text-xs text-red-500">* Required</span>
                          </div>
                          {errors[`categoryAccess_${index}`] && (
                            <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
                              {errors[`categoryAccess_${index}`]}
                            </div>
                          )}
                          <div className="flex gap-4">
                            {['view', 'create', 'edit', 'delete'].map((perm) => {
                              // Admin role gets all permissions for category access
                              return (
                                <label key={perm} className="flex items-center gap-1 text-sm">
                                  <input
                                    type="checkbox"
                                    checked={catAccess.permissions[perm]}
                                    onChange={(e) => {
                                      const updated = [...inviteForm.categoryAccess];
                                        updated[index].permissions[perm] = e.target.checked;
                                      setInviteForm({ ...inviteForm, categoryAccess: updated });
                                      // Clear error when permission is selected
                                      if (e.target.checked && errors[`categoryAccess_${index}`]) {
                                        const newErrors = { ...errors };
                                        delete newErrors[`categoryAccess_${index}`];
                                        setErrors(newErrors);
                                      }
                                    }}
                                    className="rounded"
                                  />
                                  <span className="capitalize">{perm}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ))}
                    {inviteForm.categoryAccess.length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-4">No category access added</p>
                    )}
                  </div>
                </div>
                )}

                {/* Review Summary */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-blue-900 mb-2">Review Summary</h3>
                  <p className="text-sm text-blue-800">
                    {inviteForm.firstName} {inviteForm.lastName} ({inviteForm.email}) will be invited as {inviteForm.role}
                    {inviteForm.department && ` in ${inviteForm.department} department`}. Module access and category permissions as configured above.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-4 mt-6">
                <button
                  onClick={() => {
                    setShowInviteDialog(false);
                    setErrors({});
                  }}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleInviteUser}
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Sending...' : 'Send Invitation'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Role Dialog */}
      {showRoleDialog && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowRoleDialog(false)}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {editingRole ? 'Edit Role' : 'Create Custom Role'}
                </h2>
                <button
                  onClick={() => setShowRoleDialog(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={roleForm.name}
                    onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={roleForm.description}
                    onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Module Permissions</h3>
                  <p className="text-sm text-gray-600">Module permissions matrix would be displayed here.</p>
                </div>
              </div>

              <div className="flex justify-end gap-4 mt-6">
                <button
                  onClick={() => setShowRoleDialog(false)}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveRole}
                  disabled={loading}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccessControlPage;

