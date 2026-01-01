/**
 * SKU Inventory Health Classification System
 * 
 * Canonical classification rules - ORDER IS NON-NEGOTIABLE
 * 
 * Status Hierarchy (evaluate in exact order):
 * 1. NEW - recently received inventory (protected)
 * 2. NON_MOVING - dead stock (highest priority)
 * 3. SLOW_MOVING - low activity inventory
 * 4. ACTIVE - healthy inventory
 * 
 * Each SKU must belong to exactly one status at any time.
 */

export type SKUStatus = 'NEW' | 'NON_MOVING' | 'SLOW_MOVING' | 'ACTIVE';

export interface SKUInventoryData {
  current_stock_qty: number;
  last_outbound_date: string | null;
  first_inward_date: string;
}

export interface PlanningThresholds {
  slow_moving_days: number;
  slow_moving_min_qty: number;
  slow_moving_min_qty_is_percentage: boolean;
  slow_moving_min_qty_percentage?: number; // 0-100
  non_moving_days: number;
  non_moving_min_qty: number;
  non_moving_min_qty_is_percentage: boolean;
  non_moving_min_qty_percentage?: number; // 0-100
}

export interface ClassificationResult {
  status: SKUStatus;
  days_since_last_movement: number;
  reason: string;
}

/**
 * Calculate days since last movement
 * Uses: TODAY - COALESCE(last_outbound_date, first_inward_date)
 */
function calculateDaysSinceLastMovement(
  lastOutboundDate: string | null,
  firstInwardDate: string
): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const referenceDate = lastOutboundDate 
    ? new Date(lastOutboundDate)
    : new Date(firstInwardDate);
  referenceDate.setHours(0, 0, 0, 0);
  
  const diffTime = today.getTime() - referenceDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  return Math.max(0, diffDays);
}

/**
 * Canonical SKU Classification Function
 * 
 * ⚠️ ORDER IS NON-NEGOTIABLE
 * 
 * Rule 0: NEW SKU (Override Rule)
 * Rule 1: NON_MOVING (Highest Priority)
 * Rule 2: SLOW_MOVING
 * Rule 3: ACTIVE
 */
export function classifySKU(
  skuData: SKUInventoryData,
  thresholds: PlanningThresholds
): ClassificationResult {
  const { current_stock_qty, last_outbound_date, first_inward_date } = skuData;
  const { slow_moving_days, slow_moving_min_qty, non_moving_days, non_moving_min_qty } = thresholds;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const firstInward = new Date(first_inward_date);
  firstInward.setHours(0, 0, 0, 0);
  
  const daysSinceFirstInward = Math.floor((today.getTime() - firstInward.getTime()) / (1000 * 60 * 60 * 24));
  const daysSinceLastMovement = calculateDaysSinceLastMovement(last_outbound_date, first_inward_date);
  
  // 🧊 Rule 0: NEW SKU (Override Rule)
  // NEW SKUs must never be slow-moving or non-moving
  if (daysSinceFirstInward < slow_moving_days) {
    return {
      status: 'NEW',
      days_since_last_movement: daysSinceLastMovement,
      reason: `SKU is new (received ${daysSinceFirstInward} days ago, less than slow_moving_days threshold of ${slow_moving_days})`
    };
  }
  
  // Zero-Stock Rule (Critical)
  // If current_stock_qty == 0, exclude from SLOW_MOVING and NON_MOVING
  if (current_stock_qty === 0) {
    return {
      status: 'ACTIVE',
      days_since_last_movement: daysSinceLastMovement,
      reason: 'Zero stock - not a problem inventory state'
    };
  }
  
  // 🔴 Rule 1: NON_MOVING (Highest Priority)
  // A SKU is NON_MOVING if ALL are true:
  // - current_stock_qty >= non_moving_min_qty
  // - days_since_last_movement >= non_moving_days
  if (
    current_stock_qty >= non_moving_min_qty &&
    daysSinceLastMovement >= non_moving_days
  ) {
    return {
      status: 'NON_MOVING',
      days_since_last_movement: daysSinceLastMovement,
      reason: `Stock: ${current_stock_qty} >= ${non_moving_min_qty}, Days: ${daysSinceLastMovement} >= ${non_moving_days}`
    };
  }
  
  // 🟠 Rule 2: SLOW_MOVING
  // A SKU is SLOW_MOVING if ALL are true:
  // - current_stock_qty >= slow_moving_min_qty
  // - days_since_last_movement >= slow_moving_days
  // - days_since_last_movement < non_moving_days
  if (
    current_stock_qty >= slow_moving_min_qty &&
    daysSinceLastMovement >= slow_moving_days &&
    daysSinceLastMovement < non_moving_days
  ) {
    return {
      status: 'SLOW_MOVING',
      days_since_last_movement: daysSinceLastMovement,
      reason: `Stock: ${current_stock_qty} >= ${slow_moving_min_qty}, Days: ${daysSinceLastMovement} >= ${slow_moving_days} and < ${non_moving_days}`
    };
  }
  
  // 🟢 Rule 3: ACTIVE
  // All remaining SKUs are ACTIVE
  return {
    status: 'ACTIVE',
    days_since_last_movement: daysSinceLastMovement,
    reason: 'Does not meet criteria for NEW, NON_MOVING, or SLOW_MOVING'
  };
}

/**
 * Validate Planning Thresholds
 * 
 * Rules:
 * - slow_moving_days > 0
 * - non_moving_days > slow_moving_days (critical)
 * - slow_moving_min_qty >= 0
 * - non_moving_min_qty >= 0
 */
export function validatePlanningThresholds(
  thresholds: PlanningThresholds
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (thresholds.slow_moving_days <= 0) {
    errors.push('slow_moving_days must be greater than 0');
  }
  
  if (thresholds.non_moving_days <= thresholds.slow_moving_days) {
    errors.push(`non_moving_days (${thresholds.non_moving_days}) must be greater than slow_moving_days (${thresholds.slow_moving_days})`);
  }
  
  if (thresholds.slow_moving_min_qty < 0) {
    errors.push('slow_moving_min_qty must be greater than or equal to 0');
  }
  
  if (thresholds.non_moving_min_qty < 0) {
    errors.push('non_moving_min_qty must be greater than or equal to 0');
  }
  
  // Validate percentage values if in percentage mode
  if (thresholds.slow_moving_min_qty_is_percentage) {
    const percentage = thresholds.slow_moving_min_qty_percentage ?? 0;
    if (percentage < 0 || percentage > 100) {
      errors.push('slow_moving_min_qty_percentage must be between 0 and 100');
    }
  }
  
  if (thresholds.non_moving_min_qty_is_percentage) {
    const percentage = thresholds.non_moving_min_qty_percentage ?? 0;
    if (percentage < 0 || percentage > 100) {
      errors.push('non_moving_min_qty_percentage must be between 0 and 100');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get default planning thresholds
 */
export function getDefaultPlanningThresholds(): PlanningThresholds {
  return {
    slow_moving_days: 90,
    slow_moving_min_qty: 5,
    slow_moving_min_qty_is_percentage: false,
    slow_moving_min_qty_percentage: 0,
    non_moving_days: 180,
    non_moving_min_qty: 1,
    non_moving_min_qty_is_percentage: false,
    non_moving_min_qty_percentage: 0
  };
}

