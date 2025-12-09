/**
 * Data Transformers
 * Transform database snake_case to camelCase and vice versa
 */

/**
 * Transform vendor from snake_case to camelCase
 */
const transformVendor = (vendor) => {
  if (!vendor) return null;
  return {
    id: vendor.id,
    name: vendor.name,
    contactPerson: vendor.contact_person,
    designation: vendor.designation,
    phone: vendor.phone,
    email: vendor.email,
    gstNumber: vendor.gst_number,
    address: vendor.address,
    city: vendor.city,
    state: vendor.state,
    pin: vendor.pin,
    isActive: vendor.is_active,
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
    companyName: customer.company_name,
    customerName: customer.customer_name,
    name: customer.customer_name, // Alias for compatibility
    phone: customer.phone,
    emailId: customer.email_id,
    email: customer.email_id, // Alias for compatibility
    gstNumber: customer.gst_number,
    address: customer.address,
    city: customer.city,
    state: customer.state,
    pin: customer.pin,
    isActive: customer.is_active,
    createdAt: customer.created_at,
    updatedAt: customer.updated_at,
  };
};

/**
 * Transform SKU from snake_case to camelCase
 */
const transformSKU = (sku) => {
  if (!sku) return null;
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
    ratingSize: sku.rating_size,
    model: sku.model,
    series: sku.series,
    unit: sku.unit,
    material: sku.material,
    insulation: sku.insulation,
    inputSupply: sku.input_supply,
    color: sku.color,
    cri: sku.cri,
    cct: sku.cct,
    beamAngle: sku.beam_angle,
    ledType: sku.led_type,
    shape: sku.shape,
    weight: sku.weight,
    length: sku.length,
    width: sku.width,
    height: sku.height,
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
  transformSKU,
  transformArray,
};


