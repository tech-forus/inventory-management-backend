const pool = require('./database');

/**
 * Vendor Model
 * Handles all database operations for vendors
 */
class VendorModel {
  /**
   * Get all vendors for a company with relationships
   */
  static async getAll(companyId) {
    const result = await pool.query(
      `SELECT 
        v.*,
        COALESCE(
          (SELECT json_agg(product_category_id) 
           FROM vendor_product_categories 
           WHERE vendor_id = v.id), 
          '[]'::json
        )::jsonb as product_category_ids,
        COALESCE(
          (SELECT json_agg(item_category_id) 
           FROM vendor_item_categories 
           WHERE vendor_id = v.id), 
          '[]'::json
        )::jsonb as item_category_ids,
        COALESCE(
          (SELECT json_agg(sub_category_id) 
           FROM vendor_sub_categories 
           WHERE vendor_id = v.id), 
          '[]'::json
        )::jsonb as sub_category_ids,
        COALESCE(
          (SELECT json_agg(brand_id) 
           FROM vendor_brands 
           WHERE vendor_id = v.id), 
          '[]'::json
        )::jsonb as brand_ids
      FROM vendors v 
      WHERE v.company_id = $1 AND v.is_active = true 
      ORDER BY v.name`,
      [companyId.toUpperCase()]
    );
    return result.rows;
  }

  /**
   * Get vendor by ID with relationships
   */
  static async getById(id, companyId, client = null) {
    const queryClient = client || pool;
    const result = await queryClient.query(
      `SELECT 
        v.*,
        COALESCE(
          (SELECT json_agg(product_category_id) 
           FROM vendor_product_categories 
           WHERE vendor_id = v.id), 
          '[]'::json
        )::jsonb as product_category_ids,
        COALESCE(
          (SELECT json_agg(item_category_id) 
           FROM vendor_item_categories 
           WHERE vendor_id = v.id), 
          '[]'::json
        )::jsonb as item_category_ids,
        COALESCE(
          (SELECT json_agg(sub_category_id) 
           FROM vendor_sub_categories 
           WHERE vendor_id = v.id), 
          '[]'::json
        )::jsonb as sub_category_ids,
        COALESCE(
          (SELECT json_agg(brand_id) 
           FROM vendor_brands 
           WHERE vendor_id = v.id), 
          '[]'::json
        )::jsonb as brand_ids
      FROM vendors v 
      WHERE v.id = $1 AND v.company_id = $2 AND v.is_active = true`,
      [id, companyId.toUpperCase()]
    );
    return result.rows[0];
  }

  /**
   * Create a new vendor with relationships
   */
  static async create(vendorData, companyId, client = null) {
    const queryClient = client || pool;
    const result = await queryClient.query(
      `INSERT INTO vendors (
        company_id, name, contact_person, department, designation, email, phone, whatsapp_number, gst_number,
        address, city, state, pin, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        companyId.toUpperCase(),
        vendorData.name,
        vendorData.contactPerson || null,
        vendorData.department || null,
        vendorData.designation || null,
        vendorData.email || null,
        vendorData.phone || null,
        vendorData.whatsappNumber || null,
        vendorData.gstNumber || null,
        vendorData.address || null,
        vendorData.city || null,
        vendorData.state || null,
        vendorData.pin || null,
        vendorData.isActive !== false,
      ]
    );
    const vendor = result.rows[0];
    
    // Save relationships if provided
    if (vendor.id) {
      await this.saveRelationships(vendor.id, vendorData, queryClient);
    }
    
    // Fetch vendor with relationships using the same client (within transaction)
    return await this.getById(vendor.id, companyId, queryClient);
  }

  /**
   * Save vendor relationships (categories and brands)
   */
  static async saveRelationships(vendorId, vendorData, client = null) {
    const queryClient = client || pool;
    
    // Delete existing relationships
    await queryClient.query('DELETE FROM vendor_product_categories WHERE vendor_id = $1', [vendorId]);
    await queryClient.query('DELETE FROM vendor_item_categories WHERE vendor_id = $1', [vendorId]);
    await queryClient.query('DELETE FROM vendor_sub_categories WHERE vendor_id = $1', [vendorId]);
    await queryClient.query('DELETE FROM vendor_brands WHERE vendor_id = $1', [vendorId]);
    
    // Insert product categories
    if (vendorData.productCategoryIds && Array.isArray(vendorData.productCategoryIds) && vendorData.productCategoryIds.length > 0) {
      for (const categoryId of vendorData.productCategoryIds) {
        const id = typeof categoryId === 'string' ? parseInt(categoryId) : categoryId;
        if (!isNaN(id)) {
          await queryClient.query(
            'INSERT INTO vendor_product_categories (vendor_id, product_category_id) VALUES ($1, $2) ON CONFLICT (vendor_id, product_category_id) DO NOTHING',
            [vendorId, id]
          );
        }
      }
    }
    
    // Insert item categories
    if (vendorData.itemCategoryIds && Array.isArray(vendorData.itemCategoryIds) && vendorData.itemCategoryIds.length > 0) {
      for (const categoryId of vendorData.itemCategoryIds) {
        const id = typeof categoryId === 'string' ? parseInt(categoryId) : categoryId;
        if (!isNaN(id)) {
          await queryClient.query(
            'INSERT INTO vendor_item_categories (vendor_id, item_category_id) VALUES ($1, $2) ON CONFLICT (vendor_id, item_category_id) DO NOTHING',
            [vendorId, id]
          );
        }
      }
    }
    
    // Insert sub categories
    if (vendorData.subCategoryIds && Array.isArray(vendorData.subCategoryIds) && vendorData.subCategoryIds.length > 0) {
      for (const categoryId of vendorData.subCategoryIds) {
        const id = typeof categoryId === 'string' ? parseInt(categoryId) : categoryId;
        if (!isNaN(id)) {
          await queryClient.query(
            'INSERT INTO vendor_sub_categories (vendor_id, sub_category_id) VALUES ($1, $2) ON CONFLICT (vendor_id, sub_category_id) DO NOTHING',
            [vendorId, id]
          );
        }
      }
    }
    
    // Insert brands
    if (vendorData.brandIds && Array.isArray(vendorData.brandIds) && vendorData.brandIds.length > 0) {
      for (const brandId of vendorData.brandIds) {
        const id = typeof brandId === 'string' ? parseInt(brandId) : brandId;
        if (!isNaN(id)) {
          await queryClient.query(
            'INSERT INTO vendor_brands (vendor_id, brand_id) VALUES ($1, $2) ON CONFLICT (vendor_id, brand_id) DO NOTHING',
            [vendorId, id]
          );
        }
      }
    }
  }

  /**
   * Update vendor with relationships
   */
  static async update(id, vendorData, companyId, client = null) {
    const queryClient = client || pool;
    const result = await queryClient.query(
      `UPDATE vendors SET
        name = $1, contact_person = $2, department = $3, designation = $4, email = $5,
        phone = $6, whatsapp_number = $7, gst_number = $8, address = $9, city = $10,
        state = $11, pin = $12, is_active = $13, updated_at = CURRENT_TIMESTAMP
      WHERE id = $14 AND company_id = $15
      RETURNING *`,
      [
        vendorData.name,
        vendorData.contactPerson || null,
        vendorData.department || null,
        vendorData.designation || null,
        vendorData.email || null,
        vendorData.phone || null,
        vendorData.whatsappNumber || null,
        vendorData.gstNumber || null,
        vendorData.address || null,
        vendorData.city || null,
        vendorData.state || null,
        vendorData.pin || null,
        vendorData.isActive !== false,
        id,
        companyId.toUpperCase(),
      ]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    // Save relationships if provided
    await this.saveRelationships(id, vendorData, queryClient);
    
    // Fetch vendor with relationships using the same client (within transaction)
    return await this.getById(id, companyId, queryClient);
  }

  /**
   * Soft delete vendor
   */
  static async delete(id, companyId) {
    const result = await pool.query(
      'UPDATE vendors SET is_active = false WHERE id = $1 AND company_id = $2 RETURNING id',
      [id, companyId.toUpperCase()]
    );
    return result.rows[0];
  }

  /**
   * Bulk create vendors
   */
  static async bulkCreate(vendors, companyId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const inserted = [];

      for (const vendor of vendors) {
        const result = await client.query(
          `INSERT INTO vendors (
            company_id, name, contact_person, department, designation, email, phone, whatsapp_number, gst_number,
            address, city, state, pin
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          ON CONFLICT (company_id, name) DO UPDATE
          SET contact_person = EXCLUDED.contact_person,
              department = EXCLUDED.department,
              designation = EXCLUDED.designation,
              email = EXCLUDED.email,
              phone = EXCLUDED.phone,
              whatsapp_number = EXCLUDED.whatsapp_number,
              gst_number = EXCLUDED.gst_number,
              address = EXCLUDED.address,
              city = EXCLUDED.city,
              state = EXCLUDED.state,
              pin = EXCLUDED.pin,
              updated_at = CURRENT_TIMESTAMP
          RETURNING *`,
          [
            companyId.toUpperCase(),
            vendor.name,
            vendor.contactPerson || vendor.contact_person || null,
            vendor.department || null,
            vendor.designation || null,
            vendor.email || null,
            vendor.phone || null,
            vendor.whatsappNumber || vendor.whatsapp_number || null,
            vendor.gstNumber || vendor.gst_number || null,
            vendor.address || null,
            vendor.city || null,
            vendor.state || null,
            vendor.pin || null,
          ]
        );
        inserted.push(result.rows[0]);
      }

      await client.query('COMMIT');
      return inserted;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = VendorModel;


