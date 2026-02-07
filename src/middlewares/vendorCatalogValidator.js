const VendorModel = require('../models/vendorModel');

/**
 * Vendor Catalog Validator
 * Validates that SKUs belong to vendor's allowed catalog (categories + brands)
 */

/**
 * Validate that SKU belongs to vendor's allowed catalog
 * @param {number} vendorId - Vendor ID
 * @param {number} skuId - SKU ID
 * @param {string} companyId - Company ID
 * @param {object} sku - SKU object (if already fetched)
 * @returns {Promise<boolean>} - Returns true if valid, throws error if invalid
 */
const validateVendorCatalog = async (vendorId, skuId, companyId, sku = null) => {
    // Fetch vendor with catalog
    const vendor = await VendorModel.getById(vendorId, companyId);
    if (!vendor) {
        throw new Error('Vendor not found');
    }

    // SKU is passed in if already fetched (to avoid redundant DB calls)
    // Otherwise we'd need to fetch it, but for incoming inventory we already have SKU data
    // So we'll validate using the SKU object passed in the request
    if (!sku) {
        throw new Error('SKU data is required for validation');
    }

    const extractIds = (ids) => ids && Array.isArray(ids) ? ids.map(String) : [];

    const allowedProductCatIds = extractIds(vendor.product_category_ids || vendor.productCategoryIds);
    const allowedItemCatIds = extractIds(vendor.item_category_ids || vendor.itemCategoryIds);
    const allowedSubCatIds = extractIds(vendor.sub_category_ids || vendor.subCategoryIds);
    const allowedBrandIds = extractIds(vendor.brand_ids || vendor.brandIds);

    // STRICT VALIDATION: If vendor has restrictions, SKU MUST match

    // Validate Product Category
    if (allowedProductCatIds.length > 0) {
        const skuProductCatId = String(sku.product_category_id || sku.productCategoryId || '');
        if (!skuProductCatId || !allowedProductCatIds.includes(skuProductCatId)) {
            throw new Error(`SKU's product category is not allowed for vendor "${vendor.name}". Allowed categories: ${allowedProductCatIds.join(', ')}`);
        }
    }

    // Validate Item Category
    if (allowedItemCatIds.length > 0) {
        const skuItemCatId = String(sku.item_category_id || sku.itemCategoryId || '');
        if (!skuItemCatId || !allowedItemCatIds.includes(skuItemCatId)) {
            throw new Error(`SKU's item category is not allowed for vendor "${vendor.name}". Allowed categories: ${allowedItemCatIds.join(', ')}`);
        }
    }

    // Validate Sub-Category (STRICT)
    if (allowedSubCatIds.length > 0) {
        const skuSubCatId = String(sku.sub_category_id || sku.subCategoryId || '');
        if (!skuSubCatId || !allowedSubCatIds.includes(skuSubCatId)) {
            throw new Error(`SKU's sub-category is not allowed for vendor "${vendor.name}". Allowed sub-categories: ${allowedSubCatIds.join(', ')}`);
        }
    }

    // Validate Brand (STRICT)
    if (allowedBrandIds.length > 0) {
        const skuBrandId = String(sku.brand_id || sku.brandId || '');
        if (!skuBrandId || !allowedBrandIds.includes(skuBrandId)) {
            throw new Error(`SKU's brand is not allowed for vendor "${vendor.name}". Allowed brands: ${allowedBrandIds.join(', ')}`);
        }
    }

    return true;
};

module.exports = { validateVendorCatalog };
