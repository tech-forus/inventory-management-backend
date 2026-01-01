import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, X, UserPlus, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { validateRequired, validateEmail } from '../utils/validators';
import api from '../utils/api';

const InviteUserPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [invitedEmail, setInvitedEmail] = useState('');
  
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

  // Category data for invite form
  const [productCategories, setProductCategories] = useState<any[]>([]);
  const [itemCategories, setItemCategories] = useState<any[]>([]);
  const [subCategories, setSubCategories] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    // Load product categories
    api.get('/categories/product')
      .then((res) => {
        setProductCategories(res.data.data || []);
      })
      .catch((error) => {
        console.error('Error loading categories:', error);
      });
  }, []);

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
      setInvitedEmail(inviteForm.email);
      setSuccess(true);
      
      // Reset form
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
      setErrors({});
      
      // Hide success message after 5 seconds
      setTimeout(() => {
        setSuccess(false);
        setInvitedEmail('');
      }, 5000);
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
          permissions: { view: true, create: true, edit: true, delete: true },
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
      // Load item categories for all selected product categories
      const allItemCategories: any[] = [];
      for (const productCategoryId of productCategoryIds) {
        const response = await api.get('/categories/item', {
          params: { productCategoryId },
        });
        allItemCategories.push(...(response.data.data || []));
      }
      // Remove duplicates
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
      // Load sub categories for all selected item categories
      const allSubCategories: any[] = [];
      for (const itemCategoryId of itemCategoryIds) {
        const response = await api.get('/categories/sub', {
          params: { itemCategoryId },
        });
        allSubCategories.push(...(response.data.data || []));
      }
      // Remove duplicates
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
      // Load items for all selected combinations
      const allItems: any[] = [];
      for (const productCategoryId of productCategoryIds) {
        for (const itemCategoryId of itemCategoryIds) {
          for (const subCategoryId of subCategoryIds) {
            const response = await api.get('/skus', {
              params: {
                productCategory: productCategoryId,
                itemCategory: itemCategoryId,
                subCategory: subCategoryId,
                limit: 1000,
              },
            });
            allItems.push(...(response.data.data || []));
          }
        }
      }
      // Remove duplicates
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

  const resetForm = () => {
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
    setErrors({});
    setSuccess(false);
    setInvitedEmail('');
  };

  return (
    <div className="p-8 space-y-10 w-full max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/app/access-control')}
              className="text-slate-600 hover:text-slate-900 transition-colors"
              title="Back to Access Control"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Invite User</h1>
          </div>
          <p className="text-lg text-slate-500 font-medium">Send an invitation to a new user to join the system.</p>
        </div>
      </div>

      {/* Success Message */}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-[2rem] p-6 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600" />
          <div>
            <p className="text-green-800 font-medium">Invitation sent successfully!</p>
            <p className="text-green-700 text-sm">An invitation email has been sent to {invitedEmail || 'the user'}.</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 space-y-8">
          {/* Basic Information */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Basic Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => {
                    setInviteForm({ ...inviteForm, email: e.target.value });
                    if (errors.email) setErrors({ ...errors, email: '' });
                  }}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="user@example.com"
                />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
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
                    if (errors.role) setErrors({ ...errors, role: '' });
                  }}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={inviteForm.firstName}
                  onChange={(e) => {
                    setInviteForm({ ...inviteForm, firstName: e.target.value });
                    if (errors.firstName) setErrors({ ...errors, firstName: '' });
                  }}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.firstName ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="John"
                />
                {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={inviteForm.lastName}
                  onChange={(e) => {
                    setInviteForm({ ...inviteForm, lastName: e.target.value });
                    if (errors.lastName) setErrors({ ...errors, lastName: '' });
                  }}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.lastName ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Doe"
                />
                {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Employee ID</label>
                <input
                  type="text"
                  value={inviteForm.employeeId}
                  onChange={(e) => setInviteForm({ ...inviteForm, employeeId: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="EMP001"
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                <input
                  type="text"
                  value={inviteForm.department}
                  onChange={(e) => setInviteForm({ ...inviteForm, department: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Sales, Warehouse, Accounting, etc."
                />
              </div>
            </div>
          </div>

          {/* Module Access */}
          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Module Access</h2>
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
                  <div key={module} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-gray-900 w-48">{moduleLabel}</span>
                    </div>
                    <div className="flex items-center gap-6">
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
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
                          className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-gray-700">View</span>
                      </label>
                      {!showOnlyView && (
                        <>
                          <label className="flex items-center gap-2 text-sm cursor-pointer">
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
                              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            <span className={!perms.view ? 'text-gray-400' : 'text-gray-700'}>Create</span>
                          </label>
                          <label className="flex items-center gap-2 text-sm cursor-pointer">
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
                              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            <span className={!perms.view ? 'text-gray-400' : 'text-gray-700'}>Edit</span>
                          </label>
                          <label className="flex items-center gap-2 text-sm cursor-pointer">
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
                              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                            <span className={!perms.view ? 'text-gray-400' : 'text-gray-700'}>Delete</span>
                          </label>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Category Access - Only for Admin role */}
          {inviteForm.role === 'admin' && (
            <div className="border-t border-gray-200 pt-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Category Access</h2>
                <button
                  onClick={handleAddCategoryAccess}
                  className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Category Access
                </button>
              </div>
            <div className="space-y-4">
              {inviteForm.categoryAccess.map((catAccess, index) => (
                <div key={index} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-sm font-medium text-gray-700">Category Access {index + 1}</span>
                    <button
                      onClick={() => handleRemoveCategoryAccess(index)}
                      className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                      title="Remove"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Product Category</label>
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
                                    // Clear dependent selections
                                    updated[index].itemCategoryIds = [];
                                    updated[index].subCategoryIds = [];
                                    updated[index].itemIds = [];
                                  }
                                  setInviteForm({ ...inviteForm, categoryAccess: updated });
                                  loadItemCategories(updated[index].productCategoryIds);
                                }}
                                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">Item Category</label>
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
                                    // Clear dependent selections
                                    updated[index].subCategoryIds = [];
                                    updated[index].itemIds = [];
                                  }
                                  setInviteForm({ ...inviteForm, categoryAccess: updated });
                                  loadSubCategories(updated[index].itemCategoryIds);
                                }}
                                disabled={!catAccess.productCategoryIds?.length}
                                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">Sub Category</label>
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
                                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
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
                      <label className="block text-sm font-medium text-gray-700 mb-2">Item Name</label>
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
                                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">Permissions</label>
                    <div className="flex gap-4">
                      {['view', 'create', 'edit', 'delete'].map((perm) => {
                        // Admin role gets all permissions for category access
                        return (
                          <label key={perm} className="flex items-center gap-2 text-sm cursor-pointer">
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
                              className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500"
                            />
                            <span className="capitalize text-gray-700">{perm}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
              {inviteForm.categoryAccess.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-6 bg-gray-50 rounded-lg border border-gray-200">
                  No category access added. Click "Add Category Access" to add specific category permissions.
                </p>
              )}
            </div>
          </div>
          )}

          {/* Review Summary */}
          {(inviteForm.firstName || inviteForm.lastName || inviteForm.email || inviteForm.role) && (
            <div className="border-t border-gray-200 pt-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-blue-900 mb-2">Review Summary</h3>
                <p className="text-sm text-blue-800">
                  {inviteForm.firstName || inviteForm.lastName ? (
                    <>
                      <strong>{inviteForm.firstName} {inviteForm.lastName}</strong>
                      {inviteForm.email && <> ({inviteForm.email})</>}
                    </>
                  ) : (
                    inviteForm.email || 'User'
                  )}{' '}
                  will be invited as <strong>{inviteForm.role || 'selected role'}</strong>
                  {inviteForm.department && <> in <strong>{inviteForm.department}</strong> department</>}.
                  Module access and category permissions as configured above.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex justify-between items-center">
          <button
            onClick={() => navigate('/app/access-control')}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <div className="flex gap-3">
            <button
              onClick={resetForm}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Reset Form
            </button>
            <button
              onClick={handleInviteUser}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Sending...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Send Invitation
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InviteUserPage;

