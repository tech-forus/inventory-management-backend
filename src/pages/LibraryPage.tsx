import React, { useState } from 'react';
import { Package, Users, Building2, UserCheck, Users2, Box, Truck } from 'lucide-react';
import { libraryService } from '../services/libraryService';
import VendorsTab from '../components/library/VendorsTab';
import BrandsTab from '../components/library/BrandsTab';
import CategoryMasterTab from '../components/library/CategoryMasterTab';
import TeamsTab from '../components/library/TeamsTab';
import CustomersTab from '../components/library/CustomersTab';
import ProductsTab from '../components/library/ProductsTab';
import TransportorTab from '../components/library/TransportorTab';
import { skuService } from '../services/skuService';

interface Vendor {
  id: number;
  name: string;
  contactPerson?: string;
  designation?: string;
  phone?: string;
  email?: string;
  gstNumber?: string;
  address?: string;
  city?: string;
  state?: string;
  pin?: string;
  isActive: boolean;
}

interface Brand {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt?: string;
}

interface ProductCategory {
  id: number;
  name: string;
  description?: string;
  itemCount?: number;
  createdAt?: string;
}

interface ItemCategory {
  id: number;
  name: string;
  productCategoryId: number;
  productCategoryName?: string;
  subCategoryCount?: number;
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

interface Team {
  id: number;
  name: string;
  contactNumber: string;
  emailId: string;
  department: string;
  designation: string;
  isActive?: boolean;
}

interface Customer {
  id: number;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  gstNumber?: string;
  address?: string;
  city?: string;
  state?: string;
  pin?: string;
  isActive: boolean;
}

interface Product {
  id: number;
  skuId: string;
  itemName: string;
  productCategory?: string;
  itemCategory?: string;
  subCategory?: string;
  brand?: string;
  vendor?: string;
  model?: string;
  hsnSacCode?: string;
  currentStock: number;
  minStock: number;
  ratingSize?: string;
  series?: string;
  unit?: string;
}

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

type LibrarySection = 'category-master' | 'products' | 'brands' | 'vendors' | 'customers' | 'teams' | 'transportors';

const LibraryPage: React.FC = () => {
  const [selectedSection, setSelectedSection] = useState<LibrarySection>('category-master');
  const [loadingStates, setLoadingStates] = useState<Record<LibrarySection, boolean>>({
    'category-master': false,
    'products': false,
    'brands': false,
    'vendors': false,
    'customers': false,
    'teams': false,
    'transportors': false,
  });

  // Data states
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [productCategories, setProductCategories] = useState<ProductCategory[]>([]);
  const [itemCategories, setItemCategories] = useState<ItemCategory[]>([]);
  const [subCategories, setSubCategories] = useState<SubCategory[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [transportors, setTransportors] = useState<Transportor[]>([]);

  const handleSectionSelect = (section: LibrarySection) => {
    setSelectedSection(section);
    // Load data when selecting
    loadData(section);
  };

  const loadData = async (section: LibrarySection, forceRefresh: boolean = false) => {
    // Skip if already loading
    if (loadingStates[section] && !forceRefresh) return;
    
    // Check if data is already loaded (only if not forcing refresh)
    if (!forceRefresh) {
      if (
        (section === 'vendors' && vendors.length > 0) ||
        (section === 'brands' && brands.length > 0) ||
        (section === 'category-master' && productCategories.length > 0) ||
        (section === 'teams' && teams.length > 0) ||
        (section === 'customers' && customers.length > 0) ||
        (section === 'products' && products.length > 0) ||
        (section === 'transportors' && transportors.length > 0)
      ) {
        return;
      }
    }

    try {
      setLoadingStates(prev => ({ ...prev, [section]: true }));
      
      switch (section) {
        case 'vendors':
          const vendorsRes = await libraryService.getYourVendors();
          setVendors(vendorsRes.data || []);
          break;
        case 'brands':
          const brandsRes = await libraryService.getYourBrands();
          setBrands(brandsRes.data || []);
          break;
        case 'category-master':
          // Load all category types when Category Master is selected
          const [productCatsRes, itemCatsRes, subCatsRes] = await Promise.all([
            libraryService.getYourProductCategories(),
            libraryService.getYourItemCategories(),
            libraryService.getYourSubCategories(),
          ]);
          setProductCategories(productCatsRes.data || []);
          setItemCategories(itemCatsRes.data || []);
          setSubCategories(subCatsRes.data || []);
          break;
        case 'teams':
          const teamsRes = await libraryService.getTeams();
          setTeams(teamsRes.data || []);
          break;
        case 'customers':
          const customersRes = await libraryService.getCustomers();
          setCustomers(customersRes.data || []);
          break;
        case 'products':
          const productsRes = await skuService.getAll({ limit: 10000 });
          setProducts(productsRes.data || []);
          break;
        case 'transportors':
          const transportorsRes = await libraryService.getTransportors();
          setTransportors(transportorsRes.data || []);
          break;
      }
    } catch (error) {
      console.error(`Error loading ${section}:`, error);
    } finally {
      setLoadingStates(prev => ({ ...prev, [section]: false }));
    }
  };

  const handleRefresh = async (section: LibrarySection) => {
    // Clear data first
    switch (section) {
      case 'vendors':
        setVendors([]);
        break;
      case 'brands':
        setBrands([]);
        break;
      case 'category-master':
        setProductCategories([]);
        setItemCategories([]);
        setSubCategories([]);
        break;
      case 'teams':
        setTeams([]);
        break;
      case 'customers':
        setCustomers([]);
        break;
      case 'products':
        setProducts([]);
        break;
      case 'transportors':
        setTransportors([]);
        break;
    }
    // Force reload by passing forceRefresh flag
    await loadData(section, true);
  };

  // Load initial data for selected section
  React.useEffect(() => {
    loadData(selectedSection);
  }, [selectedSection]);

  const librarySections: { key: LibrarySection; label: string; description: string; icon: React.ReactNode }[] = [
    { key: 'category-master', label: 'Category Master', description: 'Product hierarchy', icon: <Box className="w-[18px] h-[18px]" /> },
    { key: 'products', label: 'Products', description: 'SKU catalog', icon: <Package className="w-[18px] h-[18px]" /> },
    { key: 'brands', label: 'Brands', description: 'Brand directory', icon: <Building2 className="w-[18px] h-[18px]" /> },
    { key: 'vendors', label: 'Vendors', description: 'Supplier network', icon: <Users className="w-[18px] h-[18px]" /> },
    { key: 'customers', label: 'Customers', description: 'Client database', icon: <UserCheck className="w-[18px] h-[18px]" /> },
    { key: 'transportors', label: 'Transporter Details', description: 'Transportation partners', icon: <Truck className="w-[18px] h-[18px]" /> },
    { key: 'teams', label: 'Teams', description: 'User groups', icon: <Users2 className="w-[18px] h-[18px]" /> },
  ];

  const getSectionTitle = () => {
    const section = librarySections.find(s => s.key === selectedSection);
    return section?.label || 'Library';
  };

  const getSectionDescription = () => {
    switch (selectedSection) {
      case 'category-master':
        return 'Manage product → item → sub-category hierarchy';
      case 'products':
        return 'View and manage your product catalog';
      case 'brands':
        return 'Manage brand information';
      case 'vendors':
        return 'Manage vendor and supplier information';
      case 'customers':
        return 'Manage customer information';
      case 'teams':
        return 'Manage team members and departments';
      case 'transportors':
        return 'Manage transporter and logistics information';
      default:
        return '';
    }
  };

  return (
    <div className="p-[28.8px] space-y-9 w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-[21.6px]">
        <div className="space-y-[7.2px]">
          <h1 className="text-[32.4px] font-black text-slate-900 tracking-tight">Library</h1>
          <p className="text-[16.2px] text-slate-500 font-medium">Master data management for vendors, brands, categories, and more.</p>
        </div>
      </div>

        {/* 2-Column Layout */}
        <div className="grid grid-cols-12 gap-[21.6px]">
          {/* Left: Master Navigator */}
          <div className="col-span-12 lg:col-span-3">
          <div className="bg-white rounded-[2.25rem] border border-slate-100 shadow-sm p-[21.6px]">
            <h2 className="text-[11.7px] font-black text-slate-400 uppercase tracking-[0.2em] mb-[14.4px]">Master Data</h2>
            <nav className="space-y-[7.2px]">
                {librarySections.map((section) => {
                  const isSelected = selectedSection === section.key;
                  const isLoading = loadingStates[section.key];
                  
                  return (
                    <button
                      key={section.key}
                      onClick={() => handleSectionSelect(section.key)}
                    className={`w-full flex items-center gap-[10.8px] px-[14.4px] py-[10.8px] rounded-[14.4px] text-left transition-all ${
                        isSelected
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                        : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                    <span className={isSelected ? 'text-white' : 'text-slate-400'}>
                        {section.icon}
                      </span>
                      <div className="flex-1 min-w-0">
                      <div className={`text-[12.6px] font-black ${isSelected ? 'text-white' : 'text-slate-900'}`}>{section.label}</div>
                      <div className={`text-[10.8px] ${isSelected ? 'text-indigo-100' : 'text-slate-500'} font-medium`}>
                          {section.description}
                        </div>
                      </div>
                      {isLoading && (
                      <div className={`w-[14.4px] h-[14.4px] border-2 ${isSelected ? 'border-white' : 'border-indigo-600'} border-t-transparent rounded-full animate-spin`}></div>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Right: Contextual Workspace */}
          <div className="col-span-12 lg:col-span-9">
          <div className="bg-white rounded-[2.25rem] border border-slate-100 shadow-lg">
              {/* Clean Header */}
            <div className="border-b border-slate-100 px-9 py-[21.6px]">
              <h2 className="text-[21.6px] font-black text-slate-900 tracking-tight">{getSectionTitle()}</h2>
              <p className="text-[14.4px] text-slate-500 font-medium mt-[7.2px]">{getSectionDescription()}</p>
              </div>

              {/* Workspace Content */}
              <div className="p-9">
                {selectedSection === 'category-master' && (
                  <CategoryMasterTab
                    productCategories={productCategories}
                    itemCategories={itemCategories}
                    subCategories={subCategories}
                    loading={loadingStates['category-master']}
                    onRefresh={() => handleRefresh('category-master')}
                  />
                )}
                {selectedSection === 'vendors' && (
                  <VendorsTab
                    vendors={vendors}
                    loading={loadingStates['vendors']}
                    onRefresh={() => handleRefresh('vendors')}
                  />
                )}
                {selectedSection === 'brands' && (
                  <BrandsTab
                    brands={brands}
                    loading={loadingStates['brands']}
                    onRefresh={() => handleRefresh('brands')}
                  />
                )}
                {selectedSection === 'teams' && (
                  <TeamsTab
                    teams={teams}
                    loading={loadingStates['teams']}
                    onRefresh={() => handleRefresh('teams')}
                  />
                )}
                {selectedSection === 'customers' && (
                  <CustomersTab
                    customers={customers}
                    loading={loadingStates['customers']}
                    onRefresh={() => handleRefresh('customers')}
                  />
                )}
                {selectedSection === 'products' && (
                  <ProductsTab
                    products={products}
                    loading={loadingStates['products']}
                    onRefresh={() => handleRefresh('products')}
                  />
                )}
                {selectedSection === 'transportors' && (
                  <TransportorTab
                    transportors={transportors}
                    loading={loadingStates['transportors']}
                    onRefresh={() => handleRefresh('transportors')}
                  />
                )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LibraryPage;
