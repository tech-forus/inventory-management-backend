const { pool } = require('../models/database');
const { getCompanyId } = require('../middleware/auth');

/**
 * Get all dashboard metrics in a single optimized call
 * Replaces 6 separate API calls with 1 consolidated endpoint
 */
const getDashboardMetrics = async (req, res, next) => {
  try {
    const companyId = getCompanyId(req).toUpperCase();
    
    // Get date ranges
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    const dateFrom30 = thirtyDaysAgo.toISOString().split('T')[0];
    
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 6); // 7 days including today
    const dateFrom7 = sevenDaysAgo.toISOString().split('T')[0];
    
    const dateTo = today.toISOString().split('T')[0];

    // Execute all queries in parallel for optimal performance
    const [
      basicMetricsResult,
      topProductsResult,
      categoryDistributionResult,
      movementDataResult
    ] = await Promise.all([
      // 1. Basic metrics (total SKUs, low stock alerts, non-movable count)
      pool.query(`
        SELECT 
          COUNT(*) as total_skus,
          COUNT(CASE WHEN current_stock < COALESCE(min_stock_level, 0) OR current_stock = 0 THEN 1 END) as low_stock_alerts,
          COUNT(CASE WHEN is_non_movable = true AND current_stock > 0 THEN 1 END) as non_movable_count
        FROM skus 
        WHERE company_id = $1 AND is_active = true
      `, [companyId]),

      // 2. Top 5 selling products (last 30 days)
      pool.query(`
        SELECT 
          s.id,
          s.sku_id,
          s.item_name,
          s.current_stock,
          s.min_stock_level,
          COALESCE(pc.name, ic.name, sc.name, 'Uncategorized') as category,
          COALESCE(SUM(oii.outgoing_quantity), 0)::INTEGER as units_sold
        FROM skus s
        LEFT JOIN outgoing_inventory_items oii ON s.id = oii.sku_id
        LEFT JOIN outgoing_inventory oi ON oii.outgoing_inventory_id = oi.id 
          AND oi.company_id = $1 
          AND oi.is_active = true 
          AND oi.status = 'completed'
          AND oi.invoice_challan_date >= $2::DATE
          AND oi.invoice_challan_date <= $3::DATE
        LEFT JOIN product_categories pc ON s.product_category_id = pc.id
        LEFT JOIN item_categories ic ON s.item_category_id = ic.id
        LEFT JOIN sub_categories sc ON s.sub_category_id = sc.id
        WHERE s.company_id = $1 AND s.is_active = true
        GROUP BY s.id, s.sku_id, s.item_name, s.current_stock, s.min_stock_level,
                 pc.name, ic.name, sc.name
        ORDER BY units_sold DESC, s.item_name
        LIMIT 5
      `, [companyId, dateFrom30, dateTo]),

      // 3. Category distribution (top 4 categories by SKU count)
      pool.query(`
        SELECT 
          COALESCE(pc.name, ic.name, sc.name, 'Uncategorized') as category_name,
          COUNT(*) as sku_count
        FROM skus s
        LEFT JOIN product_categories pc ON s.product_category_id = pc.id
        LEFT JOIN item_categories ic ON s.item_category_id = ic.id
        LEFT JOIN sub_categories sc ON s.sub_category_id = sc.id
        WHERE s.company_id = $1 AND s.is_active = true
        GROUP BY COALESCE(pc.name, ic.name, sc.name, 'Uncategorized')
        ORDER BY sku_count DESC
        LIMIT 4
      `, [companyId]),

      // 4. 7-day movement data (incoming and outgoing amounts)
      pool.query(`
        SELECT 
          movement_date,
          COALESCE(SUM(CASE WHEN movement_type = 'incoming' THEN amount END), 0)::DECIMAL(15,2) as incoming_amount,
          COALESCE(SUM(CASE WHEN movement_type = 'outgoing' THEN amount END), 0)::DECIMAL(15,2) as outgoing_amount
        FROM (
          -- Incoming movements
          SELECT 
            ii.receiving_date as movement_date,
            'incoming' as movement_type,
            COALESCE(SUM(iii.total_value_excl_gst), 0) as amount
          FROM incoming_inventory ii
          INNER JOIN incoming_inventory_items iii ON ii.id = iii.incoming_inventory_id
          WHERE ii.company_id = $1 
            AND ii.is_active = true 
            AND ii.status = 'completed'
            AND ii.receiving_date >= $2::DATE
            AND ii.receiving_date <= $3::DATE
          GROUP BY ii.receiving_date
          
          UNION ALL
          
          -- Outgoing movements  
          SELECT 
            oi.invoice_challan_date as movement_date,
            'outgoing' as movement_type,
            COALESCE(SUM(oii.total_value_excl_gst), 0) as amount
          FROM outgoing_inventory oi
          INNER JOIN outgoing_inventory_items oii ON oi.id = oii.outgoing_inventory_id
          WHERE oi.company_id = $1 
            AND oi.is_active = true 
            AND oi.status = 'completed'
            AND oi.invoice_challan_date >= $2::DATE
            AND oi.invoice_challan_date <= $3::DATE
          GROUP BY oi.invoice_challan_date
        ) movements
        GROUP BY movement_date
        ORDER BY movement_date
      `, [companyId, dateFrom7, dateTo])
    ]);

    // Process results
    const basicMetrics = basicMetricsResult.rows[0];
    const topProducts = topProductsResult.rows;
    const categoryDistribution = categoryDistributionResult.rows;
    const movementData = movementDataResult.rows;

    // Create date series for last 7 days
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const movementSeries = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayName = days[date.getDay()];
      
      // Find movement data for this date
      const dayMovement = movementData.find(m => m.movement_date === dateStr);
      
      movementSeries.push({
        day: `${dayName}\n${date.getDate()}`,
        date: date.getDate(),
        fullDate: dateStr,
        incomingAmount: dayMovement ? parseFloat(dayMovement.incoming_amount) : 0,
        outgoingAmount: dayMovement ? parseFloat(dayMovement.outgoing_amount) : 0
      });
    }

    // Transform top products
    const transformedTopProducts = topProducts.map(item => {
      const stock = parseInt(item.current_stock) || 0;
      const minStock = parseInt(item.min_stock_level) || 0;
      
      let status = 'In Stock';
      if (stock === 0) status = 'Out of Stock';
      else if (minStock > 0 && stock <= minStock) status = 'Low Stock';
      
      return {
        id: item.id,
        name: item.item_name || 'Unknown Item',
        category: (item.category || 'UNCATEGORIZED').toUpperCase(),
        sold: parseInt(item.units_sold) || 0,
        stock: stock,
        status: status
      };
    });

    // Transform category distribution
    const transformedCategories = categoryDistribution.map(cat => ({
      name: cat.category_name || 'Uncategorized',
      value: parseInt(cat.sku_count) || 0
    }));

    // Build response
    const response = {
      success: true,
      data: {
        metrics: {
          totalSKUs: parseInt(basicMetrics.total_skus) || 0,
          lowStockAlerts: parseInt(basicMetrics.low_stock_alerts) || 0,
          nonMovableSKUs: parseInt(basicMetrics.non_movable_count) || 0,
          // Slow moving will be calculated separately if needed
          slowMovingSKUs: 0
        },
        movementData: movementSeries,
        categoryData: transformedCategories,
        topProducts: transformedTopProducts
      },
      lastUpdated: new Date().toISOString()
    };

    res.json(response);

  } catch (error) {
    console.error('Dashboard metrics error:', error);
    next(error);
  }
};

/**
 * Get slow moving SKUs (separate endpoint for performance)
 */
const getSlowMovingSKUs = async (req, res, next) => {
  try {
    const companyId = getCompanyId(req).toUpperCase();
    const period = parseInt(req.query.period || 90, 10);
    
    // For now, return placeholder - this can be implemented later with proper analysis
    res.json({
      success: true,
      data: [],
      message: 'Slow moving analysis not yet implemented'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardMetrics,
  getSlowMovingSKUs
};