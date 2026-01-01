import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { skuService } from '../services/skuService';
import { libraryService } from '../services/libraryService';
import { onCategoriesUpdated } from '../utils/categoriesEvents';
import { onInventoryUpdated } from '../utils/inventoryEvents';
import SKUManagementView from '../components/sku/SKUManagementView';

interface SKU {
  id: number;
  skuId: string;
  productCategory: string;
  itemCategory: string;
  subCategory?: string;
  itemName: string;
  brand: string;
  vendor: string;
  model?: string;
  hsnSacCode?: string;
  ratingSize?: string;
  series?: string;
  unit?: string;
  currentStock: number;
  minStock: number;
  minStockLevel?: number;
  totalStocks?: number;
  bookStocks?: number;
  shortStocks?: number;
  usefulStocks?: number;
  // Optional specifications
  material?: string;
  insulation?: string;
  inputSupply?: string;
  color?: string;
  cri?: string;
  cct?: string;
  beamAngle?: string;
  ledType?: string;
  shape?: string;
  weight?: number;
  length?: number;
  width?: number;
  height?: number;
  defaultStorageLocation?: string;
  itemDetails?: string;
  vendorItemCode?: string;
  gstRate?: number;
}

const SKUManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [skus, setSkus] = useState<SKU[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);

  // Filters
  const [search, setSearch] = useState('');
  const [productCategory, setProductCategory] = useState('');
  const [itemCategory, setItemCategory] = useState('');
  const [subCategory, setSubCategory] = useState('');
  const [brand, setBrand] = useState('');
  const [stockStatus, setStockStatus] = useState('all');

  // Sorting
  const [sortBy, setSortBy] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Dropdown data
  const [productCategories, setProductCategories] = useState<any[]>([]);
  const [itemCategories, setItemCategories] = useState<any[]>([]);
  const [subCategories, setSubCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);

  useEffect(() => {
    loadInitialData();

    // Check for URL parameters and apply filters
    const urlStockStatus = searchParams.get('stockStatus');
    if (urlStockStatus) {
      setStockStatus(urlStockStatus);
    }
  }, []);

  useEffect(() => {
    return onCategoriesUpdated(() => {
      loadInitialData();
      if (productCategory) loadItemCategories(parseInt(productCategory));
      if (itemCategory) loadSubCategories(parseInt(itemCategory));
    });
  }, [productCategory, itemCategory]);

  useEffect(() => {
    return onInventoryUpdated(() => {
      loadSKUs();
    });
  }, []);

  useEffect(() => {
    loadSKUs();
  }, [currentPage, search, productCategory, itemCategory, subCategory, brand, stockStatus, sortBy, sortOrder]);

  useEffect(() => {
    if (productCategory) {
      loadItemCategories(parseInt(productCategory));
    } else {
      setItemCategories([]);
      setItemCategory('');
      setSubCategory('');
      setSubCategories([]);
    }
  }, [productCategory]);

  useEffect(() => {
    if (itemCategory) {
      loadSubCategories(parseInt(itemCategory));
    } else {
      setSubCategories([]);
      setSubCategory('');
    }
  }, [itemCategory]);

  const loadInitialData = async () => {
    try {
      const [productCats, brandsData] = await Promise.all([
        libraryService.getYourProductCategories(),
        libraryService.getBrands(),
      ]);
      setProductCategories(productCats.data || []);
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

  const loadSKUs = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: currentPage,
        limit: pageSize,
      };
      if (search) params.search = search;
      if (productCategory) params.productCategory = productCategory;
      if (itemCategory) params.itemCategory = itemCategory;
      if (subCategory) params.subCategory = subCategory;
      if (brand) params.brand = brand;
      if (stockStatus !== 'all') {
        // Map frontend values to backend expected values
        const statusMap: { [key: string]: string } = {
          'out_of_stock': 'out',
          'low_stock': 'low',
          'in_stock': 'in'
        };
        params.stockStatus = statusMap[stockStatus] || stockStatus;
        console.log('[SKU Filter] Frontend status:', stockStatus, '→ Backend status:', params.stockStatus);
      }

      // Handle sorting
      if (sortBy) {
        params.sortBy = sortBy;
        params.sortOrder = sortOrder;
      }

      const response = await skuService.getAll(params);
      let skuData = response.data || [];
      
      // Log filter results for debugging
      if (stockStatus !== 'all' && skuData.length > 0) {
        const statusCounts = skuData.reduce((acc: any, sku: SKU) => {
          const currentStock = sku.currentStock ?? 0;
          const minStockLevel = sku.minStockLevel ?? sku.minStock ?? 0;
          let status = 'In Stock';
          if (currentStock === 0) status = 'Out of Stock';
          else if (currentStock <= minStockLevel) status = 'Low Stock';
          acc[status] = (acc[status] || 0) + 1;
          return acc;
        }, {});
        console.log('[SKU Filter] Results:', statusCounts, 'Total items:', skuData.length);
      }

      // Client-side sorting as fallback if backend doesn't support it
      if (sortBy && skuData.length > 0) {
        skuData = [...skuData].sort((a, b) => {
          let aValue: any;
          let bValue: any;
          
          switch (sortBy) {
            case 'skuId':
              aValue = a.skuId?.toLowerCase() || '';
              bValue = b.skuId?.toLowerCase() || '';
              break;
            case 'itemName':
              aValue = a.itemName?.toLowerCase() || '';
              bValue = b.itemName?.toLowerCase() || '';
              break;
            case 'brand':
              aValue = a.brand?.toLowerCase() || '';
              bValue = b.brand?.toLowerCase() || '';
              break;
            case 'totalStocks':
              aValue = a.totalStocks ?? a.currentStock ?? 0;
              bValue = b.totalStocks ?? b.currentStock ?? 0;
              break;
            case 'bookStocks':
              aValue = a.bookStocks ?? 0;
              bValue = b.bookStocks ?? 0;
              break;
            case 'shortStocks':
              aValue = a.shortStocks ?? 0;
              bValue = b.shortStocks ?? 0;
              break;
            case 'usefulStocks':
              const aTotal = a.totalStocks ?? a.currentStock ?? 0;
              const aBook = a.bookStocks ?? 0;
              const bTotal = b.totalStocks ?? b.currentStock ?? 0;
              const bBook = b.bookStocks ?? 0;
              aValue = a.usefulStocks ?? (aTotal - aBook);
              bValue = b.usefulStocks ?? (bTotal - bBook);
              break;
            default:
              return 0;
          }
          
          if (typeof aValue === 'string' && typeof bValue === 'string') {
            return sortOrder === 'asc' 
              ? aValue.localeCompare(bValue)
              : bValue.localeCompare(aValue);
          } else {
            return sortOrder === 'asc' 
              ? (aValue as number) - (bValue as number)
              : (bValue as number) - (aValue as number);
          }
        });
      }
      
      setSkus(skuData);
      setTotalCount(response.total || 0);
    } catch (error) {
      console.error('Error loading SKUs:', error);
      setSkus([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      // Toggle sort order if same field
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new sort field with ascending order
      setSortBy(field);
      setSortOrder('asc');
    }
    // Reset to first page when sorting changes
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setSearch('');
    setProductCategory('');
    setItemCategory('');
    setSubCategory('');
    setBrand('');
    setStockStatus('all');
    setCurrentPage(1);
  };

  const handleSKUClick = (skuId: string) => {
    navigate(`/app/sku/${skuId}`);
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <SKUManagementView
      search={search}
      onSearchChange={setSearch}
      productCategory={productCategory}
      onProductCategoryChange={setProductCategory}
      itemCategory={itemCategory}
      onItemCategoryChange={setItemCategory}
      subCategory={subCategory}
      onSubCategoryChange={setSubCategory}
      brand={brand}
      onBrandChange={setBrand}
      stockStatus={stockStatus}
      onStockStatusChange={setStockStatus}
      onResetFilters={handleResetFilters}
      productCategories={productCategories}
      itemCategories={itemCategories}
      subCategories={subCategories}
      brands={brands}
      skus={skus}
      loading={loading}
      onSKUClick={handleSKUClick}
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSort={handleSort}
      currentPage={currentPage}
      totalPages={totalPages}
      totalCount={totalCount}
      pageSize={pageSize}
      onPageChange={setCurrentPage}
    />
  );
};

export default SKUManagementPage;

