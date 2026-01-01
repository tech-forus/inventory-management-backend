import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Edit, Package, Building2, Tag, Box, TrendingUp, MapPin, Calendar } from 'lucide-react';
import { skuService } from '../services/skuService';
import { formatNumber, formatDate } from '../utils/formatters';

interface SKUDetail {
  id: number;
  skuId: string;
  productCategoryId: number;
  productCategory: string;
  itemCategoryId: number;
  itemCategory: string;
  subCategoryId?: number;
  subCategory?: string;
  itemName: string;
  itemDetails?: string;
  vendorId: number;
  vendor: string;
  vendorItemCode?: string;
  brandId: number;
  brand: string;
  hsnSacCode?: string;
  ratingSize?: string;
  model?: string;
  series?: string;
  unit: string;
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
  currentStock: number;
  minStockLevel: number;
  defaultStorageLocation?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const SKUDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [sku, setSku] = useState<SKUDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadSKU();
    }
  }, [id]);

  const loadSKU = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await skuService.getById(id!);
      if (response.success && response.data) {
        setSku(response.data);
      } else {
        setError('SKU not found');
      }
    } catch (err: any) {
      console.error('Error loading SKU:', err);
      setError(err.response?.data?.error || 'Failed to load SKU details');
    } finally {
      setLoading(false);
    }
  };

  const getStockStatus = () => {
    if (!sku) return { label: 'Unknown', color: 'gray' };
    if (sku.currentStock === 0) {
      return { label: 'Out of Stock', color: 'red' };
    } else if (sku.currentStock <= sku.minStockLevel) {
      return { label: 'Low Stock', color: 'yellow' };
    } else {
      return { label: 'In Stock', color: 'green' };
    }
  };

  const stockStatus = getStockStatus();

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !sku) {
    return (
      <div className="p-8 space-y-6">
        <div className="bg-rose-50 border border-rose-200 rounded-[2rem] p-6">
          <p className="text-rose-800 font-medium">{error || 'SKU not found'}</p>
        </div>
        <button
          onClick={() => navigate('/app/sku')}
          className="px-6 py-3 bg-slate-600 text-white rounded-2xl hover:bg-slate-700 flex items-center gap-2 text-[13px] font-black uppercase tracking-wider transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to SKU Management
        </button>
      </div>
    );
  }

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
          <div>
              <h1 className="text-4xl font-black text-slate-900 tracking-tight">{sku.itemName}</h1>
              <p className="text-base text-slate-500 font-medium mt-1">SKU ID: <span className="font-mono text-indigo-600">{sku.skuId}</span></p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-5 py-2 rounded-full text-[13px] font-black uppercase tracking-wider border ${
            stockStatus.color === 'green' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
            stockStatus.color === 'yellow' ? 'bg-amber-50 text-amber-700 border-amber-100' :
            'bg-rose-50 text-rose-700 border-rose-100'
          }`}>
            {stockStatus.label}
          </span>
          <button
            onClick={() => navigate(`/app/sku/${id}/edit`)}
            className="px-6 py-3 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 flex items-center gap-2 text-[13px] font-black uppercase tracking-wider transition-all shadow-sm"
          >
            <Edit className="w-4 h-4" />
            Edit SKU
          </button>
        </div>
      </div>

      {/* Stock Overview Card */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Current Stock</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatNumber(sku.currentStock)}</p>
              <p className="text-xs text-gray-500 mt-1">{sku.unit}</p>
            </div>
            <Package className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Minimum Stock Level</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{formatNumber(sku.minStockLevel)}</p>
              <p className="text-xs text-gray-500 mt-1">{sku.unit}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-orange-500" />
          </div>
        </div>
        {sku.defaultStorageLocation && (
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Storage Location</p>
                <p className="text-lg font-semibold text-gray-900 mt-1 truncate">{sku.defaultStorageLocation}</p>
              </div>
              <MapPin className="w-8 h-8 text-green-500" />
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Basic Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
            Basic Information
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">SKU ID</label>
                <p className="text-base text-gray-900 mt-1 font-mono">{sku.skuId}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Item Name</label>
                <p className="text-base text-gray-900 mt-1">{sku.itemName}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Product Category</label>
                <p className="text-base text-gray-900 mt-1">{sku.productCategory || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Item Category</label>
                <p className="text-base text-gray-900 mt-1">{sku.itemCategory || '-'}</p>
              </div>
            </div>
            {sku.subCategory && (
              <div>
                <label className="text-sm font-medium text-gray-500">Sub Category</label>
                <p className="text-base text-gray-900 mt-1">{sku.subCategory}</p>
              </div>
            )}
            {sku.itemDetails && (
              <div>
                <label className="text-sm font-medium text-gray-500">Item Details</label>
                <p className="text-base text-gray-700 mt-1 whitespace-pre-wrap">{sku.itemDetails}</p>
              </div>
            )}
          </div>
        </div>

        {/* Vendor & Brand Information */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            Vendor & Brand Information
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Vendor</label>
                <p className="text-base text-gray-900 mt-1">{sku.vendor || '-'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Brand</label>
                <p className="text-base text-gray-900 mt-1">{sku.brand || '-'}</p>
              </div>
            </div>
            {sku.vendorItemCode && (
              <div>
                <label className="text-sm font-medium text-gray-500">Vendor Item Code</label>
                <p className="text-base text-gray-900 mt-1">{sku.vendorItemCode}</p>
              </div>
            )}
            {sku.hsnSacCode && (
              <div>
                <label className="text-sm font-medium text-gray-500">HSN/SAC Code</label>
                <p className="text-base text-gray-900 mt-1 font-mono">{sku.hsnSacCode}</p>
              </div>
            )}
          </div>
        </div>

        {/* Left Column: Product Specifications & Additional Information */}
        <div className="flex flex-col gap-4 h-full">
          {/* Product Specifications */}
          <div className="bg-white rounded-lg shadow p-6 flex-1">
            <h2 className="text-xl font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Tag className="w-5 h-5 text-blue-600" />
              Product Specifications
            </h2>
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-4">
                {sku.ratingSize && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Rating/Size</label>
                    <p className="text-base text-gray-900 mt-1">{sku.ratingSize}</p>
                  </div>
                )}
                {sku.model && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Model Number</label>
                    <p className="text-base text-gray-900 mt-1">{sku.model}</p>
                  </div>
                )}
              </div>
              {sku.series && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Series</label>
                  <p className="text-base text-gray-900 mt-1">{sku.series}</p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-gray-500">Unit</label>
                <p className="text-base text-gray-900 mt-1">{sku.unit}</p>
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div className="bg-white rounded-lg shadow p-6 flex-1">
            <h2 className="text-xl font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              Additional Information
            </h2>
            <div className="space-y-2">
              <div>
                <label className="text-sm font-medium text-gray-500">Status</label>
                <p className="text-base text-gray-900 mt-1">
                  <span className={`px-2 py-1 rounded text-sm ${
                    sku.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {sku.isActive ? 'Active' : 'Inactive'}
                  </span>
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Created At</label>
                  <p className="text-base text-gray-900 mt-1">{formatDate(sku.createdAt)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Last Updated</label>
                  <p className="text-base text-gray-900 mt-1">{formatDate(sku.updatedAt)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Optional Specifications */}
        {(sku.material || sku.insulation || sku.inputSupply || sku.color || sku.cri || sku.cct || 
          sku.beamAngle || sku.ledType || sku.shape || sku.weight || sku.length || sku.width || sku.height) && (
          <div className="bg-white rounded-lg shadow p-6 h-full">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Box className="w-5 h-5 text-blue-600" />
              Optional Specifications
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {sku.material && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Material</label>
                    <p className="text-base text-gray-900 mt-1">{sku.material}</p>
                  </div>
                )}
                {sku.insulation && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Insulation</label>
                    <p className="text-base text-gray-900 mt-1">{sku.insulation}</p>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                {sku.inputSupply && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Input Supply</label>
                    <p className="text-base text-gray-900 mt-1">{sku.inputSupply}</p>
                  </div>
                )}
                {sku.color && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Color</label>
                    <p className="text-base text-gray-900 mt-1">{sku.color}</p>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-3 gap-4">
                {sku.cri && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">CRI</label>
                    <p className="text-base text-gray-900 mt-1">{sku.cri}</p>
                  </div>
                )}
                {sku.cct && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">CCT</label>
                    <p className="text-base text-gray-900 mt-1">{sku.cct}</p>
                  </div>
                )}
                {sku.beamAngle && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Beam Angle</label>
                    <p className="text-base text-gray-900 mt-1">{sku.beamAngle}</p>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                {sku.ledType && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">LED Type</label>
                    <p className="text-base text-gray-900 mt-1">{sku.ledType}</p>
                  </div>
                )}
                {sku.shape && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Shape</label>
                    <p className="text-base text-gray-900 mt-1">{sku.shape}</p>
                  </div>
                )}
              </div>
              {(sku.weight || sku.length || sku.width || sku.height) && (
                <div className="border-t pt-4 mt-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Dimensions & Weight</h3>
                  <div className="grid grid-cols-2 gap-4">
                    {sku.weight && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Weight</label>
                        <p className="text-base text-gray-900 mt-1">{sku.weight} kg</p>
                      </div>
                    )}
                    {sku.length && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Length</label>
                        <p className="text-base text-gray-900 mt-1">{sku.length} cm</p>
                      </div>
                    )}
                    {sku.width && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Width</label>
                        <p className="text-base text-gray-900 mt-1">{sku.width} cm</p>
                      </div>
                    )}
                    {sku.height && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Height</label>
                        <p className="text-base text-gray-900 mt-1">{sku.height} cm</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SKUDetailPage;


