/**
 * Data Transformers
 * Transform database snake_case to camelCase and vice versa
 */

/**
 * Transform vendor from snake_case to camelCase
 */
const transformVendor = (vendor) => {
  if (!vendor) return null;
  
  // Extract IDs from JSON arrays or regular arrays
  // PostgreSQL jsonb/json_agg returns arrays directly when using pg library
  const extractIds = (ids) => {
    if (ids === null || ids === undefined) return [];
    
    // PostgreSQL jsonb returns arrays directly
    if (Array.isArray(ids)) {
      return ids.map(id => {
        if (typeof id === 'number') return id;
        if (typeof id === 'string') {
          const numId = parseInt(id);
          return isNaN(numId) ? null : numId;
        }
        return null;
      }).filter(id => id !== null && !isNaN(id));
    }
    
    // Handle JSON string (fallback)
    if (typeof ids === 'string') {
      // Empty array string
      if (ids === '[]' || ids.trim() === '') return [];
      try {
        const parsed = JSON.parse(ids);
        if (Array.isArray(parsed)) {
          return parsed.map(id => {
            if (typeof id === 'number') return id;
            if (typeof id === 'string') {
              const numId = parseInt(id);
              return isNaN(numId) ? null : numId;
            }
            return null;
          }).filter(id => id !== null && !isNaN(id));
        }
      } catch (e) {
        // Not JSON
      }
    }
    
    // Handle single number (shouldn't happen but handle it)
    if (typeof ids === 'number') {
      return [ids];
    }
    
    return [];
  };
  
  return {
    id: vendor.id,
    name: vendor.name,
    contactPerson: vendor.contact_person,
    department: vendor.department,
    designation: vendor.designation,
    phone: vendor.phone,
    whatsappNumber: vendor.whatsapp_number,
    email: vendor.email,
    gstNumber: vendor.gst_number,
    address: vendor.address,
    city: vendor.city,
    state: vendor.state,
    pin: vendor.pin,
    isActive: vendor.is_active,
    productCategoryIds: extractIds(vendor.product_category_ids),
    itemCategoryIds: extractIds(vendor.item_category_ids),
    subCategoryIds: extractIds(vendor.sub_category_ids),
    brandIds: extractIds(vendor.brand_ids),
    createdAt: vendor.created_at,
    updatedAt: vendor.updated_at,
  };
};

/**
 * Transform brand from snake_case to camelCase
 */
const transformBrand = (brand) => {
  if (!brand) return null;
  return {
    id: brand.id,
    name: brand.name,
    description: brand.description,
    isActive: brand.is_active,
    createdAt: brand.created_at,
    updatedAt: brand.updated_at,
  };
};

/**
 * Transform category from snake_case to camelCase
 */
const transformCategory = (category) => {
  if (!category) return null;
  return {
    id: category.id,
    name: category.name,
    description: category.description,
    productCategoryId: category.product_category_id,
    itemCategoryId: category.item_category_id,
    hsnCode: category.hsn_code,
    gstRate: category.gst_rate,
    isActive: category.is_active,
    createdAt: category.created_at,
    updatedAt: category.updated_at,
  };
};

/**
 * Transform team from snake_case to camelCase
 */
const transformTeam = (team) => {
  if (!team) return null;
  return {
    id: team.id,
    name: team.name,
    contactNumber: team.contact_number,
    emailId: team.email_id,
    department: team.department,
    designation: team.designation,
    isActive: team.is_active,
    createdAt: team.created_at,
    updatedAt: team.updated_at,
  };
};

/**
 * Transform customer from snake_case to camelCase
 */
const transformCustomer = (customer) => {
  if (!customer) return null;
  return {
    id: customer.id,
    companyId: customer.company_id,
    customerName: customer.customer_name,
    name: customer.customer_name, // Alias for compatibility
    contactPerson: customer.contact_person,
    email: customer.email,
    emailId: customer.email, // Alias for compatibility
    phone: customer.phone,
    whatsappNumber: customer.whatsapp_number,
    addressLine1: customer.address_line1,
    addressLine2: customer.address_line2,
    address: customer.address_line1, // Alias for compatibility
    personalAddress: customer.personal_address,
    dateOfBirth: customer.date_of_birth,
    city: customer.city,
    state: customer.state,
    country: customer.country,
    postalCode: customer.postal_code,
    pin: customer.postal_code, // Alias for compatibility
    companyName: customer.company_name,
    gstNumber: customer.gst_number,
    taxId: customer.tax_id,
    creditLimit: customer.credit_limit,
    outstandingBalance: customer.outstanding_balance,
    isActive: customer.is_active,
    notes: customer.notes,
    createdAt: customer.created_at,
    updatedAt: customer.updated_at,
    createdBy: customer.created_by,
    updatedBy: customer.updated_by,
  };
};

/**
 * Transform transportor from snake_case to camelCase
 */
const transformTransportor = (transportor) => {
  if (!transportor) return null;
  return {
    id: transportor.id,
    companyId: transportor.company_id,
    name: transportor.transporter_name,
    transporterName: transportor.transporter_name,
    contactPerson: transportor.contact_person_name,
    contactPersonName: transportor.contact_person_name,
    contactNumber: transportor.contact_number,
    whatsappNumber: transportor.whatsapp_number,
    email: transportor.email_id,
    emailId: transportor.email_id,
    gstNumber: transportor.gst_number,
    subVendor: transportor.sub_vendor,
    isActive: transportor.is_active,
    remarks: transportor.remarks,
    createdAt: transportor.created_at,
    updatedAt: transportor.updated_at,
  };
};

/**
 * Transform SKU from snake_case to camelCase
 */
const transformSKU = (sku) => {
  if (!sku) return null;
  
  // Parse custom_fields if it exists - return empty array instead of null for consistency
  let customFields = null;
  if (sku.custom_fields) {
    try {
      const parsed = typeof sku.custom_fields === 'string' 
        ? JSON.parse(sku.custom_fields) 
        : sku.custom_fields;
      
      // Ensure it's an array format
      if (Array.isArray(parsed)) {
        customFields = parsed;
      } else if (parsed && typeof parsed === 'object') {
        // Convert object format to array format
        customFields = Object.entries(parsed).map(([key, value]) => ({
          key: String(key || ''),
          value: String(value || '')
        }));
      } else {
        customFields = null;
      }
    } catch (e) {
      console.error('Error parsing custom_fields:', e);
      customFields = null;
    }
  }
  
  return {
    id: sku.id,
    skuId: sku.sku_id,
    productCategoryId: sku.product_category_id,
    productCategory: sku.product_category,
    itemCategoryId: sku.item_category_id,
    itemCategory: sku.item_category,
    subCategoryId: sku.sub_category_id,
    subCategory: sku.sub_category,
    itemName: sku.item_name,
    itemDetails: sku.item_details,
    vendorId: sku.vendor_id,
    vendor: sku.vendor,
    vendorItemCode: sku.vendor_item_code,
    brandId: sku.brand_id,
    brand: sku.brand,
    hsnSacCode: sku.hsn_sac_code,
    gstRate: sku.gst_rate,
    ratingSize: sku.rating_size,
    model: sku.model,
    series: sku.series,
    unit: sku.unit,
    material: sku.material,
    manufactureOrImport: sku.manufacture_or_import,
    color: sku.color,
    weight: sku.weight,
    weightUnit: sku.weight_unit,
    length: sku.length,
    lengthUnit: sku.length_unit,
    width: sku.width,
    widthUnit: sku.width_unit,
    height: sku.height,
    heightUnit: sku.height_unit,
    customFields,
    currentStock: sku.current_stock,
    minStockLevel: sku.min_stock_level,
    reorderPoint: sku.reorder_point,
    defaultStorageLocation: sku.default_storage_location,
    isActive: sku.is_active,
    createdAt: sku.created_at,
    updatedAt: sku.updated_at,
  };
};

/**
 * Transform warehouse from snake_case to camelCase
 */
const transformWarehouse = (warehouse) => {
  if (!warehouse) return null;
  return {
    id: warehouse.id,
    warehouseName: warehouse.warehouse_name,
    warehouseCode: warehouse.warehouse_code,
    address: warehouse.address,
    city: warehouse.city,
    state: warehouse.state,
    pincode: warehouse.pincode,
    isDefault: warehouse.is_default,
    status: warehouse.status,
    createdAt: warehouse.created_at,
    updatedAt: warehouse.updated_at,
  };
};

/**
 * Transform material from snake_case to camelCase
 */
const transformMaterial = (material) => {
  if (!material) return null;
  return {
    id: material.id,
    name: material.name,
    isActive: material.is_active,
    createdAt: material.created_at,
    updatedAt: material.updated_at,
  };
};

/**
 * Transform colour from snake_case to camelCase
 */
const transformColour = (colour) => {
  if (!colour) return null;
  return {
    id: colour.id,
    name: colour.name,
    hexCode: colour.hex_code,
    isActive: colour.is_active,
    createdAt: colour.created_at,
    updatedAt: colour.updated_at,
  };
};

/**
 * Transform array of items
 */
const transformArray = (items, transformer) => {
  if (!Array.isArray(items)) return [];
  return items.map(transformer);
};

module.exports = {
  transformVendor,
  transformBrand,
  transformCategory,
  transformTeam,
  transformCustomer,
  transformTransportor,
  transformSKU,
  transformWarehouse,
  transformMaterial,
  transformColour,
  transformArray,
};


