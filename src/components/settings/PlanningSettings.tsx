import React, { useState, useEffect } from 'react';
import { Sliders, AlertCircle, CheckCircle2 } from 'lucide-react';
import { PlanningThresholds, validatePlanningThresholds, getDefaultPlanningThresholds } from '../../utils/skuClassification';

interface PlanningSettingsProps {
  planningSubTab: 'slowMoving' | 'nonMovable';
  onSubTabChange: (subTab: 'slowMoving' | 'nonMovable') => void;
  planningThresholds: PlanningThresholds;
  onPlanningThresholdsChange: (thresholds: PlanningThresholds) => void;
}

const PlanningSettings: React.FC<PlanningSettingsProps> = ({
  planningSubTab,
  onSubTabChange,
  planningThresholds,
  onPlanningThresholdsChange,
}) => {
  const [localThresholds, setLocalThresholds] = useState<PlanningThresholds>(planningThresholds);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [slowMovingInputMode, setSlowMovingInputMode] = useState<'months' | 'days'>('days');
  const [nonMovingInputMode, setNonMovingInputMode] = useState<'months' | 'days'>('days');

  // Check if current year is a leap year
  const isLeapYear = (year: number): boolean => {
    return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
  };

  const getMaxDays = (): number => {
    const currentYear = new Date().getFullYear();
    return isLeapYear(currentYear) ? 366 : 365;
  };

  useEffect(() => {
    setLocalThresholds(planningThresholds);
    setValidationErrors([]);
    setShowSuccess(false);
  }, [planningThresholds]);

  const handleThresholdChange = (field: keyof PlanningThresholds, value: number) => {
    const updated = { ...localThresholds, [field]: value };
    setLocalThresholds(updated);
    
    // Validate immediately
    const validation = validatePlanningThresholds(updated);
    setValidationErrors(validation.errors);
    
    // Update parent if valid
    if (validation.valid) {
      onPlanningThresholdsChange(updated);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    }
  };

  const handleReset = () => {
    const defaults = getDefaultPlanningThresholds();
    setLocalThresholds(defaults);
    setValidationErrors([]);
    onPlanningThresholdsChange(defaults);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  };

  const validation = validatePlanningThresholds(localThresholds);

  return (
    <div className="space-y-6">
      <style>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #4f46e5;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        .slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #4f46e5;
          cursor: pointer;
          border: 2px solid #ffffff;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        .slider:focus {
          outline: none;
        }
        .slider:focus::-webkit-slider-thumb {
          box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.2);
        }
        .slider:focus::-moz-range-thumb {
          box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.2);
        }
      `}</style>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
          <Sliders className="w-5 h-5 text-indigo-600" />
        </div>
        <h2 className="text-2xl font-semibold text-gray-900">Planning Settings</h2>
      </div>

      {/* Horizontal Tabs for Planning */}
      <div className="mb-6">
        <nav className="flex">
          <button
            onClick={() => onSubTabChange('slowMoving')}
            className={`flex-1 px-4 py-3 font-semibold text-sm transition-all border-b-2 text-center ${
              planningSubTab === 'slowMoving'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            Customize Slow Moving SKU's Setting
          </button>
          <button
            onClick={() => onSubTabChange('nonMovable')}
            className={`flex-1 px-4 py-3 font-semibold text-sm transition-all border-b-2 text-center ${
              planningSubTab === 'nonMovable'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            Customize Non-Movable SKU's Setting
          </button>
        </nav>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-red-900 mb-1">Validation Errors</h4>
              <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {showSuccess && validation.valid && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-green-900">Settings updated successfully</span>
          </div>
        </div>
      )}

      {/* Slow Moving SKU Settings */}
      {planningSubTab === 'slowMoving' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Slow Moving SKU's Settings</h3>
            <p className="text-sm text-gray-500 mb-6">
              Configure thresholds to identify SKUs with low sales velocity. A SKU is classified as slow-moving when it meets both time and quantity criteria.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Minimum Days Since Last Movement
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium ${slowMovingInputMode === 'days' ? 'text-indigo-600' : 'text-gray-500'}`}>
                    Days
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={slowMovingInputMode === 'months'}
                      onChange={(e) => setSlowMovingInputMode(e.target.checked ? 'months' : 'days')}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                  <span className={`text-xs font-medium ${slowMovingInputMode === 'months' ? 'text-indigo-600' : 'text-gray-500'}`}>
                    Months
                  </span>
                </div>
              </div>
              {slowMovingInputMode === 'months' ? (
                <div>
                  <input
                    type="number"
                    min="0"
                    max="12"
                    value={Math.floor(localThresholds.slow_moving_days / 30)}
                    onChange={(e) => {
                      const months = Math.min(12, Math.max(0, parseInt(e.target.value) || 0));
                      const totalDays = months * 30;
                      handleThresholdChange('slow_moving_days', Math.min(getMaxDays(), totalDays));
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="3"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Current: {localThresholds.slow_moving_days} days ({Math.floor(localThresholds.slow_moving_days / 30)} months {localThresholds.slow_moving_days % 30} days)
                  </p>
                </div>
              ) : (
                <div>
                  <input
                    type="number"
                    min="1"
                    max={getMaxDays()}
                    value={localThresholds.slow_moving_days}
                    onChange={(e) => handleThresholdChange('slow_moving_days', Math.min(getMaxDays(), parseInt(e.target.value) || 0))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="90"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Maximum: {getMaxDays()} days ({isLeapYear(new Date().getFullYear()) ? 'Leap year' : 'Non-leap year'})
                  </p>
                </div>
              )}
              <p className="mt-1 text-xs text-gray-500">
                SKUs with no outbound movement for this many days or more will be considered slow-moving (if they also meet the quantity threshold).
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Minimum Stock Quantity
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium ${!localThresholds.slow_moving_min_qty_is_percentage ? 'text-indigo-600' : 'text-gray-500'}`}>
                    Number
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={localThresholds.slow_moving_min_qty_is_percentage}
                      onChange={(e) => {
                        const updated = {
                          ...localThresholds,
                          slow_moving_min_qty_is_percentage: e.target.checked,
                          slow_moving_min_qty_percentage: e.target.checked ? (localThresholds.slow_moving_min_qty_percentage || 0) : undefined
                        };
                        setLocalThresholds(updated);
                        const validation = validatePlanningThresholds(updated);
                        setValidationErrors(validation.errors);
                        if (validation.valid) {
                          onPlanningThresholdsChange(updated);
                        }
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                  <span className={`text-xs font-medium ${localThresholds.slow_moving_min_qty_is_percentage ? 'text-indigo-600' : 'text-gray-500'}`}>
                    Percentage
                  </span>
                </div>
              </div>
              {localThresholds.slow_moving_min_qty_is_percentage ? (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">
                        {localThresholds.slow_moving_min_qty_percentage ?? 0}%
                      </span>
                      <span className="text-xs text-gray-500">0% - 100%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="0.1"
                      value={localThresholds.slow_moving_min_qty_percentage ?? 0}
                      onChange={(e) => {
                        const percentage = parseFloat(e.target.value) || 0;
                        const updated = {
                          ...localThresholds,
                          slow_moving_min_qty_percentage: percentage
                        };
                        setLocalThresholds(updated);
                        const validation = validatePlanningThresholds(updated);
                        setValidationErrors(validation.errors);
                        if (validation.valid) {
                          onPlanningThresholdsChange(updated);
                        }
                      }}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                      style={{
                        background: `linear-gradient(to right, #4f46e5 0%, #4f46e5 ${(localThresholds.slow_moving_min_qty_percentage ?? 0)}%, #e5e7eb ${(localThresholds.slow_moving_min_qty_percentage ?? 0)}%, #e5e7eb 100%)`
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    Only SKUs with stock quantity greater than or equal to this percentage of total inventory will be classified as slow-moving.
                  </p>
                </div>
              ) : (
                <div>
                  <input
                    type="number"
                    min="0"
                    value={localThresholds.slow_moving_min_qty}
                    onChange={(e) => handleThresholdChange('slow_moving_min_qty', parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="5"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Only SKUs with stock quantity greater than or equal to this value will be classified as slow-moving.
                  </p>
                </div>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-blue-900 mb-2">Classification Rule</h4>
              <p className="text-xs text-blue-800">
                A SKU is classified as <strong>SLOW_MOVING</strong> when:
              </p>
              <ul className="list-disc list-inside text-xs text-blue-800 mt-2 space-y-1">
                <li>Stock quantity ≥ {localThresholds.slow_moving_min_qty_is_percentage 
                  ? `${localThresholds.slow_moving_min_qty_percentage ?? 0}% of total inventory`
                  : `${localThresholds.slow_moving_min_qty} units`}</li>
                <li>Days since last movement ≥ {localThresholds.slow_moving_days} days</li>
                <li>Days since last movement &lt; {localThresholds.non_moving_days} days (non-moving threshold)</li>
                <li>SKU is not NEW (received less than {localThresholds.slow_moving_days} days ago)</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Non-Movable SKU Settings */}
      {planningSubTab === 'nonMovable' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Non-Movable SKU's Settings</h3>
            <p className="text-sm text-gray-500 mb-6">
              Configure thresholds to identify dead stock. Non-moving SKUs have the highest priority and must have a longer time threshold than slow-moving SKUs.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Minimum Days Since Last Movement
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium ${nonMovingInputMode === 'days' ? 'text-indigo-600' : 'text-gray-500'}`}>
                    Days
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={nonMovingInputMode === 'months'}
                      onChange={(e) => setNonMovingInputMode(e.target.checked ? 'months' : 'days')}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                  <span className={`text-xs font-medium ${nonMovingInputMode === 'months' ? 'text-indigo-600' : 'text-gray-500'}`}>
                    Months
                  </span>
                </div>
              </div>
              {nonMovingInputMode === 'months' ? (
                <div>
                  <input
                    type="number"
                    min="0"
                    max="12"
                    value={Math.floor(localThresholds.non_moving_days / 30)}
                    onChange={(e) => {
                      const months = Math.min(12, Math.max(0, parseInt(e.target.value) || 0));
                      const totalDays = months * 30;
                      const minDays = localThresholds.slow_moving_days + 1;
                      handleThresholdChange('non_moving_days', Math.min(getMaxDays(), Math.max(minDays, totalDays)));
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="6"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Current: {localThresholds.non_moving_days} days ({Math.floor(localThresholds.non_moving_days / 30)} months {localThresholds.non_moving_days % 30} days)
                  </p>
                </div>
              ) : (
                <div>
                  <input
                    type="number"
                    min={localThresholds.slow_moving_days + 1}
                    max={getMaxDays()}
                    value={localThresholds.non_moving_days}
                    onChange={(e) => {
                      const days = parseInt(e.target.value) || 0;
                      const minDays = localThresholds.slow_moving_days + 1;
                      handleThresholdChange('non_moving_days', Math.min(getMaxDays(), Math.max(minDays, days)));
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="180"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Maximum: {getMaxDays()} days ({isLeapYear(new Date().getFullYear()) ? 'Leap year' : 'Non-leap year'})
                  </p>
                </div>
              )}
              <p className="mt-1 text-xs text-gray-500">
                <strong>Critical:</strong> Must be greater than slow-moving days ({localThresholds.slow_moving_days}). 
                SKUs with no outbound movement for this many days or more will be considered non-moving (dead stock).
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Minimum Stock Quantity
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium ${!localThresholds.non_moving_min_qty_is_percentage ? 'text-indigo-600' : 'text-gray-500'}`}>
                    Number
                  </span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={localThresholds.non_moving_min_qty_is_percentage}
                      onChange={(e) => {
                        const updated = {
                          ...localThresholds,
                          non_moving_min_qty_is_percentage: e.target.checked,
                          non_moving_min_qty_percentage: e.target.checked ? (localThresholds.non_moving_min_qty_percentage || 0) : undefined
                        };
                        setLocalThresholds(updated);
                        const validation = validatePlanningThresholds(updated);
                        setValidationErrors(validation.errors);
                        if (validation.valid) {
                          onPlanningThresholdsChange(updated);
                        }
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                  <span className={`text-xs font-medium ${localThresholds.non_moving_min_qty_is_percentage ? 'text-indigo-600' : 'text-gray-500'}`}>
                    Percentage
                  </span>
                </div>
              </div>
              {localThresholds.non_moving_min_qty_is_percentage ? (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">
                        {localThresholds.non_moving_min_qty_percentage ?? 0}%
                      </span>
                      <span className="text-xs text-gray-500">0% - 100%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="0.1"
                      value={localThresholds.non_moving_min_qty_percentage ?? 0}
                      onChange={(e) => {
                        const percentage = parseFloat(e.target.value) || 0;
                        const updated = {
                          ...localThresholds,
                          non_moving_min_qty_percentage: percentage
                        };
                        setLocalThresholds(updated);
                        const validation = validatePlanningThresholds(updated);
                        setValidationErrors(validation.errors);
                        if (validation.valid) {
                          onPlanningThresholdsChange(updated);
                        }
                      }}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                      style={{
                        background: `linear-gradient(to right, #4f46e5 0%, #4f46e5 ${(localThresholds.non_moving_min_qty_percentage ?? 0)}%, #e5e7eb ${(localThresholds.non_moving_min_qty_percentage ?? 0)}%, #e5e7eb 100%)`
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    Only SKUs with stock quantity greater than or equal to this percentage of total inventory will be classified as non-moving.
                  </p>
                </div>
              ) : (
                <div>
                  <input
                    type="number"
                    min="0"
                    value={localThresholds.non_moving_min_qty}
                    onChange={(e) => handleThresholdChange('non_moving_min_qty', parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="1"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Only SKUs with stock quantity greater than or equal to this value will be classified as non-moving.
                  </p>
                </div>
              )}
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-red-900 mb-2">Classification Rule</h4>
              <p className="text-xs text-red-800">
                A SKU is classified as <strong>NON_MOVING</strong> (dead stock) when:
              </p>
              <ul className="list-disc list-inside text-xs text-red-800 mt-2 space-y-1">
                <li>Stock quantity ≥ {localThresholds.non_moving_min_qty_is_percentage 
                  ? `${localThresholds.non_moving_min_qty_percentage ?? 0}% of total inventory`
                  : `${localThresholds.non_moving_min_qty} units`}</li>
                <li>Days since last movement ≥ {localThresholds.non_moving_days} days</li>
                <li>SKU is not NEW (received less than {localThresholds.slow_moving_days} days ago)</li>
                <li>This classification has the highest priority</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Reset Button */}
      <div className="pt-4 border-t border-gray-200">
        <button
          onClick={handleReset}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Reset to Defaults
        </button>
      </div>
    </div>
  );
};

export default PlanningSettings;
